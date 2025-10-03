import algosdk from 'algosdk';
import { algodClient, indexerClient } from './algorand';

/**
 * NFT-based credential system for CardlessID
 * Uses Algorand ASAs (Algorand Standard Assets) as non-transferable credentials
 */

export interface NFTCredentialMetadata {
  name: string;
  description: string;
  credentialId: string;
  compositeHash: string;
  issuedAt: string;
  // NOTE: No age/birth information stored on-chain for privacy (minimal disclosure principle)
}

/**
 * Create a non-transferable NFT credential
 * Sets clawback and freeze to issuer address to make it non-transferable
 */
export async function createCredentialNFT(
  issuerAddress: string,
  issuerPrivateKey: Uint8Array,
  recipientAddress: string,
  metadata: NFTCredentialMetadata
): Promise<{ assetId: number; txId: string }> {
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create ASA with these properties:
    // - total = 1 (unique NFT)
    // - decimals = 0 (non-divisible)
    // - defaultFrozen = false (recipient can hold it)
    // - manager = issuer (can update metadata if needed)
    // - reserve = undefined (not needed)
    // - freeze = issuer (can freeze to prevent transfers)
    // - clawback = issuer (can reclaim/revoke)
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: issuerAddress,
      total: 1,
      decimals: 0,
      defaultFrozen: false,
      manager: issuerAddress,
      reserve: undefined,
      freeze: issuerAddress,
      clawback: issuerAddress,
      unitName: 'CIDCRED',
      assetName: metadata.name,
      assetURL: `https://cardlessid.org/credentials/${metadata.credentialId}`,
      assetMetadataHash: new Uint8Array(
        Buffer.from(metadata.compositeHash.substring(0, 64), 'hex')
      ),
      note: new TextEncoder().encode(
        JSON.stringify({
          standard: 'arc69',
          ...metadata,
        })
      ),
      suggestedParams,
    });

    const signedTxn = txn.signTxn(issuerPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      response.txid,
      4
    );

    const assetId = confirmedTxn['asset-index'];

    console.log(`✓ Created credential NFT: Asset ID ${assetId}`);

    return {
      assetId,
      txId: response.txid,
    };
  } catch (error) {
    console.error('Error creating credential NFT:', error);
    throw error;
  }
}

/**
 * Transfer (opt-in + send) credential NFT to recipient
 * This is a two-step process, but we'll handle the opt-in on behalf of the user
 * by returning instructions for them to opt-in first
 */
export async function transferCredentialNFT(
  issuerAddress: string,
  issuerPrivateKey: Uint8Array,
  recipientAddress: string,
  assetId: number
): Promise<string> {
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create asset transfer transaction
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: issuerAddress,
      to: recipientAddress,
      amount: 1,
      assetIndex: assetId,
      suggestedParams,
    });

    const signedTxn = txn.signTxn(issuerPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(`✓ Transferred credential NFT ${assetId} to ${recipientAddress}`);

    return response.txid;
  } catch (error) {
    console.error('Error transferring credential NFT:', error);
    throw error;
  }
}

/**
 * Freeze a credential NFT to make it non-transferable
 * This should be called immediately after transfer
 */
export async function freezeCredentialNFT(
  issuerAddress: string,
  issuerPrivateKey: Uint8Array,
  recipientAddress: string,
  assetId: number
): Promise<string> {
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
      from: issuerAddress,
      assetIndex: assetId,
      freezeTarget: recipientAddress,
      freezeState: true, // true = frozen (cannot transfer)
      suggestedParams,
    });

    const signedTxn = txn.signTxn(issuerPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(`✓ Froze credential NFT ${assetId} for ${recipientAddress}`);

    return response.txid;
  } catch (error) {
    console.error('Error freezing credential NFT:', error);
    throw error;
  }
}

/**
 * Revoke a credential by clawing it back
 */
export async function revokeCredentialNFT(
  issuerAddress: string,
  issuerPrivateKey: Uint8Array,
  holderAddress: string,
  assetId: number
): Promise<string> {
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: issuerAddress,
      to: issuerAddress, // Send back to issuer
      amount: 1,
      assetIndex: assetId,
      revocationTarget: holderAddress, // Claw back from this address
      suggestedParams,
    });

    const signedTxn = txn.signTxn(issuerPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(`✓ Revoked credential NFT ${assetId} from ${holderAddress}`);

    return response.txid;
  } catch (error) {
    console.error('Error revoking credential NFT:', error);
    throw error;
  }
}

/**
 * Check if a wallet has valid credential NFTs
 * Returns all credential NFTs owned by the wallet from this issuer
 */
export async function getWalletCredentials(
  walletAddress: string,
  issuerAddress: string
): Promise<
  Array<{
    assetId: number;
    amount: number;
    frozen: boolean;
    metadata: any;
    createdAt?: string;
  }>
> {
  try {
    // Get account info
    const accountInfo = await algodClient.accountInformation(walletAddress).do();

    const credentials: Array<{
      assetId: number;
      amount: number;
      frozen: boolean;
      metadata: any;
      createdAt?: string;
    }> = [];

    // Check each asset the account owns
    for (const asset of accountInfo.assets || []) {
      if (asset.amount > 0) {
        // Get asset details
        const assetInfo = await algodClient.getAssetByID(asset['asset-id']).do();

        // Check if this asset was created by our issuer
        if (assetInfo.params.creator === issuerAddress) {
          // Parse metadata from creation transaction
          let metadata = null;
          try {
            // Get asset creation transaction
            const txnSearch = await indexerClient
              .searchForTransactions()
              .address(issuerAddress)
              .txType('acfg')
              .assetID(asset['asset-id'])
              .do();

            if (txnSearch.transactions && txnSearch.transactions.length > 0) {
              const creationTxn = txnSearch.transactions[0];
              if (creationTxn.note) {
                const noteString = new TextDecoder().decode(
                  Buffer.from(creationTxn.note, 'base64')
                );
                metadata = JSON.parse(noteString);
              }
            }
          } catch (e) {
            console.error('Error parsing asset metadata:', e);
          }

          credentials.push({
            assetId: asset['asset-id'],
            amount: asset.amount,
            frozen: asset['is-frozen'] || false,
            metadata: metadata || {
              name: assetInfo.params.name,
              unitName: assetInfo.params['unit-name'],
              url: assetInfo.params.url,
            },
            createdAt: metadata?.issuedAt,
          });
        }
      }
    }

    return credentials;
  } catch (error) {
    console.error('Error getting wallet credentials:', error);
    throw error;
  }
}

/**
 * Check if a credential with the same compositeHash already exists
 * Searches all NFTs created by the issuer for matching hash
 */
export async function checkDuplicateCredentialNFT(
  issuerAddress: string,
  compositeHash: string
): Promise<{ exists: boolean; assetIds: number[] }> {
  try {
    // Search for all asset creation transactions by issuer
    const txnSearch = await indexerClient
      .searchForTransactions()
      .address(issuerAddress)
      .txType('acfg')
      .do();

    const duplicateAssetIds: number[] = [];

    for (const txn of txnSearch.transactions || []) {
      // Check if this is an asset creation (not config update)
      if (txn['created-asset-index']) {
        if (txn.note) {
          try {
            const noteString = new TextDecoder().decode(
              Buffer.from(txn.note, 'base64')
            );
            const metadata = JSON.parse(noteString);

            if (metadata.compositeHash === compositeHash) {
              duplicateAssetIds.push(txn['created-asset-index']);
            }
          } catch (e) {
            // Skip if can't parse note
            continue;
          }
        }
      }
    }

    return {
      exists: duplicateAssetIds.length > 0,
      assetIds: duplicateAssetIds,
    };
  } catch (error) {
    console.error('Error checking duplicate credential:', error);
    return { exists: false, assetIds: [] };
  }
}

/**
 * Get credential NFT details by asset ID
 */
export async function getCredentialNFTDetails(assetId: number): Promise<{
  creator: string;
  name: string;
  unitName: string;
  total: number;
  frozen: boolean;
  metadata: any;
}> {
  try {
    const assetInfo = await algodClient.getAssetByID(assetId).do();

    // Get metadata from creation transaction
    let metadata = null;
    try {
      const txnSearch = await indexerClient
        .searchForTransactions()
        .assetID(assetId)
        .txType('acfg')
        .do();

      if (txnSearch.transactions && txnSearch.transactions.length > 0) {
        const creationTxn = txnSearch.transactions[0];
        if (creationTxn.note) {
          const noteString = new TextDecoder().decode(
            Buffer.from(creationTxn.note, 'base64')
          );
          metadata = JSON.parse(noteString);
        }
      }
    } catch (e) {
      console.error('Error parsing metadata:', e);
    }

    return {
      creator: assetInfo.params.creator,
      name: assetInfo.params.name,
      unitName: assetInfo.params['unit-name'],
      total: assetInfo.params.total,
      frozen: assetInfo.params['default-frozen'] || false,
      metadata,
    };
  } catch (error) {
    console.error('Error getting credential details:', error);
    throw error;
  }
}
