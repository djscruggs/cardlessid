/**
 * CORS Configuration
 * Restricts API access to authorized origins only
 */

// Allowed origins for API requests
const ALLOWED_ORIGINS = [
  process.env.VITE_APP_URL,
  process.env.ALLOWED_MOBILE_ORIGIN,
  'https://cardlessid.org',
  'https://www.cardlessid.org',
  // Add your mobile app origins here
].filter(Boolean) as string[];

// In development, allow localhost
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push(
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  );
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Set CORS headers on response for API endpoints
 * Returns null if origin is not allowed
 */
export function setCorsHeaders(
  request: Request,
  options: {
    allowPublic?: boolean; // Allow public access (e.g., for schema endpoints)
  } = {}
): Record<string, string> | null {
  const origin = request.headers.get('Origin');

  // Public endpoints allow all origins
  if (options.allowPublic) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  // Protected endpoints only allow whitelisted origins
  if (!origin || !isOriginAllowed(origin)) {
    // No CORS headers = browser will block cross-origin requests
    return null;
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight OPTIONS request
 */
export function handleCorsPreflightRequest(
  request: Request,
  options: { allowPublic?: boolean } = {}
): Response | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const headers = setCorsHeaders(request, options);
  
  if (!headers) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}
