# Test Suite Documentation

This directory contains comprehensive tests for the Cardless ID application.

## Test Files

### Unit Tests (No Server Required)

These tests run independently without requiring a dev server:

1. **[utils.test.ts](./utils.test.ts)** - Utility function tests
   - Credential schema validation
   - W3C credential structure
   - Hash generation (SHA-256)
   - Date handling

2. **[api-unit.test.ts](./api-unit.test.ts)** - API logic unit tests
   - Verification quality level determination
   - Request validation logic
   - Response formatting
   - Composite hash generation
   - DID format validation

3. **[api-routes-mock.test.ts](./api-routes-mock.test.ts)** - API route tests with mocks
   - Route handler logic with mocked dependencies
   - Full credential issuance flow simulation
   - Authentication and authorization mocking
   - Rate limiting logic
   - Error handling scenarios

4. **[components.test.tsx](./components.test.tsx)** - Component structure tests
   - Component props validation
   - Credential data structures
   - Browser API interactions

5. **[api.test.ts](./api.test.ts)** - API integration validation
   - Input validation patterns
   - Data transformation
   - Error handling

### Integration Tests (Server Required - Currently Skipped)

These tests require a running dev server at `http://localhost:5173`:

6. **[routes.test.ts](./routes.test.ts)** - Route integration tests (SKIPPED)
   - Navigation routes (/, /about, /demo, etc.)
   - Documentation pages
   - API endpoints

To enable these tests:
1. Start dev server: `npm run dev`
2. Remove `.skip` from the test file
3. Run: `npm test`

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run specific test file
```bash
npm test -- app/__tests__/utils.test.ts
```

### Run tests with coverage (when configured)
```bash
npm test -- --coverage
```

## Test Architecture

### Approach 1: Pure Unit Tests
Test individual functions and logic in isolation without any external dependencies.

**Example:**
```typescript
describe("Verification Quality Level", () => {
  it("should return high for perfect verification", () => {
    const metadata = {
      fraudCheckPassed: true,
      bothSidesProcessed: true,
      lowConfidenceFields: [],
      fraudSignals: [],
    };
    expect(determineVerificationLevel(metadata)).toBe("high");
  });
});
```

### Approach 2: Mocked Dependencies
Test route handlers by mocking external services (database, blockchain, etc.).

**Example:**
```typescript
it("should simulate successful credential issuance", async () => {
  const mockGetVerificationSession = vi.fn().mockResolvedValue({ /* ... */ });
  const mockSaveVerification = vi.fn().mockResolvedValue(true);
  const mockCreateNFT = vi.fn().mockResolvedValue({ assetId: "123456" });

  // Test logic using mocks
  const session = await mockGetVerificationSession("session-123");
  // ... rest of test
});
```

### Approach 3: Integration Tests (with server)
Test actual HTTP requests to running server.

**Example:**
```typescript
it("should return 200 for home page", async () => {
  const response = await fetch("http://localhost:5173/");
  expect(response.status).toBe(200);
});
```

## What's Tested

### ✅ Currently Covered
- Credential schema validation
- W3C credential structure
- Input validation (addresses, dates, required fields)
- Verification quality determination
- Composite hash generation for duplicate detection
- DID format validation
- Request/response formatting
- Authentication logic
- Rate limiting logic
- Error handling patterns

### 🚧 To Be Added Later
- Algorand blockchain integration tests
- Firebase database integration tests
- End-to-end credential issuance flow
- Mobile app integration tests

## Configuration

Tests are configured in:
- **[vitest.config.ts](../../vitest.config.ts)** - Main test configuration
- **[vitest.setup.ts](../../vitest.setup.ts)** - Test setup and global utilities
- **[package.json](../../package.json)** - Test scripts

### Key Configuration Details

- **Test Environment**: `happy-dom` (lightweight browser environment)
- **Excluded Paths**: `**/cardlessid-algorand/**` (smart contract tests)
- **Test Pattern**: `app/**/*.{test,spec}.{js,ts,tsx}`

## Best Practices

1. **Keep tests fast** - Mock external dependencies (DB, blockchain, APIs)
2. **Test behavior, not implementation** - Focus on inputs/outputs
3. **Use descriptive test names** - Tests should read like documentation
4. **Arrange-Act-Assert pattern** - Structure tests clearly
5. **Mock sparingly** - Only mock what you need to
6. **Test edge cases** - Invalid inputs, error conditions, boundary values

## Debugging Tests

### Run a single test
```bash
npm test -- -t "should return high for perfect verification"
```

### Run tests in a specific file with verbose output
```bash
npm test -- app/__tests__/api-unit.test.ts --reporter=verbose
```

### Use Vitest UI for interactive debugging
```bash
npm run test:ui
```

Then open the URL shown in your browser.

## CI/CD Integration

Tests are designed to run in CI/CD pipelines without requiring:
- Running dev server
- Database connections
- Blockchain access
- External API credentials

This makes them fast and reliable for continuous integration.

## Current Test Stats

- **Total Tests**: 72 passing + 13 skipped
- **Test Files**: 6 files
- **Coverage**: Core business logic and validation (expand as needed)

## Adding New Tests

When adding new features, follow this pattern:

1. **Unit test the logic** - Test pure functions in isolation
2. **Mock the dependencies** - Test handlers with mocked services
3. **Integration test (optional)** - Test with real server if needed

Example for new feature:
```typescript
// 1. Unit test
describe("New Feature Logic", () => {
  it("should validate new input", () => {
    expect(validateNewInput("valid")).toBe(true);
  });
});

// 2. Mock test
describe("New Feature API", () => {
  it("should handle request", async () => {
    const mockService = vi.fn().mockResolvedValue({ success: true });
    // test logic
  });
});
```
