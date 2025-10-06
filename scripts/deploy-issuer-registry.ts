/**
 * Deploy Issuer Registry Smart Contract to Algorand
 *
 * This script:
 * 1. Compiles the PyTeal contract (requires pyteal installed)
 * 2. Deploys to Algorand testnet
 * 3. Outputs the app ID to update .env
 */

import algosdk from 'algosdk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = parseInt(process.env.ALGOD_PORT || '443');

async function compileContract(): Promise<string> {
  console.log('📝 Compiling PyTeal contract...');

  const contractPath = path.join(process.cwd(), 'app/contracts/issuer-registry.py');
  const tealPath = path.join(process.cwd(), 'app/contracts/issuer-registry.teal');

  try {
    // Run Python to compile PyTeal to TEAL
    execSync(`python3 ${contractPath} > ${tealPath}`, { stdio: 'inherit' });
    console.log('✅ Contract compiled to TEAL');

    // Read the compiled TEAL
    const teal = fs.readFileSync(tealPath, 'utf8');
    return teal;
  } catch (error) {
    console.error('❌ Failed to compile contract. Make sure pyteal is installed:');
    console.error('   pip3 install pyteal');
    throw error;
  }
}

async function deployContract(): Promise<number> {
  console.log('\n🚀 Deploying contract to Algorand testnet...\n');

  // Check for issuer private key and wallet address
  const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;
  const walletAddress = process.env.VITE_APP_WALLET_ADDRESS;

  if (!issuerPrivateKey) {
    throw new Error('ISSUER_PRIVATE_KEY not found in .env.local file');
  }
  if (!walletAddress) {
    throw new Error('VITE_APP_WALLET_ADDRESS not found in .env.local file');
  }

  // Connect to Algorand
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

  // Get admin account from private key
  const privateKeyUint8 = new Uint8Array(Buffer.from(issuerPrivateKey, 'base64'));
  const adminAccount = {
    addr: walletAddress,
    sk: privateKeyUint8
  };
  console.log(`📍 Deploying from admin address: ${adminAccount.addr}`);

  // Calculate total ALGO needed for deployment
  const accountMinBalance = 100_000;  // 0.1 ALGO minimum for app account
  const boxMBR = 2500 + (400 * (32 + 56));  // Box storage MBR
  const appFunding = accountMinBalance + boxMBR;  // Total for app account
  const deploymentFee = 10_000;  // Estimated deployment transaction fee
  const fundingFee = 1_000;  // Fee for funding transaction
  const totalNeeded = (appFunding + deploymentFee + fundingFee) / 1_000_000;

  // Check balance
  const accountInfo = await algodClient.accountInformation(adminAccount.addr).do();
  const balance = Number(accountInfo.amount) / 1_000_000; // Convert microAlgos to Algos
  console.log(`💰 Admin balance: ${balance} ALGO`);
  console.log(`💰 Estimated total needed: ${totalNeeded.toFixed(4)} ALGO`);
  console.log(`   - App account funding: ${(appFunding / 1_000_000).toFixed(4)} ALGO`);
  console.log(`   - Deployment fees: ${((deploymentFee + fundingFee) / 1_000_000).toFixed(4)} ALGO`);

  if (balance < totalNeeded) {
    console.log('\n⚠️  Insufficient balance! Get testnet ALGO from:');
    console.log('   https://bank.testnet.algorand.network/');
    console.log(`   Address: ${adminAccount.addr}`);
    console.log(`   Need: ${totalNeeded.toFixed(4)} ALGO, Have: ${balance.toFixed(4)} ALGO\n`);
    throw new Error('Insufficient balance for deployment');
  }
  console.log(`✅ Sufficient funds available\n`);

  // Compile the contract
  const approvalProgram = await compileContract();

  // For this contract, we use a minimal clear state program
  const clearProgram = `#pragma version 10
int 1
return`;

  // Compile programs
  const approvalCompiled = await algodClient.compile(approvalProgram).do();
  const clearCompiled = await algodClient.compile(clearProgram).do();

  // Get suggested params
  const params = await algodClient.getTransactionParams().do();

  // Use the same box MBR calculation as above
  params.fee = Number(params.minFee) + boxMBR; // Increase fee to cover box MBR
  params.flatFee = true;

  // Create application
  const onComplete = algosdk.OnApplicationComplete.NoOpOC;
  const numGlobalByteSlices = 1;  // admin address
  const numGlobalInts = 1;        // issuer_count
  const numLocalByteSlices = 0;
  const numLocalInts = 0;
  const extraPages = 3;           // Box storage requires extra pages

  console.log('📦 Creating application transaction...');
  console.log(`   Admin address type: ${typeof adminAccount.addr}, value: ${adminAccount.addr}`);
  console.log(`   Params keys: ${Object.keys(params).join(', ')}`);

  // For box storage, need to specify box references
  const senderAddress = algosdk.decodeAddress(adminAccount.addr);
  const boxes = [
    {
      appIndex: 0, // 0 means current app
      name: senderAddress.publicKey // Box key is the sender address
    }
  ];

  const txnParams: any = {
    sender: adminAccount.addr,
    suggestedParams: params,
    onComplete,
    approvalProgram: new Uint8Array(Buffer.from(approvalCompiled.result, 'base64')),
    clearProgram: new Uint8Array(Buffer.from(clearCompiled.result, 'base64')),
    numLocalInts,
    numLocalByteSlices,
    numGlobalInts,
    numGlobalByteSlices,
    extraPages,
    boxes, // Add box references for the admin issuer being added during bootstrap
  };

  // Remove undefined fields which might cause issues
  Object.keys(txnParams).forEach(key => {
    if (txnParams[key] === undefined) {
      delete txnParams[key];
    }
  });

  console.log(`   Transaction params from: ${txnParams.from}`);

  // First deploy without box creation - remove boxes from params
  delete txnParams.boxes;

  console.log('📤 Creating app (step 1)...');
  const createTxn = algosdk.makeApplicationCreateTxnFromObject(txnParams);
  const signedCreateTxn = createTxn.signTxn(adminAccount.sk);

  console.log('   Sending signed transaction...');
  const sendResponse = await algodClient.sendRawTransaction(signedCreateTxn).do();
  console.log(`   Send response:`, sendResponse);
  const createTxId = sendResponse.txId || sendResponse.txid;
  console.log(`📝 Create Transaction ID: ${createTxId}`);

  console.log('⏳ Waiting for confirmation...');
  await algosdk.waitForConfirmation(algodClient, createTxId, 10);

  // Get transaction info to retrieve app ID
  const txInfo = await algodClient.pendingTransactionInformation(createTxId).do();
  const appId = Number(txInfo['applicationIndex']);
  console.log(`✅ App created! App ID: ${appId}`);

  // Fund the app account for box storage
  const appAddress = algosdk.getApplicationAddress(appId).toString();
  console.log(`\n📍 App account address: ${appAddress}`);
  console.log(`💸 Funding app account with ${(appFunding / 1_000_000).toFixed(4)} ALGO...`);

  const fundParams = await algodClient.getTransactionParams().do();
  const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: adminAccount.addr,
    receiver: appAddress,
    amount: appFunding,
    suggestedParams: fundParams,
  });

  const signedFundTxn = fundTxn.signTxn(adminAccount.sk);
  const fundResponse = await algodClient.sendRawTransaction(signedFundTxn).do();
  const fundTxId = fundResponse.txId || fundResponse.txid;
  console.log(`📝 Funding Transaction ID: ${fundTxId}`);
  console.log('⏳ Waiting for confirmation...');
  await algosdk.waitForConfirmation(algodClient, fundTxId, 10);
  console.log(`✅ App account funded successfully!`);

  console.log(`\n📋 Contract deployed and funded!`);
  console.log(`📋 App ID: ${appId}`);
  console.log(`📋 App Address: ${appAddress}`);
  console.log(`\n✅ Ready to add issuers!\n`);

  return appId;
}

async function updateEnvFile(appId: number): Promise<void> {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Check if ISSUER_REGISTRY_APP_ID already exists
  if (envContent.includes('ISSUER_REGISTRY_APP_ID=')) {
    // Replace existing value
    envContent = envContent.replace(
      /ISSUER_REGISTRY_APP_ID=.*/,
      `ISSUER_REGISTRY_APP_ID=${appId}`
    );
  } else {
    // Add new line
    envContent += `\nISSUER_REGISTRY_APP_ID=${appId}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`\n✅ Updated .env.local with ISSUER_REGISTRY_APP_ID=${appId}`);
}

async function main() {
  try {
    console.log('🌟 Issuer Registry Deployment Tool\n');
    console.log('=' .repeat(50));

    const appId = await deployContract();
    await updateEnvFile(appId);

    console.log('\n' + '=' .repeat(50));
    console.log('\n🎉 Deployment complete!\n');
    console.log('Next steps:');
    console.log('1. Restart your dev server to load the new app ID');
    console.log('2. Visit http://localhost:5173/app/admin/issuer-registry');
    console.log('3. Add yourself as the first issuer using the admin UI');
    console.log('4. Then you can add other issuers who can vouch for more issuers\n');

  } catch (error) {
    console.error('\n❌ Deployment failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
