#!/usr/bin/env node

/**
 * Algorand LocalNet Setup Script
 * 
 * This script helps set up a local Algorand node for testing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOCALNET_DIR = path.join(process.env.HOME, 'algorand-localnet');
const NODE_DATA_DIR = path.join(LOCALNET_DIR, 'node', 'data');

async function setupLocalNet() {
  console.log('🚀 Setting up Algorand LocalNet...\n');
  
  try {
    // Check if goal is installed
    console.log('1. Checking Algorand installation...');
    execSync('goal version', { stdio: 'pipe' });
    console.log('✅ Algorand CLI found');
    
    // Create localnet directory
    console.log('2. Creating localnet directory...');
    if (!fs.existsSync(LOCALNET_DIR)) {
      fs.mkdirSync(LOCALNET_DIR, { recursive: true });
    }
    console.log('✅ Directory created:', LOCALNET_DIR);
    
    // Generate genesis file
    console.log('3. Generating genesis file...');
    const genesisContent = `{
  "id": "localnet",
  "network": "localnet",
  "proto": "future",
  "consensus": {
    "upgrade": {
      "ConsensusProtocol": "future"
    }
  },
  "alloc": [
    {
      "addr": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "comment": "RewardsPool"
    }
  ]
}`;
    
    fs.writeFileSync(path.join(LOCALNET_DIR, 'genesis.json'), genesisContent);
    console.log('✅ Genesis file created');
    
    // Create node data directory
    console.log('4. Setting up node data directory...');
    if (!fs.existsSync(NODE_DATA_DIR)) {
      fs.mkdirSync(NODE_DATA_DIR, { recursive: true });
    }
    console.log('✅ Node data directory created');
    
    console.log('\n🎉 LocalNet setup complete!');
    console.log('\nNext steps:');
    console.log('1. Start the node: goal node start -d ~/algorand-localnet/node/data');
    console.log('2. Create accounts: goal account new');
    console.log('3. Run tests: node scripts/test-algorand.js localnet');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Install Algorand: https://developer.algorand.org/docs/get-details/installation/');
    console.log('2. Make sure goal is in your PATH');
    process.exit(1);
  }
}

setupLocalNet();

