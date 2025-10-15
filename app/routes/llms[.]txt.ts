import { type LoaderFunctionArgs } from "react-router";
import fs from "fs";
import path from "path";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const llmsTxt = fs.readFileSync(
      path.join(process.cwd(), "llms.txt"),
      "utf-8"
    );

    return new Response(llmsTxt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*", // Allow cross-origin requests
      },
    });
  } catch (error) {
    console.error("Error reading llms.txt:", error);
    return new Response("llms.txt not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
