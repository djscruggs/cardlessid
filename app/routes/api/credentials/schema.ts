import type { LoaderFunctionArgs } from "react-router";
import CardlessCredential from "~/components/credentials/w3c-minimal";
import {
  CARDLESS_FIELDS,
  SCHEMA_VERSION,
  SCHEMA_DESCRIPTION,
  USAGE_NOTES
} from "~/utils/credential-schema";

/**
 * Public endpoint for Cardless ID credential schema
 *
 * GET /api/credentials/schema
 *
 * Returns the W3C Verifiable Credential schema used by Cardless ID.
 * Third parties can use this to understand the credential structure
 * for verification and extension purposes.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return Response.json(
    {
      schema: CardlessCredential,
      version: SCHEMA_VERSION,
      documentation: "https://cardlessid.org/docs/credential-schema",
      description: SCHEMA_DESCRIPTION,
      fields: {
        "cardlessid:compositeHash": {
          type: "string",
          description: CARDLESS_FIELDS.compositeHash.description,
          purpose: CARDLESS_FIELDS.compositeHash.purpose,
          example: CARDLESS_FIELDS.compositeHash.example
        },
        "service": {
          type: CARDLESS_FIELDS.service.type,
          description: CARDLESS_FIELDS.service.description,
          purpose: CARDLESS_FIELDS.service.purpose,
          structure: CARDLESS_FIELDS.service.structure,
          example: CARDLESS_FIELDS.service.example,
          optional: CARDLESS_FIELDS.service.optional,
          note: CARDLESS_FIELDS.service.note
        },
        "evidence": {
          type: CARDLESS_FIELDS.evidence.type,
          description: CARDLESS_FIELDS.evidence.description,
          purpose: CARDLESS_FIELDS.evidence.purpose,
          structure: CARDLESS_FIELDS.evidence.structure
        },
      },
      usage: USAGE_NOTES,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*", // Allow CORS for third-party access
      },
    }
  );
}

// Prevent POST/PUT/DELETE requests
export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
