/**
 * Firebase helpers for age verification sessions
 * Manages age verification demo session lifecycle in Firebase Realtime Database
 */

import { db } from "./firebase.server";

const SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const DATA_RETENTION_MS = 60 * 60 * 1000; // 1 hour — retention limit

export interface AgeVerificationSession {
  id: string;
  minAge: number;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: number;
  expiresAt: number;
  walletAddress?: string;
}

/**
 * Create a new age verification session
 */
export async function createAgeVerificationSession(
  minAge: number
): Promise<AgeVerificationSession> {
  const now = Date.now();
  const session: AgeVerificationSession = {
    id: `age_${now}_${Math.random().toString(36).substring(7)}`,
    minAge,
    status: "pending",
    createdAt: now,
    expiresAt: now + SESSION_EXPIRY_MS,
  };

  const sessionRef = db.ref(`ageVerificationSessions/${session.id}`);
  await sessionRef.set(session);
  return session;
}

/**
 * Get age verification session by ID
 */
export async function getAgeVerificationSession(
  sessionId: string
): Promise<AgeVerificationSession | null> {
  const sessionRef = db.ref(`ageVerificationSessions/${sessionId}`);
  const snapshot = await sessionRef.get();

  if (!snapshot.exists()) {
    return null;
  }

  const session = snapshot.val() as AgeVerificationSession;

  // Delete and return null if past data retention period
  if (Date.now() > session.createdAt + DATA_RETENTION_MS) {
    await sessionRef.remove();
    return null;
  }

  // Delete terminal sessions — flow is complete, no need to retain
  if (session.status === "approved" || session.status === "rejected") {
    await sessionRef.remove();
    return session;
  }

  // Check if expired
  if (Date.now() > session.expiresAt && session.status === "pending") {
    await updateAgeVerificationSession(sessionId, { status: "expired" });
    return { ...session, status: "expired" };
  }

  return session;
}

/**
 * Update age verification session
 */
export async function updateAgeVerificationSession(
  sessionId: string,
  updates: Partial<AgeVerificationSession>
): Promise<void> {
  const sessionRef = db.ref(`ageVerificationSessions/${sessionId}`);
  await sessionRef.update(updates);
}

/**
 * Approve age verification session
 */
export async function approveAgeVerificationSession(
  sessionId: string,
  walletAddress: string
): Promise<void> {
  await updateAgeVerificationSession(sessionId, {
    status: "approved",
    walletAddress,
  });
}

/**
 * Reject age verification session
 */
export async function rejectAgeVerificationSession(
  sessionId: string
): Promise<void> {
  await updateAgeVerificationSession(sessionId, {
    status: "rejected",
  });
}

/**
 * Delete all ageVerificationSessions older than the data retention period.
 * Call from a scheduled job for proactive cleanup independent of read-path deletion.
 * Returns the number of sessions deleted.
 */
export async function purgeExpiredAgeVerificationSessions(): Promise<number> {
  const sessionsRef = db.ref("ageVerificationSessions");
  const snapshot = await sessionsRef.get();

  if (!snapshot.exists()) {
    return 0;
  }

  const cutoff = Date.now() - DATA_RETENTION_MS;
  const deletions: Promise<void>[] = [];

  snapshot.forEach((child) => {
    const session = child.val() as AgeVerificationSession;
    if (
      session.createdAt < cutoff ||
      session.status === "approved" ||
      session.status === "rejected"
    ) {
      deletions.push(db.ref(`ageVerificationSessions/${child.key}`).remove());
    }
  });

  await Promise.all(deletions);
  return deletions.length;
}
