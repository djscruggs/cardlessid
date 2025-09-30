/**
 * Example W3C Verifiable Credential for Cardless ID
 *
 * This credential structure is used for age verification without exposing PII.
 * All personal information is hashed using SHA-256 for privacy.
 *
 * The composite hash (firstName|middleName|lastName|birthDate) is used to
 * prevent duplicate credentials from being issued.
 */
const CardlessCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2",
    {
      "cardless": "https://cardlessid.org/credentials/v1#"
    }
  ],
  id: "urn:uuid:8b330349-f027-46e3-ae16-8a032903ce9b",
  type: ["VerifiableCredential", "BirthDateCredential"],
  issuer: {
    id: "did:algorand:EXAMPLE_WALLET_ADDRESS_HERE",
  },
  issuanceDate: "2025-09-30T17:00:00Z",
  credentialSubject: {
    id: "did:algorand:USER_WALLET_ADDRESS_HERE",
    // All personal data is hashed for privacy
    "cardless:governmentIdHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "cardless:firstNameHash": "96d9632f363564cc3032521409cf22a852f2032eec099ed5967c0d000cec607a",
    "cardless:middleNameHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "cardless:lastNameHash": "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f",
    "cardless:birthDateHash": "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5",
    "cardless:compositeHash": "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
    "cardless:idType": "drivers_license",
    "cardless:state": "CA",
  },
  proof: {
    type: "Ed25519Signature2020",
    created: "2025-09-30T17:00:00Z",
    verificationMethod: "did:algorand:EXAMPLE_WALLET_ADDRESS_HERE#key-1",
    proofPurpose: "assertionMethod",
    proofValue: "placeholder-signature-value"
  },
};

export default CardlessCredential;
