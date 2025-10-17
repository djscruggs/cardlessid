/**
 * GET /api/wallet/status/:address
 *
 * Check if a wallet address has been verified by checking NFT credentials on Algorand blockchain
 * Returns verification status based on credential NFTs owned from issuer
 */

import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
  const { address } = params;

  if (!address) {
    return Response.json({ error: "Wallet address required" }, { status: 400 });
  }

  try {
    // Dynamic imports
    const { getWalletCredentials, getIssuerInfo } = await import("~/utils/nft-credentials");
    const algosdk = (await import("algosdk")).default;

    console.log(`🔍 [WALLET STATUS] Checking wallet NFTs on blockchain: ${address}`);

    // Validate Algorand address format
    if (!algosdk.isValidAddress(address)) {
      return Response.json(
        { error: "Invalid Algorand address format" },
        { status: 400 }
      );
    }

    // Get app wallet address (issuer)
    const appWalletAddress = process.env.VITE_APP_WALLET_ADDRESS;
    if (!appWalletAddress) {
      throw new Error("VITE_APP_WALLET_ADDRESS environment variable is required");
    }

    // Get all credential NFTs owned by this wallet from our issuer
    const credentials = await getWalletCredentials(address, appWalletAddress);

    console.log(`✓ [WALLET STATUS] Found ${credentials.length} credential NFT(s) for ${address}`);

    // If no credentials found, wallet is not verified
    if (credentials.length === 0) {
      return Response.json({
        verified: false,
        credentialCount: 0,
      });
    }

    // Sort by creation date (most recent first)
    const sortedCredentials = credentials.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const latestCredential = sortedCredentials[0];

    // Get issuer info from smart contract registry
    let issuerInfo = null;
    try {
      issuerInfo = await getIssuerInfo(appWalletAddress);
      if (issuerInfo) {
        console.log(`✓ [WALLET STATUS] Found issuer info: ${issuerInfo.name}`);
      }
    } catch (error) {
      console.warn("Failed to fetch issuer info:", error);
      // Continue without issuer info if it fails
    }

    // Return verification status from blockchain
    return Response.json({
      verified: true,
      credentialCount: credentials.length,
      issuedAt: latestCredential.createdAt,
      credentials: credentials.map(cred => ({
        assetId: cred.assetId,
        frozen: cred.frozen,
        issuedAt: cred.createdAt,
        credentialId: cred.metadata?.credentialId,
        issuerName: cred.metadata?.issuerName,
        issuerUrl: cred.metadata?.issuerUrl,
      })),
      latestCredential: {
        assetId: latestCredential.assetId,
        frozen: latestCredential.frozen,
        credentialId: latestCredential.metadata?.credentialId,
        compositeHash: latestCredential.metadata?.compositeHash,
        issuerName: latestCredential.metadata?.issuerName,
        issuerUrl: latestCredential.metadata?.issuerUrl,
      },
      issuer: issuerInfo,
      network: process.env.VITE_ALGORAND_NETWORK || 'testnet',
    });
  } catch (error) {
    console.error("Error checking wallet status:", error);
    return Response.json(
      {
        error: "Failed to check wallet status",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Prevent POST requests
export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
