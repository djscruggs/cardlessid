# BigInt Serialization Fix

## Issue

When processing full verification with photos in the credentials API, the following error occurred:

```
TypeError: Do not know how to serialize a BigInt
```

This error happened after successfully creating an NFT credential:
```
✓ Created NFT credential: Asset ID 747879310, Tx: Q7WU44GZYXXJAAJJDWNS6YJEFTGUVUZSLBPNA73OP7QVTKCZHZCA
Credential issuance error: TypeError: Do not know how to serialize a BigInt
```

## Root Cause

The Algorand SDK (`algosdk`) returns BigInt values for:
- Asset IDs (e.g., `747879310n`)
- Transaction IDs
- Round numbers
- Other numeric blockchain data

When the credentials API tried to serialize the response using `Response.json()`, it failed because JavaScript's native JSON serialization doesn't support BigInt values.

The error only occurred during **full verification with photos** (not mock verification) because:
- Full verification creates actual NFTs on the blockchain
- Blockchain operations return BigInt values from the Algorand SDK
- Mock verification doesn't interact with the blockchain, so no BigInt values are created

## Solution

Changed from using `Response.json()` to using `JSON.stringify()` with a custom BigInt replacer function:

### Before (Broken)
```typescript
return Response.json({
  success: true,
  nft: {
    assetId: assetId?.toString() || "DEMO_ASSET_ID", // Even with toString(), other BigInts exist
  },
  duplicateDetection: {
    duplicateAssetIds, // Could contain BigInt values
  },
  // ... other fields that might contain BigInt values
});
```

### After (Fixed)
```typescript
const responseData = {
  success: true,
  nft: {
    assetId: assetId?.toString() || "DEMO_ASSET_ID",
  },
  duplicateDetection: {
    duplicateAssetIds: duplicateAssetIds.map(id => Number(id)),
  },
  // ... other fields
};

// Use JSON.stringify with BigInt replacer
const jsonString = JSON.stringify(responseData, (_key, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

return new Response(jsonString, {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## Files Modified

1. **[app/routes/api/credentials.ts](../app/routes/api/credentials.ts)** (Lines 549-628)
   - Changed response creation to use `JSON.stringify()` with BigInt replacer
   - Ensured `duplicateAssetIds` are converted to numbers before serialization

## Tests Added

Created comprehensive regression tests to prevent this issue from recurring:

### 1. **[app/__tests__/bigint-serialization.test.ts](../app/__tests__/bigint-serialization.test.ts)**
   - 15 tests covering general BigInt serialization scenarios
   - Tests JSON.stringify with BigInt replacer
   - Tests credential response structures
   - Tests edge cases (large values, zero, negative, mixed types)

### 2. **[app/__tests__/credentials-bigint-regression.test.ts](../app/__tests__/credentials-bigint-regression.test.ts)**
   - 9 tests specifically for credentials API
   - Tests response creation with BigInt values
   - Tests duplicateAssetIds array conversion
   - Simulates Algorand SDK responses
   - Tests full credential response serialization

All tests pass (24 new tests added):
```
✓ app/__tests__/bigint-serialization.test.ts (15 tests)
✓ app/__tests__/credentials-bigint-regression.test.ts (9 tests)
```

## How to Verify the Fix

Run the full test suite:
```bash
npm test
```

Or run just the BigInt tests:
```bash
npm test -- bigint-serialization.test.ts
npm test -- credentials-bigint-regression.test.ts
```

## Prevention

The regression tests will catch this error if:
1. Someone reverts to using `Response.json()` with BigInt values
2. New code introduces BigInt values without proper conversion
3. Any response serialization changes break BigInt handling

## Best Practices Going Forward

When working with Algorand blockchain data:

1. **Always convert BigInt to string or number** before JSON serialization:
   ```typescript
   const assetId = BigInt(12345);
   const assetIdString = assetId.toString();  // "12345"
   const assetIdNumber = Number(assetId);     // 12345
   ```

2. **Use the BigInt replacer pattern** for responses:
   ```typescript
   const jsonString = JSON.stringify(data, (_key, value) =>
     typeof value === 'bigint' ? value.toString() : value
   );
   ```

3. **Convert arrays of BigInt** before serialization:
   ```typescript
   const assetIds: bigint[] = [BigInt(111), BigInt(222)];
   const converted = assetIds.map(id => Number(id));
   ```

4. **Test with actual blockchain operations**, not just mocks, to catch BigInt issues

## Related Issues

This is a **known issue** with JavaScript's JSON serialization:
- JSON.stringify() cannot serialize BigInt values by default
- Must use a replacer function to convert BigInt to string or number
- Common when working with blockchain SDKs (Algorand, Ethereum, etc.)

## References

- [MDN: JSON.stringify() with replacer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)
- [MDN: BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [Algorand SDK Documentation](https://algorand.github.io/js-algorand-sdk/)
