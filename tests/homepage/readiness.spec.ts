import { expect, test } from "@playwright/test";

const snapshot = ".stellar-current-snapshot iframe";
const heroAsset = "**/stellar-homepage-approved-photo.webp";

test("review homepage becomes visible on a normal fresh load", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(snapshot)).toBeVisible();
  await expect(page.locator(".stellar-snapshot-status")).toHaveCount(0);
  await expect(page.frameLocator(snapshot).getByRole("heading", { name: "LEAN NUTRITION", exact: true })).toBeVisible();
});

test("an unfinished offscreen image does not block initialization or repeat it on load", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/assets/6bd852517b24719b.png", async route => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(snapshot)).toBeVisible();
    expect(await page.evaluate(() => document.querySelector<HTMLIFrameElement>(
      ".stellar-current-snapshot iframe",
    )!.contentDocument!.readyState)).not.toBe("complete");
    const doc = await page.evaluateHandle(() => document.querySelector<HTMLIFrameElement>(
      ".stellar-current-snapshot iframe",
    )!.contentDocument);
    release();
    await expect.poll(() => page.evaluate(() => document.querySelector<HTMLIFrameElement>(
      ".stellar-current-snapshot iframe",
    )!.contentDocument!.readyState)).toBe("complete");
    expect(await page.evaluate(original => original === document.querySelector<HTMLIFrameElement>(
      ".stellar-current-snapshot iframe",
    )!.contentDocument, doc)).toBe(true);
    await expect(page.frameLocator(snapshot).locator("#stellar-home-categories")).toHaveCount(1);
  } finally {
    release();
  }
});

test("a delayed hero can finish before the deadline", async ({ page }) => {
  await page.route(heroAsset, async route => {
    await new Promise(resolve => setTimeout(resolve, 2_000));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status")).toContainText("Loading Stellar Labs");
  await expect(page.locator(snapshot)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a stalled stylesheet has a bounded recovery state and a working retry", async ({ page }) => {
  let release!: () => void;
  let stall = true;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const stylesheet = "**/assets/eaf2f3394b5f4108.css";
  await page.route(stylesheet, async route => {
    if (stall) await gate;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("alert")).toContainText("couldn’t finish loading", { timeout: 11_000 });
    // A render-blocking stylesheet can also hold document parsing. Do not
    // expose an uninitialized snapshot as a usable partial page.
    await expect(page.getByRole("button", { name: "View available homepage" })).toHaveCount(0);
    stall = false;
    release();
    await page.getByRole("button", { name: "Retry homepage" }).click();
    await expect(page.locator(snapshot)).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  } finally {
    release();
  }
});

test("a failed hero offers an explicit partial-page option", async ({ page }) => {
  await page.route(heroAsset, route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("couldn’t finish loading");
  await page.getByRole("button", { name: "View available homepage" }).click();
  await expect(page.locator(snapshot)).toBeVisible();
  await expect(page.frameLocator(snapshot).getByRole("heading", { name: "LEAN NUTRITION", exact: true })).toBeVisible();
});

test("a failed snapshot cannot silently pass readiness and can be retried", async ({ page }) => {
  const documentRoute = "**/homepage-snapshot.html?*";
  await page.route(documentRoute, route => route.fulfill({
    status: 503, contentType: "text/html", body: "<html><body>Unavailable</body></html>",
  }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("couldn’t finish loading", { timeout: 11_000 });
  await expect(page.getByRole("button", { name: "View available homepage" })).toHaveCount(0);
  await page.unroute(documentRoute);
  await page.getByRole("button", { name: "Retry homepage" }).click();
  await expect(page.locator(snapshot)).toBeVisible();
});
