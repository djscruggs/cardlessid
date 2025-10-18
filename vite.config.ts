import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import llms from "vite-plugin-llms";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactRouterDevTools } from "react-router-devtools";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouterDevTools(),
    reactRouter(),
    tsconfigPaths(),
    devtoolsJson(),
    llms(),
  ],
  server: {
    host: true,
    allowedHosts: [".ngrok-free.app"],
  },
});
