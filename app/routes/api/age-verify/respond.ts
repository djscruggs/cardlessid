import type { Route } from "./+types/respond";
import {
  getAgeVerificationSession,
  approveAgeVerificationSession,
  rejectAgeVerificationSession,
} from "~/utils/age-verification.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { sessionId, approved, walletAddress } = body;

    if (!sessionId) {
      return Response.json({ error: "Session ID required" }, { status: 400 });
    }

    if (typeof approved !== "boolean") {
      return Response.json(
        { error: "Approved parameter must be a boolean" },
        { status: 400 }
      );
    }

    // Verify session exists and is still pending
    const session = await getAgeVerificationSession(sessionId);

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "pending") {
      return Response.json(
        { error: "Session is no longer pending" },
        { status: 400 }
      );
    }

    if (Date.now() > session.expiresAt) {
      return Response.json({ error: "Session has expired" }, { status: 400 });
    }

    // Update session based on approval
    if (approved) {
      if (!walletAddress) {
        return Response.json(
          { error: "Wallet address required for approval" },
          { status: 400 }
        );
      }
      await approveAgeVerificationSession(sessionId, walletAddress);
    } else {
      await rejectAgeVerificationSession(sessionId);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error responding to age verification:", error);
    return Response.json(
      { error: "Failed to process verification response" },
      { status: 500 }
    );
  }
}
