import { expect, test } from "@playwright/test";

const routes = [
  "/", "/pages/about-us", "/supplements", "/?category=100-isolate-whey-protein&formula=isolate",
  "/?category=vegan-plant-protein", "/?category=electrolyte", "/shop", "/product-information",
  "/products/vanilla-vegan-shake", "/products/vanilla-whey-protein-shake",
  "/products/supplements-lemon-lime-electrolyte-powder",
  "/supplement-details?product=womens-multi", "/recipes",
  "/recipes/vegan-vanilla-anti-inflammatory-protein-shake",
  "/recipes/low-fodmap-strawberry-banana-vanilla-smoothie",
];

for (const width of [390, 1440]) {
  test(`approved website text and unchanged navigation render at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // The snapshot stays script-disabled. Inspect rendered text from its
      // same-origin host, including React content portaled into that document.
      const content = () => page.evaluate(() => {
        const iframe = document.querySelector<HTMLIFrameElement>("main iframe");
        const doc = iframe?.contentDocument;
        const mount = doc?.getElementById("supplements-app-mount");
        if (mount && !mount.childElementCount) return "";
        return mount?.innerText || doc?.body?.innerText || document.querySelector<HTMLElement>(".stellar-product-guide")?.innerText || "";
      });
      await expect.poll(content, { message: `${route} must finish rendering` }).toMatch(/\w{10}/);
      await expect.poll(async () => /fodmap|new products, same label|christine hanson|low sodium|less sodium|reduced sodium/i.test(await content()),
        { message: `${route} must not show retired marketing copy` }).toBe(false);
      const text = await content();
      if (route === "/") {
        expect(text).toContain("for those focused on fat loss and maintaining lean muscle");
        expect(text).toContain("Easy-to-Digest Ingredients");
      }
      if (route === "/pages/about-us") expect(text).toContain("CHRISTINE HAAS, MS, LDN, CNS");
      if (route === "/supplements") {
        expect(text).toContain("Daily supplements designed to complement your nutrition and wellness routine.");
        expect(text).not.toContain("Easy-to-Digest Ingredients");
      }
      if (route.includes("vanilla-vegan-shake")) {
        expect(text).toMatch(/6g[\s\S]*Carbs|Carbs[\s\S]*6g/);
        expect(text).toContain("20g of plant protein per serving");
      }
      if (route.includes("vanilla-whey-protein-shake")) {
        expect(text).toContain("Natural Whey Protein Blend");
        expect(text).not.toMatch(/artificial (flavors|colors|sweeteners)/i);
      }
      if (route.startsWith("/products/") || route.startsWith("/supplement-details")) {
        expect(text.match(/These statements have not been evaluated by the Food and Drug Administration/g)).toHaveLength(1);
      }
      if (route !== "/product-information") await expect(page.locator("main iframe").first()).not.toHaveAttribute("sandbox", /allow-scripts/);
    }
    // A real category activation still reaches the local collection.
    await page.goto("/?category=vegan-plant-protein", { waitUntil: "domcontentloaded" });
    const collection = page.frameLocator(".stellar-supplements-frame");
    await collection.getByTestId("button-details-VeganVanilla").click();
    await expect(page).toHaveURL(/\/products\/vanilla-vegan-shake$/);
  });
  test(`Canvas uses the same approved website text at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    for (const component of ["Homepage", "PowderVegan", "PowderWhey", "PowderElectrolytes", "ProteinVanillaBlend", "SupplementDetails?product=womens-multi"]) {
      await page.goto(`/__mockup/preview/stellar-labs/${component}`, { waitUntil: "domcontentloaded" });
      const content = () => page.evaluate(() => {
        const frame = document.querySelector<HTMLIFrameElement>("iframe");
        const doc = frame?.contentDocument;
        const mount = doc?.getElementById("supplements-app-mount");
        return mount && !mount.childElementCount ? "" : doc?.body?.innerText || "";
      });
      await expect.poll(content).toMatch(/\w{10}/);
      await expect.poll(async () => /fodmap|new products, same label|low sodium|less sodium/i.test(await content())).toBe(false);
      if (component === "Homepage") {
        await expect.poll(content).toContain("Easy-to-Digest Ingredients");
        expect(await content()).toContain("for those focused on fat loss and maintaining lean muscle");
      }
      if (component === "ProteinVanillaBlend") {
        expect(await content()).not.toMatch(/artificial (flavors|colors|sweeteners)/i);
      }
      await expect(page.locator("iframe").first()).not.toHaveAttribute("sandbox", /allow-scripts/);
    }
  });
}
