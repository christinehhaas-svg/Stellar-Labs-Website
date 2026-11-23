import { chromium, firefox, webkit } from "@playwright/test";
import { existsSync } from "node:fs";

// Host diagnostics only: blank-page creation is not an application test.
// Fail before the long suite if an engine cannot run. Never skip or substitute it.
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  let browser;
  try {
    const executablePath = name === "chromium"
      ? process.env.HOMEPAGE_TEST_CHROMIUM || (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined)
      : undefined;
    browser = await engine.launch({ executablePath, timeout: 15_000 });
    const page = await browser.newPage();
    await page.goto("about:blank");
    console.log(`[browser host] ${name}: ready`);
  } catch (error) {
    console.error(`[browser host] ${name} cannot run:\n${error.message}`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
}
if (process.exitCode) {
  console.error("Full browser validation is blocked. Use the Ubuntu browser workflow with matching Playwright dependencies; no engine was skipped.");
}
