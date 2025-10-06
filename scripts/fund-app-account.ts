/**
 * Fund the app account with ALGO for box storage
 */

import algosdk from 'algosdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APP_ID = parseInt(process.env.ISSUER_REGISTRY_APP_ID || '0');
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';

async function fundAppAccount() {
  if (!APP_ID) {
    throw new Error('ISSUER_REGISTRY_APP_ID not found in .env.local');
  }

  const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;
  const walletAddress = process.env.VITE_APP_WALLET_ADDRESS;

  if (!issuerPrivateKey || !walletAddress) {
    throw new Error('ISSUER_PRIVATE_KEY or VITE_APP_WALLET_ADDRESS not found in .env.local');
  }

  const algodClient = new algosdk.Algodv2('', ALGOD_SERVER, 443);
  const privateKeyUint8 = new Uint8Array(Buffer.from(issuerPrivateKey, 'base64'));
  const adminAccount = { addr: walletAddress, sk: privateKeyUint8 };

  const appAddress = algosdk.getApplicationAddress(APP_ID).toString();

  // Account minimum balance is 100,000 microALGO (0.1 ALGO)
  // Plus box MBR: base 2500 + 400 per byte
  // Box key: 32 bytes (address), Box value: 56 bytes (8+8+8+32)
  const accountMinBalance = 100_000;
  const boxMBR = 2500 + (400 * (32 + 56));
  const totalNeeded = accountMinBalance + boxMBR;

  console.log('💸 Funding App Account\n');
  console.log('=' .repeat(50));
  console.log(`📍 App ID: ${APP_ID}`);
  console.log(`📍 App Account: ${appAddress}`);
  console.log(`💰 Account Min Balance: ${accountMinBalance / 1_000_000} ALGO`);
  console.log(`💰 Box Storage MBR: ${boxMBR / 1_000_000} ALGO`);
  console.log(`💰 Total Amount: ${totalNeeded / 1_000_000} ALGO (${totalNeeded} microALGO)`);
  console.log('=' .repeat(50));

  const params = await algodClient.getTransactionParams().do();
  const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: adminAccount.addr,
    receiver: appAddress,
    amount: totalNeeded,
    suggestedParams: params,
  });

  const signedTxn = fundTxn.signTxn(adminAccount.sk);
  const sendResponse = await algodClient.sendRawTransaction(signedTxn).do();
  const txId = sendResponse.txId || sendResponse.txid;
  console.log(`\n📝 Transaction ID: ${txId}`);
  console.log('⏳ Waiting for confirmation...');

  await algosdk.waitForConfirmation(algodClient, txId, 10);

  console.log('\n✅ App account funded successfully!');
  console.log('\nYou can now add issuers to the registry.\n');
}

fundAppAccount().catch(err => {
  console.error('\n❌ Error funding app account:', err.message);
  process.exit(1);
});
