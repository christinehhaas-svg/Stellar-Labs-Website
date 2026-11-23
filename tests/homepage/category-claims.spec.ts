import { expect, test } from "@playwright/test";

for (const surface of [
  { name: "review", path: "/product-information", module: "/src/pages/stellar/_shared/QualityCallouts.tsx" },
  { name: "Canvas", path: "/__mockup/preview/stellar-labs/StellarProductInformation", module: "/__mockup/src/components/mockups/stellar-labs/_shared/QualityCallouts.tsx" },
]) {
  test(`${surface.name}: category claims each retain their own icon and readable label`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(surface.path);
    const families = page.locator(".stellar-product-guide__family");
    await expect(families).toHaveCount(5);
    for (const family of await families.all()) {
      await family.locator("summary").first().click();
      for (const badge of await family.locator(".stellar-product-guide__claims > span").all()) {
        const text = (await badge.innerText()).trim();
        const expected = text === "Non-GMO" ? "corn"
          : /^Certified Gluten-Free/.test(text) ? "gluten-free"
          : /^Easy-to-Digest/.test(text) ? "stomach"
          : /^(Vegan|Vegetarian|Sweetened with Stevia)/.test(text) ? "leaf"
          : text === "No Added Sugars" ? "sugar"
          : /^rBGH-Free/.test(text) ? "milk" : "check";
        const icon = /^Tested for Heavy Metals/.test(text) ? "testing" : expected;
        expect(text).not.toContain(" · ");
        await expect(badge.locator("[data-claim-icon]")).toHaveCount(1);
        await expect(badge.locator("[data-claim-icon]")).toHaveAttribute("data-claim-icon", icon);
        await expect(badge).toBeVisible();
      }
    }
    // Historical combined category wording must expand into independent badges,
    // without stripping the product-specific exception from its own claim.
    const split = await page.evaluate(async modulePath => {
      const { qualityCallouts } = await import(/* @vite-ignore */ modulePath);
      return qualityCallouts([
        "Certified Gluten-Free · Non-GMO",
        "Vegan · Certified Gluten-Free · Non-GMO",
        "Easy-to-Digest Ingredients · No Added Sugars",
        "Certified Gluten-Free · except Night Time Fat Burn",
      ]).map((item: { label: string; symbol: string }) => [item.label, item.symbol]);
    }, surface.module);
    expect(split).toEqual([
      ["Certified Gluten-Free", "gluten-free"], ["Non-GMO", "corn"],
      ["Vegan", "leaf"], ["Certified Gluten-Free", "gluten-free"], ["Non-GMO", "corn"],
      ["Easy-to-Digest Ingredients", "stomach"], ["No Added Sugars", "sugar"],
      ["Certified Gluten-Free · except Night Time Fat Burn", "gluten-free"],
      ["Tested for Heavy Metals", "testing"],
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
