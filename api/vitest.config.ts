import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // shared test database — run files sequentially
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://jughd:jughd@localhost:5433/jughd?schema=public",
      SESSION_SECRET: process.env.SESSION_SECRET ?? "test-secret-16-chars-min",
    },
  },
});
