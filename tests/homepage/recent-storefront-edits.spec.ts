import { expect, test } from "@playwright/test";

test("recent collection copy and ingredient callouts survive fresh page loads", async ({ page }) => {
  for (const surface of [
    { electrolyte: "/?category=electrolyte", vegan: "/?category=vegan-plant-protein" },
    {
      electrolyte: "/__mockup/preview/stellar-labs/PowderElectrolytes",
      vegan: "/__mockup/preview/stellar-labs/PowderVegan",
    },
  ]) {
    await page.goto(surface.electrolyte);
    const frame = page.frameLocator(".stellar-supplements-frame");
    await expect(frame.locator(".sl-collection-heading")).toContainText(
      "Low calorie delicious hydration with all major electrolytes that tastes great.",
    );
    const claims = frame.locator(".sl-whey-collection-claims");
    await expect(claims.getByText("Easy-to-Digest Ingredients", { exact: true })).toBeVisible();
    await expect(claims.getByText("Vegan", { exact: true })).toBeVisible();
    await expect(claims).not.toContainText(/FODMAP|All Major Electrolytes|Includes chloride/i);
    await page.goto(surface.vegan);
    await expect(claims.getByText("Easy-to-Digest Ingredients", { exact: true })).toBeVisible();
    await expect(claims.getByText("Vegan", { exact: true })).toBeVisible();
  }
});

test("Shop All retains the plural Electrolytes category and edited recipe photos load", async ({ page }) => {
  await page.goto("/shop");
  const shop = page.frameLocator("iframe").first();
  await expect(shop.locator('[data-filter-tag="electrolyte"]')).toHaveText("Electrolytes", { ignoreCase: true });
  const lemonLime = shop.locator('[data-catalog-component="ElectrolyteLemonLime"]');
  await expect(lemonLime.locator(".sl-card-name")).toHaveText("Lemon Lime Electrolyte Hydration");
  await expect(lemonLime).not.toContainText(/4\.76\s*oz|135\s*g/);
  await expect(lemonLime.locator(".sl-card-variant")).toHaveCount(0);
  for (const component of ["ProteinVanillaBlend", "ProteinChocolateBlend", "ProteinCaramelBlend"]) {
    const card = shop.locator(`[data-catalog-component="${component}"]`);
    await expect(card.locator("dt")).toHaveText(["Calories", "Protein", "Carbs", "Sugar"]);
    await expect(card).not.toContainText(/Natural sugar/i);
  }
  await page.goto("/recipes");
  const recipes = page.frameLocator("iframe").first();
  for (const [slug, image] of [
    ["raw-vegan-banana-berry-smoothie", "vanilla-board-no-bar.jpg"],
    ["low-fodmap-strawberry-banana-vanilla-smoothie", "vanilla-board-no-bar.jpg"],
    ["raw-vegan-chocolate-peanut-butter-banana-smoothie", "chocolate-desk-no-bar.jpg"],
    ["whey-chocolate-peanut-butter-banana-smoothie", "chocolate-notebook-no-bar.jpg"],
  ]) {
    const photo = recipes.getByTestId(`card-recipe-${slug}`).locator("img");
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveAttribute("src", new RegExp(`${image.replaceAll(".", "\\.")}$`));
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
      .toBe(true);
  }
});

test("Shop All Lemon Lime nutrition fits on one readable row without calcium", async ({ page }) => {
  for (const width of [1280, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/shop");
    const frame = page.frameLocator("iframe").first();
    const card = frame.locator('[data-catalog-component="ElectrolyteLemonLime"]');
    const metrics = card.locator(".sl-card-electrolyte-metrics");
    await expect(metrics.locator("dd")).toHaveText(["5", "280mg", "51mg", "80mg"]);
    await expect(metrics.locator("dt")).toHaveText(["Calories", "Potassium", "Magnesium", "Sodium"]);
    const layout = await metrics.evaluate(element => [...element.children].map(metric => {
      const bounds = metric.getBoundingClientRect();
      const label = metric.querySelector("dt")!;
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(label);
      const text = range.getBoundingClientRect();
      return { top: bounds.top, fits: text.left >= bounds.left - 1 && text.right <= bounds.right + 1 };
    }));
    expect(layout.every(metric => metric.fits), "Full nutrient labels must fit without running together").toBe(true);
    expect(new Set(layout.map(metric => Math.round(metric.top))).size, "Four nutrients stay on a single row").toBe(1);
  }
});
