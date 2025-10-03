import type { ActionFunctionArgs } from "react-router";
import algosdk from "algosdk";

/**
 * POST /api/credentials/transfer
 *
 * Transfer and freeze credential NFT after client has opted in
 *
 * Expected payload:
 * {
 *   assetId: number,
 *   walletAddress: string
 * }
 */
export async function action({ request }: ActionFunctionArgs) {
  const {
    transferCredentialNFT,
    freezeCredentialNFT,
  } = await import("~/utils/nft-credentials");
  const { getPeraExplorerUrl } = await import("~/utils/algorand");
  
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { assetId, walletAddress } = await request.json();

    if (!assetId || !walletAddress) {
      return Response.json(
        { error: "Missing assetId or walletAddress" },
        { status: 400 }
      );
    }

    // Ensure assetId is a number (but keep original for response)
    const numericAssetId = Number(assetId);
    if (isNaN(numericAssetId)) {
      return Response.json(
        { error: "assetId must be a valid number" },
        { status: 400 }
      );
    }

    // Get issuer credentials
    const appWalletAddress = process.env.VITE_APP_WALLET_ADDRESS;
    const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;

    console.log(`🔍 Environment check: appWalletAddress=${appWalletAddress}, hasPrivateKey=${!!issuerPrivateKey}`);

    if (!appWalletAddress || !issuerPrivateKey) {
      throw new Error("Issuer credentials not configured");
    }

    // Restore account from private key
    const secretKey = new Uint8Array(Buffer.from(issuerPrivateKey, 'base64'));
    const issuerAccount = {
      addr: algosdk.encodeAddress(secretKey.slice(32)),
      sk: secretKey,
    };

    console.log(`🔍 Account restoration: derivedAddress=${issuerAccount.addr}, expectedAddress=${appWalletAddress}`);

    // Check if issuer wallet needs funding before attempting transfer
    const { walletNeedsFunding } = await import("~/utils/algorand");
    const issuerNeedsFunds = await walletNeedsFunding(appWalletAddress);
    if (issuerNeedsFunds) {
      throw new Error(`Issuer wallet ${appWalletAddress} has insufficient ALGO balance for transaction fees. Please fund it with at least 0.1 ALGO.`);
    }

    const network = (process.env.VITE_ALGORAND_NETWORK || 'testnet') as 'testnet' | 'mainnet';

    console.log(`🔄 Transferring credential NFT ${numericAssetId} to ${walletAddress}`);
    console.log(`🔍 Transfer params: appWallet=${appWalletAddress}, wallet=${walletAddress}, assetId=${numericAssetId}`);

    // Transfer the NFT
    const transferTxId = await transferCredentialNFT(
      appWalletAddress,
      issuerAccount.sk,
      walletAddress,
      numericAssetId
    );

    console.log(`✓ Transferred NFT, Tx: ${transferTxId}`);

    // Freeze the NFT to make it non-transferable
    const freezeTxId = await freezeCredentialNFT(
      appWalletAddress,
      issuerAccount.sk,
      walletAddress,
      numericAssetId
    );

    console.log(`✓ Froze NFT, Tx: ${freezeTxId}`);

    return Response.json({
      success: true,
      assetId: numericAssetId.toString(), // Ensure it's a string for JSON serialization
      walletAddress,
      transactions: {
        transfer: {
          id: transferTxId,
          explorerUrl: getPeraExplorerUrl(transferTxId, network),
        },
        freeze: {
          id: freezeTxId,
          explorerUrl: getPeraExplorerUrl(freezeTxId, network),
        },
      },
      message: "Credential NFT transferred and frozen (non-transferable)",
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return Response.json(
      {
        error: "Failed to transfer credential",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function loader() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
