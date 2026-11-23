import { expect, test } from "@playwright/test";

test("Shop All e-books open their existing store destinations outside the preview", async ({ page, context }) => {
  // Check navigation without relying on the remote store's bot protection.
  // This test does not exercise or promise checkout.
  await context.route("https://www.stellarlabsnutrition.com/**", route =>
    route.fulfill({ contentType: "text/html", body: "<h1>External store destination</h1>" }));
  await page.goto("/shop", { waitUntil: "networkidle" });
  const snapshot = page.frameLocator('iframe[title*="original Shopify homepage"]');
  const links = await snapshot.locator("product-card .stellar-product-store-link").evaluateAll(elements =>
    elements.filter(link => /ebook|e-book|eating-system|low-lean/i.test(link.getAttribute("href") || ""))
      .map(link => link.getAttribute("href")!));
  expect(links.length).toBeGreaterThan(0);
  for (const href of links) {
    const button = snapshot.locator(`a.stellar-product-store-link[href="${href}"]`);
    await expect(button).toHaveAttribute("target", "_blank");
    await expect(button).toHaveAttribute("rel", /noopener/);
    const popupPromise = page.waitForEvent("popup");
    await button.click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup).toHaveURL(href);
    await expect(page).toHaveURL(/\/shop$/);
    await popup.close();
  }
});

const featured = [
  ["Whey Protein Isolate", "/?category=100-isolate-whey-protein&formula=isolate"],
  ["Whey Protein Blend", "/?category=100-isolate-whey-protein&formula=blend"],
  ["Vegan Protein", "/?category=vegan-plant-protein"],
  ["Electrolyte Hydration", "/?category=electrolyte"],
  ["Supplements", "/supplements"],
] as const;

test("featured photos, titles, and shop links open their categories inside a nested preview", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  // Use a fresh, script-free embedding document for every case. Replacing an
  // active React page with setContent leaves its old effects and listeners alive.
  await page.route("**/__test-embedded-host", route => route.fulfill({
    contentType: "text/html",
    body: `<iframe title="Embedded website" style="width:100%;height:900px"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src="/"></iframe>`,
  }));
  const selectors = [".card-gallery a", '[ref="productTitleLink"]', ".stellar-featured-detail-link"];
  const clickTargets = [".card-gallery img", '[ref="productTitleLink"] [role="heading"]', ".stellar-featured-detail-link"];
  for (const [index, [title, destination]] of featured.entries()) {
      await page.goto("/__test-embedded-host", { waitUntil: "domcontentloaded" });
      const outerUrl = page.url();
      const host = page.frameLocator('iframe[title="Embedded website"]');
      const snapshot = host.frameLocator('iframe[title*="original Shopify homepage"]');
      const card = snapshot.locator("product-card").filter({
        // Approved headings split across block spans can have no text-node
        // space at a visual line break (for example "Vegan" / "Protein Powders").
        has: snapshot.locator('[ref="productTitleLink"]').filter({
          hasText: new RegExp(title.split(" ").join("\\s*")),
        }),
      });
      for (const selector of selectors) {
        const link = card.locator(selector).first();
        await expect(link).toHaveAttribute("href", /.+/);
        const href = new URL((await link.getAttribute("href"))!, page.url());
        expect(href.origin).toBe(new URL(page.url()).origin);
        expect(href.pathname + href.search).toBe(destination);
        await expect(card.locator(selector).first()).toHaveAttribute("data-stellar-shop-navigation", "");
      }
      await card.locator(clickTargets[index % clickTargets.length]).first().click();
      await expect.poll(async () => {
        const url = new URL(await host.locator("body").evaluate(() => window.location.href));
        return `${url.pathname}${url.search}`;
      }).toBe(destination);
      await expect(host.locator("main").first()).toBeVisible();
      await expect(page).toHaveURL(outerUrl);
  }
});
