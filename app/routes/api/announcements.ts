import type { LoaderFunctionArgs } from "react-router";
import { json } from "react-router";
import { getAnnouncements } from "~/utils/firebase.server";

/**
 * Endpoint for mobile app to fetch announcements
 *
 * GET /api/announcements?limit=10
 *
 * Returns array of announcements sorted by most recent first
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return json({ error: "Invalid limit parameter. Must be between 1 and 50" }, { status: 400 });
    }

    const announcements = await getAnnouncements(limit);

    return json({
      success: true,
      announcements,
      count: announcements.length,
    });

  } catch (error) {
    console.error("Announcements fetch error:", error);
    return json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Prevent POST/PUT/DELETE requests
export async function action() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
