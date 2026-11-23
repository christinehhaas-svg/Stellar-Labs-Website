import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { assertLocalOnlyOrdering } from "./collection-assertions";

// Literal expectations, independent of production JSON, routes and copy helpers.
const sizes = [
  { flavor: "Chocolate", calories: "110", protein: "25", carbs: "1", sugar: "<1g" },
  { flavor: "Vanilla", calories: "110", protein: "25", carbs: "1", sugar: "0g" },
] as const;
const handle = (flavor: string, small = true) =>
  `100-isolate-whey-protein-shake-${flavor.toLowerCase()}${small ? "-1lb" : ""}`;
const title = (flavor: string, small = true) =>
  `100% Isolate Whey Protein Shake ${flavor} ${small ? "1lb" : "2lb"}`;
const canvasRoot = "/__mockup/preview/stellar-labs";
const sandbox = "allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";

async function assertDetail(page: Page, product: (typeof sizes)[number], small = true) {
  const frame = page.frameLocator(".stellar-protein-product-frame");
  await expect(page.locator(".stellar-protein-product-frame")).toHaveAttribute("sandbox", sandbox);
  await expect(frame.locator("#protein-title")).toHaveText("Stellar Labs Whey Isolate Protein Powder");
  await expect(frame.locator(".sl-protein-price")).toHaveText(small ? "$52.95" : "$89.95");
  const flavors = frame.getByRole("group", { name: "Select a flavor", exact: true });
  const sizeOptions = frame.getByRole("group", { name: "Select a size", exact: true });
  await expect(flavors.locator("[aria-current=page]")).toHaveText(product.flavor);
  await expect(sizeOptions.locator("[aria-current=page]")).toHaveText(small ? "1 lb" : "2 lb");
  await expect(flavors.locator("[aria-current=page]")).toHaveCount(1);
  await expect(sizeOptions.locator("[aria-current=page]")).toHaveCount(1);
  // Both sizes must stay individually addressable and visibly distinguishable.
  for (const { flavor } of sizes) {
    const link = flavors.getByRole("link", { name: flavor, exact: true });
    await expect(link).toHaveAttribute("href", `/products/${handle(flavor, small)}`);
    await expect(link).toHaveAttribute("target", "_top");
  }
  await expect(sizeOptions.getByRole("link")).toHaveCount(2);
  for (const isSmall of [true, false]) {
    const link = sizeOptions.getByRole("link", { name: isSmall ? "1 lb" : "2 lb", exact: true });
    await expect(link).toHaveAttribute("href", `/products/${handle(product.flavor, isSmall)}`);
    await expect(link).toHaveAttribute("target", "_top");
  }
  if (small) {
    await expect(frame.locator(".sl-protein-meta")).toHaveText(`${product.flavor} · 1 lb · 16 servings`);
    await expect(frame.locator(".sl-protein-hero-image img")).toHaveAttribute("alt", `${title(product.flavor)} — front of package`);
    await expect(frame.locator(".sl-protein-hero-image img")).toHaveAttribute("src", /-1lb-mockup\.webp$/);
    await expect(frame.locator(".sl-protein-label-grid img")).toHaveCount(0);
    await expect(frame.locator(".sl-detail-nutrition > p")).toHaveText("Per 29 g serving");
    await expect(frame.locator(".sl-detail-nutrition dt")).toHaveText(["Calories", "Protein", "Carbs", "Sugar"]);
    await expect(frame.locator(".sl-detail-nutrition dd")).toHaveText([
      product.calories, `${product.protein}g`, `${product.carbs}g`, product.sugar,
    ]);
    await expect(frame.locator(".sl-protein-section .sl-protein-preview-note")).toHaveCount(0);
    await expect(frame.locator("#product-facts-label > [role=note]")).toHaveCount(0);
    await expect(frame.locator(".sl-protein-uploaded-label [role=note]")).toHaveCount(0);
    await expect(frame.locator(".sl-protein-uploaded-label img").last())
      .toHaveAttribute("src", new RegExp(`${product.flavor.toLowerCase()}-whey-isolate-1lb-label\\.png$`));
  } else {
    await expect(frame.locator(".sl-protein-meta")).toHaveText(`${product.flavor} · 2 lb · 29 servings`);
    await expect(frame.locator(".sl-protein-hero-image img")).toHaveCount(1);
    await expect(frame.locator(".sl-protein-label-grid img")).toHaveCount(0);
    await expect(frame.locator("#product-facts-label [role=note]")).toHaveCount(0);
  }
  const slug = `${product.flavor.toLowerCase()}-whey-isolate-${small ? "1lb" : "2lb"}`;
  const labelImages = frame.locator(".sl-protein-uploaded-label img");
  await expect(labelImages).toHaveCount(2);
  await expect(labelImages.nth(0)).toHaveAttribute("src", new RegExp(`/${slug}-facts\\.png$`));
  await expect(labelImages.nth(1)).toHaveAttribute("src", new RegExp(`/${slug}-label\\.png$`));
  await assertLocalOnlyOrdering(frame);
  return frame;
}

async function followFlavor(page: Page, frame: FrameLocator, flavor: string) {
  const path = `/products/${handle(flavor, false)}`;
  await frame.getByRole("group", { name: "Select a flavor", exact: true })
    .getByRole("link", { name: flavor, exact: true }).click();
  await expect(frame.getByRole("group", { name: "Select a flavor", exact: true }).locator("[aria-current=page]")).toHaveText(flavor);
  await expect(page).toHaveURL(url => url.pathname === path && url.search === "");
}

for (const width of [390, 1440]) {
  for (const surface of ["review", "Canvas"] as const) {
    test(`${surface} ${width}px: one-pound isolates keep their collection routes, prices and disclosed mockups`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const filter of ["", "&formula=isolate"]) {
        await page.goto(surface === "review"
          ? `/?category=100-isolate-whey-protein${filter}`
          : `${canvasRoot}/PowderWhey?category=100-isolate-whey-protein${filter}`, { waitUntil: "domcontentloaded" });
        const frame = page.frameLocator(".stellar-supplements-frame");
        await expect(page.locator(".stellar-supplements-frame")).toHaveAttribute("sandbox", sandbox);
        for (const { flavor } of sizes) {
          for (const small of [true, false]) {
            await frame.locator(`[data-whey-family="isolate:${flavor}"]`)
              .getByRole("button", { name: small ? "1 lb" : "2 lb", exact: true }).click();
            const card = frame.getByTestId(`card-product-Protein${flavor}Isolate${small ? "1lb" : ""}`);
            await expect(card.locator("h2 .sl-card-name")).toHaveText("Stellar Labs Whey Isolate Protein Powder");
            await expect(card.locator("h2 .sl-card-variant")).toHaveText(flavor);
            for (const selector of [".sl-product-image", ".sl-details-button"]) {
              await expect(card.locator(selector)).toHaveAttribute("href", `/products/${handle(flavor, small)}`);
            }
            if (small) {
              await expect(card).toContainText("$52.95");
              await expect(card.locator("img")).toHaveAttribute("alt", `${title(flavor, small)} — illustrative bottle mockup`);
              await expect(card.locator("img")).toHaveAttribute("src", /-1lb-mockup\.webp$/);
            } else {
              await expect(card.locator("img")).toHaveCount(1);
            }
          }
        }
      }
      // Canvas intentionally links into the review app; test that native exit.
      await page.frameLocator(".stellar-supplements-frame")
        .locator('[data-whey-family="isolate:Chocolate"]')
        .getByRole("button", { name: "1 lb", exact: true }).click();
      await page.frameLocator(".stellar-supplements-frame")
        .getByTestId("card-product-ProteinChocolateIsolate1lb").locator(".sl-product-image").click();
      await expect(page).toHaveURL(url => url.pathname === `/products/${handle("Chocolate")}`);
      await assertDetail(page, sizes[0]);
    });

    test(`${surface} ${width}px: Shop All includes both one-pound isolates without borrowing artwork`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(surface === "review" ? "/shop" : `${canvasRoot}/Homepage`, { waitUntil: "domcontentloaded" });
      const frame = page.frameLocator(".stellar-current-snapshot iframe");
      // Canvas has no /shop view. Exercise its real catalog initializer on the
      // raw captured document, before the homepage's featured-only filter removes
      // non-featured cards. Do not alter the live homepage or invent a Canvas route.
      if (surface === "Canvas") {
        await expect(page.locator(".stellar-current-snapshot iframe")).toHaveAttribute("src", /homepage-snapshot\.html/);
        const passes = await page.evaluate(async () => {
          const modulePath = "/__mockup/src/components/mockups/stellar-labs/_homepageProducts.ts";
          const { initializeHomepageProducts } = await import(/* @vite-ignore */ modulePath);
          const snapshot = document.querySelector<HTMLIFrameElement>(".stellar-current-snapshot iframe")!;
          const response = await fetch(snapshot.src);
          if (!response.ok) throw new Error(`Catalog snapshot unavailable: ${response.status}`);
          const doc = new DOMParser().parseFromString(await response.text(), "text/html");
          return [1, 2].map(() => {
            initializeHomepageProducts(doc);
            return ["chocolate", "vanilla"].map(flavor => {
              const handle = `100-isolate-whey-protein-shake-${flavor}`;
              const cards = [...doc.querySelectorAll(`[data-stellar-product="${handle}-1lb"] product-card`)];
              const card = cards[0];
              const large = [...doc.querySelectorAll("product-card")].filter(item =>
                item.querySelector(`a[href="/products/${handle}"]`));
              return {
                count: cards.length, text: card?.textContent, images: card?.querySelectorAll("img").length,
                imageAlt: card?.querySelector("img")?.alt,
                imageSrc: card?.querySelector("img")?.getAttribute("src"),
                heading: card?.querySelector("h3")?.textContent,
                links: [...(card?.querySelectorAll("a") ?? [])].map(link => ({
                  href: link.getAttribute("href"), target: link.target,
                })),
                sourceLinks: card?.querySelectorAll(".stellar-nutrition-source-link").length,
                largeCount: large.length, largeText: large[0]?.textContent,
              };
            });
          });
        });
        for (const results of passes) {
          for (const [index, result] of results.entries()) {
            const { flavor } = sizes[index];
            expect(result.count).toBe(1);
            expect(result.heading).toBe(title(flavor));
            expect(result.text).toContain("$52.95");
            expect(result.imageAlt).toBe(`${title(flavor)} — illustrative bottle mockup`);
            expect(result.imageSrc).toMatch(/-isolate-1lb-mockup\.webp$/);
            expect(result.text).toContain("Serving size: 29g (1 scoop)");
            expect(result.text).toContain("Servings per container: 16");
            expect(result.images).toBe(1);
            expect(result.sourceLinks).toBe(0);
            expect(result.links.length).toBeGreaterThanOrEqual(3);
            for (const link of result.links) {
              expect(link).toEqual({ href: `/products/${handle(flavor)}`, target: "_top" });
            }
            expect(result.largeCount).toBe(1);
            expect(result.largeText).toContain(title(flavor, false));
          }
        }
        return;
      }
      for (const { flavor } of sizes) {
        const card = frame.locator(`[data-stellar-product="${handle(flavor)}"] product-card`);
        await expect(card).toHaveCount(1);
        await expect(card.locator(".sl-card-name")).toHaveText("Stellar Labs Whey Isolate Protein Powder");
        await expect(card.locator(".sl-card-variant")).toHaveText(`${flavor} · 1 lb`);
        await expect(card.locator(".sl-product-price")).toHaveText("$52.95");
        await expect(card.locator("img")).toHaveAttribute("alt", `${title(flavor)} — illustrative bottle mockup`);
        await expect(card.locator("img")).toHaveAttribute("src", /-1lb-mockup\.webp$/);
        const facts = sizes.find(product => product.flavor === flavor)!;
        await expect(card.locator(".sl-card-nutrition dd")).toHaveText([`${facts.protein}g`, facts.calories, `${facts.carbs}g`, facts.sugar]);
        await expect(card.locator(".sl-card-per-serving")).toHaveText("Per serving");
        await expect(card.locator(".stellar-nutrition-source-link")).toHaveCount(0);
        await expect(card.locator(".sl-catalog-view-product"))
          .toHaveAttribute("href", `/products/${handle(flavor)}`);
        const large = frame.locator("product-card").filter({ has: frame.locator(`a[href="/products/${handle(flavor, false)}"]`) });
        await expect(large).toHaveCount(1);
        await expect(large.locator(".sl-card-variant")).toHaveText(`${flavor} · 2 lb`);
      }
      if (surface === "review") {
        await frame.locator(`[data-stellar-product="${handle("Vanilla")}"] .sl-catalog-view-product`).click();
        await expect(page).toHaveURL(url => url.pathname === `/products/${handle("Vanilla")}`);
        await assertDetail(page, sizes[1]);
      }
    });

    test(`${surface} ${width}px: available flavors navigate while one-pound direct routes retain their size`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 900 });
      const orderingRequests: string[] = [];
      await context.route(/\/(?:cart|checkout)(?:[/?#.]|$)/, route => {
        orderingRequests.push(route.request().url());
        return route.abort();
      });
      // Start in each real detail implementation. Canvas's original 2 lb
      // wrappers expose the shared selector; their links open local review routes.
      await page.goto(surface === "review"
        ? `/products/${handle("Chocolate", false)}`
        : `${canvasRoot}/ProteinChocolateIsolate`, { waitUntil: "domcontentloaded" });
      let frame = await assertDetail(page, sizes[0], false);
      for (const product of [sizes[1], sizes[0]]) {
        await followFlavor(page, frame, product.flavor);
        frame = await assertDetail(page, product, false);
      }
      // Both unavailable packages remain independently addressable from their
      // collection links. Reload must not fall back to the matching 2 lb route.
      for (const product of sizes) {
        const path = `/products/${handle(product.flavor)}`;
        await page.goto(path, { waitUntil: "domcontentloaded" });
        frame = await assertDetail(page, product);
        await page.reload({ waitUntil: "domcontentloaded" });
        frame = await assertDetail(page, product);
        await frame.getByRole("group", { name: "Select a size", exact: true })
          .getByRole("link", { name: "2 lb", exact: true }).click();
        await expect(page).toHaveURL(url => url.pathname === `/products/${handle(product.flavor, false)}`);
        await assertDetail(page, product, false);
      }
      expect(orderingRequests).toEqual([]);
    });
  }
}
