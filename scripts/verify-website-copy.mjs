import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

const root = "artifacts/stellar-review/src/pages/stellar/_shared/";
const read = async name => JSON.parse(await fs.readFile(root + name, "utf8"));
const products = (await Promise.all(["protein-products.json", "vegan-products.json", "electrolyte-products.json"].map(read)))
  .flat().filter(product => !product.discontinued);
const recipes = await read("recipes.json");
const base = process.env.HOMEPAGE_TEST_BASE_URL || "http://127.0.0.1:80";
const routes = [
  "/", "/shop", "/pages/about-us", "/supplements", "/product-information",
  "/?category=100-isolate-whey-protein&formula=isolate",
  "/?category=100-isolate-whey-protein&formula=blend",
  "/?category=vegan-plant-protein", "/?category=electrolyte", "/recipes",
  ...products.map(product => `/products/${product.handle}`),
  ...["womens-multi", "mens-multivitamin", "probiotic-40", "digestive-enzyme", "omega-3", "magnesium-complex", "turmeric-w-bioperine"]
    .map(id => `/supplement-details?product=${id}`),
  ...recipes.map(recipe => `/recipes/${recipe.slug}`),
];
const withdrawn = /fodmap|New Products, Same Label|CHRISTINE HANSON|guilt-free|healthy enough for breakfast|just 2g of sugar|all natural|sustainable energy|Tumeric|Coconut Xtract|no bloat|low sodium|less sodium/gi;
const fda = "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.";
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium" });
const prefix = process.argv.find(argument => argument.startsWith("--route-prefix="))?.split("=").slice(1).join("=");
const results = [];
try {
  // One read-only browser pass; no cart, checkout, remote writes or account flow.
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const route of width === 390 ? ["/", "/pages/about-us"] : [...new Set(routes)]) {
      if (prefix && !route.startsWith(prefix)) continue;
      await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
      const frame = page.frames().find(frame => frame !== page.mainFrame())
        ?? (route === "/product-information" ? page.mainFrame() : undefined);
      if (!frame) throw new Error(`Missing product/page frame: ${route}`);
      await frame.locator("body").waitFor();
      await frame.locator("details").evaluateAll(details => details.forEach(detail => { detail.open = true; }));
      const text = await frame.locator("body").innerText();
      const remaining = [...text.matchAll(withdrawn)].map(match => match[0]);
      const fdaCopies = text.split(fda).length - 1;
      const productPage = route.startsWith("/products/") || route.startsWith("/supplement-details");
      const result = {
        route, width, remaining, fdaCopies,
        heading: await frame.locator("h1").allTextContents(),
        errors: [...errors],
        passed: text.trim().length > 100 && remaining.length === 0
          && (!productPage || (fdaCopies === 1 && (text.match(/These statements have not been evaluated/g) ?? []).length === 1)) && errors.length === 0,
      };
      results.push(result);
      console.log(`${result.passed ? "PASS" : "FAIL"} ${width} ${route}${remaining.length ? `: ${remaining.join(", ")}` : ""}${productPage ? ` FDA=${fdaCopies}` : ""}`);
      errors.length = 0;
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await fs.mkdir("generated-artifacts/website-copy-review", { recursive: true });
const output = "generated-artifacts/website-copy-review/live-page-checks.json";
const prior = prefix ? JSON.parse(await fs.readFile(output, "utf8")) : [];
await fs.writeFile(output, JSON.stringify([...prior.filter(previous => !results.some(result => result.route === previous.route && result.width === previous.width)), ...results], null, 2));
if (results.some(result => !result.passed)) process.exitCode = 1;
