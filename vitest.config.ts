import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Windows + deep paths / junction: avoid hung worker fetch between files.
    pool: "forks",
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
