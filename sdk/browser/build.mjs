/**
 * Build script for @cardlessid/verify
 *
 * Outputs:
 *   dist/iife/cardlessid-verify.js  — CDN-loadable IIFE, sets window.CardlessIDVerify
 *   dist/esm/index.js               — ES module for bundlers / npm
 *   dist/cjs/index.cjs              — CommonJS for older toolchains / Node.js require()
 *   dist/index.d.ts                 — TypeScript declarations (from tsc)
 *
 * Note: --tsconfig must point to an absolute path to our sdk tsconfig.json.
 * Without this, esbuild 0.28 walks up to node_modules/qrcode-generator/experiment/vt/tsconfig.json
 * (which has useDefineForClassFields:true) and triggers a class field transform error.
 */

import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsconfig = join(__dirname, "tsconfig.json");

const esbuild = "npx esbuild";
const entry = "src/index.ts";
const target = "es2020,chrome87,firefox78,safari15";
const shared = `--bundle --sourcemap --target=${target} --tsconfig=${tsconfig}`;

// Ensure dist dirs exist
for (const dir of ["dist/iife", "dist/esm", "dist/cjs"]) {
  mkdirSync(join(__dirname, dir), { recursive: true });
}

function run(cmd) {
  console.log("$", cmd.replace(tsconfig, "tsconfig.json"));
  execSync(cmd, { stdio: "inherit", cwd: __dirname });
}

// 1. IIFE — browser CDN bundle (minified)
run(`${esbuild} ${entry} ${shared} --format=iife --minify --outfile=dist/iife/cardlessid-verify.js`);

// 2. ESM — for bundlers and modern Node
run(`${esbuild} ${entry} ${shared} --format=esm --outfile=dist/esm/index.js`);

// 3. CJS — for older Node / require()
run(`${esbuild} ${entry} ${shared} --format=cjs --out-extension:.js=.cjs --outfile=dist/cjs/index.cjs`);

// 4. TypeScript declarations via tsc
console.log("$ tsc --emitDeclarationOnly");
execSync("npx tsc --project tsconfig.json --emitDeclarationOnly --declarationDir dist", {
  stdio: "inherit",
  cwd: __dirname,
});

console.log("\nBuild complete:");
console.log("  dist/iife/cardlessid-verify.js  (IIFE, CDN)");
console.log("  dist/esm/index.js               (ESM)");
console.log("  dist/cjs/index.cjs              (CJS)");
console.log("  dist/index.d.ts                 (types)");
