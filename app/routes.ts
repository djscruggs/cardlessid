import {
  type RouteConfig,
  index,
  route,
  prefix,
} from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx", { id: "foo" }),
  route("about", "routes/about.tsx"),
  route("contact", "routes/contact.tsx"),
  route("demo", "routes/demo.tsx"),
  route("demo/verify/:vid", "routes/verify.tsx"),
  ...prefix("api", [
    index("routes/api/hello.ts"),
    route("verify-worldcoin", "routes/api/verify-worldcoin.ts"),
    route("verify-webhook", "routes/api/verify-webhook.ts"),
    route("credentials-issue", "routes/api/credentials-issue.ts"),
    route("announcements", "routes/api/announcements.ts"),
    route("credential-schema", "routes/api/credential-schema.ts"),
  ]),
  ...prefix("app", [
    route("worldcoin", "routes/app/worldcoin.tsx"),
    route("create-credential", "routes/app/create-credential.tsx"),
    route("verify/:txId", "routes/app/verify.$txId.tsx"),
    route("testnet-explorer", "routes/app/testnet-explorer.tsx"),
  ]),
] satisfies RouteConfig;
