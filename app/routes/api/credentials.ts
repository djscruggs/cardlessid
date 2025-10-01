import type { ActionFunctionArgs } from "react-router";
import {
  getVerification,
  saveVerification,
  updateCredentialIssued,
  checkDuplicateCredential,
} from "~/utils/firebase.server";
import { isValidAlgorandAddress } from "~/utils/algorand";

/**
 * Endpoint for mobile app to request credential after verification
 *
 * Expected payload:
 * {
 *   walletAddress: string,
 *   firstName: string,
 *   middleName: string (optional),
 *   lastName: string,
 *   birthDate: string (ISO format),
 *   governmentId: string,
 *   idType: 'passport' | 'drivers_license',
 *   state: string (US state code)
 * }
 *
 * Returns W3C Verifiable Credential with hashed personal data for on-chain verification.
 * The mobile wallet stores both the credential (with hashes) and the original unhashed data locally.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const {
      walletAddress,
      firstName,
      middleName = "",
      lastName,
      birthDate,
      governmentId,
      idType,
      state,
    } = await request.json();

    // Validate required inputs
    if (!walletAddress) {
      return Response.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    if (
      !firstName ||
      !lastName ||
      !birthDate ||
      !governmentId ||
      !idType ||
      !state
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    // Check if wallet has already been verified
    const verification = await getVerification(walletAddress);

    if (verification) {
      return Response.json(
        {
          error:
            "This wallet address has already been verified and issued a credential.",
        },
        { status: 409 }
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

    // Check for duplicate credentials
    const isDuplicate = await checkDuplicateCredential(compositeHash);
    if (isDuplicate) {
      return Response.json(
        {
          error:
            "A credential with this identity information has already been issued.",
        },
        { status: 409 }
      );
    }

    // Get app wallet address from environment - this is the issuer
    const appWalletAddress = process.env.VITE_APP_WALLET_ADDRESS;
    if (!appWalletAddress) {
      throw new Error(
        "VITE_APP_WALLET_ADDRESS environment variable is required"
      );
    }
    const issuerId = `did:algorand:${appWalletAddress}`;
    const subjectId = `did:algorand:${walletAddress}`;

    // Generate credential
    const credentialId = `urn:uuid:${crypto.randomUUID()}`;
    const issuanceDate = new Date().toISOString();

    const credential = {
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
      proof: {
        // TODO: Implement actual cryptographic signature
        // For now, this is a placeholder
        type: "Ed25519Signature2020",
        created: issuanceDate,
        verificationMethod: `${issuerId}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue: "placeholder-signature-value",
      },
    };

    // Save verification record with composite hash for duplicate detection
    await saveVerification(walletAddress, true);
    await updateCredentialIssued(walletAddress, compositeHash);

    return {
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
    };
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
