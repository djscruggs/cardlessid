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

export async function waitForConfirmation(txId: string, timeout: number = 10000): Promise<any> {
  try {
    const confirmedTx = await algosdk.waitForConfirmation(algodClient, txId, timeout);
    return confirmedTx;
  } catch (error) {
    console.error('Error waiting for confirmation:', error);
    throw error;
  }
}

// Create a transaction to store credential data on-chain
export async function createCredentialTransaction(
  fromAddress: string,
  privateKey: Uint8Array,
  credentialData: string
): Promise<string> {
  try {
    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // Create a note with the credential data
    const note = new TextEncoder().encode(credentialData);
    
    // Create transaction
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: fromAddress,
      receiver: fromAddress, // Send to self (this is just to store data)
      amount: 0, // No ALGO transfer, just data storage
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

// Query for existing credentials by composite hash
export async function findCredentialByHash(compositeHash: string): Promise<any[]> {
  try {
    // Search for transactions with the composite hash in the note
    const searchResults = await indexerClient
      .searchForTransactions()
      .notePrefix(new TextEncoder().encode(compositeHash))
      .do();
    
    return searchResults.transactions || [];
  } catch (error) {
    console.error('Error searching for credentials:', error);
    return [];
  }
}
