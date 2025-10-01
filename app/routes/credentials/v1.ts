import type { LoaderFunctionArgs } from "react-router";
import { CARDLESS_NAMESPACE, CARDLESS_FIELDS } from "~/utils/credential-schema";

/**
 * JSON-LD Context document for Cardless ID credentials
 *
 * This defines the cardlessid: namespace vocabulary used in verifiable credentials
 * URL: https://cardlessid.org/credentials/v1
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const context = {
    "@context": {
      "@version": 1.1,
      "@protected": true,

      "cardlessid": CARDLESS_NAMESPACE,

      // Sybil-resistant identity hash (SHA-256 of firstName|middleName|lastName|birthDate)
      "compositeHash": {
        "@id": CARDLESS_FIELDS.compositeHash.id,
        "@type": CARDLESS_FIELDS.compositeHash.type
      }
    }
  };

  return Response.json(context, {
    headers: {
      "Content-Type": "application/ld+json",
      "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Prevent POST/PUT/DELETE requests
export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}