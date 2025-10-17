import type { ActionFunctionArgs } from "react-router";

/**
 * Determine verification quality level based on provider metadata
 */
function determineVerificationLevel(metadata: any): "high" | "medium" | "low" {
  if (!metadata) return "low";

  const hasLowConfidence = (metadata.lowConfidenceFields?.length || 0) > 0;
  const hasFraudCheck = metadata.fraudCheckPassed === true;
  const hasBothSides = metadata.bothSidesProcessed === true;
  const hasFraudSignals = (metadata.fraudSignals?.length || 0) > 0;

  // High: Fraud check passed + both sides + no low confidence fields + no fraud signals
  if (hasFraudCheck && hasBothSides && !hasLowConfidence && !hasFraudSignals) {
    return "high";
  }

  // Low: Has low confidence fields OR has fraud signals OR no fraud check
  if (hasLowConfidence || hasFraudSignals || !hasFraudCheck) {
    return "low";
  }

  // Medium: Everything else
  return "medium";
}

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
  const { authenticateRequestWithFallback, checkRateLimit } = await import("~/utils/api-auth.server");

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Authenticate request
  // - Mobile clients MUST provide X-API-Key header
  // - Web app server-side routes can use environment variables
  const authResult = await authenticateRequestWithFallback(request);
  if (!authResult.success) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  const { issuer, source } = authResult;

  // Determine if this is a demo request (web UI without API key)
  const isDemoMode = source === "env";

  if (isDemoMode) {
    console.log(`[Credentials] DEMO MODE: Web UI demonstration (no real credentials issued)`);
  } else {
    console.log(`[Credentials] PRODUCTION MODE: ${issuer.name} (API key)`);
  }

  // Check rate limit (only for API key users)
  if (source === "api-key" && issuer.rateLimit) {
    if (checkRateLimit(issuer.apiKey, issuer.rateLimit)) {
      return Response.json(
        {
          error: `Rate limit exceeded. Maximum ${issuer.rateLimit} requests per hour.`,
        },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const {
      verificationToken,
      verificationSessionId,
      walletAddress,
      // Identity data submitted by client (for verification)
      firstName,
      middleName,
      lastName,
      birthDate,
      governmentId,
      idType,
      state,
      expirationDate,
    } = body;

    // Validate required inputs
    if (!verificationToken && !verificationSessionId) {
      return Response.json(
        { error: "Missing verificationToken or verificationSessionId" },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return Response.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    // Import data integrity utilities
    const { verifyVerificationToken, generateDataHMAC } = await import(
      "~/utils/data-integrity.server"
    );

    let sessionId: string;
    let expectedDataHmac: string | null = null;

    // Verify token if provided (secure method with HMAC)
    if (verificationToken) {
      const tokenData = verifyVerificationToken(verificationToken);

      if (!tokenData) {
        return Response.json(
          { error: "Invalid or tampered verification token" },
          { status: 403 }
        );
      }

      sessionId = tokenData.sessionId;
      expectedDataHmac = tokenData.dataHmac;
      console.log("[Credentials] Verified token signature");

      // Validate that client submitted identity data
      if (!firstName || !lastName || !birthDate || !governmentId) {
        return Response.json(
          {
            error:
              "Missing identity data - firstName, lastName, birthDate, and governmentId are required",
          },
          { status: 400 }
        );
      }

      // Verify submitted data matches stored hash
      const submittedData = {
        firstName,
        middleName: middleName || "",
        lastName,
        birthDate,
        governmentId,
        idType: idType || "",
        state: state || "",
        expirationDate: expirationDate || "",
      };
      const submittedDataHmac = generateDataHMAC(submittedData);

      if (submittedDataHmac !== expectedDataHmac) {
        console.error(
          "[Credentials] Data tampering detected - submitted data does not match verified hash"
        );
        return Response.json(
          {
            error:
              "Data tampering detected - the identity information you submitted does not match what was verified",
          },
          { status: 400 }
        );
      }

      console.log(
        "[Credentials] Submitted identity data verified - hash matches"
      );
    } else {
      // Fallback to plain sessionId (backwards compatibility - for manual credential creation)
      sessionId = verificationSessionId;
      console.warn(
        "[Credentials] Using legacy sessionId without token verification"
      );
    }

    // Get verification session
    const session = await getVerificationSession(sessionId);

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

    // Use submitted data if token was provided and verified, otherwise use session data
    let credentialData: {
      firstName: string;
      middleName: string;
      lastName: string;
      birthDate: string;
      governmentId: string;
      expirationDate: string;
      idType: string;
      state: string;
    };

    if (verificationToken) {
      // Use verified submitted data
      credentialData = {
        firstName,
        middleName: middleName || "",
        lastName,
        birthDate,
        governmentId,
        idType: idType || "government_id",
        expirationDate,
        state: state || "",
      };
    } else {
      // Use session data (legacy/manual mode)
      credentialData = {
        firstName: session.verifiedData!.firstName,
        middleName: session.verifiedData!.middleName || "",
        lastName: session.verifiedData!.lastName,
        birthDate: session.verifiedData!.birthDate,
        governmentId: session.verifiedData!.governmentId,
        idType: session.verifiedData!.idType,
        state: session.verifiedData!.state,
      };
    }

    // Validate birthDate is at least 13 years ago
    const birthDateObj = new Date(credentialData.birthDate);
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

    // Use authenticated issuer's wallet address
    const appWalletAddress = issuer.address;
    if (!appWalletAddress) {
      throw new Error("Issuer wallet address is missing from configuration");
    }

    // Create composite hash for duplicate detection
    const compositeData = `${credentialData.firstName}|${credentialData.middleName}|${credentialData.lastName}|${credentialData.birthDate}`;
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

    // Use authenticated issuer's private key for signing
    const issuerPrivateKey = issuer.privateKeyBase64;

    if (!issuerPrivateKey) {
      throw new Error("Issuer private key is missing from configuration");
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
        `Issuer private key does not match issuer address for ${issuer.name}`
      );
    }

    console.log(
      `[Credentials] Using issuer: ${issuer.name} (${appWalletAddress.substring(0, 8)}...)`
    );

    const issuerId = `did:algo:${appWalletAddress}`;
    const subjectId = `did:algo:${walletAddress}`;

    // Generate credential
    const credentialId = `urn:uuid:${crypto.randomUUID()}`;
    const issuanceDate = new Date().toISOString();

    // Extract verification quality metrics from session
    const verificationQuality = {
      fraudCheckPassed: session.providerMetadata?.fraudCheckPassed || false,
      fraudSignals: session.providerMetadata?.fraudSignals || [],
      extractionMethod: session.providerMetadata?.extractionMethod || "unknown",
      lowConfidenceFields: session.providerMetadata?.lowConfidenceFields || [],
      bothSidesProcessed: session.providerMetadata?.bothSidesProcessed || false,
      faceMatchConfidence:
        session.providerMetadata?.faceMatchConfidence || null,
      livenessConfidence: session.providerMetadata?.livenessConfidence || null,
      verificationLevel: determineVerificationLevel(session.providerMetadata),
    };

    console.log("[Credentials] Verification quality metrics:", {
      level: verificationQuality.verificationLevel,
      fraudCheckPassed: verificationQuality.fraudCheckPassed,
      lowConfidenceFieldCount: verificationQuality.lowConfidenceFields.length,
      fraudSignalCount: verificationQuality.fraudSignals.length,
      faceMatchConfidence: verificationQuality.faceMatchConfidence,
      livenessConfidence: verificationQuality.livenessConfidence,
    });

    // Create credential without proof (this is what gets signed)
    // Using W3C VC Data Model standard "evidence" property for verification metadata
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
      // W3C standard evidence property for verification metadata
      evidence: [
        {
          type: ["DocumentVerification"],
          verifier: issuerId,
          evidenceDocument:
            credentialData.idType === "drivers_license"
              ? "DriversLicense"
              : credentialData.idType === "passport"
                ? "Passport"
                : "GovernmentIssuedID",
          subjectPresence: "Digital",
          documentPresence: "Digital",
          // Verification quality and confidence metrics
          verificationMethod: verificationQuality.extractionMethod,
          fraudDetection: {
            performed: verificationQuality.fraudCheckPassed,
            passed: verificationQuality.fraudCheckPassed,
            method: "google-document-ai",
            provider: "Google Document AI",
            signals: verificationQuality.fraudSignals,
          },
          documentAnalysis: {
            provider: verificationQuality.extractionMethod,
            bothSidesAnalyzed: verificationQuality.bothSidesProcessed,
            lowConfidenceFields: verificationQuality.lowConfidenceFields,
            qualityLevel: verificationQuality.verificationLevel,
          },
          biometricVerification: {
            performed: verificationQuality.faceMatchConfidence !== null,
            faceMatch: {
              confidence: verificationQuality.faceMatchConfidence,
              provider: "AWS Rekognition",
            },
            liveness: {
              confidence: verificationQuality.livenessConfidence,
              provider: "AWS Rekognition",
            },
          },
        },
      ],
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

    // Mint credential NFT on blockchain (SKIP FOR DEMO MODE)
    let assetId: string | undefined;
    let mintTxId: string | undefined;
    let fundingTxId: string | undefined;
    let credentialExplorerUrl: string | undefined;

    if (isDemoMode) {
      // DEMO MODE: Skip blockchain operations, use dummy values
      console.log(`[Credentials] Demo mode - skipping NFT creation`);
      assetId = "DEMO_ASSET_ID";
      mintTxId = "DEMO_TX_ID";
      credentialExplorerUrl = "https://testnet.explorer.perawallet.app/tx/DEMO_TX_ID";
    } else {
      // PRODUCTION MODE: Actually mint NFT on blockchain
      try {
        // Get network from env
        const network = (process.env.VITE_ALGORAND_NETWORK || "testnet") as
          | "testnet"
          | "mainnet";

        // Import funding utilities
        const { walletNeedsFunding, fundNewWallet } = await import(
          "~/utils/algorand"
        );

        // Step 0: Check if issuer wallet needs funding
        const issuerNeedsFunds = await walletNeedsFunding(appWalletAddress);
      if (issuerNeedsFunds) {
        console.log(
          `💰 Issuer wallet ${appWalletAddress} needs funding for NFT operations`
        );
        // We need to fund the issuer wallet first - this requires a different approach
        // For now, throw an error with instructions
        throw new Error(
          `Issuer wallet ${appWalletAddress} has insufficient ALGO balance. Please fund it with at least 0.1 ALGO from the testnet faucet or another wallet.`
        );
      } else {
        console.log(
          `✓ Issuer wallet ${appWalletAddress} has sufficient balance`
        );
      }

      // Step 1: Check if recipient wallet needs funding and fund it
      const needsFunding = await walletNeedsFunding(walletAddress);
      if (needsFunding) {
        console.log(
          `💰 Wallet ${walletAddress} needs funding for asset opt-in`
        );
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
    }

    // Save verification record with composite hash for duplicate detection (SKIP FOR DEMO)
    if (!isDemoMode) {
      await saveVerification(walletAddress, true);
      await updateCredentialIssued(walletAddress, compositeHash);

      // Mark verification session as consumed
      await markSessionCredentialIssued(verificationSessionId, walletAddress);
    } else {
      console.log(`[Credentials] Demo mode - skipping database writes`);
    }

    const responseData = {
      success: true,
      ...(isDemoMode && {
        demoMode: true,
        demoNotice: "This is a DEMONSTRATION only. No real credentials were created on the blockchain. To issue real credentials, mobile apps must register for an API key at https://cardlessid.org/contact",
      }),
      credential,
      personalData: {
        firstName: credentialData.firstName,
        middleName: credentialData.middleName,
        lastName: credentialData.lastName,
        birthDate: credentialData.birthDate,
        governmentId: credentialData.governmentId,
        idType: credentialData.idType,
        state: credentialData.state,
      },
      verificationQuality: {
        level: verificationQuality.verificationLevel,
        fraudCheckPassed: verificationQuality.fraudCheckPassed,
        extractionMethod: verificationQuality.extractionMethod,
        bothSidesProcessed: verificationQuality.bothSidesProcessed,
        lowConfidenceFields: verificationQuality.lowConfidenceFields,
        fraudSignals: verificationQuality.fraudSignals,
        faceMatchConfidence: verificationQuality.faceMatchConfidence,
        livenessConfidence: verificationQuality.livenessConfidence,
      },
      issuedAt: issuanceDate,
      nft: {
        assetId: assetId?.toString() || "DEMO_ASSET_ID",
        requiresOptIn: !isDemoMode,
        ...(isDemoMode
          ? {
              demoNotice: "No NFT was created - this is a demonstration",
            }
          : {
              instructions: {
                step1: "Client must opt-in to the asset",
                step2:
                  "Call POST /api/credentials/transfer with assetId and walletAddress",
                step3: "Asset will be transferred and frozen (non-transferable)",
              },
            }),
      },
      blockchain: {
        transaction: {
          id: mintTxId,
          explorerUrl: credentialExplorerUrl,
          note: "NFT credential minted",
        },
        funding: fundingTxId
          ? {
              id: fundingTxId,
              amount: "0.2 ALGO",
              note: "Wallet funded for asset opt-in",
            }
          : undefined,
        network: process.env.VITE_ALGORAND_NETWORK || "testnet",
      },
      duplicateDetection: {
        duplicateCount: duplicateAssetIds.length,
        isDuplicate,
        duplicateAssetIds: duplicateAssetIds.map(id => Number(id)),
        message:
          duplicateAssetIds.length > 0
            ? `Warning: ${duplicateAssetIds.length} duplicate credential(s) found on blockchain`
            : "No duplicates found",
      },
    };

    // Use JSON.stringify with BigInt replacer, then parse back to ensure all BigInts are converted
    const jsonString = JSON.stringify(responseData, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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
