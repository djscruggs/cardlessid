#!/usr/bin/env tsx

/**
 * Script to fund the admin account with ALGO from the main account
 */

import algosdk from "algosdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function fundAdminAccount() {
  console.log("💰 Funding Admin Account");
  console.log("========================");

  const mainAccountMnemonic = process.env.ISSUER_PRIVATE_KEY;
  const adminAddress = process.env.ADMIN_ADDRESS;

  if (!mainAccountMnemonic) {
    console.error("❌ ISSUER_PRIVATE_KEY not found in .env.local");
    return;
  }

  if (!adminAddress) {
    console.error("❌ ADMIN_ADDRESS not found in .env.local");
    return;
  }

  try {
    // Create main account from base64 private key
    const privateKeyBytes = Buffer.from(mainAccountMnemonic, 'base64');
    const mainAccount = algosdk.mnemonicToSecretKey(""); // We'll override with our key
    mainAccount.sk = privateKeyBytes;
    mainAccount.addr = algosdk.encodeAddress(algosdk.bytesToUint8Array(algosdk.ed25519.derivePublicKey(privateKeyBytes)));
    console.log(`Main Account: ${mainAccount.addr}`);
    console.log(`Admin Account: ${adminAddress}`);

    // Connect to testnet
    const algodClient = new algosdk.Algodv2(
      "",
      "https://testnet-api.algonode.cloud",
      443
    );

    // Get account info
    const mainAccountInfo = await algodClient.accountInformation(mainAccount.addr).do();
    console.log(`Main Account Balance: ${mainAccountInfo.amount / 1000000} ALGO`);

    // Create payment transaction
    const params = await algodClient.getTransactionParams().do();
    const amount = 5000000; // 5 ALGO in microALGO

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: mainAccount.addr,
      to: adminAddress,
      amount: amount,
      suggestedParams: params,
    });

    // Sign and send transaction
    const signedTxn = txn.signTxn(mainAccount.sk);
    const txId = await algodClient.sendRawTransaction(signedTxn).do();

    console.log(`✅ Transaction sent: ${txId.txid}`);
    console.log(`💰 Sent 5 ALGO to admin account`);
    console.log("\n⏳ Waiting for confirmation...");

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId.txid, 4);
    console.log(`✅ Transaction confirmed in round ${confirmedTxn['confirmed-round']}`);

    // Check new balance
    const adminAccountInfo = await algodClient.accountInformation(adminAddress).do();
    console.log(`Admin Account Balance: ${adminAccountInfo.amount / 1000000} ALGO`);

  } catch (error: any) {
    console.error("❌ Error funding admin account:", error.message);
  }
}

// Run the script
fundAdminAccount().catch(console.error);
