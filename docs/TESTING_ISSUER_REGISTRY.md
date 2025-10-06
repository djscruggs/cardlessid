# Testing the Issuer Registry System

This guide walks through testing the on-chain issuer registry from smart contract deployment to API usage.

## Prerequisites

### 1. Install PyTeal

```bash
pip install pyteal
```

### 2. Install Algorand Tools

Choose one:

**Option A: Algorand Sandbox (Recommended for local testing)**
```bash
git clone https://github.com/algorand/sandbox.git
cd sandbox
./sandbox up testnet
```

**Option B: Use Testnet directly**
- No local setup needed
- Uses public Algorand testnet nodes

### 3. Create Test Accounts

```bash
# Generate admin account
node -e "
const algosdk = require('algosdk');
const account = algosdk.generateAccount();
console.log('Address:', account.addr);
console.log('Mnemonic:', algosdk.secretKeyToMnemonic(account.sk));
"
```

Save the output:
- **Admin Address**: `ADMIN_ADDRESS_HERE`
- **Admin Mnemonic**: `word1 word2 ... word25`

### 4. Fund Test Accounts

**Testnet:**
Visit https://bank.testnet.algorand.network/
- Paste your admin address
- Click "Dispense" to get test ALGO

**LocalNet (Sandbox):**
```bash
# Accounts are pre-funded
./sandbox goal account list
```

## Step 1: Compile the Smart Contract

```bash
cd /Users/djscruggs/VSCode/cardlessid

# Compile issuer registry contract
python app/contracts/issuer-registry.py > issuer-registry.teal

# Verify compilation
cat issuer-registry.teal | head -20
```

You should see TEAL assembly code starting with `#pragma version 10`.

## Step 2: Deploy to Algorand

### Option A: Using `goal` (Algorand CLI)

First, create a minimal clear program:

```bash
cat > clear-program.teal << 'EOF'
#pragma version 10
int 1
EOF
```

Deploy the contract:

```bash
# Set your network (testnet or sandbox)
export ALGORAND_DATA="$HOME/.algorand-testnet"  # or sandbox data dir

# Deploy
goal app create \
  --creator ADMIN_ADDRESS_HERE \
  --approval-prog issuer-registry.teal \
  --clear-prog clear-program.teal \
  --global-byteslices 1 \
  --global-ints 1 \
  --local-byteslices 0 \
  --local-ints 0 \
  --extra-pages 3

# Note the "Created app with app index XXXXX"
export ISSUER_REGISTRY_APP_ID=XXXXX
```

### Option B: Using AlgoKit (Recommended)

```bash
# Install AlgoKit
brew install algorand/tap/algokit  # macOS
# or: pip install algokit

# Deploy
algokit deploy \
  --app issuer-registry.teal \
  --creator ADMIN_ADDRESS_HERE
```

### Option C: Using TypeScript

Create `scripts/deploy-issuer-registry.ts`:

```typescript
import algosdk from "algosdk";
import * as fs from "fs";

async function deploy() {
  // Connect to network
  const algodClient = new algosdk.Algodv2(
    "",
    "https://testnet-api.algonode.cloud",
    443
  );

  // Load admin account
  const adminMnemonic = process.env.ADMIN_MNEMONIC!;
  const adminAccount = algosdk.mnemonicToSecretKey(adminMnemonic);

  // Read compiled TEAL
  const approvalProgram = fs.readFileSync("issuer-registry.teal", "utf8");
  const clearProgram = "#pragma version 10\nint 1";

  // Compile programs
  const approvalCompiled = await algodClient.compile(approvalProgram).do();
  const clearCompiled = await algodClient.compile(clearProgram).do();

  // Get suggested params
  const params = await algodClient.getTransactionParams().do();

  // Create application
  const txn = algosdk.makeApplicationCreateTxnFromObject({
    from: adminAccount.addr,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: new Uint8Array(Buffer.from(approvalCompiled.result, "base64")),
    clearProgram: new Uint8Array(Buffer.from(clearCompiled.result, "base64")),
    numLocalInts: 0,
    numLocalByteSlices: 0,
    numGlobalInts: 1,
    numGlobalByteSlices: 1,
    extraPages: 3, // For box storage
  });

  // Sign and send
  const signedTxn = txn.signTxn(adminAccount.sk);
  const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

  // Wait for confirmation
  const result = await algosdk.waitForConfirmation(algodClient, txId, 4);
  const appId = result["application-index"];

  console.log("✓ Deployed Issuer Registry!");
  console.log("App ID:", appId);
  console.log("Transaction:", txId);
  console.log("\nAdd to .env:");
  console.log(`ISSUER_REGISTRY_APP_ID=${appId}`);
}

deploy().catch(console.error);
```

Run it:
```bash
export ADMIN_MNEMONIC="your 25-word mnemonic here"
npx tsx scripts/deploy-issuer-registry.ts
```

## Step 3: Configure Environment

Create or update `.env`:

```bash
# Admin credentials
ADMIN_MNEMONIC="your 25-word mnemonic here"

# Deployed contract
ISSUER_REGISTRY_APP_ID=123456789

# Algorand network (testnet or mainnet)
VITE_ALGORAND_NETWORK=testnet
```

## Step 4: Test with TypeScript Utilities

Create `scripts/test-issuer-registry.ts`:

```typescript
import algosdk from "algosdk";
import {
  addIssuer,
  getIssuerStatus,
  revokeIssuer,
  reinstateIssuer,
  revokeCredential,
  verifyCredentialValidity,
} from "../app/utils/issuer-registry";

async function test() {
  console.log("🧪 Testing Issuer Registry\n");

  // Load admin account
  const adminMnemonic = process.env.ADMIN_MNEMONIC!;
  const adminAccount = algosdk.mnemonicToSecretKey(adminMnemonic);

  console.log("Admin:", adminAccount.addr);
  console.log("Registry App ID:", process.env.ISSUER_REGISTRY_APP_ID);
  console.log();

  // Test 1: Check admin is bootstrapped
  console.log("Test 1: Check admin is automatically added as first issuer");
  const adminStatus = await getIssuerStatus(adminAccount.addr);
  console.log("Admin status:", adminStatus);
  console.log("✓ Admin is active:", adminStatus?.isActive);
  console.log();

  // Test 2: Add a new issuer
  console.log("Test 2: Admin vouches for a new issuer");
  const newIssuer = algosdk.generateAccount();
  console.log("New issuer address:", newIssuer.addr);

  const txId1 = await addIssuer(adminAccount.sk, newIssuer.addr);
  console.log("✓ Added issuer, tx:", txId1);

  const issuerStatus = await getIssuerStatus(newIssuer.addr);
  console.log("Issuer status:", issuerStatus);
  console.log("✓ Vouched by:", issuerStatus?.vouchedBy);
  console.log();

  // Test 3: New issuer vouches for another issuer
  console.log("Test 3: Issuer vouches for another issuer");
  const thirdIssuer = algosdk.generateAccount();
  console.log("Third issuer address:", thirdIssuer.addr);

  const txId2 = await addIssuer(newIssuer.sk, thirdIssuer.addr);
  console.log("✓ Added issuer, tx:", txId2);

  const thirdStatus = await getIssuerStatus(thirdIssuer.addr);
  console.log("Third issuer vouched by:", thirdStatus?.vouchedBy);
  console.log("✓ Matches new issuer:", thirdStatus?.vouchedBy === newIssuer.addr);
  console.log();

  // Test 4: Verify credential validity
  console.log("Test 4: Verify a credential");
  const testCredId = "urn:uuid:test-credential-123";
  const issuanceDate = new Date();

  const validity = await verifyCredentialValidity(
    testCredId,
    newIssuer.addr,
    issuanceDate
  );
  console.log("Credential valid:", validity.valid);
  console.log();

  // Test 5: Revoke issuer (without revokeAllPrior)
  console.log("Test 5: Revoke issuer (future credentials only)");
  const txId3 = await revokeIssuer(adminAccount.sk, newIssuer.addr, false);
  console.log("✓ Revoked issuer, tx:", txId3);

  const revokedStatus = await getIssuerStatus(newIssuer.addr);
  console.log("Issuer active:", revokedStatus?.isActive);
  console.log("Revoked at:", revokedStatus?.revokedAt);
  console.log();

  // Test 6: Verify old credential still valid
  console.log("Test 6: Check credential issued before revocation");
  const oldValidity = await verifyCredentialValidity(
    testCredId,
    newIssuer.addr,
    issuanceDate
  );
  console.log("Old credential still valid:", oldValidity.valid);
  console.log();

  // Test 7: Verify new credential would be invalid
  console.log("Test 7: Check credential issued after revocation");
  const futureDate = new Date(Date.now() + 1000000);
  const futureValidity = await verifyCredentialValidity(
    "urn:uuid:future-credential",
    newIssuer.addr,
    futureDate
  );
  console.log("Future credential valid:", futureValidity.valid);
  console.log("Reason:", futureValidity.reason);
  console.log();

  // Test 8: Reinstate issuer
  console.log("Test 8: Reinstate issuer");
  const txId4 = await reinstateIssuer(adminAccount.sk, newIssuer.addr);
  console.log("✓ Reinstated issuer, tx:", txId4);

  const reinstatedStatus = await getIssuerStatus(newIssuer.addr);
  console.log("Issuer active again:", reinstatedStatus?.isActive);
  console.log();

  // Test 9: Revoke specific credential
  console.log("Test 9: Revoke a specific credential");
  const txId5 = await revokeCredential(
    adminAccount.sk,
    testCredId,
    newIssuer.addr
  );
  console.log("✓ Revoked credential, tx:", txId5);

  const credValidity = await verifyCredentialValidity(
    testCredId,
    newIssuer.addr,
    issuanceDate
  );
  console.log("Credential valid:", credValidity.valid);
  console.log("Reason:", credValidity.reason);
  console.log();

  console.log("✅ All tests passed!");
}

test().catch(console.error);
```

Run the tests:
```bash
npx tsx scripts/test-issuer-registry.ts
```

## Step 5: Test with Web UI (Recommended)

Start your development server:
```bash
npm run dev
```

Navigate to:
```
http://localhost:5173/app/admin/issuer-registry
```

The web UI provides a user-friendly interface to test all registry operations:

### **Add Issuer Tab**
- Enter issuer address
- Optionally provide voucher mnemonic (instead of using admin)
- Submit to add issuer to registry
- See transaction ID and success/error messages

### **Query Status Tab**
- Enter issuer address  
- View complete issuer status:
  - Active/Revoked status
  - Authorization timestamp
  - Revocation timestamp (if revoked)
  - Who vouched for them
  - Whether all credentials are invalidated

### **Revoke Issuer Tab**
- Enter issuer address
- Choose whether to invalidate all prior credentials (nuclear option)
- Submit revocation with visual warnings
- See transaction confirmation

### **Verify Credential Tab**
- Enter credential ID
- Enter issuer address
- Select issuance date/time
- Get validity result with detailed reason if invalid

### Testing Workflow Example

1. **Add First Issuer (Admin Vouches):**
   - Go to "Add Issuer" tab
   - Paste new Algorand address
   - Leave "Use voucher mnemonic" unchecked (uses admin)
   - Click "Add Issuer"
   - Note the transaction ID

2. **Query the New Issuer:**
   - Go to "Query Status" tab
   - Paste the issuer address
   - Click "Query Status"
   - Verify status shows "Active" and vouched by admin

3. **Test Vouching Chain:**
   - Go back to "Add Issuer" tab
   - Enter another new address
   - Check "Use voucher mnemonic"
   - Paste the first issuer's mnemonic
   - Submit - now the first issuer is vouching!
   - Query the second issuer to see vouching chain

4. **Test Temporal Revocation:**
   - Go to "Verify Credential" tab
   - Enter a test credential ID
   - Enter first issuer's address
   - Select a date in the past
   - Verify it shows "Valid"
   - Go to "Revoke Issuer" tab
   - Revoke the first issuer (without "revoke all")
   - Go back to "Verify Credential"
   - Try the same credential - should still be valid
   - Try a future date - should be invalid

## Step 8: Test API Endpoints (Command Line Alternative)

If you prefer testing via command line:

Start your development server:
```bash
npm run dev
```

### Test 1: Add Issuer (Admin Vouching)

```bash
curl -X POST http://localhost:5173/api/issuer-registry/add \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "issuerAddress=SOME_ALGORAND_ADDRESS"
```

### Test 2: Add Issuer (Issuer Vouching)

```bash
curl -X POST http://localhost:5173/api/issuer-registry/add \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "issuerAddress=NEW_ISSUER_ADDRESS" \
  -d "voucherMnemonic=existing issuer 25-word mnemonic here"
```

### Test 3: Query Issuer Status

```bash
curl http://localhost:5173/api/issuer-registry/status/ISSUER_ADDRESS
```

### Test 4: Revoke Issuer

```bash
curl -X POST http://localhost:5173/api/issuer-registry/revoke \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "revokeAllPrior=false"
```

### Test 5: Verify Credential

```bash
curl -X POST http://localhost:5173/api/issuer-registry/verify-credential \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "credentialId=urn:uuid:test-123" \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "issuanceDate=2024-01-15T10:00:00Z"
```

## Step 8: Manual Testing Scenarios

### Scenario 1: Vouching Chain

```bash
# 1. Admin vouches for Issuer A
curl -X POST http://localhost:5173/api/issuer-registry/add \
  -d "issuerAddress=ISSUER_A_ADDRESS"

# 2. Issuer A vouches for Issuer B
curl -X POST http://localhost:5173/api/issuer-registry/add \
  -d "issuerAddress=ISSUER_B_ADDRESS" \
  -d "voucherMnemonic=ISSUER_A_MNEMONIC"

# 3. Verify chain: B ← A ← Admin
curl http://localhost:5173/api/issuer-registry/status/ISSUER_B_ADDRESS
# Should show vouchedBy: ISSUER_A_ADDRESS

curl http://localhost:5173/api/issuer-registry/status/ISSUER_A_ADDRESS
# Should show vouchedBy: ADMIN_ADDRESS
```

### Scenario 2: Temporal Revocation

```bash
# 1. Add issuer
curl -X POST http://localhost:5173/api/issuer-registry/add \
  -d "issuerAddress=ISSUER_ADDRESS"

# 2. Credential issued at 2024-01-01 (before revocation)
curl -X POST http://localhost:5173/api/issuer-registry/verify-credential \
  -d "credentialId=cred-1" \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "issuanceDate=2024-01-01T00:00:00Z"
# Result: valid=true

# 3. Revoke issuer on 2024-06-01
curl -X POST http://localhost:5173/api/issuer-registry/revoke \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "revokeAllPrior=false"

# 4. Old credential still valid
curl -X POST http://localhost:5173/api/issuer-registry/verify-credential \
  -d "credentialId=cred-1" \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "issuanceDate=2024-01-01T00:00:00Z"
# Result: valid=true

# 5. New credential invalid
curl -X POST http://localhost:5173/api/issuer-registry/verify-credential \
  -d "credentialId=cred-2" \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "issuanceDate=2024-12-01T00:00:00Z"
# Result: valid=false, reason="Credential issued after issuer was revoked"
```

### Scenario 3: Nuclear Option

```bash
# Revoke with revokeAllPrior=true
curl -X POST http://localhost:5173/api/issuer-registry/revoke \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "revokeAllPrior=true"

# All credentials now invalid
curl -X POST http://localhost:5173/api/issuer-registry/verify-credential \
  -d "credentialId=old-cred" \
  -d "issuerAddress=ISSUER_ADDRESS" \
  -d "issuanceDate=2024-01-01T00:00:00Z"
# Result: valid=false, reason="All credentials from this issuer have been revoked"
```

## Step 8: Verify On-Chain

### Using Pera Explorer (Testnet)

```
https://testnet.explorer.perawallet.app/application/{ISSUER_REGISTRY_APP_ID}
```

You can see:
- Global state (admin, issuer_count)
- Box storage (issuer records)
- Transaction history

### Using `goal`

```bash
# List all boxes (issuers)
goal app box list --app-id $ISSUER_REGISTRY_APP_ID

# Read specific issuer box
goal app box info \
  --app-id $ISSUER_REGISTRY_APP_ID \
  --name $(echo -n "ISSUER_ADDRESS" | base64)

# View global state
goal app read --app-id $ISSUER_REGISTRY_APP_ID --global
```

## Common Issues

### Issue 1: "Box not found"

**Cause**: Issuer hasn't been added yet
**Solution**: Use `/api/issuer-registry/add` to add them first

### Issue 2: "Insufficient balance"

**Cause**: Admin account doesn't have enough ALGO for box storage
**Solution**: Fund admin account (each issuer costs ~0.1 ALGO for box storage)

### Issue 3: "Transaction failed: logic eval error"

**Cause**: Trying to add issuer with non-issuer account
**Solution**: Only admin or existing active issuers can vouch for new issuers

### Issue 4: "App does not exist"

**Cause**: Wrong app ID or network mismatch
**Solution**: Verify `ISSUER_REGISTRY_APP_ID` and `VITE_ALGORAND_NETWORK` match

## Integration Testing Checklist

- [ ] Smart contract compiles successfully
- [ ] Contract deploys to testnet
- [ ] Admin is bootstrapped as first issuer
- [ ] Admin can add new issuers
- [ ] Issuers can vouch for other issuers
- [ ] Issuer status queries work
- [ ] Temporal revocation works correctly
- [ ] Nuclear option invalidates all credentials
- [ ] Individual credential revocation works
- [ ] Credential verification logic is accurate
- [ ] API endpoints return correct responses
- [ ] On-chain data is visible in explorer

## Next Steps

Once testing is complete:

1. **Deploy to Mainnet**
   - Use same process but with mainnet configuration
   - Fund admin account with real ALGO
   - Update `.env` with mainnet app ID

2. **Integrate with Credential Issuance**
   - Update credential issuance flow to check issuer authorization
   - Include `credentialStatus` field in issued credentials
   - Implement verification in your relying party apps

3. **Monitor and Maintain**
   - Set up alerts for revocation events
   - Regular audits of issuer registry
   - Monitor box storage costs

## Resources

- [Algorand Developer Portal](https://developer.algorand.org/)
- [PyTeal Documentation](https://pyteal.readthedocs.io/)
- [Algorand Box Storage](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/apps/state/#box-storage)
- [Issuer Registry Documentation](./ISSUER_REGISTRY.md)
- [Vouching System Guide](./ISSUER_VOUCHING_SYSTEM.md)
