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
  route("credentials/v1", "routes/credentials/v1.ts"),
  ...prefix("api", [
    index("routes/api/hello.ts"),
    route("verify-worldcoin", "routes/api/verify-worldcoin.ts"),
    route("verify-webhook", "routes/api/verify-webhook.ts"),
    route("credentials", "routes/api/credentials.ts"),
    route("credentials/schema", "routes/api/credentials/schema.ts"),
    route("announcements", "routes/api/announcements.ts"),
    ...prefix("verification", [
      route("start", "routes/api/verification/start.ts"),
      route("webhook", "routes/api/verification/webhook.ts"),
      route("status/:id", "routes/api/verification/status.$id.ts"),
    ]),
  ]),
  ...prefix("app", [
    route("worldcoin", "routes/app/worldcoin.tsx"),
    route("create-credential", "routes/app/create-credential.tsx"),
    route("verify/:txId", "routes/app/verify.$txId.tsx"),
    route("testnet-explorer", "routes/app/testnet-explorer.tsx"),
    route("mock-verification", "routes/app/mock-verification.tsx"),
  ]),
] satisfies RouteConfig;
