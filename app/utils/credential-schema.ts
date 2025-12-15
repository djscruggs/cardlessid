/**
 * Shared Cardless ID credential schema definition
 * Used by both the JSON-LD context and schema API endpoints
 */

export const CARDLESS_NAMESPACE = "https://cardlessid.org/credentials/v1#";

export const CARDLESS_FIELDS = {
  compositeHash: {
    id: `${CARDLESS_NAMESPACE}compositeHash`,
    type: "http://www.w3.org/2001/XMLSchema#string",
    description: "SHA-256 hash of firstName|middleName|lastName|birthDate (ISO 8601 format)",
    purpose: "Sybil-resistant duplicate detection - prevents the same person from creating multiple credentials",
    example: "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35"
  },
  service: {
    id: "https://www.w3.org/ns/did/v1#service",
    type: "Array<ServiceEndpoint>",
    description: "Optional array of service endpoints for system attestation and metadata",
    purpose: "Links to the exact git commit of code that issued the credential for auditability and transparency",
    structure: {
      systemAttestation: {
        id: "string - Service identifier (e.g., '#system-attestation')",
        type: "string - Service type (e.g., 'SystemAttestation')",
        serviceEndpoint: "string - GitHub commit URL for code audit"
      }
    },
    example: {
      id: "#system-attestation",
      type: "SystemAttestation",
      serviceEndpoint: "https://github.com/owner/repo/commit/abc123def456"
    },
    optional: true,
    note: "Only included when git information is available at build time. Development builds will not include this field."
  },
  evidence: {
    id: "https://www.w3.org/2018/credentials#evidence",
    type: "Array<DocumentVerification>",
    description: "W3C standard evidence property containing verification metadata and confidence metrics",
    purpose: "Provides detailed information about the verification process including fraud detection, OCR confidence, and biometric matching",
    structure: {
      fraudDetection: {
        performed: "boolean - Whether fraud detection was performed",
        passed: "boolean - Overall fraud check result",
        method: "string - Fraud detection method (e.g., 'google-document-ai')",
        provider: "string - Human-readable provider name",
        signals: "array - Fraud signals detected (empty if clean)"
      },
      documentAnalysis: {
        provider: "string - OCR provider (e.g., 'aws-textract')",
        bothSidesAnalyzed: "boolean - Whether front and back were processed",
        lowConfidenceFields: "string[] - Fields with low OCR confidence",
        qualityLevel: "'high' | 'medium' | 'low' - Overall verification quality"
      },
      biometricVerification: {
        performed: "boolean - Whether biometric verification was performed",
        faceMatch: "{ confidence: number, provider: string } - Face comparison confidence (0-1)",
        liveness: "{ confidence: number, provider: string } - Liveness detection confidence (0-1)"
      }
    }
  }
};

export const SCHEMA_VERSION = "1.0.0";

export const SCHEMA_DESCRIPTION =
  "Cardless ID uses W3C Verifiable Credentials with a composite identity hash for sybil-resistant duplicate detection. " +
  "Each credential includes a cryptographic proof (Ed25519 signature) that prevents forgery - only the legitimate issuer can create valid credentials. " +
  "The credential also includes a W3C-standard 'evidence' property with detailed verification metadata (fraud detection, OCR confidence, biometric matching) for risk assessment. " +
  "The mobile wallet stores both the credential (with hash and evidence) and the original unhashed data locally for user access.";

export const USAGE_NOTES = {
  verification:
    "Verifiers should validate the proof signature against the issuer's public key (derived from the Algorand address in the issuer DID). " +
    "The signature is created from the credential WITHOUT the proof field. Use algosdk.verifyBytes() with the issuer's public key to verify authenticity. " +
    "The compositeHash prevents duplicate credentials from the same person. " +
    "The evidence property contains verification quality metrics for risk-based trust decisions.",
  wallet:
    "Mobile wallets receive both the credential (with compositeHash, evidence, and cryptographic proof) and the original unhashed personal data (for local storage and user access). " +
    "The evidence property includes fraud detection results, OCR confidence levels, and biometric matching scores that can be used for risk assessment.",
  extension:
    "Additional claims can be added using custom namespaces while preserving core cardlessid: fields. " +
    "The W3C-standard evidence property is extensible and can include additional verification methods.",
  proof:
    "The proof.proofValue contains a base64-encoded Ed25519 signature. " +
    "To verify: 1) Remove the proof field from credential, 2) Convert to canonical JSON, 3) Verify signature using issuer's public key from Algorand. " +
    "Note: The evidence property is included in the signed data, ensuring verification metadata cannot be tampered with.",
  evidence:
    "The evidence array follows W3C VC Data Model standards and includes DocumentVerification evidence with fraud detection (Google Document AI), " +
    "document analysis (AWS Textract OCR confidence), and biometric verification (AWS Rekognition face match and liveness). " +
    "Quality levels (high/medium/low) help relying parties make risk-based acceptance decisions. " +
    "High quality requires: fraud check passed, both ID sides processed, no low-confidence fields, and strong biometric scores.",
  service:
    "The optional service array provides system attestation by linking to the exact git commit that issued the credential. " +
    "This enables verifiers to audit the issuing code for security review and demonstrates the issuer's commitment to transparency. " +
    "The serviceEndpoint contains a GitHub URL (e.g., https://github.com/owner/repo/commit/abc123) pointing to the exact code version. " +
    "This field is only included when git information is available at build time and will be omitted in development builds.",
};