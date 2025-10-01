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
    id: "did:algorand:ISSUER_WALLET_ADDRESS_HERE",
  },
  issuanceDate: "2025-09-30T17:00:00Z",
  credentialSubject: {
    id: "did:algorand:USER_WALLET_ADDRESS_HERE",
    "cardlessid:compositeHash":
      "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
  },
  proof: {
    type: "Ed25519Signature2020",
    created: "2025-09-30T17:00:00Z",
    verificationMethod: "did:algorand:ISSUER_WALLET_ADDRESS_HERE#key-1",
    proofPurpose: "assertionMethod",
    proofValue: "z3eF7d8...base64EncodedSignature", // Ed25519 signature of credential (without proof field)
  },
};

export default CardlessCredential;
