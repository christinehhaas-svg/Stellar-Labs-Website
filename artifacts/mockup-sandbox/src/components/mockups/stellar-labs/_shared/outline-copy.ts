import outline from "./pdf-product-outline.json";
import { websiteClaim, websiteWarnings } from "../../../../../../stellar-review/src/pages/stellar/_shared/website-copy";
import { heavyMetalsTestingClaim } from "./quality-claims";

export type OutlineProduct = (typeof outline.products)[number];
// Merchant-approved website wording; preserve the original PDF transcription.
export const outlineProducts = outline.products.filter(product => product.id !== "night-time-fat-burn").map(product => ({
  ...product,
  quality: product.id === "night-time-fat-burn"
    ? ["Non-GMO"]
    : [...new Set([
      ...product.quality.filter(statement =>
        !(product.id === "womens-multi" && /vegetarian/i.test(statement)) &&
        !/\bNSF\b|GLP-?1 Friendly|ultra[\s-]*filtered whey protein|^100\s*%\s*(?:whey (?:protein )?isolate|isolate whey protein)$/i.test(statement) &&
        !/digestive enzymes?|papain|papinn|protease|pepsin|proteinase/i.test(statement))
        .flatMap(statement => {
          const claim = websiteClaim(statement, product.family === "isolate" || product.family === "blend");
          return claim ? [claim] : [];
        }),
      heavyMetalsTestingClaim,
    ])],
  warnings: websiteWarnings(product.warnings),
}));
const byId = new Map(outlineProducts.map(product => [product.id, product]));
export function getOutlineProduct(id: string): OutlineProduct {
  const product = byId.get(id);
  if (!product) throw new Error(`No approved PDF product: ${id}`);
  return product;
}

export const lowFodmapDisclaimer = "";
export const milkDisclaimer = "‡Whey products are made with milk from cows not treated with rBGH/rbST. No significant difference has been shown between milk derived from rbST-treated and non-rbST-treated cows.";
export const powderNutritionDisclaimer = "Nutrition limits apply to powder per labeled serving. No added sugars does not mean sugar-free. Whey shakes are not low-calorie foods; see product facts for sugar and calorie content.";
export const outlineSourceNote = "Descriptions and quality claims follow the supplied Product Info & Claims Outline. Serving copy uses each exact product’s recorded facts, except where an explicit merchant correction is identified. Original package artwork is unchanged and may show earlier printed values. Always follow the complete label on your product.";
export const collectionClaimNote = lowFodmapDisclaimer;
export const homepageClaimExceptionNote = "";
export const mixedBerrySource = "https://www.stellarlabsnutrition.com/products/100-isolate-whey-protein-shake-mixed-berry";
export const mixedBerryNote = "Merchant-confirmed store handoff: Mixed Berry 1lb, using its original store listing and matching package panels. The PDF’s Strawberry isolate remains a separate source reference, not a sellable flavor in this review. Mixed Berry uses its own label facts, ingredients, allergens, and directions; do not substitute Strawberry’s nutrition facts.";
