import type { Route } from "./+types/details.$challengeId";
import { getIntegratorChallenge } from "~/utils/integrator-challenges.server";

/**
 * Public endpoint to get challenge details (minAge only)
 * Used by the verification page to display the age requirement
 */
export async function loader({ params }: Route.LoaderArgs) {
  const { challengeId } = params;

  if (!challengeId) {
    return Response.json({ error: "Challenge ID required" }, { status: 400 });
  }

  try {
    const challenge = await getIntegratorChallenge(challengeId);

    if (!challenge) {
      return Response.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Only return public information
    return Response.json({
      challengeId: challenge.id,
      minAge: challenge.minAge,
      status: challenge.status,
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching challenge details:", error);
    return Response.json(
      { error: "Failed to fetch challenge details" },
      { status: 500 }
    );
  }
}
