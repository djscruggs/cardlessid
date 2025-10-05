import type { Route } from "./+types/respond";
import {
  getIntegratorChallenge,
  approveIntegratorChallenge,
  rejectIntegratorChallenge,
} from "~/utils/integrator-challenges.server";

/**
 * Handle wallet response to an integrator challenge
 * Called by the wallet when user approves/rejects age verification
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { challengeId, approved, walletAddress } = body;

    if (!challengeId) {
      return Response.json({ error: "Challenge ID required" }, { status: 400 });
    }

    if (typeof approved !== "boolean") {
      return Response.json(
        { error: "Approved parameter must be a boolean" },
        { status: 400 }
      );
    }

    // Verify challenge exists and is still pending
    const challenge = await getIntegratorChallenge(challengeId);

    if (!challenge) {
      return Response.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.status !== "pending") {
      return Response.json(
        { error: "Challenge is no longer pending" },
        { status: 400 }
      );
    }

    if (Date.now() > challenge.expiresAt) {
      return Response.json({ error: "Challenge has expired" }, { status: 400 });
    }

    // Update challenge based on approval
    if (approved) {
      if (!walletAddress) {
        return Response.json(
          { error: "Wallet address required for approval" },
          { status: 400 }
        );
      }
      await approveIntegratorChallenge(challengeId, walletAddress);
    } else {
      await rejectIntegratorChallenge(challengeId);
    }

    // TODO: If challenge has callbackUrl, notify the integrator
    if (challenge.callbackUrl) {
      // Fire and forget - don't wait for callback
      notifyIntegrator(challenge.callbackUrl, {
        challengeId,
        approved,
        walletAddress: approved ? walletAddress : undefined,
        timestamp: Date.now(),
      }).catch((err) => {
        console.error("Failed to notify integrator:", err);
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error responding to integrator challenge:", error);
    return Response.json(
      { error: "Failed to process verification response" },
      { status: 500 }
    );
  }
}

/**
 * Notify integrator via callback URL (optional webhook)
 */
async function notifyIntegrator(
  callbackUrl: string,
  data: {
    challengeId: string;
    approved: boolean;
    walletAddress?: string;
    timestamp: number;
  }
): Promise<void> {
  try {
    await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "CardlessID/1.0",
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Log but don't throw - callback is optional
    console.error("Callback notification failed:", error);
  }
}
