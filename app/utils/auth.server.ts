/**
 * Authentication utilities for API key verification
 * Used by delegated verification providers
 */

import { getDatabase, ref, get, set, push } from 'firebase/database';
import { firebaseApp } from '~/firebase.config';
import crypto from 'crypto';

export interface Issuer {
  id: string;
  name: string;
  type: 'bank' | 'government' | 'employer' | 'university' | 'healthcare' | 'other';
  apiKey: string;
  active: boolean;
  createdAt: number;
  lastUsed?: number;
  metadata?: {
    contactEmail?: string;
    website?: string;
    ipWhitelist?: string[];
  };
}

/**
 * Verify an API key and return the associated issuer
 */
export async function verifyApiKey(apiKey: string): Promise<Issuer | null> {
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return null;
  }

  try {
    const db = getDatabase(firebaseApp);
    const issuersRef = ref(db, 'issuers');
    const snapshot = await get(issuersRef);

    if (!snapshot.exists()) {
      return null;
    }

    const issuers: Record<string, Issuer> = snapshot.val();
    const issuer = Object.values(issuers).find(
      (i) => i.apiKey === apiKey && i.active
    );

    if (issuer) {
      // Update last used timestamp
      await updateIssuerLastUsed(issuer.id);
    }

    return issuer || null;
  } catch (error) {
    console.error('[Auth] Error verifying API key:', error);
    return null;
  }
}

/**
 * Create a new issuer with API key
 * Note: This should be called via admin interface, not exposed publicly
 */
export async function createIssuer(issuerData: {
  name: string;
  type: Issuer['type'];
  contactEmail?: string;
  website?: string;
}): Promise<Issuer> {
  const db = getDatabase(firebaseApp);
  const issuersRef = ref(db, 'issuers');

  // Generate secure API key
  const apiKey = generateApiKey();

  const newIssuer: Omit<Issuer, 'id'> = {
    name: issuerData.name,
    type: issuerData.type,
    apiKey,
    active: true,
    createdAt: Date.now(),
    metadata: {
      contactEmail: issuerData.contactEmail,
      website: issuerData.website
    }
  };

  // Push to Firebase
  const newIssuerRef = push(issuersRef);
  const issuerId = newIssuerRef.key!;

  await set(newIssuerRef, { ...newIssuer, id: issuerId });

  return { ...newIssuer, id: issuerId };
}

/**
 * Update issuer's last used timestamp
 */
async function updateIssuerLastUsed(issuerId: string): Promise<void> {
  try {
    const db = getDatabase(firebaseApp);
    const issuerRef = ref(db, `issuers/${issuerId}/lastUsed`);
    await set(issuerRef, Date.now());
  } catch (error) {
    console.error('[Auth] Error updating last used:', error);
  }
}

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `sk_${environment}_${randomBytes}`;
}

/**
 * Deactivate an issuer (soft delete)
 */
export async function deactivateIssuer(issuerId: string): Promise<void> {
  const db = getDatabase(firebaseApp);
  const issuerRef = ref(db, `issuers/${issuerId}/active`);
  await set(issuerRef, false);
}

/**
 * List all issuers (admin only)
 */
export async function listIssuers(): Promise<Issuer[]> {
  const db = getDatabase(firebaseApp);
  const issuersRef = ref(db, 'issuers');
  const snapshot = await get(issuersRef);

  if (!snapshot.exists()) {
    return [];
  }

  const issuers: Record<string, Issuer> = snapshot.val();
  return Object.values(issuers);
}
