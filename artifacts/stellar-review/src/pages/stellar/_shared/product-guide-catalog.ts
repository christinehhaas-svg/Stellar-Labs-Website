import proteinProducts from "./protein-products.json";
import veganProducts from "./vegan-products.json";
import electrolyteProducts from "./electrolyte-products.json";
import { getPowderCopy, powderDisclaimer } from "./powder-copy";
import { collectionClaimNote, milkDisclaimer, powderNutritionDisclaimer } from "./outline-copy";
import { powderNutritionMetrics } from "./ProductCardNutrition";
import { powderServingSize, supplementServingSummary } from "./product-servings";
import { supplements, getSupplementQuality } from "./supplements-data";
import { powderDisplayName } from "./whey-lines";
import { orderNutritionFacts } from "./nutrition-order";

export type GuideProduct = {
  name: string;
  description: string;
  benefits: string[];
  quality: string[];
  facts: string;
  support: { title: string; description: string }[];
  suggestedUse: string;
  warnings: string[];
  metrics: { label: string; value: string }[];
  serving: string;
  href: string;
  note?: string;
};

const powders = [...proteinProducts, ...veganProducts, ...electrolyteProducts]
  .filter(product => !("discontinued" in product && product.discontinued));

export function guideClaims(statements: string[]) {
  return [...new Set(statements.filter(claim => !/^GLP-?1 Friendly|fodmap/i.test(claim)).map(claim => {
    if (/^Certified Gluten-Free[*†‡]*$/.test(claim)) return "Certified Gluten-Free";
    return claim;
  }))];
}

// These qualifications appear once below the guide, not in every description.
export function guideSpecificWarnings(warnings: string[]) {
  const unmark = (text: string) => text.replace(/^[*†‡]\s*/, "");
  const shared = new Set([collectionClaimNote, milkDisclaimer, powderNutritionDisclaimer, powderDisclaimer].map(unmark));
  // Historical outline wording was replaced by the merchant's shared footnote.
  shared.add(`${unmark(collectionClaimNote)} This product is not certified low-FODMAP.`);
  return [...new Set(warnings)].filter(warning => !/fodmap/i.test(warning) && !shared.has(unmark(warning))
    && !/^These statements have not been evaluated by the Food and Drug Administration\./.test(warning));
}

function powderEntries(family: string): GuideProduct[] {
  return powders.filter(product => product.formula === family).map(product => {
    const copy = getPowderCopy(product);
    return {
      ...copy,
      quality: guideClaims(copy.quality),
      name: `${powderDisplayName(product.formula)} · ${product.flavor} · ${product.size.replace(/(\d+)lb/i, "$1 lb")}`,
      facts: copy.facts.join(" · "),
      metrics: powderNutritionMetrics(product.component).metrics,
      serving: `Per ${powderServingSize(copy).replace(" per serving", "")} serving · ${copy.servings} servings per container`,
      href: `/products/${product.handle}`,
    };
  });
}

const supplementEntries: GuideProduct[] = supplements
  .filter(product => product.category !== "nighttime")
  .map(product => ({
    name: `${product.name} · ${product.count}`,
    description: product.detailCopy?.description ?? product.subtitle,
    benefits: product.benefits,
    quality: guideClaims(getSupplementQuality(product)),
    support: product.detailCopy?.support ?? [],
    suggestedUse: product.use,
    warnings: product.warnings,
    facts: orderNutritionFacts(product.facts).join(" · "),
    metrics: [],
    serving: supplementServingSummary(product.id),
    href: product.storePath ?? `/supplements#${product.id}`,
  }));

export const productGuideCatalog = {
  supplements: supplementEntries,
  isolate: powderEntries("isolate"),
  // Classic is temporarily withdrawn from both the guide and shopping catalog.
  blend: powderEntries("blend"),
  vegan: powderEntries("vegan"),
  electrolyte: powderEntries("electrolyte"),
};
