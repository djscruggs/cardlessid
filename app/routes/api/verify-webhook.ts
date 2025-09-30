import type { ActionFunctionArgs } from "react-router";
import { saveVerification } from "~/utils/firebase.server";

/**
 * Webhook endpoint for Veriff/Prove verification completion
 *
 * Expected payload from verification provider:
 * {
 *   walletAddress: string,
 *   verified: boolean,
 *   provider: 'veriff' | 'prove',
 *   sessionId: string,
 *   timestamp: number
 * }
 *
 * TODO: Add webhook signature verification for security
 * TODO: Configure provider-specific payload parsing
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const payload = await request.json();

    // Validate required fields
    const { walletAddress, verified, provider } = payload;

    if (!walletAddress) {
      return Response.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    if (typeof verified !== "boolean") {
      return Response.json({ error: "Missing or invalid verified status" }, { status: 400 });
    }

    // Only save if verification was successful
    if (verified) {
      await saveVerification(walletAddress, false); // credentialIssued will be set to true later

      return {
        success: true,
        message: "Verification recorded successfully",
        walletAddress,
      };
    } else {
      return Response.json({
        success: false,
        message: "Verification failed",
        walletAddress,
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Webhook processing error:", error);
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function loader() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
