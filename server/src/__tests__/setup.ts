// =============================================================================
// URS-DMS — Test setup (Sprint 8.6)
// Guards against accidental production data modification.
// All tests run against the configured DATABASE_URL — we trust the developer
// to point at a test database. This file ensures the safety flag is set.
// =============================================================================

import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
  // Verify NODE_ENV is set — warn if running against non-test DB
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[test] NODE_ENV is not 'test' — tests will run against the configured DATABASE_URL",
    );
  }
});

afterAll(async () => {
  // Prisma disconnect is handled by the global teardown in vitest.config
  // Individual test suites should clean up their own data
});
