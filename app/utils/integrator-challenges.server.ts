/**
 * Firebase helpers for integrator challenge management
 * Manages age verification challenges created by external integrators
 */

import { db } from "./firebase.server";

const CHALLENGE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface IntegratorChallenge {
  id: string;
  integratorId: string;
  minAge: number;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: number;
  expiresAt: number;
  callbackUrl?: string;
  walletAddress?: string;
  respondedAt?: number;
}

interface CreateChallengeParams {
  integratorId: string;
  minAge: number;
  callbackUrl?: string;
}

/**
 * Create a new integrator challenge
 */
export async function createIntegratorChallenge(
  params: CreateChallengeParams
): Promise<IntegratorChallenge> {
  const now = Date.now();
  const challenge: IntegratorChallenge = {
    id: `chal_${now}_${Math.random().toString(36).substring(2, 15)}`,
    integratorId: params.integratorId,
    minAge: params.minAge,
    status: "pending",
    createdAt: now,
    expiresAt: now + CHALLENGE_EXPIRY_MS,
    callbackUrl: params.callbackUrl,
  };

  const challengeRef = db.ref(`integratorChallenges/${challenge.id}`);
  await challengeRef.set(challenge);
  return challenge;
}

/**
 * Get integrator challenge by ID
 */
export async function getIntegratorChallenge(
  challengeId: string
): Promise<IntegratorChallenge | null> {
  const challengeRef = db.ref(`integratorChallenges/${challengeId}`);
  const snapshot = await challengeRef.get();

  if (!snapshot.exists()) {
    return null;
  }

  const challenge = snapshot.val() as IntegratorChallenge;

  // Check if expired
  if (Date.now() > challenge.expiresAt && challenge.status === "pending") {
    await updateIntegratorChallenge(challengeId, { status: "expired" });
    return { ...challenge, status: "expired" };
  }

  return challenge;
}

/**
 * Update integrator challenge
 */
export async function updateIntegratorChallenge(
  challengeId: string,
  updates: Partial<IntegratorChallenge>
): Promise<void> {
  const challengeRef = db.ref(`integratorChallenges/${challengeId}`);
  await challengeRef.update(updates);
}

/**
 * Approve integrator challenge (called when wallet responds)
 */
export async function approveIntegratorChallenge(
  challengeId: string,
  walletAddress: string
): Promise<void> {
  await updateIntegratorChallenge(challengeId, {
    status: "approved",
    walletAddress,
    respondedAt: Date.now(),
  });
}

/**
 * Reject integrator challenge (called when wallet rejects)
 */
export async function rejectIntegratorChallenge(
  challengeId: string
): Promise<void> {
  await updateIntegratorChallenge(challengeId, {
    status: "rejected",
    respondedAt: Date.now(),
  });
}
