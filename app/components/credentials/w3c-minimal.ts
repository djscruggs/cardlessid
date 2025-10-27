/**
 * Example W3C Verifiable Credential for Cardless ID
 *
 * This credential structure is used for sybil-resistant identity verification.
 * The composite hash (firstName|middleName|lastName|birthDate) is used to
 * prevent duplicate credentials from being issued to the same person.
 *
 * CRYPTOGRAPHIC PROOF:
 * The proof field contains an Ed25519 signature created by the issuer's private key.
 * - The signature is generated from the credential WITHOUT the proof field
 * - Verifiers can validate the signature using the issuer's public key (derived from the Algorand address)
 * - This ensures the credential cannot be forged - only the legitimate issuer can create valid credentials
 * - Signature format: base64-encoded Ed25519 signature
 *
 * EVIDENCE (W3C Standard):
 * The evidence property follows W3C VC Data Model standards and includes:
 * - fraudDetection: Google Document AI fraud signals and pass/fail result
 * - documentAnalysis: AWS Textract OCR confidence and quality level (high/medium/low)
 * - biometricVerification: AWS Rekognition face match and liveness confidence scores
 * This allows relying parties to make risk-based trust decisions based on verification quality.
 *
 * SERVICE (System Attestation):
 * The service array includes metadata about the system that issued the credential:
 * - ZkProofSystemVersion: Links to the specific git commit of the issuing code
 * - Provides auditability and transparency about which version generated the credential
 * - Allows verifiers to inspect the exact code used for credential generation
 *
 * REVOCATION:
 * The credentialStatus field references the on-chain issuer registry smart contract.
 * Relying parties (verifiers) must check:
 * 1. Issuer was authorized at time of issuance
 * 2. Issuer was not revoked at time of issuance
 * 3. Credential has not been individually revoked
 * 4. Issuer does not have the "revoke all prior" flag set
 */
const CardlessCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2",
    "https://cardlessid.org/credentials/v1",
  ],
  id: "urn:uuid:8b330349-f027-46e3-ae16-8a032903ce9b",
  type: ["VerifiableCredential", "BirthDateCredential"],
  issuer: {
    id: "did:algo:ISSUER_WALLET_ADDRESS_HERE",
  },
  issuanceDate: "2025-09-30T17:00:00Z",
  credentialSubject: {
    id: "did:algo:USER_WALLET_ADDRESS_HERE",
    "cardlessid:compositeHash":
      "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
  },
  evidence: [
    {
      type: ["DocumentVerification"],
      verifier: "did:algo:ISSUER_WALLET_ADDRESS_HERE",
      evidenceDocument: "DriversLicense",
      subjectPresence: "Digital",
      documentPresence: "Digital",
      verificationMethod: "aws-textract",
      fraudDetection: {
        performed: true,
        passed: true,
        method: "google-document-ai",
        provider: "Google Document AI",
        signals: []
      },
      documentAnalysis: {
        provider: "aws-textract",
        bothSidesAnalyzed: true,
        lowConfidenceFields: [],
        qualityLevel: "high"
      },
      biometricVerification: {
        performed: true,
        faceMatch: {
          confidence: 0.95,
          provider: "AWS Rekognition"
        },
        liveness: {
          confidence: 0.92,
          provider: "AWS Rekognition"
        }
      }
    }
  ],
  credentialStatus: {
    id: "did:algo:app:REGISTRY_APP_ID",
    type: "AlgorandIssuerRegistry2025",
  },
  service: [
    {
      id: "#system-attestation",
      type: "ZkProofSystemVersion",
      serviceEndpoint: "https://github.com/REPO_OWNER/REPO_SLUG/commit/COMMIT_HASH_HERE"
    }
  ],
  proof: {
    type: "Ed25519Signature2020",
    created: "2025-09-30T17:00:00Z",
    verificationMethod: "did:algo:ISSUER_WALLET_ADDRESS_HERE#key-1",
    proofPurpose: "assertionMethod",
    proofValue: "z3eF7d8...base64EncodedSignature", // Ed25519 signature of credential (without proof field)
  },
};

export default CardlessCredential;
