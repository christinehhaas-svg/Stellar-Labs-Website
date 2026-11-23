import { defineConfig } from "@playwright/test";
import homepageConfig from "../homepage/playwright.config";

export default defineConfig({
  ...homepageConfig,
  testDir: ".",
  outputDir: "../../generated-artifacts/product-preview-tests",
});
