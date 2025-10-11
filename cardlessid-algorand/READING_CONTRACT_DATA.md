# Reading Data from CardlessIssuer Contract

This guide explains how to read issuer data from the CardlessIssuer smart contract without paying transaction fees.

## Overview

The CardlessIssuer contract stores issuer information in **Box Storage**, which is publicly readable from the blockchain at no cost. You don't need to call contract methods - you can read the box data directly using the Algorand SDK or Indexer.

## Prerequisites

Install the Algorand SDK:

```bash
npm install algosdk
# or
yarn add algosdk
```

## Contract Storage Structure

The contract uses BoxMap storage with the following structure:

- **Box Key Prefix**: `'i'` (defined in contract)
- **Box Key Format**: `'i' + <issuer_address_bytes>`
- **Box Value**: IssuerInfo struct containing:
  - `isActive`: Boolean
  - `name`: String
  - `url`: String
  - `addedAt`: uint64 timestamp

## Method 1: Using Algod Client (Direct Node Access)

### Setup

```typescript
import algosdk from 'algosdk';

// For TestNet
const algodToken = '';
const algodServer = 'https://testnet-api.algonode.cloud';
const algodPort = 443;

// For MainNet
// const algodServer = 'https://mainnet-api.algonode.cloud';

const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

// Your contract's application ID
const APP_ID = 123456789; // Replace with your actual app ID
```

### Get All Box Names

```typescript
async function getAllBoxes(appId: number) {
  try {
    const boxes = await algodClient.getApplicationBoxes(appId).do();
    return boxes.boxes;
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return [];
  }
}
```

### Read a Specific Box

```typescript
async function getIssuerInfo(appId: number, issuerAddress: string) {
  try {
    // Convert address to bytes
    const addressBytes = algosdk.decodeAddress(issuerAddress).publicKey;

    // Create box name: prefix 'i' + address bytes
    const boxKey = new Uint8Array([105, ...addressBytes]); // 105 is 'i' in ASCII

    // Get box contents
    const boxResponse = await algodClient.getApplicationBoxByName(appId, boxKey).do();

    // Decode the box value (ARC4 encoded IssuerInfo)
    const boxValue = boxResponse.value;

    // Parse ARC4 encoded data
    const issuerInfo = decodeIssuerInfo(boxValue);

    return issuerInfo;
  } catch (error) {
    console.error(`Error reading issuer ${issuerAddress}:`, error);
    return null;
  }
}
```

### Decode IssuerInfo (ARC4 Format)

```typescript
function decodeIssuerInfo(boxValue: Uint8Array) {
  // ARC4 Struct format for IssuerInfo:
  // - isActive: 1 byte (0 = false, 1 = true)
  // - name: 2 bytes length + string bytes
  // - url: 2 bytes length + string bytes
  // - addedAt: 8 bytes (uint64)

  let offset = 0;

  // Read isActive (1 byte)
  const isActive = boxValue[offset] === 1;
  offset += 1;

  // Read name (ARC4 dynamic string: 2 bytes length + data)
  const nameLength = (boxValue[offset] << 8) | boxValue[offset + 1];
  offset += 2;
  const name = new TextDecoder().decode(boxValue.slice(offset, offset + nameLength));
  offset += nameLength;

  // Read url (ARC4 dynamic string: 2 bytes length + data)
  const urlLength = (boxValue[offset] << 8) | boxValue[offset + 1];
  offset += 2;
  const url = new TextDecoder().decode(boxValue.slice(offset, offset + urlLength));
  offset += urlLength;

  // Read addedAt (8 bytes uint64, big-endian)
  const addedAt = Number(
    (BigInt(boxValue[offset]) << 56n) |
    (BigInt(boxValue[offset + 1]) << 48n) |
    (BigInt(boxValue[offset + 2]) << 40n) |
    (BigInt(boxValue[offset + 3]) << 32n) |
    (BigInt(boxValue[offset + 4]) << 24n) |
    (BigInt(boxValue[offset + 5]) << 16n) |
    (BigInt(boxValue[offset + 6]) << 8n) |
    BigInt(boxValue[offset + 7])
  );

  return {
    isActive,
    name,
    url,
    addedAt,
  };
}
```

### Get All Issuers

```typescript
async function getAllIssuers(appId: number) {
  try {
    // Get all box names
    const boxes = await getAllBoxes(appId);

    const issuers = [];

    for (const box of boxes) {
      // Extract address from box name (skip first byte which is prefix 'i')
      const addressBytes = box.name.slice(1);
      const issuerAddress = algosdk.encodeAddress(addressBytes);

      // Read issuer info
      const issuerInfo = await getIssuerInfo(appId, issuerAddress);

      if (issuerInfo && issuerInfo.isActive) {
        issuers.push({
          address: issuerAddress,
          ...issuerInfo,
        });
      }
    }

    return issuers;
  } catch (error) {
    console.error('Error fetching all issuers:', error);
    return [];
  }
}
```

## Method 2: Using Algorand Indexer

The Indexer provides more efficient queries for historical data.

```typescript
import algosdk from 'algosdk';

// For TestNet
const indexerToken = '';
const indexerServer = 'https://testnet-idx.algonode.cloud';
const indexerPort = 443;

// For MainNet
// const indexerServer = 'https://mainnet-idx.algonode.cloud';

const indexerClient = new algosdk.Indexer(indexerToken, indexerServer, indexerPort);

async function getIssuerFromIndexer(appId: number, issuerAddress: string) {
  try {
    const addressBytes = algosdk.decodeAddress(issuerAddress).publicKey;
    const boxKey = new Uint8Array([105, ...addressBytes]);

    // Convert to base64 for indexer query
    const boxKeyB64 = Buffer.from(boxKey).toString('base64');

    const boxData = await indexerClient
      .lookupApplicationBoxByIDandName(appId, boxKeyB64)
      .do();

    const issuerInfo = decodeIssuerInfo(new Uint8Array(Buffer.from(boxData.value, 'base64')));

    return {
      address: issuerAddress,
      ...issuerInfo,
    };
  } catch (error) {
    console.error(`Error reading issuer ${issuerAddress} from indexer:`, error);
    return null;
  }
}
```

## Complete Example: List All Active Issuers

```typescript
import algosdk from 'algosdk';

const APP_ID = 123456789; // Replace with your app ID

async function listAllActiveIssuers() {
  const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);

  try {
    // Get all boxes
    const boxes = await algodClient.getApplicationBoxes(APP_ID).do();
    console.log(`Found ${boxes.boxes.length} issuers in registry`);

    const activeIssuers = [];

    for (const box of boxes.boxes) {
      // Extract address from box name
      const addressBytes = box.name.slice(1);
      const issuerAddress = algosdk.encodeAddress(addressBytes);

      // Read box contents
      const boxResponse = await algodClient.getApplicationBoxByName(APP_ID, box.name).do();
      const issuerInfo = decodeIssuerInfo(boxResponse.value);

      if (issuerInfo.isActive) {
        activeIssuers.push({
          address: issuerAddress,
          name: issuerInfo.name,
          url: issuerInfo.url,
          addedAt: new Date(issuerInfo.addedAt * 1000).toISOString(),
        });
      }
    }

    return activeIssuers;
  } catch (error) {
    console.error('Error listing issuers:', error);
    return [];
  }
}

function decodeIssuerInfo(boxValue: Uint8Array) {
  let offset = 0;

  const isActive = boxValue[offset] === 1;
  offset += 1;

  const nameLength = (boxValue[offset] << 8) | boxValue[offset + 1];
  offset += 2;
  const name = new TextDecoder().decode(boxValue.slice(offset, offset + nameLength));
  offset += nameLength;

  const urlLength = (boxValue[offset] << 8) | boxValue[offset + 1];
  offset += 2;
  const url = new TextDecoder().decode(boxValue.slice(offset, offset + urlLength));
  offset += urlLength;

  const addedAt = Number(
    (BigInt(boxValue[offset]) << 56n) |
    (BigInt(boxValue[offset + 1]) << 48n) |
    (BigInt(boxValue[offset + 2]) << 40n) |
    (BigInt(boxValue[offset + 3]) << 32n) |
    (BigInt(boxValue[offset + 4]) << 24n) |
    (BigInt(boxValue[offset + 5]) << 16n) |
    (BigInt(boxValue[offset + 6]) << 8n) |
    BigInt(boxValue[offset + 7])
  );

  return { isActive, name, url, addedAt };
}

// Usage
listAllActiveIssuers().then(issuers => {
  console.log('Active Issuers:');
  issuers.forEach(issuer => {
    console.log(`- ${issuer.name}`);
    console.log(`  Address: ${issuer.address}`);
    console.log(`  URL: ${issuer.url}`);
    console.log(`  Added: ${issuer.addedAt}`);
  });
});
```

## React Example Component

```tsx
import { useEffect, useState } from 'react';
import algosdk from 'algosdk';

interface Issuer {
  address: string;
  name: string;
  url: string;
  addedAt: string;
}

export default function IssuersList() {
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const APP_ID = 123456789; // Replace with your app ID

  useEffect(() => {
    loadIssuers();
  }, []);

  async function loadIssuers() {
    try {
      const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);
      const boxes = await algodClient.getApplicationBoxes(APP_ID).do();

      const issuerList: Issuer[] = [];

      for (const box of boxes.boxes) {
        const addressBytes = box.name.slice(1);
        const issuerAddress = algosdk.encodeAddress(addressBytes);

        const boxResponse = await algodClient.getApplicationBoxByName(APP_ID, box.name).do();
        const issuerInfo = decodeIssuerInfo(boxResponse.value);

        if (issuerInfo.isActive) {
          issuerList.push({
            address: issuerAddress,
            name: issuerInfo.name,
            url: issuerInfo.url,
            addedAt: new Date(issuerInfo.addedAt * 1000).toISOString(),
          });
        }
      }

      setIssuers(issuerList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issuers');
    } finally {
      setLoading(false);
    }
  }

  function decodeIssuerInfo(boxValue: Uint8Array) {
    let offset = 0;

    const isActive = boxValue[offset] === 1;
    offset += 1;

    const nameLength = (boxValue[offset] << 8) | boxValue[offset + 1];
    offset += 2;
    const name = new TextDecoder().decode(boxValue.slice(offset, offset + nameLength));
    offset += nameLength;

    const urlLength = (boxValue[offset] << 8) | boxValue[offset + 1];
    offset += 2;
    const url = new TextDecoder().decode(boxValue.slice(offset, offset + urlLength));
    offset += urlLength;

    const addedAt = Number(
      (BigInt(boxValue[offset]) << 56n) |
      (BigInt(boxValue[offset + 1]) << 48n) |
      (BigInt(boxValue[offset + 2]) << 40n) |
      (BigInt(boxValue[offset + 3]) << 32n) |
      (BigInt(boxValue[offset + 4]) << 24n) |
      (BigInt(boxValue[offset + 5]) << 16n) |
      (BigInt(boxValue[offset + 6]) << 8n) |
      BigInt(boxValue[offset + 7])
    );

    return { isActive, name, url, addedAt };
  }

  if (loading) return <div>Loading issuers...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Authorized Issuers</h1>
      <p>Total active issuers: {issuers.length}</p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>URL</th>
            <th>Wallet Address</th>
            <th>Added Date</th>
          </tr>
        </thead>
        <tbody>
          {issuers.map(issuer => (
            <tr key={issuer.address}>
              <td>{issuer.name}</td>
              <td>
                <a href={issuer.url} target="_blank" rel="noopener noreferrer">
                  {issuer.url}
                </a>
              </td>
              <td>
                <code>{issuer.address}</code>
              </td>
              <td>{new Date(issuer.addedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Important Notes

1. **No Transaction Fees**: Reading box data does NOT require sending a transaction, so it's completely free.

2. **Box Key Format**: The contract uses `keyPrefix: 'i'`, which prepends the character 'i' (ASCII 105) to the issuer address bytes.

3. **ARC4 Encoding**: The data is stored in ARC4 format. Dynamic types like strings are prefixed with 2 bytes indicating length.

4. **Network Selection**: Make sure to use the correct network (TestNet/MainNet) and the correct APP_ID for your deployed contract.

5. **Rate Limiting**: Public API nodes may have rate limits. For production, consider using a paid API service or running your own node.

## Testing

You can verify your contract's box storage using AlgoKit:

```bash
algokit task inspect
```

Or using the Algorand CLI:

```bash
goal app box list --app-id <APP_ID>
goal app box info --app-id <APP_ID> --name <box_name_b64>
```

## Resources

- [Algorand Box Storage Documentation](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/apps/state/#box-storage)
- [Algorand JavaScript SDK](https://github.com/algorand/js-algorand-sdk)
- [ARC4 ABI Encoding](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0004.md)
