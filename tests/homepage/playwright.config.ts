import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";

const baseURL = process.env.HOMEPAGE_TEST_BASE_URL ||
  // The local preview router preserves both artifact paths without requiring
  // each browser's TLS stack to trust the workspace's development certificate.
  (process.env.REPLIT_DEV_DOMAIN ? "http://127.0.0.1:80" : undefined);
if (!baseURL) {
  throw new Error("Set HOMEPAGE_TEST_BASE_URL to the running preview host.");
}

export default defineConfig({
  globalSetup: "./preview-ready.ts",
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "../../generated-artifacts/homepage-tests",
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: process.env.HOMEPAGE_TEST_REPORTER
    ? process.env.HOMEPAGE_TEST_REPORTER.split(",").map(name => [name] as [string])
    : "list",
  webServer: process.env.HOMEPAGE_TEST_STANDALONE === "1" ? {
    command: "node scripts/browser-ci-preview.mjs",
    cwd: path.resolve(__dirname, "../.."),
    url: "http://127.0.0.1:18080",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  } : undefined,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath: process.env.HOMEPAGE_TEST_CHROMIUM ||
            (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined),
        },
      },
    },
    // Keep the added cross-browser scope limited to powder collections.
    // In particular, never pass the system Chromium executable to these engines.
    ...(["webkit", "firefox"] as const).map(browserName => ({
      name: browserName,
      testMatch: ["powder-collections.spec.ts", "one-pound-isolates.spec.ts"],
      use: { browserName },
    })),
  ],
});
