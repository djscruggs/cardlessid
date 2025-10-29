/**
 * Data Integrity Utilities
 * Provides HMAC-based verification to ensure verified identity data
 * hasn't been tampered with between verification and credential issuance
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { VerifiedIdentity } from '~/types/verification';

// Require dedicated secret - no fallbacks for security
const HMAC_SECRET = process.env.DATA_INTEGRITY_SECRET || process.env.HMAC_SECRET;

if (!HMAC_SECRET) {
  throw new Error('DATA_INTEGRITY_SECRET or HMAC_SECRET environment variable is required');
}

// Token expiration time in milliseconds (10 minutes)
const TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Generate HMAC hash of verified identity data
 * Uses canonical JSON serialization to prevent delimiter collisions
 * @param data Verified identity data from document processing
 * @returns HMAC signature as hex string
 */
export function generateDataHMAC(data: Partial<VerifiedIdentity>): string {
  // Use canonical JSON object with fixed key order (prevents collisions)
  const canonicalData = {
    birthDate: data.birthDate || '',
    expirationDate: data.expirationDate || '',
    firstName: data.firstName || '',
    governmentId: data.governmentId || '',
    idType: data.idType || '',
    lastName: data.lastName || '',
    middleName: data.middleName || '',
    state: data.state || '',
  };

  const dataString = JSON.stringify(canonicalData);
  const hmac = createHmac('sha256', HMAC_SECRET);
  hmac.update(dataString);
  return hmac.digest('hex');
}

/**
 * Verify HMAC hash matches the provided data
 * Uses timing-safe comparison to prevent timing attacks
 * @param data Identity data to verify
 * @param providedHmac HMAC signature from client
 * @returns true if data is authentic and unmodified
 */
export function verifyDataHMAC(
  data: Partial<VerifiedIdentity>,
  providedHmac: string
): boolean {
  try {
    const expectedHmac = generateDataHMAC(data);
    
    // Convert to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');
    const providedBuffer = Buffer.from(providedHmac, 'hex');

    // Length must match for timing-safe comparison
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Create a signed verification token containing sessionId and data hash
 * This prevents session hijacking and data tampering
 * Includes timestamp for expiration checking
 * @param sessionId Verification session ID
 * @param dataHmac HMAC of the verified data
 * @returns Signed token to send to client
 */
export function createVerificationToken(
  sessionId: string,
  dataHmac: string
): string {
  const timestamp = Date.now();
  const tokenData = `${sessionId}:${dataHmac}:${timestamp}`;
  const signature = createHmac('sha256', HMAC_SECRET)
    .update(tokenData)
    .digest('hex');
  
  // Format: sessionId:dataHmac:timestamp:signature
  return `${tokenData}:${signature}`;
}

/**
 * Verify and parse a verification token
 * Checks signature and expiration time
 * @param token Token from client
 * @returns Parsed sessionId and dataHmac if valid, null if invalid or expired
 */
export function verifyVerificationToken(
  token: string
): { sessionId: string; dataHmac: string } | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 4) {
      console.error('Token verification failed: invalid format');
      return null;
    }

    const [sessionId, dataHmac, timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    if (isNaN(timestamp)) {
      console.error('Token verification failed: invalid timestamp');
      return null;
    }
    
    // Check expiration (10 minutes)
    const now = Date.now();
    if (now - timestamp > TOKEN_TTL_MS) {
      console.error('Token verification failed: token expired');
      return null;
    }
    
    // Re-compute signature
    const tokenData = `${sessionId}:${dataHmac}:${timestamp}`;
    const expectedSignature = createHmac('sha256', HMAC_SECRET)
      .update(tokenData)
      .digest('hex');

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      console.error('Token verification failed: signature length mismatch');
      return null;
    }

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      console.error('Token verification failed: signature mismatch');
      return null;
    }

    return { sessionId, dataHmac };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

