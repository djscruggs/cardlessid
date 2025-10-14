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
    const { authenticateRequestWithFallback, checkRateLimit } = await import("~/utils/api-auth.server");

    // Authenticate request
    // - Mobile clients MUST provide X-API-Key header
    // - Web app server-side routes can use environment variables
    const authResult = await authenticateRequestWithFallback(request);
    if (!authResult.success) {
      return Response.json({ error: authResult.error }, { status: 401 });
    }

    const { issuer, source } = authResult;
    console.log(`\n🔐 [VERIFICATION] Session start requested`);
    console.log(`   Authenticated via ${source}: ${issuer.name}`);

    // Check rate limit (only for API key users)
    if (source === "api-key" && issuer.rateLimit) {
      if (checkRateLimit(issuer.apiKey, issuer.rateLimit)) {
        return Response.json(
          {
            error: `Rate limit exceeded. Maximum ${issuer.rateLimit} requests per hour.`,
          },
          { status: 429 }
        );
      }
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { provider: requestedProvider } = body;

    console.log(`   Provider: ${requestedProvider || 'default (mock)'}`);

    // Get provider instance
    const provider = getProvider(requestedProvider);

    // Create internal session ID first
    const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create verification session with provider
    const { authToken, providerSessionId } = await provider.createSession(tempSessionId);

    // Store session in database
    const session = await createVerificationSession(provider.name as any, providerSessionId);

    console.log(`✓ [VERIFICATION] Session created`);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Provider Session: ${providerSessionId}`);
    console.log(`   Expires: ${new Date(session.expiresAt).toISOString()}`);

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
