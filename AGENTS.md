# AGENTS.md

**Project Overview:**

This is a web site that issues a lightweight decentralize identity credential. At the top level are informational pages and an app.

**Project Goals:**

The goal is to use a third party tool still TBD to verify someone's identity, then write the credentials to a custom wallet for the Algorand blockchain. The wallet will only be used to verify credentials to sites that request them. They will do so with QR code which asks if they were born before a certain date (configurable), and the wallet merely replies true or false along with the wallet address

**Technology Stack**

The site is built in Typescript with React Router V7. It uses tailwind for CSS and DaisyUI for common UI elements. The database is firebase. The only information stored in the database is session tokens. Because of the sensitive nature of data used in verifications, take care to never write any data to firebase except for the minimum needed to maintain sessions state.

**File Structure**

Build tools and configuration are in the project root

The site is root /app

Import paths should use ~ as an alias for /app

There is an example credential in app/components/credentials/w3c-minimal.ts

.
├── app
│ ├── app.css
│ ├── firebase.config.ts
│ ├── components
│ ├── config
│ ├── layouts
│ ├── root.tsx
│ ├── routes
│ │ ├── api
│ │ └── app
│ ├── routes.ts
│ ├── types
│ └── utils

**Common Commands**

`To install dependencies, run: npm install`

To launch the app for development, run : npm run dev

**Project Documentation**

This project includes a comprehensive `llms.txt` file at the root with detailed documentation about:

- Project architecture and core concepts
- All API endpoints with request/response formats
- Component library and utility functions
- W3C credential schema and verification flow
- Algorand integration and blockchain operations
- Security considerations and best practices
- Environment variables and configuration
- Common development tasks and troubleshooting

**For detailed information about any aspect of the project, refer to the llms.txt file first.**

**Documentation Search with blz**

This project uses `blz` - a fast CLI tool for searching llms.txt documentation files. Use it to quickly find documentation for the tech stack and this project.

Available documentation sources (add if not already indexed):

```bash
# This project's documentation (IMPORTANT - add this first)
# Option 1: Local file (if you have the repo cloned)
blz add cardlessid ./llms.txt

# Option 2: From the live website
blz add cardlessid https://cardlessid.org/llms.txt

# React Router v7 (community-maintained)
blz add react-router https://gist.githubusercontent.com/luiisca/14eb031a892163502e66adb687ba6728/raw/27437452506bec6764d3bf9391a80eed94a53826/ReactRouter_LLMs.txt

# JavaScript/TypeScript ecosystem
blz add bun https://bun.sh/llms.txt
blz add turborepo https://turborepo.com/llms.txt

# UI Libraries and Design Systems
blz add ant-design https://ant.design/llms.txt
blz add ark-ui https://ark-ui.com/llms.txt

# Frameworks
blz add astro https://docs.astro.build/llms.txt

# Vercel and AI
blz add vercel https://vercel.com/llms.txt
blz add ai-sdk https://ai-sdk.dev/llms.txt

# Developer Tools
blz add gradio https://www.gradio.app/llms.txt

# Check https://llmstxthub.com for more documentation sources
```

Note: TypeScript, Firebase, Algorand, Tailwind CSS, and DaisyUI do not currently provide llms.txt files. Use their official documentation directly when needed.

Common blz commands:

- Search documentation: `blz "search term"`
- Get specific lines: `blz get source:line-range` (e.g., `blz get cardlessid:100-150`)
- List indexed sources: `blz list`

**When encountering questions about this project or the tech stack, ALWAYS use blz to search relevant documentation before making assumptions. The llms.txt file contains comprehensive information about the entire codebase.**

**Coding Conventions**

Route files are named in lower case, but their components inside the file are capitalize - e.g. Home, Contact. Components are named in CamelCase with the first word capitalized

**Scratchpad**
When creating test scripts and working documents, always put them in /@scratchpad unless otherwise specified

When importing functions do them at the top of the file instead of inline

**DO**

```
import { saveVerification, updateCredentialIssued } from "~/utils/firebase.server"
import { getPeraExplorerUrl } from "~/utils/algorand";
```

**DON'T**

```
const { saveVerification, updateCredentialIssued } = await import(
   "~/utils/firebase.server"
 );
 const { getPeraExplorerUrl } = await import("~/utils/algorand");
```

**Server-Only Modules**

Use the `.server.ts` suffix for any utility module that contains server-only code (Firebase Admin, AWS SDK, HMAC secrets, etc.). The bundler enforces this convention and prevents accidental inclusion of server secrets in client bundles. Never create a server-only utility without this suffix.

**API Route Patterns**

Every API route that only accepts POST must:
1. Start the `action` function with a method guard returning 405.
2. Export a separate `loader` function that returns 405 to reject GET requests.
3. Place the `isEEARequest()` geo-blocking check immediately after the method guard, before any data parsing, session creation, or authentication.

```ts
// Good: correct guard order in an API action
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (isEEARequest(request)) {
    return Response.json({ error: 'Service not available in your region' }, { status: 451 });
  }
  // Now safe to parse body and process data
}

export async function loader() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
```

Use `Response.json()` (Web Response API) for all API responses — not framework-specific helpers like `json()`. Error responses use the shape `{ error: string }` with the appropriate HTTP status code. Success responses for mutations include `{ success: true }`. In catch blocks, use `error instanceof Error ? error.message : String(error)` for the error message.

**Geo-Blocking in Page Loaders**

Page components that handle identity or biometric data must check `isEEARequest()` server-side in the React Router `loader`, returning `data({ blocked: true }, { status: 451 })`. The component renders a "Not Available in Your Region" UI when `blocked` is true, before any identity-collecting UI.

**GDPR and Data Handling**

- Define all data retention durations as named constants (e.g., `DATA_RETENTION_MS`, `SESSION_EXPIRY_MS`, `ORPHAN_MAX_AGE_MS`) at the top of the module with a comment explaining the GDPR rationale.
- Each module that stores user data must have both a read-path TTL check (delete on access if expired) and a batch purge function for proactive cleanup.
- Delete temporary biometric files (ID photos, selfies) immediately after processing — in the success path, every error/failure path, and the catch block. Declare file-path variables as `let photoUrl: string | null = null` before the try block so they are accessible in catch.

```ts
// Good: named constant with GDPR comment
const DATA_RETENTION_MS = 48 * 60 * 60 * 1000; // 48 hours — GDPR retention limit

// Good: cleanup in all paths
let photoUrl: string | null = null;
try {
  photoUrl = await saveIdPhoto(session.id, base64Data);
  // ... process ...
  if (photoUrl) await deletePhoto(photoUrl);
  return Response.json({ success: true });
} catch (error) {
  if (photoUrl) await deletePhoto(photoUrl);
  return Response.json({ success: false }, { status: 500 });
}
```

**Validation Functions**

Return `{ valid: boolean; error?: string }` from validation/precondition functions instead of throwing or returning a bare boolean. This lets callers branch on `valid` and include the error message in API responses without try/catch.

**Authentication Functions**

Authentication functions return a discriminated union: `{ success: true; issuer: AuthenticatedIssuer; source: 'api-key' | 'env' } | { success: false; error: string }`. The `source` field tracks how authentication happened for downstream rate-limiting decisions.

**Security**

Use `timingSafeEqual` from Node's `crypto` module (with `Buffer.from()` conversion and explicit length check) for all secret/token comparisons — API keys, HMAC signatures, verification tokens. Never compare secrets with `===`.

Call `.unref()` on background `setInterval` timers (orphan sweeps, rate limit cleanup) so they do not prevent the Node.js process from exiting gracefully.

**JSDoc Conventions**

- Start every server utility and API route file with a module-level JSDoc block describing the module's purpose. API route files include the HTTP method and path (e.g., `POST /api/verification/start`). Utility files describe the integration (e.g., "Integrates with AWS Rekognition for face comparison").
- Every exported function in server utility modules must have a JSDoc comment with a description, `@param` tags for each parameter, and `@returns` tag.

```ts
/**
 * POST /api/verification/start
 *
 * Create a new verification session and get auth token for mobile SDK
 */

/**
 * Save ID photo to local storage
 * @param sessionId Verification session ID
 * @param base64Data Base64 encoded image data
 * @returns Path to saved photo
 */
export async function saveIdPhoto(sessionId: string, base64Data: string): Promise<string> {
```

**Server Logging**

Use `console.log`/`warn`/`error` with a bracketed module prefix: `[Photo Storage]`, `[Rekognition]`, `[API Auth]`, `[WEBHOOK]`, etc. This makes it easy to grep and filter logs by subsystem.

```ts
console.log('[Photo Storage] Deleted:', filepath);
console.error('[Rekognition] Face comparison error:', error);
```

## Data Structure Conventions

- **Use Set for constant lookup collections instead of arrays.** When defining a fixed set of values used for membership testing (like country codes, allowed statuses, etc.), define them as a \`Set\` rather than an array. This provides O(1) lookup and makes the intent clearer — the collection is used for 'contains' checks, not iteration.

  **Good:**

  const EEA\_COUNTRY\_CODES = new Set(\[
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  ...
  ]);
  return EEA\_COUNTRY\_CODES.has(country.toUpperCase());

  **Bad:**

  const EEA\_COUNTRY\_CODES = \[
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  ...
  ];
  return EEA\_COUNTRY\_CODES.includes(country.toUpperCase());
