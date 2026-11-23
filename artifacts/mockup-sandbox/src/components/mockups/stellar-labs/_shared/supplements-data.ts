/** Manually transcribed from the eight merchant-supplied label artworks. */
export type Supplement = {
  id: string;
  name: string;
  subtitle: string;
  category: "daily" | "digestion" | "muscle-joint" | "nighttime";
  additionalCategories?: Supplement["category"][];
  front: string;
  bottle: string;
  bottleCaption?: string;
  label: string;
  pdf?: string;
  benefits: string[];
  supply: string;
  count: string;
  use: string;
  facts: string[];
  sourceNote?: string;
  warnings: string[];
  /** Capsule-specific dietary wording explicitly present on the supplied label. */
  labeledDietaryClaims?: string[];
  storePath?: string;
  detailCopy?: {
    description: string;
    caption: string;
    qualityCaption: string;
    quality: string[];
    support: { title: string; description: string }[];
  };
};

import { reviewAsset } from "../review-links";
import { getOutlineProduct } from "./outline-copy";
import { servingDecisions, servingDecisionNote } from "./serving-decisions";
const images = reviewAsset("/__mockup/images/stellar-supplements/");
const physicianWarning = "Consult with a physician prior to use if you have a medical condition. Do not use if pregnant or lactating.";
const storageWarning = "Keep out of reach of children. Do not use if safety seal is damaged or missing. Store in a cool, dry place.";

const packageSupplements: Supplement[] = [
  {
    id: "womens-multi",
    name: "Women's Daily Multivitamin",
    subtitle: "Gentle Capsule Formula",
    category: "daily",
    front: `${images}womens-multi-front.png`,
    bottle: `${images}womens-multi-bottle.svg`,
    label: `${images}womens-multi-label.png`,
    pdf: `${images}womens-multi-label.pdf`,
    benefits: ["Energy & Metabolism Support", "Supports Muscle Function", "Supports Healthy Hair, Skin & Nails", "Antioxidant Support"],
    supply: "30-day supply",
    count: "60 capsules",
    use: "As a dietary supplement, take two (2) capsules in the morning with a meal.",
    facts: ["Serving size: 2 capsules", "30 servings per container", "Vitamins, minerals, and female support, immune support, and antioxidant blends"],
    warnings: [physicianWarning, storageWarning],
    storePath: "/products/womens-ultra-multivitamin",
  },
  {
    id: "mens-multivitamin",
    name: "Men's Daily Multivitamin",
    subtitle: "Gentle Capsule Formula",
    category: "daily",
    front: `${images}mens-multivitamin-front.png`,
    bottle: `${images}mens-multivitamin-bottle.svg`,
    label: `${images}mens-multivitamin-label.png`,
    pdf: `${images}mens-multivitamin-label.pdf`,
    benefits: ["Energy & Metabolism", "Prostate & Heart Health", "Muscle Function", "Antioxidant Support"],
    supply: "30-day supply",
    count: "60 capsules",
    use: "As a dietary supplement, take two (2) capsules in the morning with a meal.",
    facts: ["Serving size: 2 capsules", "30 servings per container", "Vitamins, minerals, and male support, immune support, and antioxidant blends"],
    warnings: [physicianWarning, storageWarning],
    storePath: "/products/mens-ultra-multivitamins",
    labeledDietaryClaims: ["Vegetarian Capsules"],
  },
  {
    id: "probiotic-40",
    name: "Probiotic",
    subtitle: "40 Billion CFU",
    category: "digestion",
    front: `${images}probiotic-40-front.png`,
    bottle: `${images}probiotic-40-bottle.svg`,
    label: `${images}probiotic-40-label.png`,
    pdf: `${images}probiotic-40-label.pdf`,
    benefits: ["Gut Balance", "Digestive Health", "Immune Support", "Digestive Comfort"],
    supply: "30-day supply",
    count: "60 capsules",
    use: "As a dietary supplement, take two (2) capsules in the morning with a meal.",
    facts: ["Serving size: 2 capsules", "30 servings per container", "40 billion CFU per two-capsule serving", "Lactobacillus acidophilus (La-14), Bifidobacterium lactis (Bl-04), Lactobacillus plantarum (Lp-115), Lactobacillus paracasei (Lpc-37)"],
    warnings: [physicianWarning, storageWarning],
    storePath: "/products/probiotic-supplements",
  },
  {
    id: "digestive-enzyme",
    name: "Digestive Enzyme",
    subtitle: "Bloat and Digestion Formula",
    category: "digestion",
    front: `${images}digestive-enzyme-front.png`,
    bottle: `${images}digestive-enzyme-bottle.svg`,
    label: `${images}digestive-enzyme-label.png`,
    pdf: `${images}digestive-enzyme-label.pdf`,
    benefits: ["Supports Digestion & Nutrient Breakdown", "Helps Reduce Bloating & Discomfort", "Enhances Nutrient Absorption", "Supports Gut Health"],
    supply: "30-day supply",
    count: "60 capsules",
    use: "As a dietary supplement, take one (1) capsule twice a day.",
    facts: ["Serving size: 1 veggie capsule", "60 servings per container; suggested use is twice daily", "Makzyme-Pro™ enzyme blend: 2500 HUT / 400 mg per serving"],
    warnings: [physicianWarning, storageWarning],
    storePath: "/products/digestive-enzymes",
    labeledDietaryClaims: ["Vegetarian Capsules"],
  },
  {
    id: "omega-3",
    name: "Omega 3 Fish Oil",
    subtitle: "Premium EPA & DHA Formula",
    category: "daily",
    front: `${images}omega-3-front.png`,
    bottle: `${images}omega-3-bottle.svg`,
    label: `${images}omega-3-label.jpeg`,
    benefits: ["Heart Health", "Brain Health", "Joint Health", "Inflammatory Response"],
    supply: "60-day supply",
    count: "60 softgels",
    use: "As a dietary supplement, take one (1) softgel daily with meals.",
    facts: ["Serving size: 1 softgel", "60 servings per container", "Fish oil: 1,200 mg per softgel", "Omega-3: 720 mg; EPA: 432 mg; DHA: 288 mg per softgel", "Gentle Softgel Formula"],
    warnings: [physicianWarning, "Contains fish (anchovy). May contain porcine. Other ingredients include gelatin.", storageWarning],
    storePath: "/products/omega-3-fish-oil-supplement",
  },
  {
    id: "magnesium-complex",
    name: "Magnesium Complex",
    subtitle: "High Absorption Magnesium",
    category: "muscle-joint",
    additionalCategories: ["digestion"],
    front: `${images}magnesium-complex-front.png`,
    bottle: `${images}magnesium-complex-bottle.svg`,
    label: `${images}magnesium-complex-label.png`,
    pdf: `${images}magnesium-complex-label.pdf`,
    benefits: ["Muscle Relaxation", "Cardiovascular & Bone Health", "Nervous System Support", "Digestive Health"],
    supply: "30-day supply",
    count: "60 capsules",
    use: "As a dietary supplement, take two (2) capsules in the morning with a meal.",
    facts: ["Serving size: 2 capsules", "30 servings per container", "Magnesium: 500 mg per two-capsule serving", "Magnesium hydroxide (Aquamin Mg™), magnesium malate, magnesium oxide, magnesium citrate, magnesium glycinate", "Gentle Capsule Formula"],
    warnings: [physicianWarning, storageWarning],
    // The current store's Magnesium Citrate is NOT a confirmed match.
  },
  {
    id: "turmeric-w-bioperine",
    name: "Turmeric Curcumin",
    subtitle: "Formulated with BioPerine®",
    category: "muscle-joint",
    front: `${images}turmeric-w-bioperine-front.png`,
    bottle: `${images}turmeric-w-bioperine-bottle.svg`,
    label: `${images}turmeric-w-bioperine-label.png`,
    pdf: `${images}turmeric-w-bioperine-label.pdf`,
    benefits: ["Antioxidant Support", "Supports Healthy Aging", "Joint & Mobility Support", "Cellular Health"],
    supply: "30-day supply",
    count: "60 capsules",
    use: "As a dietary supplement, take two (2) capsules in the morning with a meal.",
    facts: ["Serving size: 2 capsules", "Organic turmeric root: 1,200 mg per serving", "Turmeric 95% curcuminoids: 100 mg per serving", "BioPerine® black pepper extract: 6.67 mg per serving", "Gentle Capsule Formula"],
    warnings: [physicianWarning, "WARNING: Reproductive Harm — www.P65Warnings.ca.gov", storageWarning],
    // No confirmed listing found in the current supplements collection.
  },
  {
    id: "night-time-fat-burn",
    name: "Night Time Fat Burn",
    subtitle: "Nighttime formula",
    category: "nighttime",
    front: `${images}night-time-fat-burn-front.png`,
    bottle: `${images}night-time-fat-burn-bottle.svg`,
    label: `${images}night-time-fat-burn-label.png`,
    pdf: `${images}night-time-fat-burn-label.pdf`,
    benefits: ["Supports Overnight Metabolism", "Encourages Fat Utilization", "Promotes Restful Sleep", "Supports Stress and Hormonal Balance"],
    supply: "30-day supply",
    count: "60 capsules",
    use: "As a dietary supplement, take two (2) capsules before bedtime.",
    facts: ["Serving size: 2 capsules", "Melatonin: 4 mg per serving", "Night Burn Blend: 500 mg; Mood and Sleep Blend: 340 mg per serving"],
    warnings: ["Do not exceed recommended dose. Do not use if pregnant or lactating.", "Contains a gelatin capsule; see the full label for other ingredients.", storageWarning],
    storePath: "/products/supplements-night-time-fat-burner",
  },
];

export const supplements: Supplement[] = packageSupplements.filter(product => product.id !== "night-time-fat-burn").map(product => {
  const copy = getOutlineProduct(product.id);
  return {
    ...product,
    front: ["omega-3", "probiotic-40"].includes(product.id)
      ? `${images}${product.id}-merchant-front.png`
      : product.front,
    bottle: `${images}${product.id}-store-bottle.png`,
    bottleCaption: product.id === "womens-multi"
      ? "Product bottle photo from the current Stellar Labs store."
      : "Product-specific bottle illustration using the supplied label artwork and the store's container shape; not a finished-product photo.",
    facts: servingDecisions[product.id]
      ? [...servingDecisions[product.id].approvedFacts, ...product.facts.filter(fact => !/serving size|servings per container/i.test(fact))]
      : product.facts,
    supply: servingDecisions[product.id]?.supply ?? product.supply,
    sourceNote: [
      servingDecisionNote(product.id),
      product.id === "probiotic-40"
        ? "Artwork review: the supplied Probiotic 40 Billion label also reads “Daily Multivitamin.” That text is preserved in the illustration, not adopted as this product's description; corrected print artwork requires merchant approval."
        : "",
    ].filter(Boolean).join(" "),
    benefits: copy.benefits.map(benefit => benefit.replace(/\*$/, "")),
    use: servingDecisions[product.id]?.packageDirections ?? copy.suggestedUse,
    warnings: [...copy.warnings],
    labeledDietaryClaims: copy.quality.filter(claim => /^(Vegan|Vegetarian) Capsules/.test(claim)),
    detailCopy: {
      description: copy.description,
      caption: copy.benefits.join(" · "),
      qualityCaption: copy.quality.join(" · "),
      quality: [...copy.quality],
      support: copy.support.map(item => ({ ...item })),
    },
  };
});

export function getSupplementQuality(product: Supplement): string[] {
  return [...getOutlineProduct(product.id).quality];
}

export const labelDisclaimer = "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.";
export const storePreview = "https://www.stellarlabsnutrition.com";
