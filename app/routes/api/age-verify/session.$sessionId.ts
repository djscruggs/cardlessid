import type { Route } from "./+types/session.$sessionId";
import { getAgeVerificationSession } from "~/utils/age-verification.server";

export async function loader({ params }: Route.LoaderArgs) {
  const { sessionId } = params;

  if (!sessionId) {
    return Response.json({ error: "Session ID required" }, { status: 400 });
  }

  try {
    const session = await getAgeVerificationSession(sessionId);

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json(session);
  } catch (error) {
    console.error("Error fetching age verification session:", error);
    return Response.json(
      { error: "Failed to fetch verification session" },
      { status: 500 }
    );
  }
}
