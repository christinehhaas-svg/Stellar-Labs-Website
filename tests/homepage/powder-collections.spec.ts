import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  collectionRepresentatives, detailHeading, filters, frontFilename, isolateClaims, lowFodmap, queryCases, reviewPath, suppliedLabels, wheyClaimLabels,
  veganCollectionClaims, veganProductClaims, expectedCardNutrition,
  type Family, type Filter, type Product,
} from "./powder-fixtures";
import { assertCompactCards, assertFodmapFootnote, assertLocalOnlyOrdering, collectionNotes } from "./collection-assertions";

const canvasRoot = "/__mockup/preview/stellar-labs";
const surfaces = ["review", "Canvas"] as const;
type Surface = (typeof surfaces)[number];
const collection = (page: Page) => page.frameLocator(".stellar-supplements-frame");
const detail = (page: Page) => page.frameLocator(".stellar-protein-product-frame");
const snapshotSandbox = "allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";

async function assertSandbox(frame: Locator) {
  // Exact permissions: neither enable snapshot scripts nor broaden top navigation.
  await expect(frame).toHaveAttribute("sandbox", snapshotSandbox);
}

async function clickTopLink(page: Page, link: Locator, path: string, keyboard = false, target = "_parent") {
  await expect(link).toHaveAttribute("target", target);
  // Product cards and filters stay local to the review host.
  // Both must navigate the host, not merely the snapshot iframe.
  // A changed iframe URL or a new tab is not a successful escape from Canvas.
  // Observe the native document request rather than simulating navigation in JS.
  await Promise.all([
    page.waitForRequest(request => {
      const url = new URL(request.url());
      return request.isNavigationRequest() && request.frame() === page.mainFrame() &&
        url.origin === new URL(page.url()).origin && url.pathname + url.search === path;
    }),
    keyboard ? page.keyboard.press("Enter") : link.click(),
  ]);
  await assertLocation(page, path);
}

async function tabToCollectionLink(page: Page, selector: string, key: "Tab" | "Shift+Tab" = "Tab") {
  const link = collection(page).locator(selector);
  await expect(link).toHaveCount(1);
  await expect(link).toBeVisible();
  // Observe focus through the same-origin host, never evaluate in the
  // script-disabled snapshot. Do not use focus(), click(), or synthetic events:
  // every activation must earn focus through the browser's real Tab order.
  for (let tabs = 0; tabs < 80; tabs++) {
    await page.keyboard.press(key);
    const focused = await page.evaluate(selector => {
      const iframe = document.querySelector<HTMLIFrameElement>(".stellar-supplements-frame");
      return document.activeElement === iframe &&
        iframe?.contentDocument?.activeElement === iframe?.contentDocument?.querySelector(selector);
    }, selector);
    if (focused) {
      await expect(link).toBeInViewport();
      return link;
    }
  }
  throw new Error(`Tab did not reach collection link: ${selector}`);
}

function directPath(surface: Surface, family: Family, filter: Filter) {
  const path = reviewPath(family, filter);
  return surface === "review" ? path
    : `${canvasRoot}/${family === "whey" ? "PowderWhey" : family === "vegan" ? "PowderVegan" : "PowderElectrolytes"}${path.slice(1)}`;
}

async function assertNoForeignVeganClaims(content: Locator) {
  await expect(content).not.toContainText(/rBGH/i);
  for (const claim of isolateClaims) await expect(content).not.toContainText(claim);
  await expect(content).not.toContainText(/\b(?:5|10)\s+calories per serving/i);
}

async function assertLocation(page: Page, path: string) {
  await expect(page).toHaveURL(url => url.pathname + url.search === path);
}

async function assertCollection(page: Page, family: Family, filter: Filter) {
  const frame = collection(page);
  const title = family === "whey" ? "WHEY PROTEIN" : family === "vegan" ? "VEGAN PROTEIN" : "ELECTROLYTES";
  const heading = family === "whey" && filter.query.includes("formula=isolate") ? "Whey Protein Isolate"
    : family === "whey" && filter.query.includes("formula=blend") ? "Whey Protein Blend" : title;
  await expect(frame.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  const nav = frame.getByRole("navigation", { name: `${title} filters` });
  if (family === "whey") {
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('[aria-current="page"]')).toHaveText(filter.name);
  for (const option of filters[family]) {
    const link = nav.getByRole("link", { name: option.name, exact: true });
    await expect(link).toHaveAttribute("href", reviewPath(family, option));
    await expect(link).toHaveAttribute("target", "_parent");
  }
  await expect(nav.getByRole("link")).toHaveCount(filters[family].length);
  } else await expect(nav).toHaveCount(0);
  const typeLabel = frame.locator(".sl-category-lead");
  await expect(typeLabel).toHaveCount(0);
  const cards = frame.locator(".sl-product");
  const showClassic = false; // Temporarily withdrawn by the merchant.
  await expect(cards).toHaveCount(collectionRepresentatives(filter.products).length + (showClassic ? 3 : 0));
  const classic = frame.locator('.sl-product[data-product-line="classic"]');
  await expect(classic).toHaveCount(showClassic ? 3 : 0);
  if (showClassic) {
    await expect(classic.locator(".sl-card-name")).toHaveText(Array(3).fill("Stellar Labs Classic Whey Protein Blend"));
    await expect(classic.locator(".sl-card-variant")).toHaveText(["Chocolate", "Vanilla", "Cookies & Cream"]);
    await expect(classic.locator(".sl-product-price")).toHaveText(Array(3).fill("Coming soon"));
    await expect(classic.locator("img")).toHaveCount(0);
    for (const card of await classic.all()) {
      await expect(card.locator(".sl-card-nutrition dd")).toHaveText(["24g", "130", "4g", "2g"]);
      await expect(card.locator(".sl-classic-reference")).toContainText("Nutrition may vary by flavor");
      await expect(card.locator(".sl-details-button")).toHaveAttribute("href", /\/products\/classic-whey-protein-blend-/);
      await expect(card).not.toContainText(/Non-GMO|Certified Gluten-Free|Low-FODMAP|rBGH|No Added Sugar/i);
    }
  }
  await expect(frame.locator(".sl-result-count")).toHaveCount(0);
  await expect(frame.locator(".sl-collection-heading")).not.toContainText(/\b\d+\s+formulas?\b/i);
  // Exact membership/order and both link affordances prevent cross-formula/flavor cards.
  await assertCompactCards(page, filter.products);
  const claimsTitle = family === "whey" && filter.name !== "All whey"
    ? filter.name === "Whey Protein Isolate" ? "Whey Protein Isolate" : "Whey Protein Blend"
    : title;
  const claims = frame.getByRole("region", { name: `${claimsTitle} quality callouts`, exact: true });
  const labels = claims.locator(".review-quality-claim > span");
  if (family === "vegan") {
    await expect(labels).toHaveText(veganCollectionClaims);
    // Scope to collection copy, not unrelated navigation/footer or original artwork.
    await assertNoForeignVeganClaims(frame.locator("#supplements-app-mount"));
  }
  await assertFodmapFootnote(claims, collectionNotes[family],
    family !== "whey" || filter.name !== "Whey Protein Blend");
  for (const claim of isolateClaims) {
    await expect(labels.filter({ hasText: claim })).toHaveCount(0);
  }
  if (family === "whey") {
    await expect(labels).toHaveText(wheyClaimLabels);
    const values = frame.locator(".sl-whey-nutrition-value");
    if (filter.name === "Whey Protein Isolate") {
      await expect(values).toHaveText(["110", "26g", "1g", "0g"]);
      await expect(frame.locator(".sl-whey-nutrition-caption")).toHaveText(["As low as", "Up to", "As low as", "As low as"]);
      await expect(frame.locator(".sl-whey-nutrition dt")).toHaveText(["Calories", "Protein", "Carbs", "Sugar"]);
    }
    else if (filter.name === "Whey Protein Blend") {
      await expect(values).toHaveText(["24g"]);
      await expect(frame.locator(".sl-whey-nutrition-compact > p")).toHaveText("24g protein per serving");
    }
    else await expect(values).toHaveCount(0);
  }
  if (family === "electrolyte") {
    await expect(labels).toHaveText(["Non-GMO", "Certified Gluten-Free", "Easy-to-Digest Ingredients", "Vegan", "No Added Sugars"]);
    await expect(frame.locator(".sl-collection")).not.toContainText("Strawberry");
    await expect(frame.locator(".sl-whey-nutrition dt")).toHaveText(["Calories", "Potassium", "Magnesium", "Sodium", "Calcium"]);
    await expect(frame.locator(".sl-whey-nutrition-value")).toHaveText(["5", "280mg", "51mg", "80mg", "47mg"]);
  }
  await assertSandbox(page.locator(".stellar-supplements-frame"));
}

async function openProduct(page: Page, product: Product, imageLink: boolean) {
  if (product.formula === "isolate" && ["Vanilla", "Chocolate"].includes(product.flavor)) {
    await collection(page).getByTestId(`size-${product.component}`).click();
  }
  const before = new URL(page.url());
  const backPath = before.pathname + before.search;
  await clickTopLink(page, collection(page).getByTestId(`card-product-${product.component}`)
    .locator(imageLink ? ".sl-product-image" : ".sl-details-button"), `/products/${product.handle}`, false, "_parent");
  const frame = detail(page);
  await assertSandbox(page.locator(".stellar-protein-product-frame"));
  await expect(frame.locator("#protein-title")).toHaveText(detailHeading(product));
  await expect(frame.getByRole("group", { name: "Select a flavor", exact: true }).locator("[aria-current=page]")).toHaveText(product.flavor);
  const illustrative = product.component.endsWith("Isolate1lb");
  const sizes = frame.getByRole("group", { name: "Select a size", exact: true });
  if (product.formula === "isolate" && ["Vanilla", "Chocolate"].includes(product.flavor)) {
    await expect(sizes.locator("[aria-current=page]")).toHaveText(product.size === "1lb" ? "1 lb" : "2 lb");
    await expect(sizes.getByRole("link")).toHaveText(["1 lb", "2 lb"]);
  } else await expect(sizes).toHaveCount(0);
  if (illustrative) {
    await expect(frame.locator(".sl-protein-hero-image img")).toHaveAttribute("src", new RegExp(`/${frontFilename(product).replaceAll(".", "\\.")}$`));
    await expect(frame.locator(".sl-protein-hero-image img")).toHaveAttribute("alt", `${product.title} — front of package`);
    await expect(frame.locator(".sl-protein-price")).toHaveText("$52.95");
    await expect(frame.locator("#product-facts-label")).toContainText("1 lb label views");
    await expect(frame.locator("#product-facts-label")).not.toContainText("have not been supplied");
  } else {
    await expect(frame.locator(".sl-protein-hero-image img"))
      .toHaveAttribute("src", new RegExp(`/${frontFilename(product).replaceAll(".", "\\.")}$`));
    await expect(frame.locator(".sl-protein-hero-image img"))
      .toHaveAttribute("alt", `${product.title} — front of package`);
  }
  const panels = frame.locator(".sl-protein-label-grid img");
  const supplied = suppliedLabels[product.component];
  if (supplied) {
    await expect(panels).toHaveCount(0);
    const label = frame.locator(".sl-protein-uploaded-label");
    await expect(label.locator("h3")).toHaveText(`Product label: ${supplied.name}`);
    await expect(label.locator("img")).toHaveCount(2);
    await expect(label.locator("img").nth(0)).toHaveAttribute("src", new RegExp(`/stellar-labels/${supplied.slug}-facts\\.png$`));
    await expect(label.locator("img").nth(1)).toHaveAttribute("src", new RegExp(`/stellar-labels/${supplied.fullSlug ?? `${supplied.slug}-label`}\\.png$`));
    await expect(label.locator("img").nth(0)).toHaveAttribute("alt", `${supplied.name} original supplement facts`);
    await expect(label.locator("img").nth(1)).toHaveAttribute("alt", illustrative ? `${supplied.name} front and back label photographs` : `${supplied.name} complete label, ingredients, warnings and suggested use`);
    await expect(label.getByRole("link", { name: illustrative ? "Open label views PDF" : supplied.barcodeUpdated ? "Open complete label PDF" : "Open complete original label PDF", exact: false }))
      .toHaveAttribute("href", new RegExp(`/stellar-labels/${supplied.fullSlug ?? `${supplied.slug}-label`}\\.pdf$`));
    if (illustrative) await expect(label.getByRole("note")).toHaveCount(0);
  } else await expect(panels).toHaveCount(2);
  for (const panel of await panels.all()) {
    await expect(panel).toHaveAttribute("src", new RegExp(`/${product.handle}-[1-9]`));
    await expect(panel).toHaveAttribute("alt", new RegExp(`^${product.flavor} `));
  }
  if (product.formula === "vegan") {
    await expect(frame.locator(".sl-protein-meta")).toHaveText(`${product.flavor} · 2 lb · 28 servings`);
    // Both vegan listings are unavailable; the current product alone remains
    // selected and addressable. The collection still exposes both direct routes.
    await expect(frame.getByRole("group", { name: "Select a flavor", exact: true }).locator("a"))
      .toHaveText([product.flavor]);
    await expect(frame.locator(".sl-detail-nutrition > p")).toHaveText("Per 32 g serving");
    await expect(frame.locator(".sl-detail-nutrition dt")).toHaveText(["Calories", "Protein", "Carbs", "Sugar"]);
    await expect(frame.locator(".sl-detail-nutrition dd")).toHaveText(expectedCardNutrition[product.component]);
    await expect(frame.locator("#product-facts-label .sl-protein-quality li")).toHaveCount(0);
    const productClaims = frame.locator(".sl-protein-section").filter({
      has: frame.getByRole("heading", { name: "Product details", exact: true }),
    });
    // The PDF transcription retains NSF facility wording; merchant-approved
    // website copy deliberately removes it. Do not copy the raw PDF claims here.
    await expect(productClaims.locator("li")).toHaveText(veganProductClaims);
    await assertNoForeignVeganClaims(frame.locator("#supplements-app-mount"));
    await expect(page.locator(".stellar-protein-product-frame")).not.toHaveAttribute("sandbox", /allow-scripts/);
  }
  const claimsLink = frame.getByRole("link", { name: "Nutrition Facts", exact: true });
  await expect(claimsLink).toHaveAttribute("href", "#product-facts-label");
  await claimsLink.click();
  await expect(frame.locator("#product-facts-label")).toBeInViewport();
  // Inspect from the host: the captured frame deliberately does not allow scripts.
  await expect.poll(() => page.evaluate(() =>
    document.querySelector<HTMLIFrameElement>(".stellar-protein-product-frame")
      ?.contentDocument?.activeElement?.id,
  )).toBe("product-facts-label");
  await assertLocalOnlyOrdering(frame);
  const claimsHash = () => page.evaluate(() =>
    document.querySelector<HTMLIFrameElement>(".stellar-protein-product-frame")
      ?.contentDocument?.location.hash,
  );
  const hash = await claimsHash();
  expect(["", "#product-facts-label"]).toContain(hash);
  if (hash === "#product-facts-label") {
    // WebKit retains the native iframe fragment as a joint-history entry.
    // Playwright's goBack/goForward wait for a main-frame navigation, which
    // never occurs for this entry. Use the host's native History API and
    // explicitly verify the child entry in both directions, without skipping it.
    await page.evaluate(() => window.history.back());
    await expect.poll(claimsHash).toBe("");
    await assertLocation(page, `/products/${product.handle}`);
    await page.evaluate(() => window.history.forward());
    await expect.poll(claimsHash).toBe("#product-facts-label");
    await assertLocation(page, `/products/${product.handle}`);
    await expect(frame.locator("#product-facts-label")).toBeInViewport();
    await page.evaluate(() => window.history.back());
    await expect.poll(claimsHash).toBe("");
  }
  // No cart controls are activated.
  await page.goBack({ waitUntil: "domcontentloaded" });
  await assertLocation(page, backPath);
}

for (const surface of surfaces) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    test(`${surface} ${viewport.width}px: vegan Chocolate and Vanilla identities and claims survive reload and Back`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(viewport);
      const all = filters.vegan[0];
      const path = directPath(surface, "vegan", all);
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await assertLocation(page, path);
      await assertCollection(page, "vegan", all);
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertLocation(page, path);
      await assertCollection(page, "vegan", all);
      // Each flavor uses both card affordances from the assigned surface.
      // No quantity, cart or checkout controls are activated.
      for (const product of all.products) {
        for (const imageLink of [true, false]) {
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await assertCollection(page, "vegan", all);
          await openProduct(page, product, imageLink);
          await assertLocation(page, path);
          await assertCollection(page, "vegan", all);
        }
      }
    });
    for (const family of ["whey", "electrolyte"] as const) {
      test(`${surface} ${viewport.width}px: ${family} keyboard filters and both card links survive Back`, async ({ page, context }) => {
        test.setTimeout(180_000);
        await page.setViewportSize(viewport);
        const orderingRequests: string[] = [];
        // Never let an accidental activation contact a cart or checkout.
        await context.route(/\/(?:cart|checkout)(?:[/?#.]|$)/, route => {
          orderingRequests.push(route.request().url());
          return route.abort();
        });
        const options = filters[family];
        const all = options[0];
        const startPath = directPath(surface, family, all);
        await page.goto(startPath, { waitUntil: "domcontentloaded" });
        await assertCollection(page, family, all);

        // Start each filter on the assigned surface and a different state.
        // A native link to the current URL can reload/replace its history entry,
        // so it cannot meaningfully test Back to the originating filter.
        for (const option of family === "whey" ? options : []) {
          await test.step(`Tab and Enter: ${option.name} filter, then Back`, async () => {
            const source = options.length === 1 ? { ...all, query: "&flavor=strawberry" } : option === all ? options[1] : all;
            const sourcePath = directPath(surface, family, source);
            await page.goto(sourcePath, { waitUntil: "domcontentloaded" });
            await assertCollection(page, family, source);
            const path = reviewPath(family, option);
            const title = family === "whey" ? "WHEY PROTEIN" : "ELECTROLYTES";
            const link = await tabToCollectionLink(page,
              `nav[aria-label="${title} filters"] a[href="${path}"]`);
            await clickTopLink(page, link, path, true);
            await assertCollection(page, family, option);
            await page.goBack({ waitUntil: "domcontentloaded" });
            await assertLocation(page, sourcePath);
            await assertCollection(page, family, source);
            await tabToCollectionLink(page,
              `[data-testid="card-product-${collectionRepresentatives(source.products)[0].component}"] .sl-product-image`);
          });
        }

        await page.goto(startPath, { waitUntil: "domcontentloaded" });
        await assertCollection(page, family, all);
        // Both affordances on every card must be keyboard usable, including
        // cards below the phone viewport and the sole Lemon Lime electrolyte.
        for (const product of all.products) {
          for (const affordance of [".sl-product-image", ".sl-details-button"]) {
            await test.step(`Tab and Enter: ${product.flavor} ${affordance}, then Back`, async () => {
              if (product.component.endsWith("Isolate1lb")) {
                await tabToCollectionLink(page, `[data-testid="size-${product.component}"]`);
                await page.keyboard.press("Enter");
                await expect(collection(page).getByTestId(`size-${product.component}`))
                  .toHaveAttribute("aria-current", "true");
              }
              // The image precedes the size controls. Reach it with real
              // backward Tab presses when an in-place selection kept focus.
              // Native fallback navigation instead starts a fresh document.
              const sizeStillFocused = await page.evaluate(component => {
                const iframe = document.querySelector<HTMLIFrameElement>(".stellar-supplements-frame");
                return document.activeElement === iframe &&
                  iframe?.contentDocument?.activeElement?.getAttribute("data-testid") === `size-${component}`;
              }, product.component);
              const key = sizeStillFocused && affordance === ".sl-product-image" ? "Shift+Tab" : "Tab";
              const link = await tabToCollectionLink(page,
                `[data-testid="card-product-${product.component}"] ${affordance}`, key);
              const source = new URL(page.url());
              const returnPath = source.pathname + source.search;
              const path = `/products/${product.handle}`;
              await clickTopLink(page, link, path, true, "_parent");
              await assertSandbox(page.locator(".stellar-protein-product-frame"));
              await expect(detail(page).locator("#protein-title")).toHaveText(detailHeading(product));
              await assertLocalOnlyOrdering(detail(page));
              await page.goBack({ waitUntil: "domcontentloaded" });
              await assertLocation(page, returnPath);
              await assertCollection(page, family, all);
            });
          }
        }
        // Check focus recovery after the final Back too. Do not require engines
        // to restore the exact old element: native history focus varies, but
        // continued Tab browsing must reach a visible, usable collection link.
        const title = family === "whey" ? "WHEY PROTEIN" : "ELECTROLYTES";
        await tabToCollectionLink(page,
          family === "whey" ? `nav[aria-label="${title} filters"] a[href="${reviewPath(family, options[1] ?? all)}"]` : ".sl-product .sl-details-button");
        expect(context.pages()).toEqual([page]);
        expect(orderingRequests, "Keyboard browsing must never attempt ordering").toEqual([]);
      });

      test(`${surface} ${viewport.width}px: ${family} noncanonical and malformed queries survive reload and Back/Forward`, async ({ page }) => {
        // One exhaustive raw-query matrix replaces two identical loops. Keep
        // every literal fixture on BOTH surfaces and BOTH viewports, with all
        // five full collection assertions; do not sample or normalize the URLs.
        test.setTimeout(300_000);
        await page.setViewportSize(viewport);
        for (const scenario of queryCases[family]) {
          await test.step(scenario.name, async () => {
            const path = directPath(surface, family, {
              ...scenario.expected, query: scenario.query,
            });
            const checkOriginal = async () => {
              // Preserve the raw URL too: no hidden canonicalization or dropped duplicates.
              await assertLocation(page, path);
              await assertCollection(page, family, scenario.expected);
            };
            await page.goto(path, { waitUntil: "domcontentloaded" });
            await checkOriginal();
            await page.reload({ waitUntil: "domcontentloaded" });
            await checkOriginal();
            const next = filters[family].find(option => option !== scenario.expected) ?? filters[family][0];
            const nextPath = reviewPath(family, next);
            // The single-flavor electrolyte category has no redundant filter.
            // Use its real product link to create a distinct native history entry.
            const destination = family === "whey" ? nextPath : `/products/${next.products[0].handle}`;
            const link = family === "whey" ? collection(page).getByRole("navigation")
              .getByRole("link", { name: next.name, exact: true })
              : collection(page).locator(".sl-details-button").first();
            await clickTopLink(page, link, destination);
            if (family === "whey") await assertCollection(page, family, next);
            else await expect(detail(page).locator("#protein-title")).toHaveText(detailHeading(next.products[0]));
            await page.goBack({ waitUntil: "domcontentloaded" });
            await checkOriginal();
            await page.goForward({ waitUntil: "domcontentloaded" });
            await assertLocation(page, destination);
            if (family === "whey") await assertCollection(page, family, next);
            else await expect(detail(page).locator("#protein-title")).toHaveText(detailHeading(next.products[0]));
          });
        }
      });

      test(`${surface} ${viewport.width}px: ${family} claims survive filters, direct entry, reload and Back/Forward`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize(viewport);
        const options = filters[family];
        // Every state is independently addressable, not just reachable by clicking.
        for (const option of options) {
          const path = directPath(surface, family, option);
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await assertLocation(page, path);
          await assertCollection(page, family, option);
          await page.reload({ waitUntil: "domcontentloaded" });
          await assertLocation(page, path);
          await assertCollection(page, family, option);
        }
        const all = options[0];
        await page.goto(directPath(surface, family, all), { waitUntil: "domcontentloaded" });
        await assertCollection(page, family, all);
        // Two complete rounds catch stale claims after repeatedly switching formulas/flavors.
        for (let round = 0; round < 2; round++) {
          for (const option of [...options.slice(1), all]) {
            if (options.length === 1) {
              await page.goto(directPath(surface, family, { ...all, query: "&flavor=strawberry" }), { waitUntil: "domcontentloaded" });
              await assertCollection(page, family, all);
            }
            // Exercise every transition from Canvas itself, even though its links
            // intentionally leave Canvas for the review website.
            if (surface === "Canvas") {
              const current = new URL(page.url());
              const currentOption = options.find(o =>
                o.query ? current.search.endsWith(o.query) : !/&(formula|flavor)=/.test(current.search),
              ) ?? all;
              if (options.length > 1) await page.goto(directPath(surface, family, currentOption), { waitUntil: "domcontentloaded" });
              await assertCollection(page, family, currentOption);
            }
            const previous = new URL(page.url());
            const previousOption = options.find(o =>
              o.query ? previous.search.endsWith(o.query) : !/&(formula|flavor)=/.test(previous.search),
            ) ?? all;
            // Canvas deliberately routes native links to review, not to a Canvas-only URL.
            const destination = family === "whey" ? reviewPath(family, option) : `/products/${option.products[0].handle}`;
            const link = family === "whey" ? collection(page).getByRole("navigation")
              .getByRole("link", { name: option.name, exact: true })
              : collection(page).locator(".sl-details-button").first();
            await clickTopLink(page, link, destination);
            if (family === "whey") await assertCollection(page, family, option);
            else await expect(detail(page).locator("#protein-title")).toHaveText(detailHeading(option.products[0]));
            await page.goBack({ waitUntil: "domcontentloaded" });
            await assertLocation(page, previous.pathname + previous.search);
            await assertCollection(page, family, previousOption);
            await page.goForward({ waitUntil: "domcontentloaded" });
            await assertLocation(page, destination);
            if (family === "whey") await assertCollection(page, family, option);
            else await expect(detail(page).locator("#protein-title")).toHaveText(detailHeading(option.products[0]));
          }
        }
        // Start each actual card click on the assigned surface (including Canvas).
        // Every flavor/formula is opened; both image and text links are exercised.
        for (const [index, product] of all.products.entries()) {
          await page.goto(directPath(surface, family, all), { waitUntil: "domcontentloaded" });
          await assertCollection(page, family, all);
          await openProduct(page, product, index % 2 === 0);
          await assertCollection(page, family, all);
        }
      });
    }
  }
}
