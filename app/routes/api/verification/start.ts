/**
 * POST /api/verification/start
 *
 * Create a new verification session and get auth token for mobile SDK
 */

import type { ActionFunctionArgs } from "react-router";
import type { CreateSessionResponse } from "~/types/verification";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Dynamic imports to prevent client bundling
    const { getProvider } = await import("~/utils/verification-providers");
    const { createVerificationSession } = await import("~/utils/verification.server");

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { provider: requestedProvider } = body;

    // Get provider instance
    const provider = getProvider(requestedProvider);

    // Create internal session ID first
    const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create verification session with provider
    const { authToken, providerSessionId } = await provider.createSession(tempSessionId);

    // Store session in database
    const session = await createVerificationSession(provider.name as any, providerSessionId);

    // Return session info and auth token for mobile SDK
    const response: CreateSessionResponse = {
      sessionId: session.id,
      authToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
      provider: session.provider,
      providerSessionId,  // Include for webhook testing
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error creating verification session:", error);
    return Response.json(
      {
        error: "Failed to create verification session",
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
