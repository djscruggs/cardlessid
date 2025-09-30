import type { ActionFunctionArgs } from "react-router";
import { json } from "react-router";
import { getVerification, updateCredentialIssued, checkDuplicateCredential } from "~/utils/firebase.server";

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
 * Returns W3C Verifiable Credential with hashed personal data
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const {
      walletAddress,
      firstName,
      middleName = '',
      lastName,
      birthDate,
      governmentId,
      idType,
      state
    } = await request.json();

    // Validate required inputs
    if (!walletAddress) {
      return json({ error: "Missing walletAddress" }, { status: 400 });
    }

    if (!firstName || !lastName || !birthDate || !governmentId || !idType || !state) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate birthDate is at least 13 years ago
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const thirteenYearsAgo = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

    if (birthDateObj > thirteenYearsAgo) {
      return json({
        error: "Birth date must be at least 13 years ago",
      }, { status: 400 });
    }

    // Check if wallet has been verified
    const verification = await getVerification(walletAddress);

    if (!verification) {
      return json(
        { error: "Wallet address not verified. Please complete identity verification first." },
        { status: 403 }
      );
    }

    // Create composite hash for duplicate detection
    const compositeData = `${firstName}|${middleName}|${lastName}|${birthDate}`;
    const compositeHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(compositeData));
    const compositeHash = Array.from(new Uint8Array(compositeHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check for duplicate credentials
    const isDuplicate = await checkDuplicateCredential(compositeHash);
    if (isDuplicate) {
      return json({
        error: "A credential with this identity information has already been issued.",
      }, { status: 409 });
    }

    // Get app wallet address from environment - this is the issuer
    const appWalletAddress = process.env.VITE_APP_WALLET_ADDRESS;
    if (!appWalletAddress) {
      throw new Error("VITE_APP_WALLET_ADDRESS environment variable is required");
    }
    const issuerId = `did:algorand:${appWalletAddress}`;
    const subjectId = `did:algorand:${walletAddress}`;

    // Hash all personal information for privacy
    const governmentIdHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(governmentId));
    const firstNameHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(firstName));
    const middleNameHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(middleName));
    const lastNameHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lastName));
    const birthDateHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(birthDate));

    // Convert hashes to hex strings
    const toHex = (buffer: ArrayBuffer) =>
      Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Generate credential
    const credentialId = `urn:uuid:${crypto.randomUUID()}`;
    const issuanceDate = new Date().toISOString();

    const credential = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://www.w3.org/ns/credentials/examples/v2",
      ],
      id: credentialId,
      type: ["VerifiableCredential", "BirthDateCredential"],
      issuer: {
        id: issuerId,
      },
      issuanceDate,
      credentialSubject: {
        id: subjectId,
        // All personal data is hashed for privacy
        "cardless:governmentIdHash": toHex(governmentIdHash),
        "cardless:firstNameHash": toHex(firstNameHash),
        "cardless:middleNameHash": toHex(middleNameHash),
        "cardless:lastNameHash": toHex(lastNameHash),
        "cardless:birthDateHash": toHex(birthDateHash),
        "cardless:compositeHash": compositeHash,
        "cardless:idType": idType, // "passport" or "drivers_license"
        "cardless:state": state, // US state or territory
      },
      proof: {
        // TODO: Implement actual cryptographic signature
        // For now, this is a placeholder
        type: "Ed25519Signature2020",
        created: issuanceDate,
        verificationMethod: `${issuerId}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue: "placeholder-signature-value"
      },
    };

    // Mark credential as issued with composite hash for future duplicate checks
    await updateCredentialIssued(walletAddress, compositeHash);

    return json({
      success: true,
      credential,
      issuedAt: issuanceDate,
    });

  } catch (error) {
    console.error("Credential issuance error:", error);
    return json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
