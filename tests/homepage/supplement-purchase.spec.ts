import { expect, test, type Locator, type Page } from "@playwright/test";
import { supplementDisclaimer, supplementExpectations } from "./supplement-purchase-fixtures";

const medicationNote = "Check with your medical provider before taking supplements with medications.";

async function assertSelection(root: Locator, product: (typeof supplementExpectations)[number], imagePath: string) {
  await expect(root.getByRole("combobox", { name: "Choose supplement" })).toHaveValue(product.id);
  await expect(root.getByRole("heading", { level: 1 })).toHaveText(product.name);
  const front = root.locator(".sl-protein-hero-image img");
  await expect(front).toHaveAttribute("src", imagePath + product.bottle);
  const caption = product.id === "womens-multi"
    ? "Product bottle photo from the current Stellar Labs store."
    : "Product-specific bottle illustration using the supplied label artwork and the store's container shape; not a finished-product photo.";
  await expect(front).toHaveAttribute("alt", `${product.name} — ${caption}`);
  await expect(root.locator(".sl-protein-meta")).toHaveText(product.meta);
  await expect(root.locator(".sl-protein-price")).toHaveText(product.price);
  const nutrition = root.getByRole("region", { name: "Per serving nutrition summary" });
  const probiotic = product.id === "probiotic-40";
  if (probiotic) {
    await expect(nutrition).toHaveCount(0);
    await expect(root.locator(".sl-probiotic-potency")).toHaveText("40 billion CFU per serving");
    await expect(root.locator(".sl-probiotic-serving-size")).toHaveText("Serving size: 2 capsules");
    await expect(root.locator(".sl-probiotic-description")).toHaveText("Contains 4 probiotic strains");
    // Each named strain occurs once in visible text, only in Supplement Facts.
    for (const strain of product.facts) {
      await expect(root.getByText(strain, { exact: true })).toHaveCount(1);
      expect((await root.innerText()).split(strain)).toHaveLength(2);
    }
  } else {
    await expect(root.locator(".sl-probiotic-potency, .sl-probiotic-serving-size, .sl-probiotic-description")).toHaveCount(0);
    await expect(nutrition.locator(":scope > p")).toHaveText(`Per serving · ${product.basis}`);
    await expect(nutrition.locator("dt")).toHaveText(product.metrics.map(([label]) => label));
    await expect(nutrition.locator("dd")).toHaveText(product.metrics.map(([, value]) => value));
  }
  await expect(root.locator(".sl-protein-benefits li")).toHaveText(product.benefits);
  const claims = root.getByRole("heading", { name: "Product details", exact: true }).locator("..");
  await expect(claims.locator("li")).toHaveText([...product.claims, "Tested for Heavy Metals"]);
  const suggestedUse = root.getByRole("heading", { name: "Suggested use", exact: true }).locator("..");
  await expect(suggestedUse.locator("p")).toHaveText(product.use);
  const facts = root.locator("#supplement-nutrition-facts");
  await expect(facts.getByRole("heading")).toHaveText(probiotic ? "Supplement Facts" : "Complete nutrition / supplement facts");
  await expect(facts.locator("li")).toHaveText(product.facts);
  const label = facts.locator("img");
  await expect(label).toHaveAttribute("src", imagePath + product.label);
  await expect(label).toHaveAttribute("alt", `${product.name} complete original label, facts and ingredients`);
  await expect(facts.locator("a").first()).toHaveAttribute("href", imagePath + product.label);
  await expect(facts.getByRole("link", { name: "Open original complete label" }))
    .toHaveAttribute("href", imagePath + product.original);
  for (const link of await facts.locator("a").all()) {
    await expect(link).toHaveAttribute("target", "_blank");
  }
  // Scroll the lazy label into view and check actual image decoding, not just URLs.
  await label.scrollIntoViewIfNeeded();
  for (const image of [front, label]) {
    await expect.poll(() => image.evaluate((element: HTMLImageElement) =>
      element.complete && element.naturalWidth > 0)).toBe(true);
  }
  const warnings = root.locator(".sl-product-safety-notes");
  await expect(warnings.locator("li")).toHaveText([...new Set(product.warnings)]);
  await expect(warnings.locator("#label-disclaimer")).toHaveText(
    `${product.id === "turmeric-w-bioperine" ? "*" : ""}${supplementDisclaimer}`);
  await expect(root.getByText(medicationNote, { exact: true })).toHaveCount(1);
  await expect(root.locator(".sl-protein-details > :last-child")).toHaveText(medicationNote);
  await expect(root.locator("main > :last-child")).toHaveClass("sl-protein-details");
  await expect(root.locator(".sl-protein-quantity output")).toHaveText("1");
  await expect(root.getByRole("radio", { name: "One-time purchase", exact: true })).toBeChecked();
  await expect(root.getByRole("radio", { name: "Subscribe & Save 10%", exact: true })).not.toBeChecked();
  await expect(root.locator(".sl-protein-selection-status")).toHaveCount(0);
}

async function assertSectionLinks(page: Page, root: Locator) {
  const outerUrl = page.url();
  for (const [name, id] of [
    ["Product Details", "supplement-product-details"],
    ["Nutrition Facts", "supplement-nutrition-facts"],
  ]) {
    const link = root.getByRole("navigation", { name: "On this page" }).getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", `#${id}`);
    await link.click();
    const target = root.locator(`#${id}`);
    // Inspect the target's own frame, not the host window. Checking geometry
    // catches links that change a hash without actually scrolling the snapshot.
    await expect.poll(() => target.evaluate(element => {
      const view = element.ownerDocument.defaultView!;
      const rect = element.getBoundingClientRect();
      // Desktop snapshots scroll .page-wrapper; phone snapshots can scroll
      // the document instead. Either must be the target's own scroll context.
      let scrolled = view.scrollY > 0;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        scrolled ||= parent.scrollTop > 0;
      }
      return view.location.hash === `#${element.id}` && scrolled &&
        rect.top >= 0 && rect.top < view.innerHeight;
    })).toBe(true);
    expect(page.url(), "Section links must not navigate the product host").toBe(outerUrl);
  }
}

async function addLocally(page: Page, root: Locator) {
  const url = page.url();
  await root.getByRole("button", { name: "Add to Cart", exact: true }).click();
  await expect(root.locator(".sl-protein-selection-status[role=status]")).toHaveText("Selection updated.");
  // Allow asynchronous checkout attempts to be observed by the network guard.
  await page.waitForTimeout(200);
  expect(page.url()).toBe(url);
  expect(page.context().pages()).toHaveLength(1);
}

for (const width of [390, 1440]) {
  for (const surface of ["review", "Canvas"] as const) {
    test(`${surface} ${width}px: seven supplement selections keep all details together and ordering local`, async ({ page, context }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      const unsafeRequests: string[] = [];
      const navigations: string[] = [];
      const popups: string[] = [];
      // Observe the whole context, including popup requests, and abort before
      // any live ordering or mutation can reach a server.
      await context.route("**/*", async route => {
        const request = route.request();
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) ||
          /(?:cart|checkout|checkouts|orders|payments|buy-now)/i.test(request.url())) {
          unsafeRequests.push(`${request.method()} ${request.url()}`);
          await route.abort();
        } else {
          await route.continue();
        }
      });
      const path = surface === "review" ? "/supplement-details" : "/__mockup/preview/stellar-labs/SupplementDetails";
      const imagePath = surface === "review" ? "/review-assets/images/stellar-supplements/" : "/__mockup/images/stellar-supplements/";
      // Start with a non-default query selection, then switch without reloading.
      await page.goto(`${path}?product=turmeric-w-bioperine`, { waitUntil: "domcontentloaded" });
      const frame = page.frameLocator('iframe[title="Stellar Labs supplement product"]');
      const root = frame.locator("#supplements-app-mount");
      await assertSelection(root, supplementExpectations[6], imagePath);
      const selector = root.getByRole("combobox", { name: "Choose supplement" });
      await expect(selector.locator("option")).toHaveText(supplementExpectations.map(product => product.name));
      expect(await selector.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value)))
        .toEqual(supplementExpectations.map(product => product.id));
      page.on("request", request => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations.push(request.url());
      });
      context.on("page", popup => { popups.push(popup.url()); });
      // Revisit the first product at the end to catch leaked state on return.
      for (const product of [...supplementExpectations, supplementExpectations[0], supplementExpectations[2]]) {
        await selector.selectOption(product.id);
        await expect(page).toHaveURL(url => url.pathname === path && url.searchParams.get("product") === product.id);
        await assertSelection(root, product, imagePath);
        await assertSectionLinks(page, root);
        await addLocally(page, root); // One-time selection must also stay local.
        await root.getByRole("button", { name: "Decrease quantity" }).click();
        await expect(root.locator(".sl-protein-quantity output")).toHaveText("1");
        await expect(root.locator(".sl-protein-selection-status")).toHaveCount(0);
        await root.getByRole("button", { name: "Increase quantity" }).click();
        await root.getByRole("button", { name: "Increase quantity" }).click();
        await root.getByRole("radio", { name: "Subscribe & Save 10%", exact: true }).check();
        await expect(root.locator(".sl-protein-quantity output")).toHaveText("3");
        await expect(root.getByRole("radio", { name: "Subscribe & Save 10%", exact: true })).toBeChecked();
        await addLocally(page, root);
        // Leave quantity, subscription and added status dirty for the next switch.
        expect(unsafeRequests, "No cart, checkout, order, payment or mutation requests").toEqual([]);
        expect(popups, "Add to Cart must not open a checkout window").toEqual([]);
        expect(navigations, "Selection and Add to Cart must not navigate away").toEqual([]);
      }
    });
  }
}
