/**
 * GET /api/verification/status/:id
 *
 * Check status of a verification session
 * Mobile app can poll this endpoint to check if verification is complete
 */

import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;

  if (!id) {
    return Response.json({ error: "Session ID required" }, { status: 400 });
  }

  try {
    // Dynamic import
    const { getVerificationSession } = await import("~/utils/verification.server");

    console.log(`🔍 [STATUS] Checking session: ${id}`);

    // Get session
    const session = await getVerificationSession(id);

    if (!session) {
      console.log(`❌ [STATUS] Session not found: ${id}`);
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const ready = session.status === "approved" && !session.credentialIssued;

    console.log(`✓ [STATUS] Session ${id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Ready for credential: ${ready}`);
    console.log(`   Credential issued: ${session.credentialIssued || false}`);

    // Return session status
    return Response.json({
      sessionId: session.id,
      status: session.status,
      provider: session.provider,
      ready,
      expiresAt: new Date(session.expiresAt).toISOString(),
      credentialIssued: session.credentialIssued || false,
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    return Response.json(
      {
        error: "Failed to check verification status",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Prevent POST requests
export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
