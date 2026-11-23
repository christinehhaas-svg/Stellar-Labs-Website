import { expect, test } from "@playwright/test";
import { expectedCardNutrition } from "./powder-fixtures";
import proteins from "../../artifacts/stellar-review/src/pages/stellar/_shared/protein-products.json";
import vegans from "../../artifacts/stellar-review/src/pages/stellar/_shared/vegan-products.json";
import electrolytes from "../../artifacts/stellar-review/src/pages/stellar/_shared/electrolyte-products.json";

for (const width of [1440, 390, 320]) {
  test(`Shop All uses category facts and compact cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    const frame = page.frameLocator("iframe").first();
    const section = frame.locator("[data-stellar-full-catalog]");
    await expect(section.locator("[data-stellar-catalog-card]")).toHaveCount(20);
    await expect(section.locator('[data-catalog-component="ElectrolyteStrawberry"]')).toHaveCount(0);
    await expect(section.locator(".stellar-nutrition-description")).toHaveCount(0);
    const columns = await section.locator(".resource-list--grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(width > 760 ? 4 : 2);
    for (const product of [...proteins, ...vegans, ...electrolytes].filter(p => p.component !== "ElectrolyteStrawberry")) {
      const card = section.locator(`[data-catalog-component="${product.component}"]`);
      await expect(card).toHaveCount(1);
      await expect(card.locator("dt")).toHaveText(product.formula === "electrolyte"
        ? ["Calories", "Potassium", "Magnesium", "Calcium", "Sodium"]
        : ["Calories", "Protein", "Carbs", product.formula === "blend" ? "Natural sugar" : "Sugar"]);
      await expect(card.locator("dd")).toHaveText(expectedCardNutrition[product.component]);
      await expect(card.locator(".sl-card-per-serving")).toHaveText("Per serving");
      await expect(card.locator(".sl-product-price")).toHaveText(`$${(product.price / 100).toFixed(2)}`);
      await expect(card.locator(".sl-catalog-view-product")).toHaveAttribute("href", `/products/${product.handle}`);
      const bounds = await card.evaluate(el => {
        const labels = [...el.querySelectorAll("dt")].map(label => label.getBoundingClientRect());
        const figures = [...el.querySelectorAll("dd")].map(figure => figure.getBoundingClientRect());
        return {
          labelsSeparated: labels.every((label, index) => !index || label.left >= labels[index - 1].right - 0.5),
          figuresAbove: figures.every((figure, index) => figure.bottom <= labels[index].top + 0.5),
          sameNumberSize: new Set([...el.querySelectorAll("dd")].map(figure => getComputedStyle(figure).fontSize)).size === 1,
        };
      });
      expect(bounds).toEqual({ labelsSeparated: true, figuresAbove: true, sameNumberSize: true });
    }
    for (const id of ["womens-multi", "mens-multivitamin", "omega-3", "probiotic-40", "digestive-enzyme", "magnesium-complex", "turmeric-w-bioperine"]) {
      const card = section.locator(`[data-catalog-supplement="${id}"]`);
      await expect(card).toHaveCount(1);
      await expect(card.locator(".sl-catalog-view-product")).toHaveAttribute("href", `/supplement-details?product=${id}`);
    }
    // Include legacy captured cards, not just cards marked by the new renderer.
    // The old "magnesium" handle and current supplement ID refer to one product.
    await expect(section.locator("product-card").filter({ hasText: /Magnesium Complex/ })).toHaveCount(1);
    await expect(section.locator("product-card").filter({ hasText: "The Low and Lean Eating System" })).toHaveCount(1);
    const books = section.locator('product-card a[href*="stellarlabsnutrition.com/products/"]');
    for (const book of await books.all()) await expect(book).toHaveAttribute("target", "_blank");
    const navigation = frame.locator("#header-component .stellar-shop-navigation__links");
    const shopAll = navigation.locator("a").filter({ hasText: /^Shop All$/ });
    if (width > 760) await expect(shopAll).toBeVisible();
    await expect(shopAll).toHaveAttribute("href", "/shop");
    const firstLink = section.locator(".sl-catalog-view-product").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/products\/100-isolate-whey-protein-shake-vanilla$/);
  });
}
