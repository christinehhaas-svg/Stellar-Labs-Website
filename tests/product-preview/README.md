# Product preview readiness

Run against the independent review website:

```sh
pnpm exec playwright test --config tests/product-preview/playwright.config.ts
pnpm exec tsc --noEmit -p tests/product-preview/tsconfig.json
```

The configuration uses `REPLIT_DEV_DOMAIN` by default. For another preview host,
set `HOMEPAGE_TEST_BASE_URL` (shared with the existing browser-test configuration).
It uses `/repl/tools/bin/chromium` when available, or the installed Playwright
Chromium browser; `HOMEPAGE_TEST_CHROMIUM` can override the executable.

These checks hold image/font requests open to prove the product mounts before the
shell finishes loading. They also cover loading feedback, shell timeout, failed
requests, missing mounts, retry, responsive header setup, local links, and the
shared vegan/electrolyte product renderer. No Shopify connection is used.
