# Issuer Vouching System

## Overview

The Issuer Registry implements a **vouching system** where new issuers cannot be added without permission from an existing active verifier. This prevents anyone from arbitrarily adding themselves to the registry and issuing fake credentials.

## How Vouching Works

### Bootstrap

When the smart contract is first deployed:
1. The **admin** (contract creator) is automatically added as the first verifier
2. Admin's `vouched_by` field is set to their own address (self-vouching for bootstrap)
3. From this point forward, the admin can vouch for other issuers

### Adding New Issuers

To add a new verifier, you need either:
- **Admin credentials** (ADMIN_MNEMONIC environment variable)
- **OR** An active verifier's private key who will vouch for the new verifier

#### Example: Admin Vouching

```typescript
// Admin adds a new verifier
const adminAccount = algosdk.mnemonicToSecretKey(process.env.ADMIN_MNEMONIC);
const txId = await addVerifier(adminAccount.sk, "NEW_VERIFIER_ADDRESS");

// On-chain result:
// NEW_VERIFIER_ADDRESS -> {
//   authorized_at: <current timestamp>,
//   revoked_at: null,
//   revoke_all_prior: false,
//   vouched_by: ADMIN_ADDRESS
// }
```

#### Example: Issuer Vouching for Another Verifier

```typescript
// An active issuer vouches for a new verifier
const verifierAccount = algosdk.mnemonicToSecretKey("verifier's 25-word mnemonic");
const txId = await addVerifier(verifierAccount.sk, "NEW_VERIFIER_ADDRESS");

// On-chain result:
// NEW_VERIFIER_ADDRESS -> {
//   authorized_at: <current timestamp>,
//   revoked_at: null,
//   revoke_all_prior: false,
//   vouched_by: VERIFIER_ADDRESS
// }
```

## Smart Contract Validation

When `add_verifier` is called, the contract checks:

```python
# Must be either admin OR an active verifier
Assert(
    Or(
        is_admin,  # Sender is the contract admin
        is_active_verifier(Txn.sender())  # Sender is active verifier
    )
)
```

An "active verifier" is defined as:
- Exists in the registry (has a box entry)
- **AND** is not revoked (`revoked_at == 0`)

### Vouch Chain Example

```
Admin (self-vouched)
  ├─ vouches for → Issuer A
  │   ├─ vouches for → Issuer B
  │   └─ vouches for → Issuer C
  └─ vouches for → Issuer D
      └─ vouches for → Issuer E
```

Each issuer can vouch for others, creating a trust network rooted at the admin.

## API Usage

### Admin Vouching (Server-Side Only)

```bash
curl -X POST https://your-domain.com/api/issuer-registry/add \
  -d "issuerAddress=ALGORAND_ADDRESS_HERE"

# Uses ADMIN_MNEMONIC from environment variable
```

Response:
```json
{
  "success": true,
  "issuerAddress": "ALGORAND_ADDRESS_HERE",
  "vouchedBy": "ADMIN_ADDRESS",
  "voucherSource": "admin",
  "txId": "TRANSACTION_ID",
  "message": "Issuer ALGORAND_ADDRESS_HERE added successfully (vouched by admin)"
}
```

### Issuer Vouching for Another

```bash
curl -X POST https://your-domain.com/api/issuer-registry/add \
  -d "issuerAddress=NEW_VERIFIER_ADDRESS" \
  -d "voucherMnemonic=your 25-word mnemonic here"

# Issuer provides their own mnemonic to vouch
```

Response:
```json
{
  "success": true,
  "issuerAddress": "NEW_VERIFIER_ADDRESS",
  "vouchedBy": "VOUCHER_ADDRESS",
  "voucherSource": "vouching verifier",
  "txId": "TRANSACTION_ID",
  "message": "Issuer NEW_VERIFIER_ADDRESS added successfully (vouched by vouching verifier)"
}
```

## Security Implications

### Preventing Sybil Attacks

Without vouching, anyone could:
1. Call `add_verifier` with their own address
2. Start issuing credentials that appear legitimate
3. Create a sybil attack with fake issuers

With vouching:
1. Only existing trusted issuers can add new ones
2. Creates accountability (you can see who vouched for whom)
3. If a issuer vouches for a bad actor, their reputation is on the line

### Accountability Chain

Every issuer has a `vouched_by` field stored on-chain:

```typescript
const verifierStatus = await getVerifierStatus("SOME_ADDRESS");
console.log(verifierStatus.vouchedBy);  // Who vouched for them?

// Can trace back the chain:
const voucherStatus = await getVerifierStatus(verifierStatus.vouchedBy);
console.log(voucherStatus.vouchedBy);  // Who vouched for the voucher?

// Continue until you reach admin (who is self-vouched)
```

This creates a **trust chain** back to the admin.

### Revoking a Voucher's Impact

**Question:** If Issuer A vouched for Issuer B, and Issuer A gets revoked, does that affect Issuer B?

**Answer:** No, Issuer B remains active unless explicitly revoked.

However, you could implement additional logic:
- If a issuer is revoked with `revoke_all_prior = true`, consider checking their "vouched" lineage
- Could add a "cascade revoke" feature where revoking a issuer also revokes everyone they vouched for

Currently, the system prioritizes **stability** - revoking one issuer doesn't cascade to others.

## Trust Models

### Model 1: Centralized (Admin-Only Vouching)

**Setup:** Only admin vouches for issuers

**Pros:**
- Simple trust model
- Admin has full control
- Easy to audit

**Cons:**
- Single point of bottleneck
- Admin must vet everyone
- Doesn't scale well

**Use case:** Small, controlled environments

### Model 2: Distributed (Web of Trust)

**Setup:** Any active issuer can vouch for others

**Pros:**
- Scales better
- Distributed trust
- Network effect

**Cons:**
- Harder to audit
- Need to trust vouchers' judgment
- Potential for bad vouching decisions

**Use case:** Larger networks with established trust relationships

### Model 3: Hybrid (Tiered Vouching)

**Setup:** Admin vouches for "Level 1" issuers, who can vouch for "Level 2", etc.

**Implementation:** Could add `vouching_tier` field to track levels

**Pros:**
- Balanced trust/scale
- Clear hierarchy
- Limits blast radius of bad actors

**Cons:**
- More complex
- Requires tier tracking

**Use case:** Organizations with hierarchical trust structures

## Best Practices

### For Admins

1. **Carefully vet initial issuers** - They will be able to vouch for others
2. **Monitor vouching activity** - Track who is vouching for whom
3. **Establish vouching policies** - Document requirements for vouching
4. **Regular audits** - Review the issuer trust chain periodically

### For Issuers

1. **Only vouch for entities you trust** - Your reputation is on the line
2. **Verify identity before vouching** - Ensure the new issuer is legitimate
3. **Document your vouching decisions** - Keep records off-chain for accountability
4. **Secure your mnemonic** - Anyone with your key can vouch in your name

## Querying Vouch Relationships

### Get Who Vouched for a Verifier

```typescript
const issuer = await getVerifierStatus("VERIFIER_ADDRESS");
console.log(`Vouched by: ${verifier.vouchedBy}`);
```

### Find All Issuers Vouched by Someone

This requires scanning all issuers (not built into current implementation):

```typescript
// Pseudocode - would need to implement
async function getVouchedBy(voucherAddress: string) {
  const allIssuers = await getAllIssuers(); // Would need to add this
  return allIssuers.filter(v => v.vouchedBy === voucherAddress);
}
```

### Trace Trust Chain to Root

```typescript
async function getTrustChain(issuerAddress: string): Promise<string[]> {
  const chain: string[] = [];
  let current = issuerAddress;

  while (true) {
    const status = await getVerifierStatus(current);
    if (!status) break;

    chain.push(current);

    // Stop if self-vouched (the root/admin)
    if (status.vouchedBy === current) break;

    current = status.vouchedBy;
  }

  return chain;
}

// Usage
const chain = await getTrustChain("VERIFIER_ADDRESS");
// Returns: ["VERIFIER_ADDRESS", "VOUCHER_ADDRESS", "ADMIN_ADDRESS"]
```

## Future Enhancements

### 1. Vouching Limits

Limit how many issuers each issuer can vouch for:

```python
vouch_count: Map<address, int>

def add_verifier():
    current_count = vouch_count.get(Txn.sender(), 0)
    Assert(current_count < MAX_VOUCHES_PER_VERIFIER)
    vouch_count[Txn.sender()] = current_count + 1
```

### 2. Vouching Expiration

Require periodic re-vouching:

```python
vouched_at: timestamp
vouch_expiry: timestamp

def is_active_verifier(address):
    return exists(address) AND
           revoked_at == 0 AND
           vouch_expiry > Global.latest_timestamp()
```

### 3. Multi-Vouch Requirement

Require multiple vouchers:

```python
vouchers: List<address>  # Requires N vouchers

def add_verifier():
    Assert(len(vouchers) >= MIN_VOUCHERS)
```

### 4. Reputation Scoring

Track vouching success:

```python
reputation: {
    vouches_made: int,
    vouches_revoked: int,  # How many they vouched for got revoked
    reputation_score: float
}
```

### 5. Cascade Revocation Option

When revoking a verifier, optionally revoke their "descendants":

```python
def revoke_verifier_cascade(verifier_address):
    # Revoke the verifier
    revoke_verifier(verifier_address)

    # Find all they vouched for
    descendants = find_vouched_by(verifier_address)

    # Revoke them too
    for descendant in descendants:
        revoke_verifier_cascade(descendant)
```

## Conclusion

The vouching system ensures that:
- **Only trusted entities can add issuers** - No arbitrary additions
- **Accountability is preserved** - Clear record of who vouched for whom
- **Trust chains are transparent** - Anyone can trace vouching relationships on-chain
- **Prevents sybil attacks** - Can't create fake issuers without existing trust

This creates a **web of trust** rooted at the admin, where reputation and accountability matter.
