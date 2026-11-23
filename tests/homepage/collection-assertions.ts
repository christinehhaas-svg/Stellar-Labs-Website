import { expect, type FrameLocator, type Locator, type Page } from "@playwright/test";
import { collectionRepresentatives, expectedCardNutrition, frontFilename, type Product } from "./powder-fixtures";

export async function assertLocalOnlyOrdering(frame: FrameLocator) {
  // Do not restore removed merchant-facing status notes just to identify the
  // non-commerce preview. Guard the actual submit affordance without ordering.
  await expect(frame.locator(".sl-protein-cart")).toHaveAttribute("type", "button");
  await expect(frame.locator(".sl-protein-cart")).not.toHaveAttribute("formaction");
  await expect(frame.locator('form[action*="/cart"], form[action*="/checkout"]')).toHaveCount(0);
  await expect(frame.locator(".sl-protein-eyebrow, .sl-protein-preview-note")).toHaveCount(0);
}

export async function assertCompactCards(page: Page, products: readonly Product[]) {
  const requestedPackage = new URL(page.url()).searchParams.get("package");
  const hasSingleIsolateSize = (product: Product) => (product.formula === "isolate" || product.formula === "blend") && products.filter(option => option.formula === product.formula && option.flavor === product.flavor).length === 1;
  // Read through the host, not by executing scripts in the restricted snapshot.
  // One retried snapshot preserves exact per-card checks without hundreds of
  // sequential browser round trips on every Back/Forward transition.
  await expect.poll(() => page.evaluate(() => {
    const doc = document.querySelector<HTMLIFrameElement>(".stellar-supplements-frame")?.contentDocument;
    // Classic reference cards are asserted separately, not mistaken for
    // confirmed, photographed products with a purchasable price.
    return [...(doc?.querySelectorAll<HTMLElement>('.sl-product:not([data-product-line="classic"])') ?? [])].map(card => {
      const text = (selector: string) => card.querySelector(selector)?.textContent?.trim();
      const images = [...card.querySelectorAll("img")];
      return {
        id: card.dataset.testid,
        name: text("h2 .sl-card-name"), variant: text("h2 .sl-card-variant"),
        price: text(".sl-product-price"),
        sizes: [...card.querySelectorAll(".sl-size-option")].map(link => ({ label: link.textContent?.trim(), selected: link.getAttribute("aria-current") })),
        singleSize: text(".sl-single-size") ?? null,
        links: [...card.querySelectorAll<HTMLAnchorElement>(".sl-product-image, .sl-details-button")]
          .map(link => ({ href: link.getAttribute("href"), target: link.target })),
        images: images.map(image => ({ src: image.getAttribute("src"), alt: image.alt })),
        perServing: text(".sl-card-per-serving"),
        labels: [...card.querySelectorAll(".sl-card-nutrition dt")].map(el => el.textContent),
        values: [...card.querySelectorAll(".sl-card-nutrition dd")].map(el => el.textContent),
        retiredNodes: card.querySelectorAll(".sl-product-subtitle, .sl-product-caption, .sl-product-supply, .sl-product-quality-caption, .sl-card-dietary-claims, .sl-card-serving-note, .sl-card-container-count").length,
        retiredCopy: /Non-GMO|Certified Gluten-Free|Low-FODMAP|rBGH|No Added Sugars|\b\d+\s+servings\b/i.test(card.textContent ?? ""),
      };
    });
  })).toEqual(collectionRepresentatives(products, requestedPackage).map(product => ({
    id: `card-product-${product.component}`,
    name: `${product.flavor} ${product.formula === "isolate" ? "Whey Protein Isolate" : product.formula === "blend" ? "Whey Protein Blend"
      : product.formula === "vegan" ? "Vegan Protein" : "Electrolyte Powder"}`,
    variant: product.formula === "vegan" ? "2 lb" : undefined,
    price: product.formula === "electrolyte" ? "$31.95" : product.formula === "isolate"
      ? product.size === "1lb" ? "$52.95" : "$89.95" : product.formula === "blend" ? "$78.95" : "$64.95",
    singleSize: hasSingleIsolateSize(product) ? (product.size === "1lb" ? "1 lb" : "2 lb") : null,
    sizes: (product.formula === "isolate" || product.formula === "blend") && !hasSingleIsolateSize(product)
      ? products.filter(option => option.formula === product.formula && option.flavor === product.flavor)
        .sort((a, b) => Number(b.size === "1lb") - Number(a.size === "1lb"))
        .map(option => ({ label: option.size === "1lb" ? "1 lb" : "2 lb", selected: option.component === product.component ? "true" : null }))
      : [],
    links: [1, 2].map(() => ({ href: `/products/${product.handle}`, target: "_parent" })),
    images: [{
      src: expect.stringMatching(new RegExp(`/${frontFilename(product).replaceAll(".", "\\.")}$`)),
      alt: `${product.title} — ${product.component.endsWith("Isolate1lb") ? "illustrative bottle mockup" : "original package front"}`,
    }],
    perServing: "Per serving",
    labels: product.formula === "electrolyte" ? ["Calories", "Potassium", "Magnesium", "Calcium", "Sodium"]
      : ["Calories", "Protein", "Carbs", product.formula === "blend" ? "Natural sugar" : "Sugar"],
    values: expectedCardNutrition[product.component],
    retiredNodes: 0, retiredCopy: false,
  })));
}

export async function assertFodmapFootnote(claims: Locator, note: string, expectGlutenFree = true) {
  // Keep this shared assertion's call sites while enforcing the new policy:
  // retired ingredient claims and their footnotes must not be rendered.
  await expect(claims).not.toContainText(/fodmap/i);
  const collection = claims.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " sl-collection ")][1]');
  await expect(collection.locator("#collection-fodmap-note")).toHaveCount(0);
  const gluten = claims.locator(".review-quality-claim").filter({ hasText: "Certified Gluten-Free" });
  if (expectGlutenFree) await expect(gluten.locator("span")).toHaveText("Certified Gluten-Free");
  else await expect(gluten).toHaveCount(0);
  await expect(gluten.locator("a")).toHaveCount(0);
}

export const collectionNotes = {
  whey: "",
  vegan: "",
  electrolyte: "",
};
