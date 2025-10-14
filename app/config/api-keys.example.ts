/**
 * API Key Configuration for Mobile Client Integration
 *
 * SECURITY REQUIREMENTS FOR MOBILE CLIENTS:
 * =========================================
 *
 * 1. CREDENTIAL STORAGE SECURITY:
 *    - Credentials MUST be stored in encrypted device storage
 *    - Use platform-specific secure storage (iOS Keychain, Android Keystore)
 *    - Credentials MUST be tamper-proof (detect modification attempts)
 *    - Implement integrity checks (HMAC/signature verification)
 *
 * 2. ISSUER IDENTITY:
 *    - Each mobile client integration receives their own Algorand issuer address
 *    - All credentials issued through your API key will be signed by YOUR issuer address
 *    - Your issuer address will be registered in the on-chain Issuer Registry
 *    - You are responsible for all credentials issued under your issuer identity
 *
 * 3. TERMS OF SERVICE & PENALTIES:
 *    - Violation of Terms of Service may result in issuer revocation
 *    - Security breaches or fraudulent activity will result in immediate revocation
 *    - Issuer revocation OPTIONS:
 *      a) Soft revocation: Prevents new credential issuance, existing credentials remain valid
 *      b) Hard revocation: Invalidates ALL credentials ever issued by your issuer address
 *    - Revocation is recorded on-chain and cannot be easily reversed
 *    - You will be notified before hard revocation (except in severe security incidents)
 *
 * 4. COMPLIANCE REQUIREMENTS:
 *    - Implement proper user consent flows before identity verification
 *    - Follow data protection regulations (GDPR, CCPA, etc.)
 *    - Do not store unnecessary PII from credentials
 *    - Implement proper access controls in your application
 *    - Report security incidents immediately
 *
 * TO REQUEST AN API KEY:
 * =====================
 * Contact us through: https://cardlessid.org/contact
 *
 * Provide the following information:
 * - Organization/Application name
 * - Primary contact email
 * - Use case description
 * - Expected monthly verification volume
 * - Algorand wallet address for issuer registration (or we can generate one)
 */

export interface ApiKeyConfig {
  /** Unique API key (use strong random generation: openssl rand -hex 32) */
  key: string;

  /** Client/Organization name */
  name: string;

  /** Primary contact email */
  contactEmail: string;

  /** Algorand wallet address that will sign credentials for this client */
  issuerAddress: string;

  /** Base64-encoded private key for the issuer address (keep this EXTREMELY secure!) */
  issuerPrivateKey: string;

  /** Status: 'active' allows credential issuance, 'revoked' blocks all operations */
  status: 'active' | 'revoked';

  /** Optional rate limit (requests per hour, 0 = unlimited) */
  rateLimit?: number;

  /** Date added */
  createdAt: string;

  /** Optional revocation date and reason */
  revokedAt?: string;
  revokeReason?: string;
}

/**
 * API Keys Configuration
 * Copy this file to api-keys.config.ts and add your API keys
 * IMPORTANT: api-keys.config.ts is gitignored - never commit it!
 */
export const apiKeys: ApiKeyConfig[] = [
  // Example entry (DO NOT USE IN PRODUCTION):
  {
    key: 'example_key_replace_with_secure_random_hex',
    name: 'Example Mobile App',
    contactEmail: 'dev@example.com',
    issuerAddress: 'EXAMPLEADDRESS58CHARACTERSXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    issuerPrivateKey: 'base64_encoded_private_key_here',
    status: 'active',
    rateLimit: 1000, // 1000 requests per hour
    createdAt: '2025-01-01T00:00:00Z',
  },
  // Add more API keys here...
];

/**
 * SETUP INSTRUCTIONS:
 * ===================
 *
 * 1. Copy this file to api-keys.config.ts
 * 2. Generate a secure API key:
 *    openssl rand -hex 32
 *
 * 3. Generate an Algorand wallet for the client (or use their provided address):
 *    - Use Algorand SDK or Pera Wallet
 *    - Store the private key securely
 *    - Convert private key to base64 for config file
 *
 * 4. Register the issuer address in the Issuer Registry:
 *    - Use app/utils/issuer-registry.ts addIssuer() function
 *    - Vouch for the new issuer using the main app's issuer address
 *    - Include metadata (name, organization type, jurisdiction)
 *
 * 5. Fund the issuer wallet with ALGO:
 *    - Testnet: Use faucet at https://dispenser.testnet.aws.algodev.network/
 *    - Mainnet: Send at least 1 ALGO for transaction fees and NFT minting
 *
 * 6. Add the configuration to api-keys.config.ts
 *
 * 7. Test the API key with a verification + credential issuance flow
 *
 * 8. Provide the API key to the client securely (encrypted email, 1Password, etc.)
 */
