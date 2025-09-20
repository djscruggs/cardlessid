const MinimalCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2",
  ],
  id: "urn:uuid:8b330349-f027-46e3-ae16-8a032903ce9b",
  type: ["VerifiableCredential", "BirthDateCredential"],
  issuer: {
    id: "did:example:123456789abcdefghi",
  },
  issuanceDate: "2025-09-19T17:00:00Z",
  credentialSubject: {
    id: "did:example:fedcba987654321",
    birthDate: "1990-01-01",
  },
  proof: {
    // This is the cryptographic signature
  },
};

export default MinimalCredential;
