import { getPowderCopy, powderDisclaimer } from "../../../../../stellar-review/src/pages/stellar/_shared/powder-copy";
import { powderNutritionMetrics } from "../../../../../stellar-review/src/pages/stellar/_shared/ProductCardNutrition";
import { powderServingSize, supplementServingSummary } from "../../../../../stellar-review/src/pages/stellar/_shared/product-servings";
import { supplements, getSupplementQuality, labelDisclaimer } from "../../../../../stellar-review/src/pages/stellar/_shared/supplements-data";
import { uploadedPowderLabels } from "../../../../../stellar-review/src/pages/stellar/_shared/uploaded-powder-labels";
import { powderDisplayName } from "../../../../../stellar-review/src/pages/stellar/_shared/whey-lines";
import { supplementServingInfo } from "../../../../../stellar-review/src/pages/stellar/_shared/product-servings";
import { getHandoutLabelDetails } from "./stellar-handout-label-details";
import proteinProducts from "../../../../../stellar-review/src/pages/stellar/_shared/protein-products.json";
import veganProducts from "../../../../../stellar-review/src/pages/stellar/_shared/vegan-products.json";
import electrolyteProducts from "../../../../../stellar-review/src/pages/stellar/_shared/electrolyte-products.json";
export { fodmapDisclaimer } from "../../../../../stellar-review/src/pages/stellar/_shared/fodmap-disclaimer";

export const displayClaim = (claim: string) => claim.replace(/[†*]/g, "").replace(/^Low-FODMAP Ingredients$/, "Low-FODMAP Ingredients*").replace(/^rBGH-Free$/, "rBGH-Free Whey");

export type FlyerProduct = {
  id: string;
  name: string;
  family: string;
  claims: string[];
  servingSize: string;
  servingsPerContainer: string;
  metrics: { label: string; value: string }[];
  facts: string[];
  kind: "powder" | "supplement";
  benefits: string[];
  suggestedUse: string;
  warnings: string[];
  price?: string;
  upc?: string;
  upcNote?: string;
  ingredients: { heading: string; text: string }[];
  labels: string[];
};

// Reuse the approved purchase-page copy and package-specific serving decisions;
// never infer serving weight from grams of protein or borrow another flavor.
export const powderRows: FlyerProduct[] = [
  ...proteinProducts,
  ...veganProducts,
  ...electrolyteProducts.filter(product => !product.discontinued),
].map(product => {
  const copy = getPowderCopy(product);
  const { metrics } = powderNutritionMetrics(product.component);
  const summarizedFact = product.formula === "electrolyte"
    ? /^(?:Potassium|Magnesium|Calcium|Sodium|Calories):/i
    : /^(?:Protein|Calories|Total carbohydrate|Total sugars?(?: \([^)]*\))?):/i;
  const facts = copy.facts.filter(fact =>
    !/^Serving size:|servings per container|^Refer to the product label/i.test(fact) &&
    !summarizedFact.test(fact));
  if (copy.facts.some(fact => /total sugars.*naturally occurring/i.test(fact))) facts.push("Sugars are naturally occurring.");
  return {
    id: product.component,
    name: `${powderDisplayName(product.formula)} · ${product.flavor} · ${product.size.replace(/(\d+)lb/i, "$1 lb")}`,
    family: product.formula,
    claims: [...new Set(copy.quality.map(displayClaim))].filter(claim =>
      product.formula !== "electrolyte" || !/^(?:5|five)\s+major\s+electrolytes[*†]?$/i.test(claim)),
    servingSize: powderServingSize(copy).replace(" per serving", ""),
    servingsPerContainer: `${copy.servings} servings per container`,
    metrics,
    facts,
    kind: "powder",
    benefits: product.formula === "isolate"
      ? [...copy.support.map(item => item.description), ...copy.benefits.filter(benefit =>
        !copy.support.some(item => benefit.replace(/^Protein for /, "").replace(/\*$/, "") === item.title))]
      : [...copy.benefits, ...copy.support.map(item => `${item.title} — ${item.description}`)],
    suggestedUse: copy.suggestedUse,
    warnings: [...new Set([...copy.warnings, powderDisclaimer])],
    price: `$${(product.price / 100).toFixed(2)}`,
    ...getHandoutLabelDetails(product.component),
    labels: uploadedPowderLabels[product.component]
      ? [uploadedPowderLabels[product.component].facts, uploadedPowderLabels[product.component].full]
      : product.images.slice(1).map(image => image.src),
  };
});

export const supplementRows: FlyerProduct[] = supplements.map(product => {
  const servingFact = product.facts.find(fact => /^Serving size:/i.test(fact));
  if (!servingFact) throw new Error(`Missing serving size for ${product.id}`);
  const summary = supplementServingSummary(product.id);
  return {
    id: product.id,
    name: product.name,
    family: "supplement",
    claims: getSupplementQuality(product).map(displayClaim),
    servingSize: servingFact.replace(/^Serving size:\s*/i, ""),
    servingsPerContainer: summary.split(" · ")[1],
    metrics: [],
    // Keep quantity qualifiers intact (especially magnesium per TWO capsules).
    facts: product.facts.filter(fact => !/^Serving size:|servings per (?:container|bottle)/i.test(fact)),
    kind: "supplement",
    benefits: [...product.benefits.map(item => `${item}*`),
      ...(product.detailCopy?.support ?? []).map(item => `${item.title} — ${item.description}`)],
    suggestedUse: product.use,
    warnings: [...new Set([...product.warnings,
      "Check with your medical provider before taking supplements with medications.", labelDisclaimer])],
    price: supplementServingInfo[product.id].priceCents !== undefined
      ? `$${(supplementServingInfo[product.id].priceCents! / 100).toFixed(2)}` : undefined,
    ...getHandoutLabelDetails(product.id),
    labels: [product.label],
  };
});

function pagesFor(title: string, rows: FlyerProduct[], perPage: number) {
  return Array.from({ length: Math.ceil(rows.length / perPage) }, (_, index) => ({
    title,
    rows: rows.slice(index * perPage, (index + 1) * perPage),
  }));
}

export const nutritionPages = [
  // Package-specific isolate facts need more space than the shorter summaries.
  // Leave room for the complete facts, claims and footer on a Letter page.
  ...pagesFor("Whey Isolate · Nutrition Facts", powderRows.filter(row => row.family === "isolate"), 2),
  ...pagesFor("Whey Blend · Nutrition Facts", powderRows.filter(row => row.family === "blend"), 2),
  ...pagesFor("Vegan & Electrolytes · Nutrition Facts", powderRows.filter(row => row.family === "vegan" || row.family === "electrolyte"), 2),
  ...pagesFor("Supplements · Supplement Facts", supplementRows, 1),
];

// Include only copy and artwork exposed on the current purchase pages.
// Separate artwork pages preserve readable full labels rather than thumbnails.
export const productDetailPages = [...powderRows, ...supplementRows].flatMap(product => [
  { product, label: null as string | null },
  ...[...new Set(product.labels)].map(label => ({ product, label })),
]);
export const flyerPageCount = 2 + nutritionPages.length + productDetailPages.length;

const primaryClaims = ["Non-GMO", "Certified Gluten-Free", "Low-FODMAP Ingredients*"];
const wheyClaims = [...primaryClaims, "rBGH-Free Whey", "No Added Sugars"];
// Merchant-directed flyer grouping, separate from storefront collection layout.
export const collectionClaimGroups = [
  { name: "Whey Proteins", subtitle: "All Whey · isolates and blends", claims: wheyClaims },
  { name: "Whey Isolate Proteins", subtitle: "Whey isolate formulas", claims: [...wheyClaims] },
  { name: "Whey Blend Proteins", subtitle: "Natural whey blend formulas", claims: [...wheyClaims, "Sweetened with Stevia"] },
  { name: "Vegan protein powders", subtitle: "Vanilla and Chocolate", claims: [...primaryClaims, "Vegan"] },
  { name: "Electrolytes", subtitle: "Lemon Lime", claims: [...primaryClaims, "Vegan", "No Added Sugar"] },
  { name: "Supplements", subtitle: `${supplementRows.length} current formulas`, claims: [...primaryClaims] },
];
