import proteinProducts from "./protein-products.json";
import veganProducts from "./vegan-products.json";
import { shakeCardNutrition } from "./ProductCardNutrition";
import { getOutlineProduct } from "./outline-copy";

export type CollectionNutritionMetric = {
  label: string;
  value: string;
  caption?: string;
  bound?: string;
};

/** Collection highlights use real label extrema, never reverse an upper limit
 * into an unsupported "as low as" statement. Individual facts stay unchanged. */
export function collectionNutritionSummary(formula: "isolate" | "blend" | "vegan" | "electrolyte"): CollectionNutritionMetric[] {
  if (formula === "electrolyte") {
    return ["Calories", "Potassium", "Magnesium", "Calcium", "Sodium"].map(label => {
      const fact = getOutlineProduct("ElectrolyteLemonLime").facts.find(fact => fact.startsWith(`${label}:`));
      const amount = fact?.match(/:\s*(\d+)/)?.[1];
      if (!amount) throw new Error(`Missing or invalid Lemon Lime ${label}`);
      return { label, value: `${amount}${label === "Calories" ? "" : "mg"}` };
    });
  }
  const facts = [...proteinProducts, ...veganProducts].filter(product => product.formula === formula).map(product => {
    const nutrition = shakeCardNutrition[product.component];
    if (!nutrition) throw new Error(`Missing nutrition for ${product.component}`);
    return nutrition;
  });
  if (!facts.length) throw new Error(`No label facts for ${formula}`);
  const numeric = (value: string) => Number.parseFloat(value.replace(/^</, ""));
  const highlight = (key: "protein" | "calories" | "carbs" | "sugar", label: string, maximum = false): CollectionNutritionMetric => {
    const sorted = facts.map(item => item[key]).sort((a, b) =>
      (maximum ? -1 : 1) * (numeric(a) - numeric(b)) ||
      Number(b.startsWith("<")) - Number(a.startsWith("<")));
    const value = sorted[0];
    return {
      label,
      value: value.replace(/^</, ""),
      bound: value.startsWith("<") && !(formula === "isolate" && key === "carbs") ? "Less than" : undefined,
      caption: maximum ? (formula === "isolate" ? "Up to" : "As much as") : "As low as",
    };
  };
  return formula === "isolate"
    ? [highlight("calories", "Calories"), highlight("protein", "Protein", true), highlight("carbs", "Carbs"), highlight("sugar", "Sugar")]
    : [highlight("protein", "Protein", true)];
}
