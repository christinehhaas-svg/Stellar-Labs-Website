import { expect, test } from "@playwright/test";

test("whey filters navigate inside a sandboxed preview without replacing its parent", async ({ page }) => {
  await page.goto("/");
  const outerUrl = page.url();
  await page.setContent(`<iframe title="Embedded website" style="width:100%;height:900px"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    src="/?category=100-isolate-whey-protein"></iframe>`);
  const host = page.frameLocator('iframe[title="Embedded website"]');
  const collection = host.frameLocator(".stellar-supplements-frame");
  for (const [label, heading, formula] of [
    ["Whey isolate", "Stellar Labs Whey Isolate Protein Powder", "isolate"],
    ["Whey blends", "Whey Protein Blends", "blend"],
    ["All whey", "WHEY PROTEIN", null],
  ] as const) {
    await collection.getByRole("link", { name: label, exact: true }).click();
    await expect(collection.locator(".sl-collection-heading h1")).toHaveText(heading);
    await expect.poll(async () => {
      const url = await host.locator("body").evaluate(() => window.location.href);
      return new URL(url).searchParams.get("formula");
    }).toBe(formula);
    await expect(collection.locator(".sl-product").first()).toBeVisible();
    await expect(page).toHaveURL(outerUrl);
  }
});
