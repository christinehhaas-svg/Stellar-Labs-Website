// Fixed review expectations, deliberately independent of production data/helpers.
// Original label artwork is not rewritten to match merchant serving corrections.
const healthWarning = "If you have a health condition, are pregnant or breastfeeding, or take medication, consult your healthcare professional before use. Keep out of reach of children. Always read and follow the complete product label.";
export const supplementDisclaimer = "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.";
const allergenFree = "Free of Milk, Eggs, Fish, Crustacean Shellfish, Tree Nuts, Peanuts, Wheat, and Soy";
const commonClaims = ["Certified Gluten-Free", "Non-GMO"];
const standardUse = "Take two capsules in the morning with a meal, or as directed by your healthcare professional.";

type SupplementExpectation = {
  id: string;
  name: string;
  bottle: string;
  label: string;
  original: string;
  meta: string;
  price: string;
  basis: string;
  metrics: [string, string][];
  benefits: string[];
  claims: string[];
  warnings: string[];
  use: string;
  facts: string[];
};

const warnings = (extra = "") => [healthWarning + extra];
const multiMetrics: [string, string][] = [["Serving size", "2 capsules"], ["Nutrients", "Vitamins & minerals"]];

export const supplementExpectations: SupplementExpectation[] = [
  {
    id: "womens-multi", name: "Women's Daily Multivitamin",
    bottle: "womens-multi-store-bottle.png", label: "womens-multi-label.png", original: "womens-multi-label.pdf",
    meta: "60 capsules · 30 servings", price: "$24.95", basis: "2 capsules", metrics: multiMetrics,
    benefits: [
      "Energy & Metabolism Support*", "Supports Muscle Function*", "Supports Healthy Hair, Skin & Nails*", "Antioxidant Support*",
      "Energy & Metabolism — B vitamins and essential nutrients help support normal energy metabolism and everyday vitality.*",
      "Muscle Function — Key vitamins and minerals help support normal muscle function and overall wellness.*",
      "Hair, Skin & Nails — Includes biotin and other nutrients that support healthy hair, skin and nails.*",
      "Antioxidant Support — Antioxidant nutrients help support the body’s defenses against oxidative stress.*",
    ],
    claims: [...commonClaims, allergenFree], warnings: warnings(), use: standardUse,
    facts: ["Serving size: 2 capsules", "30 servings per container", "Vitamins, minerals, and female support, immune support, and antioxidant blends"],
  },
  {
    id: "mens-multivitamin", name: "Men's Daily Multivitamin",
    bottle: "mens-multivitamin-store-bottle.png", label: "mens-multivitamin-label.png", original: "mens-multivitamin-label.pdf",
    meta: "60 capsules · 30 servings", price: "$24.95", basis: "2 capsules", metrics: multiMetrics,
    benefits: [
      "Energy & Metabolism*", "Prostate & Heart Health*", "Muscle Function*", "Antioxidant Support*",
      "Energy & Metabolism — B vitamins and essential nutrients support normal energy production and metabolism.*",
      "Prostate & Heart Health — Provides nutrients selected to support men’s prostate and heart health.*",
      "Muscle Function — Essential vitamins and minerals help support normal muscle function.*",
      "Antioxidant Support — Antioxidant nutrients help support the body’s defenses against oxidative stress.*",
    ],
    claims: [...commonClaims, "Vegan Capsules", allergenFree], warnings: warnings(), use: standardUse,
    facts: ["Serving size: 2 capsules", "30 servings per container", "Vitamins, minerals, and male support, immune support, and antioxidant blends"],
  },
  {
    id: "probiotic-40", name: "Probiotic",
    bottle: "probiotic-40-store-bottle.png", label: "probiotic-40-label.png", original: "probiotic-40-label.pdf",
    meta: "60 capsules • 30 servings", price: "$24.95", basis: "2 capsules", metrics: [],
    benefits: [
      "Gut Balance*", "Digestive Health*", "Immune Support*",
      "Gut Balance — Multi-strain probiotic support helps promote a balanced intestinal environment.*",
      "Digestive Health — Selected probiotic strains help support healthy digestive function.*",
      "Immune Support — Probiotic strains help support normal immune function.*",
    ],
    claims: [...commonClaims, "Free of Milk, Eggs, Tree Nuts, Peanuts, Wheat, and Soy"],
    warnings: warnings(), use: "Follow the dosage and timing on the product label, or use as directed by your healthcare professional.",
    facts: ["Lactobacillus acidophilus (La-14)", "Bifidobacterium lactis (Bl-04)", "Lactobacillus plantarum (Lp-115)", "Lactobacillus paracasei (Lpc-37)"],
  },
  {
    id: "digestive-enzyme", name: "Digestive Enzyme",
    bottle: "digestive-enzyme-store-bottle.png", label: "digestive-enzyme-label.png", original: "digestive-enzyme-label.pdf",
    meta: "60 capsules · 60 servings", price: "$24.95", basis: "1 veggie capsule", metrics: [["Enzyme blend", "400 mg"]],
    benefits: [
      "Supports Digestion & Nutrient Breakdown*", "Helps Reduce Bloating & Discomfort*", "Enhances Nutrient Absorption*", "Supports Gut Health*",
      "Digestion & Nutrient Breakdown — Digestive enzymes help support the breakdown of proteins, fats, carbohydrates, and sugars.*",
      "Bloating & Digestive Comfort — Supports efficient digestion and post-meal comfort.*",
      "Nutrient Absorption — Helps break down foods into forms the body can more readily absorb and use.*",
      "Gut Health — Supports healthy digestive function and gastrointestinal wellness.*",
    ],
    claims: [...commonClaims, "Vegan Capsules", "Vegetarian Capsules", allergenFree], warnings: warnings(),
    use: "Take one capsule twice daily, 20-30 minutes before a meal, with an 8-ounce glass of water, or as directed by your healthcare professional.",
    facts: ["Serving size: 1 veggie capsule", "60 servings per container; suggested use is twice daily", "Makzyme-Pro™ enzyme blend: 2500 HUT / 400 mg per serving"],
  },
  {
    id: "omega-3", name: "Omega 3 Fish Oil",
    bottle: "omega-3-store-bottle.png", label: "omega-3-label.jpeg", original: "omega-3-label.jpeg",
    meta: "60 softgels · 60 servings", price: "$29.95", basis: "1 softgel",
    metrics: [["Fish oil", "1,200 mg"], ["Omega-3", "720 mg"], ["EPA", "432 mg"], ["DHA", "288 mg"]],
    benefits: [
      "Heart Health*", "Brain Health*", "Joint Health*", "Healthy Inflammatory Response*",
      "Heart Health — EPA and DHA help support cardiovascular health and normal heart function.*",
      "Brain Health — DHA helps support healthy brain and cognitive function.*",
      "Joint Health — Omega-3 fatty acids help support joint comfort and mobility.*",
      "Healthy Inflammatory Response — Omega-3s help support the body’s normal inflammatory response.*",
    ],
    claims: [...commonClaims, "100% Pure Sea-Harvested Pelagic Fish Oil", "Premium EPA & DHA Formula", "Tested for Known Contaminants"],
    warnings: warnings(" Contains fish."), use: "Take one softgel daily with a meal, or as directed by your healthcare professional.",
    facts: ["Serving size: 1 softgel", "60 servings per container", "Fish oil: 1,200 mg per softgel", "Omega-3: 720 mg; EPA: 432 mg; DHA: 288 mg per softgel", "Gentle Softgel Formula"],
  },
  {
    id: "magnesium-complex", name: "Magnesium Complex",
    bottle: "magnesium-complex-store-bottle.png", label: "magnesium-complex-label.png", original: "magnesium-complex-label.pdf",
    meta: "60 capsules · 30–60 servings (depending on use)", price: "$24.95", basis: "1–2 capsules", metrics: [["Magnesium", "500 mg"]],
    benefits: [
      "Muscle Relaxation*", "Cardiovascular & Bone Health*", "Nervous System Support*", "Digestive Health*",
      "Muscle Relaxation — Magnesium supports normal muscle function and relaxation.*",
      "Cardiovascular & Bone Health — Magnesium supports normal cardiovascular and bone health.*",
      "Nervous System Support — Magnesium helps support healthy nervous system function.*",
      "Digestive Health — Multiple forms of magnesium support healthy digestion and absorption.*",
    ],
    claims: [...commonClaims, "Vegan Capsules", allergenFree, "Multiple Forms of Magnesium"],
    warnings: warnings(" Higher supplemental doses may cause diarrhea or nausea. If these occur, discontinue use and consult your healthcare professional."),
    use: "Take one capsule daily before a meal, or two capsules if recommended by your healthcare professional.",
    facts: ["Serving size: 1–2 capsules", "30–60 servings per bottle, depending on use", "Magnesium: 500 mg per two-capsule serving", "Magnesium hydroxide (Aquamin Mg™), magnesium malate, magnesium oxide, magnesium citrate, magnesium glycinate", "Gentle Capsule Formula"],
  },
  {
    id: "turmeric-w-bioperine", name: "Turmeric Curcumin",
    bottle: "turmeric-w-bioperine-store-bottle.png", label: "turmeric-w-bioperine-label.png", original: "turmeric-w-bioperine-label.pdf",
    meta: "60 capsules · 30 servings", price: "$24.95", basis: "2 capsules",
    metrics: [["Turmeric root", "1,200 mg"], ["Curcuminoids", "100 mg"], ["BioPerine®", "6.67 mg"]],
    benefits: [
      "Antioxidant Support — Turmeric provides antioxidant compounds that help support the body’s defenses against oxidative stress.*",
      "Healthy Aging — Botanical and antioxidant support helps promote overall wellness.*",
      "Joint & Mobility Support — Turmeric helps support joint comfort and mobility.*",
      "Cellular Health — Antioxidant compounds help support normal cellular wellness.*",
    ],
    claims: [...commonClaims, "Vegan Capsules", allergenFree, "Formulated with BioPerine®"], warnings: [healthWarning],
    use: "Take two capsules once daily, 20-30 minutes before a meal, with an 8-ounce glass of water, or as directed by your healthcare professional.",
    facts: ["Serving size: 2 capsules", "Organic turmeric root: 1,200 mg per serving", "Turmeric 95% curcuminoids: 100 mg per serving", "BioPerine® black pepper extract: 6.67 mg per serving", "Gentle Capsule Formula"],
  },
];
