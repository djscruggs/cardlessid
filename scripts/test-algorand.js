#!/usr/bin/env node

/**
 * Algorand Testing Script
 *
 * Usage:
 *   node scripts/test-algorand.js [command]
 *
 * Commands:
 *   - testnet: Test connection to Algorand Testnet
 *   - localnet: Test connection to local Algorand node
 *   - wallet: Test wallet operations
 *   - credential: Test credential creation and storage
 */

import algosdk from "algosdk";
import { config, algodClient, indexerClient } from "../app/utils/algorand.ts";

const commands = {
  async testnet() {
    console.log("🧪 Testing Algorand Testnet Connection...\n");

    try {
      // Test network connection
      const status = await algodClient.status().do();
      console.log("✅ Testnet connected!");
      console.log(`   Network: ${status.network || "testnet"}`);
      console.log(`   Last round: ${status["last-round"]}`);
      console.log(`   Catchup time: ${status["catchup-time"]}ms`);

      // Test indexer connection
      const health = await indexerClient.makeHealthCheck().do();
      console.log("✅ Indexer connected!");
      console.log(`   Status: ${health.status}`);
    } catch (error) {
      console.error("❌ Testnet connection failed:", error.message);
      process.exit(1);
    }
  },

  async localnet() {
    console.log("🧪 Testing Local Algorand Node...\n");

    try {
      // Test local node (assuming it's running on default ports)
      const localAlgod = new algosdk.Algodv2("", "http://localhost:4001", "");
      const status = await localAlgod.status().do();

      console.log("✅ Local node connected!");
      console.log(`   Network: ${status.network || "local"}`);
      console.log(`   Last round: ${status["last-round"]}`);
    } catch (error) {
      console.error("❌ Local node connection failed:", error.message);
      console.log("💡 Make sure Algorand local node is running:");
      console.log("   goal node start -d ~/node/data");
      process.exit(1);
    }
  },

  async wallet() {
    console.log("🧪 Testing Wallet Operations...\n");

    // Try to read from .env.local file
    let walletAddress = process.env.VITE_APP_WALLET_ADDRESS;

    if (!walletAddress) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const envPath = path.join(process.cwd(), ".env.local");
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/VITE_APP_WALLET_ADDRESS=(.+)/);
        if (match) {
          walletAddress = match[1].trim();
        }
      } catch (error) {
        console.error("❌ Could not read .env.local file");
      }
    }

    if (!walletAddress) {
      console.error("❌ VITE_APP_WALLET_ADDRESS not found in environment");
      console.log(
        "💡 Make sure .env.local contains: VITE_APP_WALLET_ADDRESS=your_address"
      );
      process.exit(1);
    }

    try {
      // Get account info
      const accountInfo = await algodClient
        .accountInformation(walletAddress)
        .do();
      const balance = Number(accountInfo.amount || 0);

      console.log("✅ Wallet operations successful!");
      console.log(`   Address: ${walletAddress}`);
      console.log(`   Balance: ${balance / 1000000} ALGO`);
      console.log(`   Status: ${accountInfo.status}`);

      if (balance === 0) {
        console.log("\n⚠️  Wallet has 0 ALGO balance.");
        console.log(
          "   For testnet: Visit https://testnet.algoexplorer.io/dispenser"
        );
        console.log("   For localnet: Use goal account import");
      }
    } catch (error) {
      console.error("❌ Wallet operations failed:", error.message);
      process.exit(1);
    }
  },

  async credential() {
    console.log("🧪 Testing Credential Operations...\n");

    try {
      // Test credential creation
      const testCredential = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: `urn:uuid:${crypto.randomUUID()}`,
        type: ["VerifiableCredential", "BirthDateCredential"],
        issuer: { id: "did:algorand:test" },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:cardlessid:user:test",
          "cardlessid:compositeHash": "test-hash",
        },
      };

      console.log("✅ Credential creation successful!");
      console.log(`   Credential ID: ${testCredential.id}`);
      console.log(`   Subject ID: ${testCredential.credentialSubject.id}`);

      // Test QR code generation
      const QRCode = await import("qrcode");
      const qrDataURL = await QRCode.default.toDataURL(
        JSON.stringify(testCredential)
      );
      console.log("✅ QR code generation successful!");
      console.log(`   QR code size: ${qrDataURL.length} characters`);
    } catch (error) {
      console.error("❌ Credential operations failed:", error.message);
      process.exit(1);
    }
  },
};

// Main execution
const command = process.argv[2] || "testnet";

if (commands[command]) {
  await commands[command]();
} else {
  console.log("Available commands:");
  Object.keys(commands).forEach((cmd) => {
    console.log(`  - ${cmd}`);
  });
  process.exit(1);
}
