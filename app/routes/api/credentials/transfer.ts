import type { ActionFunctionArgs } from "react-router";

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
  const algosdk = (await import("algosdk")).default;

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

    // Get issuer credentials
    const appWalletAddress = process.env.VITE_APP_WALLET_ADDRESS;
    const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;

    if (!appWalletAddress || !issuerPrivateKey) {
      throw new Error("Issuer credentials not configured");
    }

    // Restore account from private key
    const secretKey = new Uint8Array(Buffer.from(issuerPrivateKey, 'base64'));
    const issuerAccount = {
      addr: algosdk.encodeAddress(secretKey.slice(32)),
      sk: secretKey,
    };

    const network = (process.env.VITE_ALGORAND_NETWORK || 'testnet') as 'testnet' | 'mainnet';

    console.log(`🔄 Transferring credential NFT ${assetId} to ${walletAddress}`);

    // Transfer the NFT
    const transferTxId = await transferCredentialNFT(
      appWalletAddress,
      issuerAccount.sk,
      walletAddress,
      assetId
    );

    console.log(`✓ Transferred NFT, Tx: ${transferTxId}`);

    // Freeze the NFT to make it non-transferable
    const freezeTxId = await freezeCredentialNFT(
      appWalletAddress,
      issuerAccount.sk,
      walletAddress,
      assetId
    );

    console.log(`✓ Froze NFT, Tx: ${freezeTxId}`);

    return Response.json({
      success: true,
      assetId,
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
