import type { LoaderFunctionArgs } from "react-router";
import CardlessCredential from "~/components/credentials/w3c-minimal";

/**
 * Public endpoint for Cardless ID credential schema
 *
 * GET /api/credential-schema
 *
 * Returns the W3C Verifiable Credential schema used by Cardless ID.
 * Third parties can use this to understand the credential structure
 * for verification and extension purposes.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return Response.json({
    schema: CardlessCredential,
    version: "1.0.0",
    documentation: "https://cardlessid.org/docs/credential-schema",
    description: "Cardless ID uses W3C Verifiable Credentials with hashed personal information for privacy-preserving age verification.",
    fields: {
      "cardless:governmentIdHash": {
        type: "string",
        description: "SHA-256 hash of government-issued ID number",
        purpose: "Duplicate detection and fraud prevention"
      },
      "cardless:firstNameHash": {
        type: "string",
        description: "SHA-256 hash of first name",
        purpose: "Privacy-preserving identity verification"
      },
      "cardless:middleNameHash": {
        type: "string",
        description: "SHA-256 hash of middle name (empty string if none)",
        purpose: "Privacy-preserving identity verification"
      },
      "cardless:lastNameHash": {
        type: "string",
        description: "SHA-256 hash of last name",
        purpose: "Privacy-preserving identity verification"
      },
      "cardless:birthDateHash": {
        type: "string",
        description: "SHA-256 hash of birth date (ISO 8601 format)",
        purpose: "Age verification without exposing exact birth date"
      },
      "cardless:compositeHash": {
        type: "string",
        description: "SHA-256 hash of firstName|middleName|lastName|birthDate",
        purpose: "Primary duplicate detection mechanism"
      },
      "cardless:idType": {
        type: "string",
        enum: ["passport", "drivers_license"],
        description: "Type of government ID used for verification"
      },
      "cardless:state": {
        type: "string",
        description: "US state or territory code (2-letter abbreviation)",
        example: "CA"
      }
    },
    usage: {
      verification: "Verifiers should validate the proof signature against the issuer's public key and check birthDateHash against required age thresholds",
      extension: "Additional claims can be added using custom namespaces while preserving core cardless: fields"
    }
  }, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      "Access-Control-Allow-Origin": "*", // Allow CORS for third-party access
    }
  });
}

// Prevent POST/PUT/DELETE requests
export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
