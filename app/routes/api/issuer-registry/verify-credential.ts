/**
 * API endpoint to verify a credential's validity
 * POST /api/issuer-registry/verify-credential
 */

import type { ActionFunctionArgs } from "react-router";
import { verifyCredentialValidity } from "~/utils/issuer-registry";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const credentialId = formData.get("credentialId") as string;
    const issuerAddress = formData.get("issuerAddress") as string;
    const issuanceDate = formData.get("issuanceDate") as string;

    if (!credentialId || !issuerAddress || !issuanceDate) {
      return new Response(JSON.stringify(
        {
          error:
            "credentialId, issuerAddress, and issuanceDate are required",
        },
      { status: 400 }
    ), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
    }

    // Parse issuance date
    const issuanceDateObj = new Date(issuanceDate);
    if (isNaN(issuanceDateObj.getTime())) {
      return new Response(JSON.stringify(
        { error: "Invalid issuanceDate format" },
      { status: 400 }
    ), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
    }

    // Verify credential
    const result = await verifyCredentialValidity(
      credentialId,
      issuerAddress,
      issuanceDateObj
    );

    return {
      success: true,
      valid: result.valid,
      reason: result.reason,
      credentialId,
      issuerAddress,
      issuanceDate,
    };
  } catch (error: any) {
    console.error("Error verifying credential:", error);
    return new Response(JSON.stringify(
      { error: error.message || "Failed to verify credential" },
      { status: 500 }
    ), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
