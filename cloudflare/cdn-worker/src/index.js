const ROUTES = {
  "/verify/latest/cardlessid-verify.js":
    "https://cdn.jsdelivr.net/gh/djscruggs/cardlessid@main/sdk/browser/dist/iife/cardlessid-verify.js",
  "/verify/latest/cardlessid-verify.js.map":
    "https://cdn.jsdelivr.net/gh/djscruggs/cardlessid@main/sdk/browser/dist/iife/cardlessid-verify.js.map",
};

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);

    const upstream = ROUTES[pathname];
    if (!upstream) {
      return new Response("Not found", { status: 404 });
    }

    const response = await fetch(upstream);
    if (!response.ok) {
      return new Response("Upstream error", { status: response.status });
    }

    const isMap = pathname.endsWith(".map");
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": isMap ? "application/json" : "application/javascript",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  },
};
