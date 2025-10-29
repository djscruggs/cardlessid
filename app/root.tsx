import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useSearchParams,
} from "react-router";
import type { LoaderFunction } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import Main from "./layouts/main";
import { HEYO } from "@heyo.so/js";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "icon",
    href: "/favicon.png",
    type: "image/png",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const hostname = url.hostname;
  return { hostname };
};

export function Layout({ children }: { children: React.ReactNode }) {
  // Initialize Heyo widget
  const [params] = useSearchParams();
  const isWidget = params.get("widget");
  if (!isWidget) {
    HEYO.init({
      projectId: "69022d22e37ea52538b6f2a3",
      // Optional configuration
      position: "bottom-right",
      theme: "auto",
      locale: "en",
    });
  }
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Main>{children}</Main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  } else if (typeof error == "string") {
    details = error;
  }

  return (
    <main className="pt-16 p-4 container mx-auto  items-center flex flex-col">
      <h1>{message}</h1>
      <p className="my-10 text-red-500">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
