/**
 * API endpoint to query issuer status
 * GET /api/issuer-registry/status/:address
 */

import type { LoaderFunctionArgs } from "react-router";
import { getIssuerStatus } from "~/utils/issuer-registry";
import algosdk from "algosdk";

export async function loader({ params }: LoaderFunctionArgs) {
  try {
    const { address } = params;

    if (!address) {
      return new Response(JSON.stringify({ error: "Address is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate address format
    if (!algosdk.isValidAddress(address)) {
      return new Response(JSON.stringify({ 
        error: "Invalid Algorand address format" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get issuer status
    const status = await getIssuerStatus(address);

    if (!status) {
      return new Response(JSON.stringify({ 
        error: "Verifier not found in registry" 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return {
      success: true,
      issuer: status,
    };
  } catch (error: any) {
    console.error("Error querying issuer status:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to query issuer status" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
