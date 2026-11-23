import { expect, test } from "@playwright/test";

const claim = "Tested for Heavy Metals";
const canvas = "/__mockup/preview/stellar-labs";

for (const surface of ["review", "Canvas"] as const) {
  for (const width of [390, 1280]) {
    test(`${surface} ${width}px: footer opens FAQs and testing information stays plain text`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 1000 });
      const home = surface === "review" ? "/" : `${canvas}/Homepage`;
      await page.goto(home, { waitUntil: "domcontentloaded" });
      const homepage = page.frameLocator('iframe[title="Stellar Labs original Shopify homepage — read-only snapshot"]');
      const callouts = homepage.locator(".stellar-callout-row");
      const tested = callouts.locator(".stellar-callout").filter({ hasText: claim });
      await expect(tested).toHaveCount(0);
      await expect(callouts.locator('svg[data-stellar-icon="heavy-metals"]')).toHaveCount(0);
      // Removing the testing badge must not shift the existing meaning-based
      // icons into the retired facility slot.
      await expect(callouts.locator('[data-stellar-icon="corn"]')).toHaveCount(1);
      await expect(callouts.locator('[data-stellar-icon="gluten-free"]')).toHaveCount(1);
      await expect(callouts.locator('[data-stellar-icon="stomach"]')).toHaveCount(1);
      const faqLink = homepage.locator("footer").getByRole("link", { name: "FAQs", exact: true });
      await expect(faqLink).toHaveCount(1);
      await expect(faqLink).toHaveAttribute("href", "/pages/faqs");
      await expect(faqLink).toHaveAttribute("target", "_parent");
      await faqLink.click();
      await expect(page).toHaveURL(/\/pages\/faqs$/);
      const faqs = page.frameLocator('iframe[title="Stellar Labs frequently asked questions"]');
      await expect(faqs.getByRole("heading", { name: "Frequently Asked Questions", exact: true })).toBeVisible();
      const heavy = faqs.getByTestId("faq-heavy-metals");
      await expect(heavy).toHaveAttribute("open", "");
      await expect(heavy.locator(".sl-faq-answer")).toHaveText("Yes. All Stellar Labs products have passed heavy-metal testing.");
      await expect(heavy.locator("svg,img")).toHaveCount(0);
      await heavy.locator("summary").click();
      await expect(heavy).not.toHaveAttribute("open");
      await heavy.locator("summary").press("Enter");
      await expect(heavy).toHaveAttribute("open", "");
      await expect(faqs.locator(".sl-faqs-list details")).toHaveCount(8);
      expect(await faqs.locator("html").evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await faqs.getByTestId("faq-shipping").locator("summary").click();
      await expect(faqs.getByRole("link", { name: "Shipping & Returns Policy", exact: true }))
        .toHaveAttribute("href", "/pages/shipping-information");
      await expect(page.locator("iframe")).not.toHaveAttribute("sandbox", /allow-scripts/);
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
          await expect(badge).toHaveCount(detail ? 1 : 0);
          if (detail) {
            await expect(badge).toBeVisible();
            await expect(badge.locator("svg,img")).toHaveCount(0);
            await expect(badge).not.toContainText(/heavy[\s-]*metal[\s-]*free|certified.*heavy[\s-]*metal/i);
          }
        });
      }
    });
  }
}
