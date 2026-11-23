import { expect, test } from "@playwright/test";

const claim = "Tested for Heavy Metals";
const canvas = "/__mockup/preview/stellar-labs";

for (const surface of ["review", "Canvas"] as const) {
  for (const width of [390, 1280]) {
    test(`${surface} ${width}px: homepage and every product family show the heavy-metal testing flask`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 1000 });
      const home = surface === "review" ? "/" : `${canvas}/Homepage`;
      await page.goto(home, { waitUntil: "domcontentloaded" });
      const homepage = page.frameLocator('iframe[title="Stellar Labs original Shopify homepage — read-only snapshot"]');
      const callouts = homepage.locator(".stellar-callout-row");
      const tested = callouts.locator(".stellar-callout").filter({ hasText: claim });
      await expect(tested).toHaveCount(1);
      await expect(tested).toBeVisible();
      await expect(tested.locator('svg[data-stellar-icon="heavy-metals"]')).toHaveCount(1);
      // Adding a fifth claim must not shift the existing meaning-based icons
      // into the retired facility slot.
      await expect(callouts.locator('[data-stellar-icon="corn"]')).toHaveCount(1);
      await expect(callouts.locator('[data-stellar-icon="gluten-free"]')).toHaveCount(1);
      await expect(callouts.locator('[data-stellar-icon="stomach"]')).toHaveCount(1);
      const pairs = [
        ["/?category=100-isolate-whey-protein", `${canvas}/Homepage?category=100-isolate-whey-protein`],
        ["/?category=100-isolate-whey-protein&formula=isolate", `${canvas}/Homepage?category=100-isolate-whey-protein&formula=isolate`],
        ["/?category=100-isolate-whey-protein&formula=blend", `${canvas}/Homepage?category=100-isolate-whey-protein&formula=blend`],
        ["/?category=vegan-plant-protein", `${canvas}/Homepage?category=vegan-plant-protein`],
        ["/?category=electrolyte", `${canvas}/Homepage?category=electrolyte`],
        ["/supplements", `${canvas}/Supplements`],
        ["/products/100-isolate-whey-protein-shake-mixed-berry", `${canvas}/ProteinMixedBerry`],
        ["/products/vanilla-vegan-shake", `${canvas}/VeganVanilla`],
        ["/products/supplements-lemon-lime-electrolyte-powder", `${canvas}/ElectrolyteLemonLime`],
        ["/supplement-details?product=womens-multi", `${canvas}/SupplementDetails?product=womens-multi`],
      ];
      for (const paths of pairs) {
        const path = paths[surface === "review" ? 0 : 1];
        await test.step(path, async () => {
          await page.goto(path, { waitUntil: "domcontentloaded" });
          const frame = page.frameLocator("iframe").first();
          const detail = paths[0].startsWith("/products/") || paths[0].startsWith("/supplement-details");
          const claims = detail ? frame.locator(".sl-protein-quality > li")
            : frame.locator(".review-quality-strip").first().locator(".review-quality-claim");
          const badge = claims.filter({ hasText: new RegExp(`^${claim}$`) });
          await expect(badge).toHaveCount(1);
          await expect(badge).toBeVisible();
          await expect(badge.locator('svg[data-claim-icon="testing"]')).toHaveCount(1);
          await expect(badge).not.toContainText(/heavy[\s-]*metal[\s-]*free|certified.*heavy[\s-]*metal/i);
        });
      }
    });
  }
}
