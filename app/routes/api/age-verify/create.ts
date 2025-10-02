import type { Route } from "./+types/create";
import { createAgeVerificationSession } from "~/utils/age-verification.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { minAge } = body;

    if (!minAge || typeof minAge !== "number" || minAge < 1 || minAge > 150) {
      return Response.json(
        { error: "Invalid minAge parameter" },
        { status: 400 }
      );
    }

    const session = await createAgeVerificationSession(minAge);

    return Response.json(session);
  } catch (error) {
    console.error("Error creating age verification session:", error);
    return Response.json(
      { error: "Failed to create verification session" },
      { status: 500 }
    );
  }
}
