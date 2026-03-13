/**
 * Geo-restriction utilities
 * Uses Vercel's built-in x-vercel-ip-country header — no API key required.
 * Falls back gracefully in local dev (no header present = allow).
 */

// EU member states + Iceland, Liechtenstein, Norway (full EEA)
const EEA_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  "FR", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU",
  "LV", "MT", "NL", "NO", "PL", "PT", "RO", "SE", "SI", "SK",
]);

/**
 * Returns the ISO 3166-1 alpha-2 country code from the request headers,
 * or null if not available (e.g. local dev).
 */
export function getCountryCode(request: Request): string | null {
  return (
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null
  );
}

/**
 * Returns true if the request originates from an EU/EEA country.
 * Returns false in local dev (no geo header present).
 */
export function isEEARequest(request: Request): boolean {
  const country = getCountryCode(request);
  if (!country) return false;
  return EEA_COUNTRY_CODES.has(country.toUpperCase());
}
