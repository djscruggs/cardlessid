/**
 * POST /api/verification/webhook
 *
 * Receive verification status updates from providers
 * This endpoint is called by the verification provider when verification completes
 */

import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Dynamic imports
    const { getProvider } = await import("~/utils/verification-providers");
    const {
      getVerificationSessionByProvider,
      updateVerificationSession,
    } = await import("~/utils/verification.server");

    // Get provider from query param or header
    const url = new URL(request.url);
    const providerName = url.searchParams.get("provider") || "mock";

    console.log(`\n📨 [WEBHOOK] Received from provider: ${providerName}`);

    // Get provider instance
    const provider = getProvider(providerName as any);

    // Validate webhook signature
    const isValid = await provider.validateWebhook(request);
    if (!isValid) {
      console.error(`❌ [WEBHOOK] Invalid signature from ${providerName}`);
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log(`✓ [WEBHOOK] Signature validated`);

    // Parse webhook body
    const body = await request.json();
    const webhookData = provider.parseWebhookData(body);

    console.log(`📋 [WEBHOOK] Data parsed`);
    console.log(`   Provider Session: ${webhookData.providerSessionId}`);
    console.log(`   Status: ${webhookData.status}`);
    if (webhookData.verifiedData) {
      console.log(`   User: ${webhookData.verifiedData.firstName} ${webhookData.verifiedData.lastName}`);
    }

    // Find session by provider's session ID
    const session = await getVerificationSessionByProvider(webhookData.providerSessionId);

    if (!session) {
      console.error(`❌ [WEBHOOK] Session not found for provider ID: ${webhookData.providerSessionId}`);
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    console.log(`✓ [WEBHOOK] Session found: ${session.id}`);

    // Update session with verification results
    // Filter out undefined values (Firebase doesn't accept them)
    const updateData: any = {
      status: webhookData.status,
    };

    if (webhookData.verifiedData !== undefined) {
      updateData.verifiedData = webhookData.verifiedData;
    }

    if (webhookData.metadata !== undefined) {
      updateData.providerMetadata = webhookData.metadata;
    }

    await updateVerificationSession(session.id, updateData);

    console.log(`✅ [WEBHOOK] Session ${session.id} updated to: ${webhookData.status}`);

    // Return success response
    return Response.json({
      success: true,
      sessionId: session.id,
      status: webhookData.status,
    });
  } catch (error) {
    console.error("Error processing verification webhook:", error);
    return Response.json(
      {
        error: "Failed to process webhook",
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
