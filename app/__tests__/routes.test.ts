import { describe, it, expect } from "vitest";

/**
 * Route Tests
 * Tests all navigation menu links and documentation pages
 *
 * NOTE: These tests require the dev server to be running at http://localhost:5173
 * Run 'npm run dev' in a separate terminal to enable these tests
 *
 * To run these tests: npm test -- --run app/__tests__/routes.test.ts
 */

describe.skip("Navigation Menu Routes", () => {
  const navigationRoutes = [
    { path: "/", name: "Home" },
    { path: "/about", name: "About" },
    { path: "/demo", name: "Demo" },
    { path: "/docs", name: "Docs" },
    { path: "/contact", name: "Contact" },
  ];

  navigationRoutes.forEach(({ path, name }) => {
    it(`should return 200 for ${name} page (${path})`, async () => {
      const response = await fetch(`http://localhost:5173${path}`);
      expect(response.status).toBe(200);
    });
  });
});

describe.skip("Documentation Routes", () => {
  const docRoutes = [
    { path: "/docs", name: "Documentation Index" },
    { path: "/docs/integration-guide", name: "Integration Guide" },
    { path: "/docs/custom-verification-guide", name: "Custom Verification Guide" },
    { path: "/docs/delegated-verification", name: "Delegated Verification Guide" },
    { path: "/docs/credential-schema", name: "Credential Schema" },
  ];

  docRoutes.forEach(({ path, name }) => {
    it(`should return 200 for ${name} (${path})`, async () => {
      const response = await fetch(`http://localhost:5173${path}`);
      expect(response.status).toBe(200);
    });
  });
});

describe.skip("API Routes", () => {
  const apiRoutes = [
    { path: "/api/credentials/schema", name: "Credentials Schema API", method: "GET" },
  ];

  apiRoutes.forEach(({ path, name, method }) => {
    it(`should return 200 for ${name} (${method} ${path})`, async () => {
      const response = await fetch(`http://localhost:5173${path}`, {
        method,
      });
      expect(response.status).toBe(200);
    });
  });
});
