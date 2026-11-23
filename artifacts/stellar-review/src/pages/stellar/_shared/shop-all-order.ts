import proteinProducts from "./protein-products.json";
import { classicWheyProducts } from "./classic-whey-products";

/** Merchant's Shop All sequence; preserve flavor order within each group. */
export function shopAllRank(handle: string, title: string, tags: string) {
  const canonical = handle.replace(/^coming-soon-/, "").replace(/-hidden$/, "");
  const protein = proteinProducts.find(product => product.handle === canonical);
  if (protein) return protein.formula === "isolate" ? (protein.size === "2lb" ? 0 : 1) : 2;
  if (classicWheyProducts.some(product => product.handle === canonical)) return 2;
  if (tags.includes("vegan-plant-protein") || /vegan-shake$/.test(canonical)) return 3;
  if (tags.includes("electrolyte")) return 4;
  if (tags.split(",").includes("supplements")) return 5;
  if (tags.includes("kitchen-tools-books")) return /book|diet|eating system/i.test(title) ? 7 : 6;
  return 8;
}

export function sortShopAllProducts(grid: HTMLElement) {
  for (const link of grid.querySelectorAll<HTMLAnchorElement>('a[href*="supplements-night-time-fat-burn"]')) {
    link.closest(".resource-list__item")?.remove();
  }
  const items = [...grid.querySelectorAll<HTMLElement>(":scope > .resource-list__item")];
  const ranked = items.flatMap((item, index) => {
    const card = item.querySelector("product-card");
    const product = JSON.parse(card?.getAttribute("view-event-payload") ?? "{}")?.product;
    // The old captured Magnesium Citrate is not the approved Magnesium Complex.
    // Keep the current label-backed Complex card, not both magnesium listings.
    if (product?.handle === "magnesium") {
      item.remove();
      return [];
    }
    const rank = product ? shopAllRank(product.handle ?? "", product.title ?? "", item.dataset.productTags ?? "") : 8;
    item.dataset.stellarShopRank = String(rank);
    return [{ item, index, rank }];
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  for (const { item } of ranked) grid.append(item);
}
