/**
 * API endpoint to update issuer metadata
 * POST /api/issuer-registry/update-metadata
 *
 * Requires admin credentials (ADMIN_MNEMONIC env var)
 */

import type { ActionFunctionArgs } from "react-router";
import { updateIssuerMetadata } from "~/utils/issuer-registry";
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

    if (!issuerAddress) {
      return new Response(JSON.stringify({ 
        error: "Issuer address is required" 
      }), {
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
      return new Response(JSON.stringify({ 
        error: "Invalid Algorand address format" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get admin credentials
    const adminMnemonic = process.env.ADMIN_MNEMONIC;
    if (!adminMnemonic) {
      return new Response(JSON.stringify({ 
        error: "Admin credentials not configured" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const adminAccount = algosdk.mnemonicToSecretKey(adminMnemonic);

    // Update issuer metadata
    const txId = await updateIssuerMetadata(adminAccount.sk, issuerAddress, {
      name,
      fullName,
      website,
      organizationType,
      jurisdiction,
    });

    return {
      success: true,
      issuerAddress,
      txId,
      metadata: {
        name,
        fullName,
        website,
        organizationType,
        jurisdiction,
      },
      message: `Metadata updated for issuer ${issuerAddress}`,
    };
  } catch (error: any) {
    console.error("Error updating issuer metadata:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to update metadata" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
