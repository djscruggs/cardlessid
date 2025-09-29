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
  ...prefix("api", [index("routes/api/hello.ts")]),
  ...prefix("api", [
    route("verify-worldcoin", "routes/api/verify-worldcoin.ts"),
  ]),
  ...prefix("app", [
    route("worldcoin", "routes/app/worldcoin.tsx"),
    route("create-credential", "routes/app/create-credential.tsx"),
  ]),
] satisfies RouteConfig;
