import {
  type RouteConfig,
  index,
  route,
  prefix,
  layout,
} from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx", { id: "foo" }),
  route("about", "routes/about.tsx"),
  route("contact", "routes/contact.tsx"),
  route("demo", "routes/demo.tsx"),
  route("demo/verify/:vid", "routes/verify.tsx"),
  route("credentials/v1", "routes/credentials/v1.ts"),
  layout("layouts/docs.tsx", [
    ...prefix("docs", [
      route("/", "routes/docs.tsx"),
      route("credential-schema", "routes/docs/credential-schema.tsx"),
      route("integration-guide", "routes/docs/integration-guide.tsx"),
    ]),
  ]),
  ...prefix("api", [
    index("routes/api/hello.ts"),
    route("verify-worldcoin", "routes/api/verify-worldcoin.ts"),
    route("verify-webhook", "routes/api/verify-webhook.ts"),
    route("credentials", "routes/api/credentials.ts"),
    route("credentials/schema", "routes/api/credentials/schema.ts"),
    route("credentials/transfer", "routes/api/credentials/transfer.ts"),
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
    ...prefix("integrator/challenge", [
      route("create", "routes/api/integrator/challenge/create.ts"),
      route("respond", "routes/api/integrator/challenge/respond.ts"),
      route("verify/:challengeId", "routes/api/integrator/challenge/verify.$challengeId.ts"),
      route("details/:challengeId", "routes/api/integrator/challenge/details.$challengeId.ts"),
    ]),
    ...prefix("wallet", [
      route("status/:address", "routes/api/wallet/status.$address.ts"),
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
    route("wallet-status", "routes/app/wallet-status.tsx"),
    route("wallet-status/:address", "routes/app/wallet-status.tsx", { id: "wallet-status-with-address" }),
  ]),
] satisfies RouteConfig;
