/** Serving sizes and counts, not cost per serving or days of supply. */
export const supplementServingInfo: Record<string, { priceCents?: number; servings: number; maxServings?: number; dose: string; unit: string }> = {
  "womens-multi": { priceCents: 2495, servings: 30, dose: "2", unit: "Capsules" },
  "mens-multivitamin": { priceCents: 2495, servings: 30, dose: "2", unit: "Capsules" },
  "probiotic-40": { priceCents: 2495, servings: 30, dose: "2", unit: "Capsules" },
  "digestive-enzyme": { priceCents: 2495, servings: 60, dose: "1", unit: "Capsule" },
  "omega-3": { priceCents: 2995, servings: 60, dose: "1", unit: "Softgel" },
  "magnesium-complex": { priceCents: 2495, servings: 30, maxServings: 60, dose: "1–2", unit: "Capsules" },
  "turmeric-w-bioperine": { priceCents: 2495, servings: 30, dose: "2", unit: "Capsules" },
};

export function supplementServingSummary(id: string): string {
  const info = supplementServingInfo[id];
  if (!info) throw new Error(`Missing supplement serving information: ${id}`);
  return `${info.dose} ${info.unit.toLowerCase()} per serving · ${info.servings}${info.maxServings ? `–${info.maxServings}` : ""} servings per container${info.maxServings ? " (depending on use)" : ""}`;
}

export function powderServingSize(copy: { facts: string[] }): string {
  const fact = copy.facts.find(fact => /^Serving size:/i.test(fact));
  const grams = fact?.match(/(\d+(?:\.\d+)?)\s*g\b/i)?.[1];
  if (!grams) throw new Error("Missing verified powder serving weight.");
  return `${grams} g per serving`;
}

export function powderServingSummary(copy: { facts: string[]; servings: number }): string {
  return `${powderServingSize(copy)} · ${copy.servings} servings per container`;
}
