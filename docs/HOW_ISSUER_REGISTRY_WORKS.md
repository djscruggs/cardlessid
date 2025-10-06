# How the Issuer Registry Works

## Overview

The Issuer Registry is an on-chain system that solves a critical problem: **How do you allow multiple parties to issue credentials while preventing anyone from spoofing verification?**

The solution uses an Algorand smart contract as a decentralized "allowlist" that tracks:
- Who is authorized to issue credentials
- When they were authorized
- When (if ever) they were revoked
- Whether specific credentials have been revoked

## The Problem

In a decentralized identity system, you want:

1. **Multiple issuers** - Not just one central authority
2. **Trustworthy credentials** - No spoofing or fake verifications
3. **Revocation capability** - Ability to remove bad actors
4. **Temporal validity** - Clear rules about when credentials are valid

Without an on-chain registry, anyone could claim to be an authorized issuer and issue fake credentials.

## The Solution: On-Chain Registry

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Algorand Blockchain                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Issuer Registry Smart Contract               │   │
│  │                                                        │   │
│  │  Global State:                                        │   │
│  │  • admin: <address>                                   │   │
│  │  • issuer_count: 5                                    │   │
│  │                                                        │   │
│  │  Box Storage (Issuers):                               │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ ISSUER_ADDR_1                                  │  │   │
│  │  │ ├─ authorized_at: 1704067200 (Jan 1, 2024)    │  │   │
│  │  │ ├─ revoked_at: null                            │  │   │
│  │  │ └─ revoke_all_prior: false                     │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ ISSUER_ADDR_2                                  │  │   │
│  │  │ ├─ authorized_at: 1706745600 (Feb 1, 2024)    │  │   │
│  │  │ ├─ revoked_at: 1709337600 (Mar 1, 2024)       │  │   │
│  │  │ └─ revoke_all_prior: false                     │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  Box Storage (Revoked Credentials):                   │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ cred:urn:uuid:abc123...                        │  │   │
│  │  │ ├─ revoked_at: 1711929600 (Apr 1, 2024)       │  │   │
│  │  │ └─ issuer_address: ISSUER_ADDR_1               │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### How It Works

#### 1. **Adding an Issuer**

When you want to authorize a new credential issuer:

```typescript
// Admin calls:
await addIssuer(adminPrivateKey, "ISSUER_ALGORAND_ADDRESS");

// This creates an on-chain transaction that stores:
// ISSUER_ADDRESS -> {
//   authorized_at: current_timestamp,
//   revoked_at: null,
//   revoke_all_prior: false
// }
```

**Result**: The issuer is now authorized. Anyone can query the blockchain to verify this.

#### 2. **Issuing a Credential**

When an authorized issuer issues a credential, they include:

```json
{
  "@context": [...],
  "id": "urn:uuid:12345...",
  "issuer": {
    "id": "did:algo:ISSUER_ADDRESS"
  },
  "issuanceDate": "2024-06-15T10:00:00Z",
  "credentialSubject": {...},
  "credentialStatus": {
    "id": "did:algo:app:REGISTRY_APP_ID",
    "type": "AlgorandIssuerRegistry2025"
  },
  "proof": {
    "proofValue": "signature..."
  }
}
```

The `credentialStatus` field points to the on-chain registry, allowing anyone to verify the issuer's authorization.

#### 3. **Verifying a Credential**

When someone wants to verify a credential is legitimate:

```typescript
const result = await verifyCredentialValidity(
  credential.id,
  credential.issuer.id,
  new Date(credential.issuanceDate)
);

// The system checks:
// 1. Does the issuer exist in the registry?
// 2. Was the issuer authorized at the time of issuance?
// 3. Was the issuer NOT revoked at the time of issuance?
// 4. Is the issuer's revoke_all_prior flag false?
// 5. Has this specific credential NOT been revoked?
```

**All checks happen on-chain** - no need to trust the verifier's word.

#### 4. **Revoking a Verifier**

If a issuer becomes compromised or malicious:

```typescript
// Option A: Revoke future credentials only
await revokeIssuer(adminPrivateKey, "BAD_ISSUER_ADDRESS", false);

// Option B: Invalidate ALL credentials (nuclear option)
await revokeIssuer(adminPrivateKey, "BAD_ISSUER_ADDRESS", true);
```

This updates the on-chain record with a revocation timestamp.

## Temporal Validity Examples

### Example 1: Normal Operation

```
Timeline:
  Jan 1, 2024  → Issuer authorized
  Jun 15, 2024 → Credential issued
  Current      → Verifying credential

Checks:
  ✅ Issuer in registry? Yes
  ✅ Issued after authorization? Yes (Jun > Jan)
  ✅ Issuer not revoked? Yes (no revocation)
  ✅ revoke_all_prior = false? Yes
  ✅ Credential not revoked? Yes

Result: VALID ✓
```

### Example 2: Issuer Revoked (Future Only)

```
Timeline:
  Jan 1, 2024  → Issuer authorized
  Jun 15, 2024 → Credential issued
  Oct 1, 2024  → Issuer revoked (revoke_all_prior = false)
  Current      → Verifying credential

Checks:
  ✅ Issuer in registry? Yes
  ✅ Issued after authorization? Yes (Jun > Jan)
  ✅ Issued before revocation? Yes (Jun < Oct)
  ✅ revoke_all_prior = false? Yes
  ✅ Credential not revoked? Yes

Result: VALID ✓

Note: Credentials issued AFTER Oct 1 would be INVALID
```

### Example 3: Nuclear Option (All Credentials Invalid)

```
Timeline:
  Jan 1, 2024  → Issuer authorized
  Jun 15, 2024 → Credential issued
  Oct 1, 2024  → Issuer revoked (revoke_all_prior = true)
  Current      → Verifying credential

Checks:
  ✅ Issuer in registry? Yes
  ✅ Issued after authorization? Yes
  ✅ Issued before revocation? Yes
  ❌ revoke_all_prior = false? NO - flag is true!

Result: INVALID ✗
Reason: "All credentials from this issuer have been revoked"

Note: ALL credentials from this issuer are now invalid,
      regardless of when they were issued
```

### Example 4: Individual Credential Revoked

```
Timeline:
  Jan 1, 2024  → Issuer authorized
  Jun 15, 2024 → Credential issued
  Aug 1, 2024  → This specific credential revoked
  Current      → Verifying credential

Checks:
  ✅ Issuer in registry? Yes
  ✅ Issued after authorization? Yes
  ✅ Issuer not revoked? Yes
  ✅ revoke_all_prior = false? Yes
  ❌ Credential not revoked? NO - revoked Aug 1!

Result: INVALID ✗
Reason: "Credential revoked on 2024-08-01T00:00:00Z"

Note: Only THIS credential is invalid.
      Other credentials from the same issuer are still valid.
```

### Example 5: Issued After Revocation

```
Timeline:
  Jan 1, 2024  → Issuer authorized
  Jun 1, 2024  → Issuer revoked
  Oct 15, 2024 → Credential issued (suspicious!)
  Current      → Verifying credential

Checks:
  ✅ Issuer in registry? Yes
  ✅ Issued after authorization? Yes
  ❌ Issued before revocation? NO - Oct > Jun!

Result: INVALID ✗
Reason: "Credential issued after issuer was revoked"

Note: This catches credentials forged after revocation
```

## Data Flow Diagram

```
┌─────────────┐
│   Admin     │
└──────┬──────┘
       │
       │ 1. Add Verifier
       │    (admin private key)
       ↓
┌─────────────────────────────────┐
│  Algorand Smart Contract        │
│  issuer-registry.teal         │
│                                 │
│  Stores:                        │
│  • Issuer authorization       │
│  • Revocation timestamps        │
│  • Individual cred revocations  │
└────────┬────────────────────────┘
         │
         │ 2. Query authorized?
         │    (anyone can read)
         ↓
┌─────────────────────┐      ┌──────────────────┐
│  Authorized         │      │   Credential     │
│  Issuer           │◄─────┤   Holder's       │
│                     │ 3.   │   Wallet         │
│  Issues credential  │ Req  │                  │
│  with proof         │ ID   │                  │
└──────────┬──────────┘      └──────────────────┘
           │
           │ 4. Issues signed credential
           │    (includes credentialStatus field)
           ↓
┌──────────────────────┐
│  User receives       │
│  credential in       │
│  their wallet        │
└──────────┬───────────┘
           │
           │ 5. Presents credential
           ↓
┌──────────────────────┐
│  Relying Party       │
│  (Verifier)          │
│                      │
│  Checks:             │
│  • Signature valid?  │
│  • Issuer authorized?│◄───┐
│  • Not revoked?      │    │
└──────────────────────┘    │
           │                │
           │ 6. Query       │
           │    on-chain    │
           └────────────────┘
```

## Security Model

### Trust Assumptions

1. **Trust the smart contract** - The contract code is public and auditable
2. **Trust the admin** - Admin can add/revoke issuers (mitigate with multi-sig)
3. **Trust Algorand blockchain** - Standard blockchain trust model
4. **Don't trust issuers blindly** - Always check the registry!

### Attack Scenarios

#### Attack: Fake Issuer Issues Credentials

```
❌ Attacker creates fake credentials
✓ Issuer checks on-chain registry
✓ Attacker's address not in registry
✓ Credential rejected
```

**Defense**: All verifications check the on-chain registry.

#### Attack: Compromised Verifier

```
✓ Admin detects compromise
✓ Admin revokes issuer (nuclear option)
✓ All credentials from that issuer become invalid
✓ System protected
```

**Defense**: Admin can instantly invalidate all credentials from compromised verifier.

#### Attack: Replay Old Credential After Revocation

```
❌ Attacker tries to use credential issued before revocation
✓ Verification checks revocation status
✓ If revoke_all_prior = true, credential invalid
✓ Attack fails
```

**Defense**: Temporal checks and revoke_all_prior flag.

#### Attack: Forge Credential from Authorized Verifier

```
❌ Attacker forges credential, claims it's from legit verifier
✓ Credential includes cryptographic signature
✓ Signature verification fails (attacker doesn't have private key)
✓ Attack fails
```

**Defense**: Ed25519 signature on credential proof.

## Integration Points

### For Credential Issuers

1. Get authorized by admin
2. When issuing credentials, include `credentialStatus` field
3. Sign credential with your private key
4. Monitor for revocation notifications

### For Credential Issuers

1. Parse credential
2. Extract issuer address and issuance date
3. Call `verifyCredentialValidity()` with on-chain check
4. Verify cryptographic signature
5. Accept/reject based on results

### For Wallet Apps

1. Store credentials with `credentialStatus` metadata
2. Periodically check if credential still valid
3. Warn user if credential revoked
4. Display issuer authorization status

## Performance & Costs

### On-Chain Storage

- **Per issuer**: ~0.1 ALGO (one-time box storage cost)
- **Per revoked credential**: ~0.1 ALGO (one-time box storage cost)

### Transaction Costs

- **Add issuer**: ~0.002 ALGO
- **Revoke issuer**: ~0.002 ALGO
- **Revoke credential**: ~0.002 ALGO
- **Query status**: FREE (read-only box access)

### Read Performance

- **Query issuer status**: < 100ms (single box read)
- **Verify credential**: < 200ms (2 box reads: issuer + credential)

## Why Algorand?

1. **Fast finality** - 4 second blocks, instant confirmation
2. **Low cost** - Transactions cost ~0.001-0.002 ALGO
3. **Box storage** - Perfect for key-value registry data
4. **Pure proof-of-stake** - Energy efficient, decentralized
5. **Smart contracts** - PyTeal for verifiable logic

## Alternative Approaches Considered

### ❌ Centralized Database
- **Pro**: Fast, cheap
- **Con**: Single point of failure, requires trust
- **Verdict**: Defeats purpose of decentralization

### ❌ Multi-Signature Credentials
- **Pro**: Simple, no smart contract
- **Con**: Hard to revoke, no temporal tracking, requires all signers online
- **Verdict**: Not flexible enough

### ❌ Asset-Based Authorization (NFTs)
- **Pro**: Leverages existing ASA infrastructure
- **Con**: No temporal data, revocation awkward, min balance requirements
- **Verdict**: Less elegant than smart contract

### ✅ Smart Contract Registry (Chosen)
- **Pro**: Flexible, auditable, temporal tracking, low cost
- **Con**: Requires contract deployment and admin key management
- **Verdict**: Best balance of security and flexibility

## Future Enhancements

### 1. Multi-Admin with Roles
```
roles:
  - super_admin: Can add/remove admins
  - verifier_admin: Can add/revoke issuers
  - credential_admin: Can revoke individual credentials
```

### 2. Issuer Metadata
```
verifier:
  address: "ABC..."
  name: "Trusted ID Provider Inc."
  website: "https://example.com"
  verifierType: "government_id | biometric | email"
  certifications: ["ISO27001", "SOC2"]
```

### 3. Automatic Expiration
```
verifier:
  authorized_at: timestamp
  expires_at: timestamp
  auto_revoke: true
```

### 4. Delegation Trees
```
root_verifier:
  can_delegate: true
  delegates:
    - sub_verifier_1
    - sub_verifier_2
```

### 5. Privacy-Preserving Queries
Use zero-knowledge proofs to verify credentials without revealing issuer identity.

## Conclusion

The Issuer Registry solves the decentralized identity bootstrapping problem:

- **Anyone can verify** issuer authorization independently
- **Temporal validity** provides clear rules for credential lifetime
- **Flexible revocation** handles both bad actors and compromised keys
- **On-chain audit trail** creates transparency and accountability

It's a foundational piece that enables trustless, decentralized identity credentials while maintaining the ability to revoke authorization when needed.
