/**
 * API Authentication Middleware
 * Handles API key validation and issuer credential extraction
 */

import { timingSafeEqual } from "crypto";
import type { ApiKeyConfig } from "~/config/api-keys.example";

export interface AuthenticatedIssuer {
  /** Client/Organization name */
  name: string;
  /** Contact email */
  contactEmail: string;
  /** Issuer Algorand wallet address */
  address: string;
  /** Issuer private key (base64 encoded) */
  privateKeyBase64: string;
  /** API key used (for logging) */
  apiKey: string;
  /** Rate limit (requests per hour) */
  rateLimit?: number;
}

/**
 * Simple API key authentication
 * Checks if the provided key matches MOBILE_API_KEY environment variable
 */
export async function authenticateApiKey(
  request: Request
): Promise<{ success: true; issuer: AuthenticatedIssuer } | { success: false; error: string }> {
  // Extract API key from header
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return {
      success: false,
      error: "Missing X-API-Key header. Mobile clients must provide an API key.",
    };
  }

  // Get expected API key from environment
  const expectedApiKey = process.env.MOBILE_API_KEY;

  if (!expectedApiKey) {
    console.error("[API Auth] MOBILE_API_KEY not configured in environment");
    return {
      success: false,
      error: "API key authentication is not configured on this server",
    };
  }

  // Validate API key using constant-time comparison to prevent timing attacks
  const apiKeyBuffer = Buffer.from(apiKey);
  const expectedKeyBuffer = Buffer.from(expectedApiKey);
  
  if (apiKeyBuffer.length !== expectedKeyBuffer.length || !timingSafeEqual(apiKeyBuffer, expectedKeyBuffer)) {
    console.warn(`[API Auth] Invalid API key attempted`);
    return {
      success: false,
      error: "Invalid API key",
    };
  }

  // Get issuer credentials from environment (use mobile-specific or fall back to main)
  const issuerAddress = process.env.MOBILE_ISSUER_ADDRESS || process.env.VITE_APP_WALLET_ADDRESS;
  const issuerPrivateKey = process.env.MOBILE_ISSUER_PRIVATE_KEY || process.env.ISSUER_PRIVATE_KEY;

  if (!issuerAddress || !issuerPrivateKey) {
    console.error("[API Auth] Issuer credentials not configured");
    return {
      success: false,
      error: "Issuer configuration is invalid. Contact support.",
    };
  }

  console.log(`[API Auth] ✓ Authenticated: Mobile Client (${issuerAddress.substring(0, 8)}...)`);

  // Create a stable hash of the API key for rate limiting (never log the actual key)
  const crypto = await import("crypto");
  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Return issuer credentials
  return {
    success: true,
    issuer: {
      name: "Mobile Client",
      contactEmail: process.env.MOBILE_API_CONTACT || "mobile@cardlessid.org",
      address: issuerAddress,
      privateKeyBase64: issuerPrivateKey,
      apiKey: apiKeyHash, // Use hash for rate limiting, never the actual key
      rateLimit: Number(process.env.MOBILE_API_RATE_LIMIT) || 1000,
    },
  };
}

/**
 * STRICT authentication - API key is REQUIRED
 * Use this for endpoints that mobile clients will call
 * Does NOT fall back to environment variables
 *
 * Mobile clients MUST provide an API key
 */
export async function authenticateApiRequest(
  request: Request
): Promise<
  | { success: true; issuer: AuthenticatedIssuer; source: "api-key" }
  | { success: false; error: string }
> {
  const authResult = await authenticateApiKey(request);
  if (!authResult.success) {
    return authResult;
  }
  return {
    success: true,
    issuer: authResult.issuer,
    source: "api-key",
  };
}

/**
 * FLEXIBLE authentication with environment variable fallback
 * Use this for endpoints that can be called by both:
 * 1. Mobile clients with API keys
 * 2. Internal web app server-side routes (uses env vars)
 *
 * Returns issuer credentials from API key OR from environment variables
 */
export async function authenticateRequestWithFallback(
  request: Request
): Promise<
  | { success: true; issuer: AuthenticatedIssuer; source: "api-key" | "env" }
  | { success: false; error: string }
> {
  // Check for API key first
  const apiKeyHeader = request.headers.get("X-API-Key");

  if (apiKeyHeader) {
    // API key provided - authenticate with API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.success) {
      return authResult;
    }
    return {
      success: true,
      issuer: authResult.issuer,
      source: "api-key",
    };
  }

  // No API key - fallback to environment variables (for web app / internal use)
  const envIssuerAddress = process.env.VITE_APP_WALLET_ADDRESS;
  const envIssuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;

  if (!envIssuerAddress || !envIssuerPrivateKey) {
    return {
      success: false,
      error:
        "Authentication required. Mobile clients must provide X-API-Key header. Contact https://cardlessid.org/contact to request an API key.",
    };
  }

  console.log(
    `[API Auth] ✓ Using environment variables for internal web app: ${envIssuerAddress.substring(0, 8)}...`
  );

  return {
    success: true,
    issuer: {
      name: "Web App (Internal)",
      contactEmail: "internal",
      address: envIssuerAddress,
      privateKeyBase64: envIssuerPrivateKey,
      apiKey: "env",
      rateLimit: undefined, // No rate limit for internal use
    },
    source: "env",
  };
}

/**
 * DEPRECATED: Use authenticateApiRequest() or authenticateRequestWithFallback() instead
 * This is kept for backward compatibility but will be removed in future versions
 */
export const authenticateRequest = authenticateRequestWithFallback;

/**
 * Simple rate limiting check
 * Returns true if rate limit exceeded, false otherwise
 *
 * NOTE: This is a basic in-memory rate limiter. For production with multiple
 * server instances, consider using Redis or similar distributed cache.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(apiKey: string, limit: number): boolean {
  if (limit === 0) return false; // 0 = unlimited

  const now = Date.now();
  const hourStart = Math.floor(now / 3600000) * 3600000; // Start of current hour
  const resetAt = hourStart + 3600000; // End of current hour

  const stored = rateLimitStore.get(apiKey);

  if (!stored || stored.resetAt !== resetAt) {
    // New hour, reset counter
    rateLimitStore.set(apiKey, { count: 1, resetAt });
    return false;
  }

  if (stored.count >= limit) {
    console.warn(`[API Auth] Rate limit exceeded`);
    return true; // Rate limit exceeded
  }

  // Increment counter
  stored.count++;
  return false;
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 3600000);
}
