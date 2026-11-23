/** Supplied manufacturer sheet, not a flavor-specific Stellar Labs package panel. */
export const classicReference = {
  source: "attached_assets/IMG_1614_1793542839658.png",
  basis: "Supplied manufacturer reference. Nutrition may vary by flavor.",
  size: "2 lb",
  servingGrams: 34,
  servings: 27,
  metrics: [
    { label: "Protein", value: "24g" },
    { label: "Calories", value: "130" },
    { label: "Carbs", value: "4g" },
    { label: "Sugar", value: "2g" },
  ],
  otherFacts: [
    ["Total fat", "2 g"],
    ["Saturated fat", "1 g"],
    ["Cholesterol", "63 mg"],
    ["Dietary fiber", "1 g"],
    ["Calcium", "133 mg"],
    ["Iron", "1 mg"],
    ["Chromium", "6 mcg"],
    ["Sodium", "52 mg"],
    ["Potassium", "312 mg"],
  ],
} as const;

export const archivedClassicWheyProducts = [
  { id: "ProteinClassicChocolate", handle: "classic-whey-protein-blend-chocolate", flavor: "Chocolate" },
  { id: "ProteinClassicVanilla", handle: "classic-whey-protein-blend-vanilla", flavor: "Vanilla" },
  { id: "ProteinClassicCookiesCream", handle: "classic-whey-protein-blend-cookies-and-cream", flavor: "Cookies & Cream" },
].map(product => ({ ...product, formula: "classic" as const, price: null, image: null, available: false }));

export type ClassicWheyProduct = (typeof classicWheyProducts)[number];
// Temporarily withdrawn by the merchant; retain the reference for later.
export const classicWheyProducts: typeof archivedClassicWheyProducts = [];
