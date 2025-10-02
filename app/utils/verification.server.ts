/**
 * Firebase helpers for verification sessions
 * Manages verification session lifecycle in Firebase Realtime Database
 */

import { db } from "./firebase.server";
import type { VerificationSession, VerificationStatus, VerificationProvider } from "~/types/verification";

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Create a new verification session
 */
export async function createVerificationSession(
  provider: VerificationProvider,
  providerSessionId: string
): Promise<VerificationSession> {
  const now = Date.now();
  const session: VerificationSession = {
    id: `session_${now}_${Math.random().toString(36).substring(7)}`,
    provider,
    status: "pending",
    createdAt: now,
    expiresAt: now + SESSION_EXPIRY_MS,
    providerSessionId,
  };

  const sessionRef = db.ref(`verificationSessions/${session.id}`);
  await sessionRef.set(session);
  return session;
}

/**
 * Get verification session by ID
 */
export async function getVerificationSession(
  sessionId: string
): Promise<VerificationSession | null> {
  const sessionRef = db.ref(`verificationSessions/${sessionId}`);
  const snapshot = await sessionRef.get();

  if (!snapshot.exists()) {
    return null;
  }

  const session = snapshot.val() as VerificationSession;

  // Check if expired
  if (Date.now() > session.expiresAt && session.status === "pending") {
    await updateVerificationSession(sessionId, { status: "expired" });
    return { ...session, status: "expired" };
  }

  return session;
}

/**
 * Get session by provider's session ID
 * Uses full scan to avoid index requirement (acceptable for low volume)
 */
export async function getVerificationSessionByProvider(
  providerSessionId: string
): Promise<VerificationSession | null> {
  const sessionsRef = db.ref("verificationSessions");
  const snapshot = await sessionsRef.get();

  if (!snapshot.exists()) {
    return null;
  }

  // Scan all sessions to find matching providerSessionId
  let foundSession: VerificationSession | null = null;
  snapshot.forEach((child) => {
    const session = child.val() as VerificationSession;
    if (session.providerSessionId === providerSessionId) {
      foundSession = session;
      return true; // Stop iteration
    }
  });

  return foundSession;
}

/**
 * Update verification session
 */
export async function updateVerificationSession(
  sessionId: string,
  updates: Partial<VerificationSession>
): Promise<void> {
  const sessionRef = db.ref(`verificationSessions/${sessionId}`);
  await sessionRef.update(updates);
}

/**
 * Mark session as having issued a credential
 */
export async function markSessionCredentialIssued(
  sessionId: string,
  walletAddress: string
): Promise<void> {
  await updateVerificationSession(sessionId, {
    credentialIssued: true,
    walletAddress,
  });
}

/**
 * Check if session is valid and approved for credential issuance
 */
export function isSessionValidForCredential(session: VerificationSession): {
  valid: boolean;
  error?: string;
} {
  if (!session) {
    return { valid: false, error: "Session not found" };
  }

  if (session.status !== "approved") {
    return { valid: false, error: `Session status is ${session.status}` };
  }

  if (Date.now() > session.expiresAt) {
    return { valid: false, error: "Session has expired" };
  }

  if (session.credentialIssued) {
    return { valid: false, error: "Credential already issued for this session" };
  }

  if (!session.verifiedData) {
    return { valid: false, error: "No verified data in session" };
  }

  return { valid: true };
}
