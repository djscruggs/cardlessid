#!/usr/bin/env tsx

/**
 * Script to create a new admin account for vouching
 * This separates the admin role from the issuer role
 */

import algosdk from "algosdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function createAdminAccount() {
  console.log("🔧 Creating Admin Account for Issuer Registry");
  console.log("==============================================");

  // Generate a new admin account
  const adminAccount = algosdk.generateAccount();
  
  console.log("✅ New Admin Account Created:");
  console.log(`   Address: ${adminAccount.addr}`);
  console.log(`   Mnemonic: ${algosdk.secretKeyToMnemonic(adminAccount.sk)}`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Add this to your .env.local file:");
  console.log(`   ADMIN_MNEMONIC="${algosdk.secretKeyToMnemonic(adminAccount.sk)}"`);
  console.log(`   ADMIN_ADDRESS="${adminAccount.addr}"`);
  console.log("\n2. Fund this account with some ALGO for transaction fees");
  console.log("   You can use the Algorand dispenser: https://dispenser.testnet.aws.algodev.network/");
  console.log(`   Or send ALGO from your main account to: ${adminAccount.addr}`);
  console.log("\n3. Use this admin account to vouch for your main issuer account");
  
  console.log("\n⚠️  IMPORTANT: Save the mnemonic securely!");
  console.log("   This account will have admin privileges in the issuer registry");
  
  return {
    address: adminAccount.addr,
    mnemonic: algosdk.secretKeyToMnemonic(adminAccount.sk)
  };
}

// Run the script
createAdminAccount().catch(console.error);

export { createAdminAccount };