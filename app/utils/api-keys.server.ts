/**
 * API Key management for integrators
 * Handles authentication and authorization for external integrators
 */

import { db } from "./firebase.server";
import crypto from "crypto";

export interface Integrator {
  id: string;
  name: string;
  apiKey: string;
  createdAt: number;
  active: boolean;
  domain?: string; // Optional domain restriction
}

/**
 * Validate API key and return integrator if valid
 */
export async function validateApiKey(
  apiKey: string
): Promise<Integrator | null> {
  if (!apiKey || typeof apiKey !== "string") {
    return null;
  }

  // Query Firebase for integrator with this API key
  const integratorsRef = db.ref("integrators");
  const snapshot = await integratorsRef
    .orderByChild("apiKey")
    .equalTo(apiKey)
    .limitToFirst(1)
    .get();

  if (!snapshot.exists()) {
    return null;
  }

  const integrators = snapshot.val();
  const integratorId = Object.keys(integrators)[0];
  const integrator = integrators[integratorId] as Integrator;

  // Check if active
  if (!integrator.active) {
    return null;
  }

  return { ...integrator, id: integratorId };
}

/**
 * Create a new integrator with API key
 * (Admin function - would typically be called via admin panel)
 */
export async function createIntegrator(params: {
  name: string;
  domain?: string;
}): Promise<Integrator> {
  const now = Date.now();
  const apiKey = generateApiKey();

  const integrator: Omit<Integrator, "id"> = {
    name: params.name,
    apiKey,
    createdAt: now,
    active: true,
    domain: params.domain,
  };

  const integratorRef = db.ref("integrators").push();
  await integratorRef.set(integrator);

  return {
    ...integrator,
    id: integratorRef.key!,
  };
}

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  // Generate 32 bytes of random data and encode as base64
  const buffer = crypto.randomBytes(32);
  return `cid_${buffer.toString("base64url")}`;
}

/**
 * Revoke an API key (deactivate integrator)
 */
export async function revokeApiKey(integratorId: string): Promise<void> {
  const integratorRef = db.ref(`integrators/${integratorId}`);
  await integratorRef.update({ active: false });
}

/**
 * List all integrators (admin function)
 */
export async function listIntegrators(): Promise<Integrator[]> {
  const integratorsRef = db.ref("integrators");
  const snapshot = await integratorsRef.get();

  if (!snapshot.exists()) {
    return [];
  }

  const integrators = snapshot.val();
  return Object.keys(integrators).map((id) => ({
    ...integrators[id],
    id,
  }));
}
