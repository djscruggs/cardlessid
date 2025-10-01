import algosdk from 'algosdk';

// Algorand network configuration
export const ALGORAND_CONFIG = {
  // Testnet configuration (recommended for development)
  testnet: {
    algodToken: '',
    algodServer: 'https://testnet-api.algonode.cloud',
    algodPort: 443,
    indexerToken: '',
    indexerServer: 'https://testnet-idx.algonode.cloud',
    indexerPort: 443,
  },
  // Mainnet configuration (for production)
  mainnet: {
    algodToken: '',
    algodServer: 'https://mainnet-api.algonode.cloud',
    algodPort: 443,
    indexerToken: '',
    indexerServer: 'https://mainnet-idx.algonode.cloud',
    indexerPort: 443,
  }
};

// Get current network (default to testnet for development)
const CURRENT_NETWORK = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALGORAND_NETWORK) || 'testnet';

export const config = ALGORAND_CONFIG[CURRENT_NETWORK as keyof typeof ALGORAND_CONFIG];

// Initialize Algorand clients
export const algodClient = new algosdk.Algodv2(
  config.algodToken,
  config.algodServer,
  config.algodPort
);

export const indexerClient = new algosdk.Indexer(
  config.indexerToken,
  config.indexerServer,
  config.indexerPort
);

// Utility functions
export async function getAccountInfo(address: string) {
  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    return accountInfo;
  } catch (error) {
    console.error('Error fetching account info:', error);
    throw error;
  }
}

export async function isValidAlgorandAddress(address: string): Promise<boolean> {
  try {
    // First check format
    if (!algosdk.isValidAddress(address)) {
      return false;
    }

    // Then check if account exists on-chain
    await algodClient.accountInformation(address).do();
    return true;
  } catch (error: any) {
    // Account doesn't exist on-chain or other error
    if (error.status === 404) {
      return false;
    }
    console.error('Error validating Algorand address:', error);
    return false;
  }
}

export async function getAccountBalance(address: string): Promise<number> {
  try {
    const accountInfo = await getAccountInfo(address);
    return Number(accountInfo.amount || 0);
  } catch (error) {
    console.error('Error fetching account balance:', error);
    return 0;
  }
}

export async function waitForConfirmation(txId: string, timeout: number = 10): Promise<any> {
  try {
    const confirmedTx = await algosdk.waitForConfirmation(algodClient, txId, timeout);
    return confirmedTx;
  } catch (error) {
    console.error('Error waiting for confirmation:', error);
    throw error;
  }
}

// Get Pera Explorer URL for a transaction
export function getPeraExplorerUrl(txId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const baseUrl = network === 'testnet'
    ? 'https://testnet.explorer.perawallet.app/tx'
    : 'https://explorer.perawallet.app/tx';
  return `${baseUrl}/${txId}`;
}


// Create a transaction to store credential record on-chain
// This creates a 0 ALGO payment from issuer to user with credential data in the note
export async function createCredentialTransaction(
  issuerAddress: string,
  userAddress: string,
  privateKey: Uint8Array,
  credentialId: string,
  compositeHash: string,
  proofValue: string
): Promise<string> {
  try {
    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create compact note with credential record
    const credentialRecord = {
      id: credentialId,
      hash: compositeHash,
      proof: proofValue.substring(0, 100), // Truncate proof to fit in note
    };
    const note = new TextEncoder().encode(JSON.stringify(credentialRecord));

    // Create transaction from issuer to user (0 ALGO payment with credential data)
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: issuerAddress,
      receiver: userAddress, // Send to user's wallet
      amount: 0, // No ALGO transfer, just credential record
      note: note,
      suggestedParams: suggestedParams,
    });

    // Sign transaction
    const signedTxn = txn.signTxn(privateKey);

    // Submit transaction
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    return response.txid;
  } catch (error) {
    console.error('Error creating credential transaction:', error);
    throw error;
  }
}

// Check if a credential has already been issued for a wallet address
// Returns { exists: boolean, duplicateCount: number }
export async function checkCredentialExists(
  issuerAddress: string,
  userAddress: string,
  compositeHash: string
): Promise<{ exists: boolean; duplicateCount: number }> {
  try {
    // Search for transactions received by the user's wallet
    const searchResults = await indexerClient
      .searchForTransactions()
      .address(userAddress)
      .addressRole('receiver')
      .txType('pay')
      .do();

    const transactions = searchResults.transactions || [];

    // Filter to only transactions from our issuer
    const credentialTxns = transactions.filter(
      (txn: any) => txn.sender === issuerAddress
    );

    // Check each transaction's note for the composite hash
    let duplicateCount = 0;
    for (const txn of credentialTxns) {
      if (txn.note) {
        try {
          const noteString = new TextDecoder().decode(
            Buffer.from(txn.note, 'base64')
          );
          const noteData = JSON.parse(noteString);
          if (noteData.hash === compositeHash) {
            duplicateCount++;
          }
        } catch (e) {
          // Skip transactions with invalid notes
          continue;
        }
      }
    }

    return {
      exists: duplicateCount > 0,
      duplicateCount
    };
  } catch (error) {
    console.error('Error checking credential existence:', error);
    return { exists: false, duplicateCount: 0 };
  }
}
