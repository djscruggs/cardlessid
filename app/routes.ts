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
    ...prefix("age-verify", [
      route("create", "routes/api/age-verify/create.ts"),
      route("respond", "routes/api/age-verify/respond.ts"),
      route("session/:sessionId", "routes/api/age-verify/session.$sessionId.ts"),
    ]),
  ]),
  ...prefix("app", [
    route("worldcoin", "routes/app/worldcoin.tsx"),
    route("create-credential", "routes/app/create-credential.tsx"),
    route("verify/:txId", "routes/app/verify.$txId.tsx"),
    route("testnet-explorer", "routes/app/testnet-explorer.tsx"),
    route("mock-verification", "routes/app/mock-verification.tsx"),
    route("age-verify", "routes/app/age-verify.tsx"),
    route("age-verify-success", "routes/app/age-verify-success.tsx"),
    route("age-verify-rejected", "routes/app/age-verify-rejected.tsx"),
    route("wallet-verify", "routes/app/wallet-verify.tsx"),
    route("wallet-verify-success", "routes/app/wallet-verify-success.tsx"),
  ]),
] satisfies RouteConfig;
