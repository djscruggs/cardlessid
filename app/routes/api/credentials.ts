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
  const { saveVerification, updateCredentialIssued } = await import(
    "~/utils/firebase.server"
  );
  const { getPeraExplorerUrl } = await import("~/utils/algorand");
  const {
    createCredentialNFT,
    transferCredentialNFT,
    freezeCredentialNFT,
    checkDuplicateCredentialNFT,
  } = await import("~/utils/nft-credentials");
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
    const { valid, error: validationError } =
      isSessionValidForCredential(session);
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

    // Check for duplicate credentials on blockchain (NFT-based)
    const { exists: isDuplicate, assetIds: duplicateAssetIds } =
      await checkDuplicateCredentialNFT(appWalletAddress, compositeHash);

    // In production, prevent duplicate issuance
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && isDuplicate) {
      return Response.json(
        {
          error:
            "A credential with this identity information has already been issued.",
          duplicateAssetIds,
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
    const secretKey = new Uint8Array(Buffer.from(issuerPrivateKey, "base64"));
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

    const issuerId = `did:algo:${appWalletAddress}`;
    const subjectId = `did:algo:${walletAddress}`;

    // Generate credential
    const credentialId = `urn:uuid:${crypto.randomUUID()}`;
    const issuanceDate = new Date().toISOString();

    // Create credential without proof (this is what gets signed)
    const credentialWithoutProof = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://www.w3.org/ns/credentials/examples/v2",
        "https://cardlessid.org/credentials/v1",
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
        proofValue: Buffer.from(signature).toString("base64"),
      },
    };

    // Mint credential NFT on blockchain
    let assetId: string | undefined;
    let mintTxId: string | undefined;
    let fundingTxId: string | undefined;
    let credentialExplorerUrl: string | undefined;

    try {
      // Get network from env
      const network = (process.env.VITE_ALGORAND_NETWORK || "testnet") as
        | "testnet"
        | "mainnet";

      // Import funding utilities
      const { walletNeedsFunding, fundNewWallet } = await import("~/utils/algorand");

      // Step 0: Check if issuer wallet needs funding
      const issuerNeedsFunds = await walletNeedsFunding(appWalletAddress);
      if (issuerNeedsFunds) {
        console.log(`💰 Issuer wallet ${appWalletAddress} needs funding for NFT operations`);
        // We need to fund the issuer wallet first - this requires a different approach
        // For now, throw an error with instructions
        throw new Error(`Issuer wallet ${appWalletAddress} has insufficient ALGO balance. Please fund it with at least 0.1 ALGO from the testnet faucet or another wallet.`);
      } else {
        console.log(`✓ Issuer wallet ${appWalletAddress} has sufficient balance`);
      }

      // Step 1: Check if recipient wallet needs funding and fund it
      const needsFunding = await walletNeedsFunding(walletAddress);
      if (needsFunding) {
        console.log(`💰 Wallet ${walletAddress} needs funding for asset opt-in`);
        fundingTxId = await fundNewWallet(
          appWalletAddress,
          issuerAccount.sk,
          walletAddress,
          200000 // 0.2 ALGO
        );
        console.log(`✓ Funded wallet with ${fundingTxId}`);
      } else {
        console.log(`✓ Wallet ${walletAddress} has sufficient balance`);
      }

      // Step 1: Create the NFT credential
      // NOTE: No age/birth information included for privacy (minimal disclosure principle)
      const nftResult = await createCredentialNFT(
        appWalletAddress,
        issuerAccount.sk,
        walletAddress,
        {
          name: `Cardless ID`,
          description: `Identity verification credential`,
          credentialId,
          compositeHash,
          issuedAt: issuanceDate,
        }
      );

      assetId = nftResult.assetId;
      mintTxId = nftResult.txId;

      console.log(
        `✓ Created NFT credential: Asset ID ${assetId}, Tx: ${mintTxId}`
      );

      // NOTE: Client must opt-in to the asset before we can transfer it
      // The client will need to:
      // 1. Call this endpoint to get the assetId
      // 2. Opt-in to the asset (0 ALGO transfer to self)
      // 3. We'll transfer and freeze in a separate endpoint or the client handles this

      credentialExplorerUrl = getPeraExplorerUrl(mintTxId, network);
    } catch (error) {
      console.error("Error minting credential NFT:", error);
      throw error; // NFT minting is critical, so we throw
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
      nft: {
        assetId: assetId.toString(), // Ensure it's a string for JSON serialization
        requiresOptIn: true,
        instructions: {
          step1: "Client must opt-in to the asset",
          step2:
            "Call POST /api/credentials/transfer with assetId and walletAddress",
          step3: "Asset will be transferred and frozen (non-transferable)",
        },
      },
      blockchain: {
        transaction: {
          id: mintTxId,
          explorerUrl: credentialExplorerUrl,
          note: "NFT credential minted",
        },
        funding: fundingTxId ? {
          id: fundingTxId,
          amount: "0.2 ALGO",
          note: "Wallet funded for asset opt-in"
        } : undefined,
        network: process.env.VITE_ALGORAND_NETWORK || "testnet",
      },
      duplicateDetection: {
        duplicateCount: duplicateAssetIds.length,
        isDuplicate,
        duplicateAssetIds,
        message:
          duplicateAssetIds.length > 0
            ? `Warning: ${duplicateAssetIds.length} duplicate credential(s) found on blockchain`
            : "No duplicates found",
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
