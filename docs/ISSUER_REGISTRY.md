# Issuer Registry System

## Overview

The Issuer Registry is an on-chain smart contract system built on Algorand that manages authorized credential issuers with temporal revocation support. This ensures that only authorized entities can issue credentials and provides mechanisms to revoke authorization with temporal validity guarantees.

## Key Features

1. **Authorized Issuer Management** - Add/remove issuers from the registry
2. **Temporal Revocation** - Revoke issuers with timestamp tracking
3. **Credential-Level Revocation** - Revoke specific credentials individually
4. **Nuclear Option** - Invalidate all credentials from a issuer (past and future)
5. **On-Chain Verification** - Anyone can verify issuer status independently
6. **Audit Trail** - All operations recorded on-chain with timestamps

## Architecture

### Smart Contract (`app/contracts/issuer-registry.py`)

The PyTeal smart contract stores:

**Global State:**
- `admin`: Address of contract administrator
- `verifier_count`: Total number of issuers ever added

**Box Storage (per verifier):**
- Key: `verifier_address` (32 bytes)
- Value: `[authorized_at (8 bytes), revoked_at (8 bytes), revoke_all_prior (8 bytes)]`

**Box Storage (per credential):**
- Key: `"cred:" + credential_id`
- Value: `[revoked_at (8 bytes), issuer_address (32 bytes)]`

### Smart Contract Operations

1. **add_verifier** - Add a new authorized verifier
2. **revoke_verifier** - Revoke a verifier's authorization
3. **reinstate_verifier** - Reinstate a previously revoked verifier
4. **revoke_credential** - Revoke a specific credential
5. **query_verifier** - Check issuer status (read-only)
6. **query_credential** - Check credential revocation status (read-only)

## Deployment

### Prerequisites

1. Install PyTeal:
```bash
pip install pyteal
```

2. Set up admin account with ALGO for contract deployment:
```bash
# Generate admin mnemonic or use existing
export ADMIN_MNEMONIC="your 25-word mnemonic here"
```

### Deploy Contract

```bash
# Compile the contract
python app/contracts/issuer-registry.py > issuer-registry.teal

# Deploy to Algorand (using goal or algokit)
# Example with goal:
goal app create \
  --creator $ADMIN_ADDRESS \
  --approval-prog issuer-registry.teal \
  --clear-prog clear-program.teal \
  --global-byteslices 1 \
  --global-ints 1 \
  --local-byteslices 0 \
  --local-ints 0

# Note the app ID returned
export ISSUER_REGISTRY_APP_ID=<app-id>
```

### Environment Configuration

Add to `.env`:
```bash
ADMIN_MNEMONIC="your 25-word mnemonic here"
ISSUER_REGISTRY_APP_ID=<app-id>
```

## API Endpoints

### Add Verifier
**POST** `/api/issuer-registry/add`

```typescript
// Request
{
  issuerAddress: string  // Algorand address
}

// Response
{
  success: true,
  issuerAddress: string,
  txId: string,
  message: string
}
```

### Revoke Verifier
**POST** `/api/issuer-registry/revoke`

```typescript
// Request
{
  issuerAddress: string,
  revokeAllPrior: boolean  // If true, all their credentials are invalid
}

// Response
{
  success: true,
  issuerAddress: string,
  revokeAllPrior: boolean,
  txId: string,
  message: string
}
```

### Reinstate Verifier
**POST** `/api/issuer-registry/reinstate`

```typescript
// Request
{
  issuerAddress: string
}

// Response
{
  success: true,
  issuerAddress: string,
  txId: string,
  message: string
}
```

### Query Issuer Status
**GET** `/api/issuer-registry/status/:address`

```typescript
// Response
{
  success: true,
  verifier: {
    address: string,
    authorizedAt: number,      // Unix timestamp
    revokedAt: number | null,  // Unix timestamp or null
    revokeAllPrior: boolean,
    isActive: boolean
  }
}
```

### Revoke Specific Credential
**POST** `/api/issuer-registry/revoke-credential`

```typescript
// Request
{
  credentialId: string,
  issuerAddress: string
}

// Response
{
  success: true,
  credentialId: string,
  issuerAddress: string,
  txId: string,
  message: string
}
```

### Verify Credential Validity
**POST** `/api/issuer-registry/verify-credential`

```typescript
// Request
{
  credentialId: string,
  issuerAddress: string,
  issuanceDate: string  // ISO 8601 format
}

// Response
{
  success: true,
  valid: boolean,
  reason?: string,  // Present if invalid
  credentialId: string,
  issuerAddress: string,
  issuanceDate: string
}
```

## Verification Logic

A credential is considered **valid** if ALL of the following are true:

1. ✅ Issuer exists in issuer registry
2. ✅ Credential was issued AFTER issuer was authorized
3. ✅ Credential was issued BEFORE issuer was revoked (if revoked)
4. ✅ Issuer does NOT have `revokeAllPrior` flag set
5. ✅ Credential has NOT been individually revoked

### Example Verification Flow

```typescript
import { verifyCredentialValidity } from '~/utils/issuer-registry';

// Verify a credential
const result = await verifyCredentialValidity(
  "urn:uuid:8b330349-f027-46e3-ae16-8a032903ce9b",  // credentialId
  "ISSUER_ALGORAND_ADDRESS",                         // issuerAddress
  new Date("2025-09-30T17:00:00Z")                   // issuanceDate
);

if (result.valid) {
  console.log("✓ Credential is valid");
} else {
  console.log("✗ Credential is invalid:", result.reason);
}
```

## Temporal Revocation Examples

### Scenario 1: Future Credentials Only
```typescript
// Issuer authorized: 2025-01-01
// Credential issued:   2025-06-01
// Issuer revoked:    2025-10-01 (revokeAllPrior = false)

// Result: Credential is VALID
// Reason: Issued before revocation
```

### Scenario 2: All Credentials Invalid
```typescript
// Issuer authorized: 2025-01-01
// Credential issued:   2025-06-01
// Issuer revoked:    2025-10-01 (revokeAllPrior = true)

// Result: Credential is INVALID
// Reason: "All credentials from this issuer have been revoked"
```

### Scenario 3: Issued After Revocation
```typescript
// Issuer authorized: 2025-01-01
// Issuer revoked:    2025-06-01
// Credential issued:   2025-10-01

// Result: Credential is INVALID
// Reason: "Credential issued after issuer was revoked"
```

### Scenario 4: Individual Credential Revoked
```typescript
// Issuer authorized: 2025-01-01
// Credential issued:   2025-06-01
// Credential revoked:  2025-10-01
// Issuer still active

// Result: Credential is INVALID
// Reason: "Credential revoked on 2025-10-01T00:00:00Z"
```

## Integration with W3C Credentials

Credentials include a `credentialStatus` field:

```typescript
{
  "@context": [...],
  "id": "urn:uuid:...",
  "type": ["VerifiableCredential", "BirthDateCredential"],
  "issuer": {
    "id": "did:algo:ISSUER_ADDRESS"
  },
  "issuanceDate": "2025-09-30T17:00:00Z",
  "credentialSubject": {...},
  "credentialStatus": {
    "id": "did:algo:app:REGISTRY_APP_ID",
    "type": "AlgorandIssuerRegistry2025"
  },
  "proof": {...}
}
```

The `credentialStatus.id` references the issuer registry app, allowing anyone to verify the credential's validity on-chain.

## Security Considerations

### Admin Key Security
- The admin mnemonic controls the entire registry
- Store securely in environment variables (never commit to git)
- Consider using a hardware wallet or multi-sig for production
- Rotate keys periodically

### Box Storage Costs
- Each issuer costs ~0.1 ALGO in box storage
- Each revoked credential costs ~0.1 ALGO in box storage
- Admin account must maintain sufficient balance

### Gas Costs
- Adding verifier: ~0.002 ALGO
- Revoking verifier: ~0.002 ALGO
- Revoking credential: ~0.002 ALGO
- Querying (read): FREE (box read operation)

## Testing

### Local Testing

```bash
# Start Algorand LocalNet
npm run docker:localnet

# Deploy test contract
python app/contracts/issuer-registry.py > issuer-registry.teal
# Deploy using goal...

# Test API endpoints
curl -X POST http://localhost:5173/api/issuer-registry/add \
  -d "issuerAddress=ADDRESS_HERE"

curl http://localhost:5173/api/issuer-registry/status/ADDRESS_HERE
```

### Testnet Testing

```bash
# Set to testnet
export VITE_ALGORAND_NETWORK=testnet

# Fund admin account from faucet
# https://testnet.algoexplorer.io/dispenser

# Deploy and test
```

## Monitoring

### View Issuer Registry State

```bash
# List all boxes (issuers and revoked credentials)
goal app box list --app-id $ISSUER_REGISTRY_APP_ID

# Read specific issuer status
goal app box info --app-id $ISSUER_REGISTRY_APP_ID --name <address-bytes>
```

### Transaction History

All registry operations create on-chain transactions viewable at:
- Testnet: `https://testnet.explorer.perawallet.app/application/{app-id}`
- Mainnet: `https://explorer.perawallet.app/application/{app-id}`

## Future Enhancements

1. **Multi-Admin Support** - Multiple admins with role-based permissions
2. **Issuer Metadata** - Store issuer names, URLs, descriptions
3. **Delegation** - Allow issuers to delegate to sub-issuers
4. **Expiration** - Auto-expire issuer authorizations after time period
5. **Events/Webhooks** - Notify when issuers are added/revoked
6. **Gas Optimization** - Batch operations to reduce costs

## Troubleshooting

### "Box not found" Error
- Issuer not added to registry yet
- Use `/api/issuer-registry/add` to add verifier

### "Admin credentials not configured"
- Set `ADMIN_MNEMONIC` in `.env`
- Ensure mnemonic is valid 25-word phrase

### "Insufficient balance" Error
- Admin account needs ALGO for transactions and box storage
- Fund from faucet (testnet) or transfer ALGO (mainnet)

### Transaction Failed
- Check admin account has enough ALGO
- Verify issuer address format is valid
- Check contract app ID is correct

## References

- [Algorand Box Storage](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/apps/state/#box-storage)
- [PyTeal Documentation](https://pyteal.readthedocs.io/)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [Algorand DID Method](https://github.com/algorandfoundation/did-algo)
