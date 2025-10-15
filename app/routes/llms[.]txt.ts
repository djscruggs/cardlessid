import { type LoaderFunctionArgs } from "react-router";
import { LLMS_TXT_CONTENT } from "~/utils/llms-content";

export async function loader({ request }: LoaderFunctionArgs) {
  // Return the inlined llms.txt content
  // This approach works reliably in serverless environments (Vercel, etc.)
  // because the content is bundled at build time
  return new Response(LLMS_TXT_CONTENT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      "Access-Control-Allow-Origin": "*", // Allow cross-origin requests
    },
  });
}
