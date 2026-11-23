import { expect, test } from "@playwright/test";
import { assertFodmapFootnote, collectionNotes } from "./collection-assertions";
import { wheyClaimLabels } from "./powder-fixtures";

for (const width of [390, 1280]) {
  test(`collection nutrition callouts at ${width}px match each formula and flavor`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const cases = [
      ["100-isolate-whey-protein&formula=blend", ["Protein"], ["24g"]],
      ["vegan-plant-protein", ["Protein"], ["20g"]],
      ["electrolyte", ["Calories", "Potassium", "Magnesium", "Sodium", "Calcium"], ["5", "280mg", "51mg", "80mg", "47mg"]],
      ["electrolyte&flavor=lemon-lime", ["Calories", "Potassium", "Magnesium", "Sodium", "Calcium"], ["5", "280mg", "51mg", "80mg", "47mg"]],
      ["electrolyte&flavor=strawberry", ["Calories", "Potassium", "Magnesium", "Sodium", "Calcium"], ["5", "280mg", "51mg", "80mg", "47mg"]],
    ] as const;
    for (const [query, labels, values] of cases) {
      await page.goto(`/?category=${query}`);
      const frame = page.frameLocator(".stellar-supplements-frame");
      const blend = query.includes("formula=blend");
      if (blend) {
        // Only Natural blends are active; Classic is withdrawn sitewide.
        await expect(frame.locator(".sl-whey-nutrition-compact > p")).toHaveText("24g protein per serving");
        await expect(frame.locator(".sl-whey-nutrition-value")).toHaveText(["24g"]);
        await expect(frame.locator(".sl-product")).toHaveCount(3);
        for (const component of ["ProteinCaramelBlend", "ProteinVanillaBlend", "ProteinChocolateBlend"]) {
          await expect(frame.getByTestId(`card-product-${component}`)).toBeVisible();
        }
        await expect(frame.locator('[data-testid^="card-product-ProteinClassic"]')).toHaveCount(0);
      } else {
        if (query.startsWith("vegan")) await expect(frame.locator(".sl-whey-nutrition-compact > p")).toHaveText("20g protein per serving");
        else await expect(frame.locator(".sl-whey-nutrition dt")).toHaveText([...labels]);
        await expect(frame.locator(".sl-whey-nutrition-value")).toHaveText([...values]);
      }
      if (query.startsWith("electrolyte")) {
        await expect(frame.locator(".sl-whey-nutrition-caption")).not.toContainText(["As low as"]);
        await expect(frame.locator(".review-quality-claim")).toHaveText([
          "Non-GMO", "Certified Gluten-Free",
          "Easy-to-Digest Ingredients", "Vegan", "No Added Sugars",
        ]);
        await expect(frame.locator(".sl-collection")).not.toContainText("Strawberry");
        await expect(frame.locator(".sl-product")).toHaveCount(1);
        await expect(frame.locator(".sl-product h2 .sl-card-name")).toHaveText("Lemon Lime Electrolyte Powder");
        await expect(frame.locator(".sl-product h2 .sl-card-variant")).toHaveCount(0);
        const filters = frame.getByRole("navigation", { name: "ELECTROLYTES filters" });
        await expect(filters).toHaveCount(0);
        await expect(frame.getByRole("navigation", { name: "ELECTROLYTES filters" }).getByRole("link", { name: "Strawberry", exact: true })).toHaveCount(0);
        await expect(frame.locator(".review-quality-strip")).not.toContainText("rBGH");
      } else if (blend) {
        await expect(frame.locator(".review-quality-claim")).toHaveText(wheyClaimLabels);
      } else {
        await expect(frame.locator(".review-quality-claim")).toHaveText([
          "Non-GMO", "Certified Gluten-Free", "Easy-to-Digest Ingredients", "Vegan",
        ]);
      }
      if (!blend) await assertFodmapFootnote(frame.locator(".review-quality-strip"),
        collectionNotes[query.startsWith("electrolyte") ? "electrolyte" : query.startsWith("vegan") ? "vegan" : "whey"], true);
      await expect(frame.locator(".sl-product").first()).toBeVisible();
      if (!blend) expect(await frame.locator(".sl-whey-nutrition").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    await page.goto("/?category=100-isolate-whey-protein&formula=isolate");
    const frame = page.frameLocator(".stellar-supplements-frame");
    await expect(frame.locator(".sl-whey-nutrition dt")).toHaveText(["Calories", "Protein", "Carbs", "Sugar"]);
    await expect(frame.locator(".sl-whey-nutrition-value")).toHaveText(["110", "26g", "1g", "0g"]);
    await expect(frame.locator(".sl-whey-nutrition-caption")).toHaveText(["As low as", "Up to", "As low as", "As low as"]);
    await expect(frame.locator(".review-quality-claim")).toHaveText(wheyClaimLabels);
    await page.goto("/?category=100-isolate-whey-protein");
    await expect(frame.locator(".sl-whey-nutrition")).toHaveCount(0);
    await expect(frame.locator(".review-quality-claim")).toHaveText(wheyClaimLabels);
    await assertFodmapFootnote(frame.locator(".review-quality-strip"), collectionNotes.whey, true);
  });
}
