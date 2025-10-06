/**
 * API endpoint to revoke a specific credential
 * POST /api/issuer-registry/revoke-credential
 */

import type { ActionFunctionArgs } from "react-router";
import { revokeCredential } from "~/utils/issuer-registry";
import algosdk from "algosdk";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const credentialId = formData.get("credentialId") as string;
    const issuerAddress = formData.get("issuerAddress") as string;

    if (!credentialId || !issuerAddress) {
      return new Response(JSON.stringify(
        { error: "credentialId and issuerAddress are required" },
      { status: 400 }
    ), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
    }

    // Validate issuer address format
    if (!algosdk.isValidAddress(issuerAddress)) {
      return new Response(JSON.stringify(
        { error: "Invalid Algorand address format for issuer" },
      { status: 400 }
    ), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
    }

    // Get admin private key from environment
    const adminMnemonic = process.env.ADMIN_MNEMONIC;
    if (!adminMnemonic) {
      return new Response(JSON.stringify(
        { error: "Admin credentials not configured" }
      ), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const adminAccount = algosdk.mnemonicToSecretKey(adminMnemonic);

    // Revoke credential
    const txId = await revokeCredential(
      adminAccount.sk,
      credentialId,
      issuerAddress
    );

    return {
      success: true,
      credentialId,
      issuerAddress,
      txId,
      message: `Credential ${credentialId} revoked successfully`,
    };
  } catch (error: any) {
    console.error("Error revoking credential:", error);
    return new Response(JSON.stringify(
      { error: error.message || "Failed to revoke credential" },
      { status: 500 }
    ), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
