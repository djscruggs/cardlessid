/**
 * API endpoint to add a new authorized issuer to the registry
 * POST /api/issuer-registry/add
 *
 * Requires either:
 * - Admin credentials (ADMIN_MNEMONIC env var)
 * - OR voucherMnemonic in request (from an active issuer)
 */

import type { ActionFunctionArgs } from "react-router";
import { addIssuer } from "~/utils/issuer-registry";
import algosdk from "algosdk";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const issuerAddress = formData.get("issuerAddress") as string;
    const name = formData.get("name") as string;
    const fullName = formData.get("fullName") as string;
    const website = formData.get("website") as string;
    const organizationType = formData.get("organizationType") as string;
    const jurisdiction = formData.get("jurisdiction") as string;
    const voucherMnemonic = formData.get("voucherMnemonic") as string;

    if (!issuerAddress) {
      return new Response(JSON.stringify({ error: "Issuer address is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!name || !fullName || !website || !organizationType || !jurisdiction) {
      return new Response(JSON.stringify({ 
        error: "All metadata fields are required (name, fullName, website, organizationType, jurisdiction)" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate address format
    if (!algosdk.isValidAddress(issuerAddress)) {
      return new Response(JSON.stringify({ error: "Invalid Algorand address format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get voucher credentials - either from request or use admin
    let voucherAccount;
    let voucherSource;

    if (voucherMnemonic) {
      // Verifier vouching for another issuer
      try {
        voucherAccount = algosdk.mnemonicToSecretKey(voucherMnemonic);
        voucherSource = "vouching issuer";
      } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid voucher mnemonic" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      // Admin adding a issuer
      const adminMnemonic = process.env.ADMIN_MNEMONIC;
      if (!adminMnemonic) {
        return new Response(JSON.stringify({ 
          error: "No voucher provided and admin credentials not configured" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      voucherAccount = algosdk.mnemonicToSecretKey(adminMnemonic);
      voucherSource = "admin";
    }

    // Add issuer to registry with metadata
    const txId = await addIssuer(voucherAccount.sk, issuerAddress, {
      name,
      fullName,
      website,
      organizationType,
      jurisdiction,
    });

    return {
      success: true,
      issuerAddress,
      vouchedBy: voucherAccount.addr,
      voucherSource,
      txId,
      metadata: {
        name,
        fullName,
        website,
        organizationType,
        jurisdiction,
      },
      message: `Issuer ${issuerAddress} added successfully (vouched by ${voucherSource})`,
    };
  } catch (error: any) {
    console.error("Error adding issuer:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to add issuer" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
