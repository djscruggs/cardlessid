/**
 * API endpoint to verify metadata uniqueness (name + URL)
 * POST /api/issuer-registry/verify-metadata
 *
 * Validates that both name and URL are unique across all existing issuers
 */

import type { ActionFunctionArgs } from "react-router";
import { getAllIssuersFromRegistry } from "~/utils/issuer-registry";

function normalizeName(name: string): string {
  return name
    .trim()                    // Remove leading/trailing spaces
    .toLowerCase()            // Convert to lowercase
    .replace(/\s+/g, ' ');    // Normalize whitespace
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Normalize protocol (prefer https)
    const protocol = urlObj.protocol === 'http:' ? 'https:' : urlObj.protocol;
    
    // Normalize hostname (lowercase, remove www)
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // Keep path as-is (for now)
    const pathname = urlObj.pathname === '/' ? '' : urlObj.pathname;
    
    // Build normalized URL
    const normalized = `${protocol}//${hostname}${pathname}`;
    
    return normalized;
  } catch {
    return url; // Return original if invalid
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const excludeAddress = formData.get("excludeAddress") as string; // For updates

    // Validate name format
    if (!name || name.length < 3 || name.length > 64) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Name must be between 3 and 64 characters" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate URL format
    if (!url) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "URL is required" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Invalid URL format" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get all existing issuers
    const existingIssuers = await getAllIssuersFromRegistry();

    // Check name uniqueness
    const nameConflict = existingIssuers.find(issuer => {
      // Skip the issuer being updated
      if (excludeAddress && issuer.address === excludeAddress) {
        return false;
      }
      
      const existingName = issuer.metadata?.name || '';
      return normalizeName(existingName) === normalizeName(name);
    });

    if (nameConflict) {
      return {
        valid: false,
        error: `Name "${name}" is already taken by issuer ${nameConflict.address}`
      };
    }

    // Check URL uniqueness
    const urlConflict = existingIssuers.find(issuer => {
      // Skip the issuer being updated
      if (excludeAddress && issuer.address === excludeAddress) {
        return false;
      }
      
      const existingUrl = issuer.metadata?.website || '';
      return normalizeUrl(existingUrl) === normalizeUrl(url);
    });

    if (urlConflict) {
      return {
        valid: false,
        error: `URL "${url}" is already registered by issuer ${urlConflict.address}`
      };
    }

    return { 
      valid: true,
      name,
      url,
      message: "Name and URL are both valid and unique" 
    };

  } catch (error: any) {
    console.error("Error verifying metadata:", error);
    return new Response(JSON.stringify({
      valid: false, error: "Validation failed: " + error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
