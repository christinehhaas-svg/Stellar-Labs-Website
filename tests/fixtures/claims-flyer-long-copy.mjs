// Intentionally much longer than a Letter facts card. Keep both the facts and
// claims, including tail sentinels, so neither clipping nor omission is success.
export const longFacts = Array.from({ length: 60 }, (_, index) =>
  `Extended fact ${index + 1}: nutrient amount and capsule serving basis must remain readable. FINAL-FACT-${index + 1}`);
export const longClaims = Array.from({ length: 60 }, (_, index) =>
  `Extended applicable claim ${index + 1}, with full qualification. FINAL-CLAIM-${index + 1}`);

export async function injectLongFlyerCopy(page, expected) {
  const product = expected.products[0];
  product.facts.push(...longFacts);
  product.claims.push(...longClaims);
  await page.locator(`[data-product-id="${product.id}"]`).evaluate((card, { longFacts, longClaims }) => {
    const list = card.querySelector("ul") ?? card.appendChild(document.createElement("ul"));
    for (const text of longFacts) {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    }
    card.querySelector(".claims-facts-claims p").textContent += ` · ${longClaims.join(" · ")}`;
  }, { longFacts, longClaims });
}
