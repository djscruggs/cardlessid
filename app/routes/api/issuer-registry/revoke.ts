/**
 * API endpoint to revoke a issuer's authorization
 * POST /api/issuer-registry/revoke
 */

import type { ActionFunctionArgs } from "react-router";
import { revokeIssuer } from "~/utils/issuer-registry";
import algosdk from "algosdk";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const issuerAddress = formData.get("issuerAddress") as string;
    const revokeAllPrior = formData.get("revokeAllPrior") === "true";

    if (!issuerAddress) {
      return new Response(JSON.stringify(
        { error: "Verifier address is required" },
      { status: 400 }
    ), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
    }

    // Validate address format
    if (!algosdk.isValidAddress(issuerAddress)) {
      return new Response(JSON.stringify(
        { error: "Invalid Algorand address format" },
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

    // Revoke issuer
    const txId = await revokeIssuer(
      adminAccount.sk,
      issuerAddress,
      revokeAllPrior
    );

    return {
      success: true,
      issuerAddress,
      revokeAllPrior,
      txId,
      message: revokeAllPrior
        ? `Verifier ${issuerAddress} revoked - ALL credentials invalidated`
        : `Verifier ${issuerAddress} revoked - future credentials invalidated`,
    };
  } catch (error: any) {
    console.error("Error revoking issuer:", error);
    return new Response(JSON.stringify(
      { error: error.message || "Failed to revoke issuer" },
      { status: 500 }
    ), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
