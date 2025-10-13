# Decentralized vs Centralized Identity: Research & Comparison

## Executive Summary

This document compares Cardless ID's approach with canonical decentralized identity (DID) systems like walt.id and centralized identity approaches like OAuth/OIDC. **Key finding:** Cardless ID is philosophically aligned with W3C DID standards and is actually more privacy-preserving than many DID implementations, while the custom `did:algo` method is well-suited for blockchain-based identity.

---

## 1. Decentralized Identity (DID) Approach

### Walt.id - Canonical Implementation

**Architecture:**

- **Trust Triangle Model**: Issuer → Holder → Verifier
- **Abstraction Layer**: Hides technical complexity while ensuring standards compliance
- **Multiple Standards Support**: W3C VCs, ISO/IEC 18013-5/-7 (mdoc), OpenID4VC

**Key Components:**

- Cryptographic keys for control/encryption/authentication
- DIDs establishing public key infrastructure
- Privacy-preserving technologies (Selective Disclosure, Zero-Knowledge Proofs)
- Standards-compliant ID wallets
- Trust registries and verifiable data registries

**Standards Followed:**

- W3C Verifiable Credentials Data Model v2.0
- W3C Decentralized Identifiers (DIDs) v1.0
- ISO/IEC standards for mobile credentials
- IETF standards for selective disclosure
- Evolving OpenID Connect for credential exchange

### W3C Verifiable Credentials Standard

**Required Components:**

1. **@context**: Must include `"https://www.w3.org/ns/credentials/v2"` as first URL
2. **type**: Must include `"VerifiableCredential"` plus specific credential type
3. **issuer**: The entity creating the credential
4. **credentialSubject**: Claims about the subject
5. **Cryptographic proof**: At least one proof method required

**Optional but Common:**

- `id`: Unique identifier
- `validFrom` and `validUntil`: Validity period
- `credentialStatus`: For revocation checking
- `credentialSchema`: Schema definition
- `evidence`: Supporting evidence for claims

---

## 2. Cardless ID Implementation Analysis

### Current W3C Compliance ✅

**Strengths:**

- ✅ Proper W3C VC Data Model v2.0 structure
- ✅ All required fields present: `@context`, `type`, `issuer`, `credentialSubject`
- ✅ Cryptographic proof (Ed25519Signature2020)
- ✅ Proper DID format: `did:algo:WALLET_ADDRESS`
- ✅ **Superior privacy**: Only stores composite hash, not actual birth date

### Differences from Standard Implementations ⚠️

1. **Custom DID Method**: Uses `did:algo` (non-standard but appropriate for Algorand blockchain)
2. **Limited Credential Data**: Only composite hash stored (privacy feature, not limitation)
3. **Single-Purpose**: Focused on age verification vs. general-purpose credentials
4. **Simplified Trust Model**: No separate trust registry beyond Algorand blockchain

### Example: Cardless ID Credential

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2",
    "https://cardlessid.org/credentials/v1"
  ],
  "type": ["VerifiableCredential", "BirthDateCredential"],
  "issuer": {
    "id": "did:algo:ISSUER_WALLET_ADDRESS_HERE"
  },
  "credentialSubject": {
    "id": "did:algo:USER_WALLET_ADDRESS_HERE",
    "cardlessid:compositeHash": "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2025-09-30T17:00:00Z",
    "verificationMethod": "did:algo:ISSUER_WALLET_ADDRESS_HERE#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3eF7d8...base64EncodedSignature"
  }
}
```

**Privacy Advantage:** Unlike typical implementations that store actual birth dates, Cardless ID stores only a hash, achieving true zero-knowledge proof.

---

## 3. Centralized Identity Approach

### OAuth/OIDC (Standard Centralized)

**Architecture:**

- Central identity provider (IdP) stores all user data
- Authentication via JWT tokens (ID tokens)
- Single Sign-On (SSO) across multiple applications
- Examples: Auth0, Okta, Microsoft Entra ID, Google Sign-In

**How It Works:**

1. User authenticates with central IdP
2. IdP issues ID token (JWT) with user claims
3. Applications trust the IdP and accept tokens
4. User data lives in centralized database

**Privacy Model:**

- ❌ IdP knows all authentication events
- ❌ Full PII stored centrally (lucrative target for attacks)
- ❌ Trust placed in single authority
- ❌ Users have no control over their data

**Advantages:**

- ✅ Rapid deployment
- ✅ Universal interoperability (OIDC widely adopted)
- ✅ Mature tooling and SDKs
- ✅ Works with existing enterprise infrastructure

---

## 4. Comparison Matrix

| Feature                   | Cardless ID                   | Walt.id (DID)                    | OAuth/OIDC (Centralized)   |
| ------------------------- | ----------------------------- | -------------------------------- | -------------------------- |
| **User Control**          | ✅ High (self-sovereign)      | ✅ High (self-sovereign)         | ❌ Low (IdP controls)      |
| **Privacy**               | ✅ Excellent (hash only)      | ✅ Good (selective disclosure)   | ❌ Poor (full PII shared)  |
| **Data Storage**          | ✅ Blockchain + wallet        | ✅ User's wallet only            | ❌ Central database        |
| **Standards Compliance**  | ⚠️ Partial W3C VC             | ✅ Full W3C/ISO compliance       | ✅ IETF standards          |
| **Attack Surface**        | ✅ Distributed                | ✅ Distributed                   | ❌ Single point of failure |
| **Interoperability**      | ⚠️ Limited (custom DID)       | ✅ High (multiple protocols)     | ✅ High (OIDC universal)   |
| **Use Case**              | Age verification only         | General credentials              | General auth/authz         |
| **Zero-Knowledge**        | ✅ Yes (hash-based)           | ✅ Yes (ZKP support)             | ❌ No                      |
| **Sybil Resistance**      | ✅ Yes (composite hash)       | ⚠️ Depends on implementation     | ⚠️ Depends on IdP          |
| **Censorship Resistance** | ✅ High (blockchain)          | ⚠️ Medium (varies by DID method) | ❌ Low (IdP control)       |
| **Key Rotation**          | ⚠️ Difficult (tied to wallet) | ✅ Easy                          | ✅ Easy                    |
| **Infrastructure Cost**   | ✅ Low (blockchain fees only) | ⚠️ Medium (wallet infra)         | ⚠️ High (IdP hosting)      |

---

## 5. DID Methods Comparison

Understanding the differences between DID methods helps clarify why `did:algo` is appropriate for Cardless ID:

### `did:web` - Web-hosted

**Format:** `did:web:cardlessid.org:users:alice`

**Resolution:** Fetch DID Document from `https://cardlessid.org/users/alice/did.json`

**Pros:**

- Simple HTTP request (no blockchain needed)
- Works with existing web infrastructure
- Easy to update keys if compromised

**Cons:**

- ❌ Centralized (domain owner controls it)
- ❌ Requires web hosting
- ❌ Domain could go offline or be seized

**Note:** The DID Document only contains public keys, **NOT credentials**. Credentials remain in user's wallet.

### `did:algo` - Blockchain-derived (Cardless ID's approach)

**Format:** `did:algo:WALLET_ADDRESS`

**Resolution:** Public key is cryptographically derived from Algorand wallet address

**Pros:**

- ✅ No web hosting needed
- ✅ Truly decentralized (lives on blockchain)
- ✅ Immutable and censorship-resistant
- ✅ Aligned with blockchain-based architecture

**Cons:**

- ⚠️ Non-standard method (requires documentation of resolution process)
- ⚠️ Difficult to rotate keys (tied to wallet address)

### `did:key` - Self-contained

**Format:** `did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH`

**Resolution:** Public key is encoded directly in the DID itself

**Pros:**

- No hosting or blockchain needed
- Completely portable

**Cons:**

- Can't rotate keys (DID changes if key changes)
- Long, ugly identifiers

### Recommendation for Cardless ID

**Stick with `did:algo`** because:

1. ✅ Algorand wallet addresses already have discoverable public keys
2. ✅ You're not changing keys frequently
3. ✅ You want decentralization (web hosting contradicts that)
4. ✅ Simpler: "My public key IS my Algorand address"

**Action Item:** Document the `did:algo` resolution process so verifiers know how to derive public keys from Algorand addresses.

---

## 6. Age Verification Specific Analysis

### 2025 Industry Trends

**Emerging Technologies:**

- **Zero-Knowledge Proofs**: Proving age without revealing birth date
- **Blockchain-based verification**: Confirming age without exposing PII
- **Anonymous systems**: Using biometric age estimation
- **Privacy-preserving architectures**: Balance compliance with privacy

### Centralized Age Verification Challenges

- Vast amounts of data stored in one location creates lucrative attack targets
- Age verification mandates concentrate power in hands of largest companies
- Smaller sites cannot afford costly compliance systems
- Privacy concerns around PII collection and storage

### Cardless ID's Competitive Position

**✅ Ahead of the Curve:**

- Already using hash-based zero-knowledge approach
- Privacy-first design with no PII in credentials
- Blockchain-based for security and immutability
- Lightweight and accessible for smaller sites

**⚠️ Considerations:**

- Still requires trusted third-party verifier (identity verification provider TBD)
- Trust model needs documentation
- Consider implementing credential status/revocation mechanism

---

## 7. Recommendations for Cardless ID

### To Better Align with DID Standards

1. **DID Method Documentation**
   - Document `did:algo` resolution process
   - Consider submitting to W3C DID Method Registry
   - Provide reference implementation for verifiers

2. **Trust Infrastructure**
   - Add support for verifiable issuer registry
   - Implement credential status checking (revocation lists or status list 2021)
   - Document trust framework and governance

3. **Enhanced Capabilities** (Optional)
   - Support multiple age threshold claims in one credential
   - Implement OpenID4VP (Verifiable Presentations) for wider compatibility
   - Consider W3C Digital Credentials API support

4. **Interoperability**
   - Document integration patterns for verifiers
   - Provide SDK or libraries for common platforms
   - Consider fallback to more standard DID methods for issuers who prefer them

### Strengths to Maintain

✅ **Zero-knowledge approach** - Hash-based privacy is excellent
✅ **Single-purpose focus** - Reduces complexity and attack surface
✅ **Blockchain-anchored** - Provides immutability and decentralization
✅ **W3C structure compliance** - Ensures future compatibility
✅ **Sybil resistance** - Composite hash prevents duplicate credentials

---

## 8. Decision Framework: Which Approach to Use

### Choose Cardless ID When:

- ✅ Privacy is paramount
- ✅ Age verification is the primary use case
- ✅ Sybil resistance is required
- ✅ Blockchain-based architecture is acceptable
- ✅ Users control their own credentials
- ✅ Censorship resistance is important

### Choose Walt.id or Similar DID Platform When:

- Multiple credential types needed (education, employment, licenses, etc.)
- General-purpose verifiable credential infrastructure required
- Maximum interoperability across ecosystems needed
- Enterprise-grade features required (complex workflows, integrations)
- Need support for multiple DID methods and trust frameworks

### Choose OAuth/OIDC (Centralized) When:

- Full user profile data needed beyond age verification
- Rapid deployment is critical
- Users already have IdP accounts (Google, Microsoft, etc.)
- Privacy is less critical than convenience
- Traditional authentication/authorization patterns preferred
- Enterprise SSO integration required

---

## 9. Conclusion

**Cardless ID is well-positioned as a privacy-preserving, decentralized age verification solution.** The implementation:

1. ✅ **Follows W3C VC standards** where it matters (credential structure, cryptographic proofs)
2. ✅ **Exceeds typical privacy standards** by using hash-based zero-knowledge proofs
3. ✅ **Appropriately uses blockchain** for decentralization and immutability
4. ⚠️ **Has minor interoperability gaps** due to custom `did:algo` method (addressable with documentation)

The main opportunities for improvement are around **formal documentation** of the `did:algo` resolution process and **trust infrastructure** (issuer registries, credential status), but these are not blockers for the core use case.

For the specific problem of privacy-preserving age verification, Cardless ID's approach is **superior to both traditional centralized systems and many decentralized implementations** that still expose birth date data.

---

## References

- [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-1.0/)
- [walt.id Decentralized Identity Infrastructure](https://walt.id)
- [walt.id Documentation](https://docs.walt.id/community-stack/concepts/decentralized-identity)
- [OpenID Connect Specification](https://openid.net/developers/how-connect-works/)
- [Age Verification in 2025: Emerging Technologies](https://facia.ai/blog/age-verification-in-2025-emerging-technologies-and-key-trends/)
- [Centralized vs Decentralized Identity Systems](https://www.biometricupdate.com/202412/centralized-identity-systems-vs-decentralized-identity-systems)
