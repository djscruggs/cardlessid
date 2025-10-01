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
  }
};

export const SCHEMA_VERSION = "1.0.0";

export const SCHEMA_DESCRIPTION =
  "Cardless ID uses W3C Verifiable Credentials with a composite identity hash for sybil-resistant duplicate detection. " +
  "Each credential includes a cryptographic proof (Ed25519 signature) that prevents forgery - only the legitimate issuer can create valid credentials. " +
  "The mobile wallet stores both the credential (with hash) and the original unhashed data locally for user access.";

export const USAGE_NOTES = {
  verification:
    "Verifiers should validate the proof signature against the issuer's public key (derived from the Algorand address in the issuer DID). " +
    "The signature is created from the credential WITHOUT the proof field. Use algosdk.verifyBytes() with the issuer's public key to verify authenticity. " +
    "The compositeHash prevents duplicate credentials from the same person.",
  wallet:
    "Mobile wallets receive both the credential (with compositeHash and cryptographic proof) and the original unhashed personal data (for local storage and user access).",
  extension:
    "Additional claims can be added using custom namespaces while preserving core cardlessid: fields",
  proof:
    "The proof.proofValue contains a base64-encoded Ed25519 signature. " +
    "To verify: 1) Remove the proof field from credential, 2) Convert to canonical JSON, 3) Verify signature using issuer's public key from Algorand",
};