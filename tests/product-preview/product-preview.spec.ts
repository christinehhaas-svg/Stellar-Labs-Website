import { expect, test, type Page } from "@playwright/test";
import proteinProducts from "../../artifacts/stellar-review/src/pages/stellar/_shared/protein-products.json";
import veganProducts from "../../artifacts/stellar-review/src/pages/stellar/_shared/vegan-products.json";
import electrolyteProducts from "../../artifacts/stellar-review/src/pages/stellar/_shared/electrolyte-products.json";

const shell = "**/review-assets/stellar-current/supplements-shell.html?*";
const product = proteinProducts[0];
const path = `/products/${product.handle}`;

function inspect(page: Page) {
  return page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(".stellar-protein-product-frame");
    const doc = iframe?.contentDocument;
    const title = doc?.querySelector<HTMLElement>("#protein-title");
    return {
      title: title?.textContent,
      height: title?.getBoundingClientRect().height ?? 0,
      frameVisible: iframe ? getComputedStyle(iframe).visibility === "visible" : false,
      readyState: doc?.readyState,
      styleCount: doc?.querySelectorAll("#stellar-protein-product-style").length,
      menu: doc?.querySelector("#header-component")?.getAttribute("data-menu-style"),
      localLinks: Array.from(doc?.querySelectorAll<HTMLAnchorElement>("a") ?? [])
        .filter((link) => link.textContent?.trim() === "Supplements")
        .map((link) => new URL(link.href).pathname),
    };
  });
}

test("product renders while shell images and fonts are still pending", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  const held = new Set<string>();
  await page.route("**/*", async (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "font") {
      held.add(type);
      await waiting;
    }
    await route.continue();
  });
  try {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect.poll(async () => (await inspect(page)).title).toBe(product.title);
    await expect.poll(() => held.has("image") && held.has("font")).toBe(true);
    const pending = await inspect(page);
    expect(pending.readyState).not.toBe("complete");
    expect(pending.frameVisible).toBe(true);
    expect(pending.height).toBeGreaterThan(0);
    expect(pending.styleCount).toBe(1);
    await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Loading product preview" })).toHaveCount(0);
    release();
    await expect.poll(async () => (await inspect(page)).readyState).toBe("complete");
    expect((await inspect(page)).styleCount).toBe(1);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await inspect(page)).menu).toBe("drawer");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect.poll(async () => (await inspect(page)).menu).toBe("menu");
    expect((await inspect(page)).localLinks).toContain("/supplements");
  } finally {
    release();
  }
});

test("a stalled shell shows loading, then a recoverable timeout", async ({ page }) => {
  await page.clock.install();
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route(shell, async (route) => {
    requests += 1;
    if (requests === 1) await waiting;
    await route.continue();
  });
  try {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("status")).toContainText("Loading product preview");
    await expect(page.getByRole("link", { name: "Back to review homepage" })).toHaveAttribute("href", "/");
    await page.clock.runFor(15_100);
    await expect(page.getByRole("alert")).toContainText("could not load");
    await page.getByRole("button", { name: "Try again" }).click();
    await page.clock.resume();
    await expect.poll(async () => (await inspect(page)).title).toBe(product.title);
    await expect(page.getByRole("alert")).toHaveCount(0);
  } finally {
    release();
  }
});

test("a loaded shell without the mount fails visibly and retry opens the product", async ({ page }) => {
  let requests = 0;
  await page.route(shell, async (route) => {
    requests += 1;
    if (requests === 1) {
      await route.fulfill({ status: 404, contentType: "text/html", body: "<h1>Not found</h1>" });
    } else {
      await route.continue();
    }
  });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("could not load");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect.poll(async () => (await inspect(page)).title).toBe(product.title);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a failed shell request is not an empty page", async ({ page }) => {
  await page.route(shell, (route) => route.abort("failed"));
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("could not load");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

for (const item of [veganProducts[0], electrolyteProducts[0]]) {
  test(`${item.title} uses the same ready product preview`, async ({ page }) => {
    await page.goto(`/products/${item.handle}`, { waitUntil: "domcontentloaded" });
    await expect.poll(async () => (await inspect(page)).title).toBe(item.title);
    expect((await inspect(page)).frameVisible).toBe(true);
  });
}
