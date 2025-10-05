import type { Route } from "./+types/create";
import { createIntegratorChallenge } from "~/utils/integrator-challenges.server";
import { validateApiKey } from "~/utils/api-keys.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { minAge, apiKey, callbackUrl } = body;

    // Validate API key
    const integrator = await validateApiKey(apiKey);
    if (!integrator) {
      return Response.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Validate minAge
    if (!minAge || typeof minAge !== "number" || minAge < 1 || minAge > 150) {
      return Response.json(
        { error: "Invalid minAge parameter (must be between 1 and 150)" },
        { status: 400 }
      );
    }

    // Create challenge
    const challenge = await createIntegratorChallenge({
      integratorId: integrator.id,
      minAge,
      callbackUrl,
    });

    // Return challenge details
    const baseUrl = new URL(request.url).origin;
    return Response.json({
      challengeId: challenge.id,
      qrCodeUrl: `${baseUrl}/app/age-verify?challenge=${challenge.id}`,
      deepLinkUrl: `cardlessid://verify?challenge=${challenge.id}`,
      expiresAt: challenge.expiresAt,
      createdAt: challenge.createdAt,
    });
  } catch (error) {
    console.error("Error creating integrator challenge:", error);
    return Response.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
