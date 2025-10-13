/**
 * Credential Issuance Utilities
 * Wrapper functions for issuing W3C Verifiable Credentials
 */

import type { VerifiedIdentity } from '~/types/verification';

/**
 * Issue a credential to a wallet address
 * This is a simplified wrapper around the full credential issuance flow
 *
 * @param walletAddress - Algorand wallet address to issue credential to
 * @param identity - Verified identity data
 * @param sessionId - Verification session ID
 * @returns Credential information including credential ID and blockchain details
 */
export async function issueCredential(
  walletAddress: string,
  identity: VerifiedIdentity,
  sessionId: string
): Promise<{
  id: string;
  credential: any;
  assetId?: string;
  txId?: string;
}> {
  // Import server-only modules
  const algosdk = (await import('algosdk')).default;
  const {
    createCredentialNFT,
    checkDuplicateCredentialNFT
  } = await import('~/utils/nft-credentials');
  const { getPeraExplorerUrl } = await import('~/utils/algorand');

  // Get environment variables
  const appWalletAddress = process.env.VITE_APP_WALLET_ADDRESS;
  const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;

  if (!appWalletAddress) {
    throw new Error('VITE_APP_WALLET_ADDRESS environment variable is required');
  }

  if (!issuerPrivateKey) {
    throw new Error('ISSUER_PRIVATE_KEY environment variable is required');
  }

  // Validate Algorand address format
  const algorandAddressRegex = /^[A-Z2-7]{58}$/;
  if (!algorandAddressRegex.test(walletAddress)) {
    throw new Error('Invalid Algorand wallet address format');
  }

  // Check for duplicate credentials
  const { exists: isDuplicate, assetIds: duplicateAssetIds } =
    await checkDuplicateCredentialNFT(appWalletAddress, identity.compositeHash);

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && isDuplicate) {
    throw new Error('A credential with this identity has already been issued');
  }

  // Restore issuer account from private key
  const secretKey = new Uint8Array(Buffer.from(issuerPrivateKey, 'base64'));
  const issuerAccount = {
    addr: algosdk.encodeAddress(secretKey.slice(32)),
    sk: secretKey,
  };

  // Verify the key matches the configured wallet address
  if (issuerAccount.addr !== appWalletAddress) {
    throw new Error('ISSUER_PRIVATE_KEY does not match VITE_APP_WALLET_ADDRESS');
  }

  const issuerId = `did:algo:${appWalletAddress}`;
  const subjectId = `did:algo:${walletAddress}`;
  const credentialId = `urn:uuid:${crypto.randomUUID()}`;
  const issuanceDate = new Date().toISOString();

  // Create credential without proof
  const credentialWithoutProof = {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://www.w3.org/ns/credentials/examples/v2',
      'https://cardlessid.org/credentials/v1',
    ],
    id: credentialId,
    type: ['VerifiableCredential', 'BirthDateCredential'],
    issuer: {
      id: issuerId,
    },
    issuanceDate,
    credentialSubject: {
      id: subjectId,
      'cardlessid:compositeHash': identity.compositeHash,
    },
    evidence: [identity.evidence],
  };

  // Sign the credential
  const credentialBytes = new TextEncoder().encode(
    JSON.stringify(credentialWithoutProof)
  );
  const signature = algosdk.signBytes(credentialBytes, issuerAccount.sk);

  // Create final credential with proof
  const credential = {
    ...credentialWithoutProof,
    proof: {
      type: 'Ed25519Signature2020',
      created: issuanceDate,
      verificationMethod: `${issuerId}#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: Buffer.from(signature).toString('base64'),
    },
  };

  // Mint credential NFT on blockchain
  let assetId: string | undefined;
  let mintTxId: string | undefined;

  try {
    const { walletNeedsFunding, fundNewWallet } = await import('~/utils/algorand');

    // Check if issuer wallet needs funding
    const issuerNeedsFunds = await walletNeedsFunding(appWalletAddress);
    if (issuerNeedsFunds) {
      throw new Error(
        `Issuer wallet ${appWalletAddress} has insufficient ALGO balance. ` +
        'Please fund it with at least 0.1 ALGO.'
      );
    }

    // Check if recipient wallet needs funding
    const needsFunding = await walletNeedsFunding(walletAddress);
    if (needsFunding) {
      console.log(`💰 Funding wallet ${walletAddress} for asset opt-in`);
      await fundNewWallet(
        appWalletAddress,
        issuerAccount.sk,
        walletAddress,
        200000 // 0.2 ALGO
      );
    }

    // Create the NFT credential
    const nftResult = await createCredentialNFT(
      appWalletAddress,
      issuerAccount.sk,
      walletAddress,
      {
        name: 'Cardless ID',
        description: 'Identity verification credential',
        credentialId,
        compositeHash: identity.compositeHash,
        issuedAt: issuanceDate,
      }
    );

    assetId = nftResult.assetId;
    mintTxId = nftResult.txId;

    console.log(`✓ Created NFT credential: Asset ID ${assetId}, Tx: ${mintTxId}`);
  } catch (error) {
    console.error('Error minting credential NFT:', error);
    throw error;
  }

  return {
    id: credentialId,
    credential,
    assetId,
    txId: mintTxId,
  };
}
