import type { Route } from "./+types/verify.$challengeId";
import { getIntegratorChallenge } from "~/utils/integrator-challenges.server";
import { validateApiKey } from "~/utils/api-keys.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { challengeId } = params;

  if (!challengeId) {
    return Response.json({ error: "Challenge ID required" }, { status: 400 });
  }

  try {
    // Validate API key from header
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) {
      return Response.json(
        { error: "API key required in X-API-Key header" },
        { status: 401 }
      );
    }

    const integrator = await validateApiKey(apiKey);
    if (!integrator) {
      return Response.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Get challenge
    const challenge = await getIntegratorChallenge(challengeId);

    if (!challenge) {
      return Response.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Verify integrator owns this challenge
    if (challenge.integratorId !== integrator.id) {
      return Response.json(
        { error: "Challenge does not belong to this integrator" },
        { status: 403 }
      );
    }

    // Return challenge status
    return Response.json({
      challengeId: challenge.id,
      status: challenge.status,
      minAge: challenge.minAge,
      verified: challenge.status === "approved",
      walletAddress: challenge.walletAddress,
      createdAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
      respondedAt: challenge.respondedAt,
    });
  } catch (error) {
    console.error("Error verifying challenge:", error);
    return Response.json(
      { error: "Failed to verify challenge" },
      { status: 500 }
    );
  }
}
