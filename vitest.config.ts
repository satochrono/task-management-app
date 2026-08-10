import path from "node:path";

import { defineConfig } from "vitest/config";

const srcAlias = path.resolve(import.meta.dirname, "src");

const serverOnlyShim = path.resolve(
  import.meta.dirname,
  "test/support/server-only.ts",
);

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
    projects: [
      {
        resolve: {
          alias: {
            "@": srcAlias,
          },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts", "src/**/*.test.tsx"],
        },
      },
      {
        resolve: {
          alias: {
            "@": srcAlias,
          },
        },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
          environmentOptions: {
            jsdom: {
              url: "http://localhost:3000",
            },
          },
        },
      },
      {
        resolve: {
          alias: {
            "@/shared/presentation/http/require-authentication":
              import.meta.dirname + "/test/support/require-authentication.ts",
            "@": srcAlias,
            "server-only": serverOnlyShim,
          },
        },
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          setupFiles: ["./vitest.integration.setup.ts"],
          fileParallelism: false,
          server: {
            deps: {
              inline: ["server-only"],
            },
          },
        },
      },
    ],
  },
});
