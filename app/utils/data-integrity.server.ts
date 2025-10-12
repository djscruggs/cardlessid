/**
 * Data Integrity Utilities
 * Provides HMAC-based verification to ensure verified identity data
 * hasn't been tampered with between verification and credential issuance
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { VerifiedIdentity } from '~/types/verification';

const HMAC_SECRET = process.env.DATA_INTEGRITY_SECRET || process.env.SESSION_SECRET;

if (!HMAC_SECRET) {
  console.warn('⚠️  DATA_INTEGRITY_SECRET not set - using SESSION_SECRET fallback');
}

/**
 * Generate HMAC hash of verified identity data
 * @param data Verified identity data from document processing
 * @returns HMAC signature as hex string
 */
export function generateDataHMAC(data: Partial<VerifiedIdentity>): string {
  if (!HMAC_SECRET) {
    throw new Error('DATA_INTEGRITY_SECRET or SESSION_SECRET environment variable required');
  }

  // Create deterministic string from data (order matters)
  const dataString = [
    data.firstName || '',
    data.middleName || '',
    data.lastName || '',
    data.birthDate || '',
    data.governmentId || '',
    data.idType || '',
    data.state || '',
    data.expirationDate || ''
  ].join('|');

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
  if (!HMAC_SECRET) {
    throw new Error('DATA_INTEGRITY_SECRET or SESSION_SECRET environment variable required');
  }

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
 * @param sessionId Verification session ID
 * @param dataHmac HMAC of the verified data
 * @returns Signed token to send to client
 */
export function createVerificationToken(
  sessionId: string,
  dataHmac: string
): string {
  const tokenData = `${sessionId}:${dataHmac}`;
  const signature = createHmac('sha256', HMAC_SECRET!)
    .update(tokenData)
    .digest('hex');
  
  // Format: sessionId:dataHmac:signature
  return `${tokenData}:${signature}`;
}

/**
 * Verify and parse a verification token
 * @param token Token from client
 * @returns Parsed sessionId and dataHmac if valid, null if invalid
 */
export function verifyVerificationToken(
  token: string
): { sessionId: string; dataHmac: string } | null {
  if (!HMAC_SECRET) {
    throw new Error('DATA_INTEGRITY_SECRET or SESSION_SECRET environment variable required');
  }

  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return null;
    }

    const [sessionId, dataHmac, providedSignature] = parts;
    
    // Re-compute signature
    const tokenData = `${sessionId}:${dataHmac}`;
    const expectedSignature = createHmac('sha256', HMAC_SECRET)
      .update(tokenData)
      .digest('hex');

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      return null;
    }

    return { sessionId, dataHmac };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

