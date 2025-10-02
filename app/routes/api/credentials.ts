import type { ActionFunctionArgs } from "react-router";

/**
 * Endpoint for mobile app to request credential after verification
 *
 * Expected payload:
 * {
 *   verificationSessionId: string,  // Session ID from /api/verification/start
 *   walletAddress: string
 * }
 *
 * Returns W3C Verifiable Credential with hashed personal data for on-chain verification.
 * The mobile wallet stores both the credential (with hashes) and the original unhashed data locally.
 */
export async function action({ request }: ActionFunctionArgs) {
  // Import server-only modules inside the action to prevent client bundling
  const {
    saveVerification,
    updateCredentialIssued,
  } = await import("~/utils/firebase.server");
  const {
    createCredentialTransaction,
    waitForConfirmation,
    getPeraExplorerUrl,
    checkCredentialExists,
  } = await import("~/utils/algorand");
  const {
    getVerificationSession,
    isSessionValidForCredential,
    markSessionCredentialIssued,
  } = await import("~/utils/verification.server");
  const algosdk = (await import("algosdk")).default;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { verificationSessionId, walletAddress } = await request.json();

    // Validate required inputs
    if (!verificationSessionId) {
      return Response.json(
        { error: "Missing verificationSessionId" },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return Response.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    // Get verification session
    const session = await getVerificationSession(verificationSessionId);

    if (!session) {
      return Response.json(
        { error: "Verification session not found" },
        { status: 404 }
      );
    }

    // Validate session is ready for credential issuance
    const { valid, error: validationError } = isSessionValidForCredential(session);
    if (!valid) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    // Extract verified identity data from session
    const {
      firstName,
      middleName = "",
      lastName,
      birthDate,
      governmentId,
      idType,
      state,
    } = session.verifiedData!;

    // Validate birthDate is at least 13 years ago
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const thirteenYearsAgo = new Date(
      today.getFullYear() - 13,
      today.getMonth(),
      today.getDate()
    );

    if (birthDateObj > thirteenYearsAgo) {
      return Response.json(
        {
          error: "Birth date must be at least 13 years ago",
        },
        { status: 400 }
      );
    }

    // Validate Algorand address format (58 characters, base32)
    const algorandAddressRegex = /^[A-Z2-7]{58}$/;
    if (!algorandAddressRegex.test(walletAddress)) {
      return Response.json(
        {
          error: "Invalid Algorand wallet address format",
        },
        { status: 400 }
      );
    }

    // Get app wallet address from environment - needed for duplicate check
    const appWalletAddress = process.env.VITE_APP_WALLET_ADDRESS;
    if (!appWalletAddress) {
      throw new Error(
        "VITE_APP_WALLET_ADDRESS environment variable is required"
      );
    }

    // Create composite hash for duplicate detection
    const compositeData = `${firstName}|${middleName}|${lastName}|${birthDate}`;
    const compositeHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(compositeData)
    );
    const compositeHash = Array.from(new Uint8Array(compositeHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Check for duplicate credentials on blockchain
    const { exists: isDuplicate, duplicateCount } = await checkCredentialExists(
      appWalletAddress,
      walletAddress,
      compositeHash
    );

    // In production, prevent duplicate issuance
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && isDuplicate) {
      return Response.json(
        {
          error:
            "A credential with this identity information has already been issued.",
        },
        { status: 409 }
      );
    }


    // Get issuer's private key for signing
    const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;

    if (!issuerPrivateKey) {
      throw new Error(
        "ISSUER_PRIVATE_KEY environment variable is required for credential signing"
      );
    }

    // Restore account from private key (base64 encoded)
    const secretKey = new Uint8Array(Buffer.from(issuerPrivateKey, 'base64'));
    const issuerAccount = {
      addr: algosdk.encodeAddress(secretKey.slice(32)), // Last 32 bytes are public key
      sk: secretKey,
    };

    // Verify the key matches the configured wallet address
    if (issuerAccount.addr !== appWalletAddress) {
      throw new Error(
        "ISSUER_PRIVATE_KEY does not match VITE_APP_WALLET_ADDRESS"
      );
    }

    const issuerId = `did:algorand:${appWalletAddress}`;
    const subjectId = `did:algorand:${walletAddress}`;

    // Generate credential
    const credentialId = `urn:uuid:${crypto.randomUUID()}`;
    const issuanceDate = new Date().toISOString();

    // Create credential without proof (this is what gets signed)
    const credentialWithoutProof = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://www.w3.org/ns/credentials/examples/v2",
        "https://cardlessid.org/credentials/v1"
      ],
      id: credentialId,
      type: ["VerifiableCredential", "BirthDateCredential"],
      issuer: {
        id: issuerId,
      },
      issuanceDate,
      credentialSubject: {
        id: subjectId,
        "cardlessid:compositeHash": compositeHash,
      },
    };

    // Create canonical JSON string and sign it
    const credentialBytes = new TextEncoder().encode(
      JSON.stringify(credentialWithoutProof)
    );
    const signature = algosdk.signBytes(credentialBytes, issuerAccount.sk);

    // Create final credential with cryptographic proof
    const credential = {
      ...credentialWithoutProof,
      proof: {
        type: "Ed25519Signature2020",
        created: issuanceDate,
        verificationMethod: `${issuerId}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue: Buffer.from(signature).toString('base64'),
      },
    };

    // Write credential record to blockchain
    let credentialTxId: string | undefined;
    let credentialExplorerUrl: string | undefined;

    try {
      // Get network from env
      const network = (process.env.VITE_ALGORAND_NETWORK || 'testnet') as 'testnet' | 'mainnet';

      // Create credential transaction with hash and proof
      credentialTxId = await createCredentialTransaction(
        appWalletAddress,
        walletAddress,
        issuerAccount.sk,
        credentialId,
        compositeHash,
        credential.proof.proofValue
      );
      await waitForConfirmation(credentialTxId);
      credentialExplorerUrl = getPeraExplorerUrl(credentialTxId, network);

    } catch (error) {
      console.error('Error writing credential to blockchain:', error);
      // Continue even if blockchain write fails - credential is still valid
    }

    // Save verification record with composite hash for duplicate detection
    await saveVerification(walletAddress, true);
    await updateCredentialIssued(walletAddress, compositeHash);

    // Mark verification session as consumed
    await markSessionCredentialIssued(verificationSessionId, walletAddress);

    return Response.json({
      success: true,
      credential,
      personalData: {
        firstName,
        middleName,
        lastName,
        birthDate,
        governmentId,
        idType,
        state,
      },
      issuedAt: issuanceDate,
      blockchain: {
        transaction: {
          id: credentialTxId,
          explorerUrl: credentialExplorerUrl,
          note: "Credential record with hash and proof"
        },
        network: process.env.VITE_ALGORAND_NETWORK || 'testnet',
      },
      duplicateDetection: {
        duplicateCount,
        isDuplicate,
        message: duplicateCount > 0
          ? `Warning: ${duplicateCount} duplicate credential(s) found on blockchain`
          : 'No duplicates found'
      },
    });
  } catch (error) {
    console.error("Credential issuance error:", error);
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function loader() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
