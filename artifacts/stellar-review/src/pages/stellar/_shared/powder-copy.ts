import { electrolyteCopy } from "./electrolyte-copy";
import { wheyLines } from "./whey-lines";
import { assertPowderPackageIdentity, getPowderServingDecision, servingDecisionNote, type PowderPackageIdentity } from "./serving-decisions";
import { getOutlineProduct, milkDisclaimer, powderNutritionDisclaimer, outlineSourceNote } from "./outline-copy";
import { websiteClaim, websiteWarnings } from "./website-copy";

export type PowderCopy = {
  sourceNote?: string;
  containerWeight?: string;
  description: string;
  benefits: string[];
  quality: string[];
  support: { title: string; description: string }[];
  suggestedUse: string;
  facts: string[];
  warnings: string[];
  servings: number;
};

export const wheyBaselineQuality = [...getOutlineProduct("ProteinChocolateIsolate").quality];
export const veganQuality = [...getOutlineProduct("VeganChocolate").quality];

const powderUse = "Mix one rounded scoop with 6–8 ounces of water, milk, or your favorite non-dairy beverage. Vary the amount of liquid for taste preference.";
const healthWarnings = [
  "If you have any health conditions, are pregnant, breastfeeding, or taking medication, ask a physician prior to use.",
  "Keep out of reach of small children.",
];
const sharedEquipment = "Manufactured on shared equipment that produces products containing milk, eggs, soybeans, wheat, shellfish, fish oil, tree nuts, and peanuts.";
export const powderDisclaimer = "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.";

// Values transcribed from each current package panel, not another flavor's
// listing. The website's older Vanilla Blend listing differs from its label.
const servingFacts: Record<string, { identity: Omit<PowderPackageIdentity, "component">; grams: number; servings: number; protein?: number }> = {
  ProteinMixedBerry: { identity: { size: "1lb", formula: "isolate", flavor: "Mixed Berry" }, grams: 29, servings: 16, protein: 25 },
  ProteinUnflavored: { identity: { size: "1lb", formula: "isolate", flavor: "Unflavored" }, grams: 29, servings: 16, protein: 25 },
  ProteinVanillaIsolate: { identity: { size: "2lb", formula: "isolate", flavor: "Vanilla" }, grams: 31, servings: 29, protein: 26 },
  ProteinChocolateIsolate: { identity: { size: "2lb", formula: "isolate", flavor: "Chocolate" }, grams: 31, servings: 29, protein: 25 },
  ProteinCappuccino: { identity: { size: "1lb", formula: "isolate", flavor: "Cappuccino" }, grams: 30, servings: 16, protein: 25 },
  ProteinCaramelBlend: { identity: { size: "2lb", formula: "blend", flavor: "Caramel" }, grams: 32, servings: 28, protein: 24 },
  ProteinVanillaBlend: { identity: { size: "2lb", formula: "blend", flavor: "Vanilla" }, grams: 33, servings: 28, protein: 24 },
  ProteinChocolateBlend: { identity: { size: "2lb", formula: "blend", flavor: "Chocolate" }, grams: 33, servings: 28, protein: 24 },
  VeganChocolate: { identity: { size: "2lb", formula: "vegan", flavor: "Chocolate" }, grams: 32, servings: 28, protein: 20 },
  VeganVanilla: { identity: { size: "2lb", formula: "vegan", flavor: "Vanilla" }, grams: 32, servings: 28, protein: 20 },
  ElectrolyteLemonLime: { identity: { size: "30 servings", formula: "electrolyte", flavor: "Lemon Lime" }, grams: 4.5, servings: 30 },
  ElectrolyteStrawberry: { identity: { size: "40 servings", formula: "electrolyte", flavor: "Strawberry" }, grams: 6.5, servings: 40 },
};

function getPackageCopy(product: PowderPackageIdentity): PowderCopy {
  const serving = Object.hasOwn(servingFacts, product.component) ? servingFacts[product.component] : undefined;
  if (!serving) throw new Error(`Missing verified label facts for ${product.component}`);
  assertPowderPackageIdentity(product, serving.identity);
  const facts = [
    `Serving size: 1 ${product.formula === "electrolyte" ? "" : "rounded "}scoop (${serving.grams}g)`,
    `${serving.servings} servings per container`,
    ...(serving.protein === undefined ? [] : [`Protein: ${serving.protein}g per serving`]),
  ];
  if (product.formula === "electrolyte") {
    const copy = electrolyteCopy[product.component];
    if (!copy) throw new Error(`Missing electrolyte copy for ${product.component}`);
    return {
      ...copy, facts, servings: serving.servings,
      // Printed net weight; keep the canonical catalog size for identity checks.
      ...(product.component === "ElectrolyteLemonLime" ? { containerWeight: "135 g" } : {}),
      warnings: [...healthWarnings, ...copy.allergens, "Store at room temperature."],
    };
  }
  if (product.formula === "vegan") {
    return {
      description: `${product.flavor} Vegan Protein: 20g of plant protein per serving, made with pea, brown rice, and quinoa proteins and sweetened with stevia.`,
      benefits: ["20g of Plant Protein per Serving", "Vegan Protein Nutrition", "Three Plant Protein Sources", "Easy Mixing — No Blender Required"],
      quality: [...veganQuality],
      support: [
        { title: "Vegan Protein", description: "Pea protein isolate, brown rice powder, and quinoa come together in one vegan protein blend." },
        { title: "Daily Protein Nutrition", description: "Each serving provides 20g of protein to help complement your daily protein intake." },
        { title: "Amino Acid Nutrition", description: "Plant proteins supply naturally occurring amino acids as part of everyday protein nutrition." },
        { title: "Easy Mixing", description: "Mixes with liquid in a shaker, blender, or with a glass and spoon." },
      ],
      suggestedUse: powderUse, facts, servings: serving.servings,
      warnings: [...healthWarnings, sharedEquipment],
    };
  }
  const isolate = product.formula === "isolate";
  return {
    description: isolate
      ? "Stellar Labs® 100% Isolate Whey Protein is a clean, high-quality protein source that delivers essential amino acids in an easy-to-mix shake. Ultra-filtered whey isolate is low in sugar. A convenient option for athletes and anyone looking to add protein to their everyday routine."
      : "Whey Protein Blend combines whey protein concentrate and whey protein isolate. Sweetened with stevia.",
    benefits: isolate ? [
      "A clean, high-quality whey protein source",
      "Delivers essential amino acids to support everyday nutrition",
      "Low in sugar and free of fillers",
      "Easy to mix",
    ] : [
      "A blend of whey protein concentrate and whey protein isolate",
      "Protein to support muscle recovery and growth",
      "A smooth shake that mixes easily with your choice of liquid",
      "Sweetened with stevia.",
    ],
    quality: [...wheyBaselineQuality, ...(isolate
      ? []
      : ["Whey Protein Concentrate + Whey Protein Isolate", "Sweetened with Stevia"])],
    support: isolate ? [
      { title: "High-quality whey protein", description: "Whey protein isolate provides a convenient, high-quality protein source for your daily routine." },
      { title: "Essential amino acids", description: "Whey protein delivers essential amino acids as part of everyday protein nutrition." },
      { title: "Low in sugar", description: "A low-sugar protein option made without fillers." },
      { title: "Easy mixing", description: "An easy-to-mix shake for your daily routine." },
    ] : [
      { title: "Whey protein blend", description: "Concentrate and isolate come together in one versatile everyday protein." },
      { title: "Muscle recovery & growth", description: "Dietary protein supplies amino acids that support muscle recovery and growth as part of an active routine." },
      { title: "Easy to mix", description: "Mixes with liquid in a shaker, blender, or with a glass and spoon." },
      { title: "Sweetened with Stevia", description: "Sweetened with stevia." },
    ],
    suggestedUse: powderUse, facts, servings: serving.servings,
    warnings: [...healthWarnings, "Contains milk and soy.", sharedEquipment],
  };
}

/** The PDF updates marketing copy, not the artwork or a different pack's facts. */
function isolateDescription(flavor: string): string {
  return wheyLines.isolate.description;
}

export function getPowderCopy(product: PowderPackageIdentity): PowderCopy {
  const copy = getFormulaCopy(product);
  return {
    ...copy,
    ...(product.formula === "isolate" ? {
      benefits: ["Convenient Everyday Nutrition", "Easy Mixing"],
      support: [
        { title: "Muscle Maintenance & Recovery", description: "Dietary protein supplies amino acids that support muscle maintenance and recovery.*" },
        { title: "Essential Amino Acids", description: "Provides all nine essential amino acids, including BCAAs." },
      ],
    } : {}),
    description: product.formula === "vegan"
      ? `${product.flavor} Vegan Protein: 20g of plant protein per serving, made with pea, brown rice, and quinoa proteins and sweetened with stevia.`
      : copy.description,
    quality: [...new Set([...copy.quality, ...(["blend", "vegan"].includes(product.formula) ? ["Sweetened with Stevia"] : [])].flatMap(claim => {
      if (/^GLP-?1 Friendly/i.test(claim) || (product.formula === "blend" && /artificial (?:flavors|colors|sweeteners)/i.test(claim))) return [];
      const approved = websiteClaim(claim, product.formula === "isolate" || product.formula === "blend");
      return approved ? [approved] : [];
    }))],
    warnings: websiteWarnings(copy.warnings),
  };
}

function getFormulaCopy(product: PowderPackageIdentity): PowderCopy {
  if (product.component === "ProteinChocolateIsolate1lb" || product.component === "ProteinVanillaIsolate1lb") {
    const flavor = product.component === "ProteinChocolateIsolate1lb" ? "Chocolate" : "Vanilla";
    assertPowderPackageIdentity(product, { formula: "isolate", flavor, size: "1lb" });
    const source = getOutlineProduct(flavor === "Chocolate" ? "ProteinChocolateIsolate" : "ProteinVanillaIsolate");
    return {
      description: isolateDescription(flavor),
      benefits: [...source.benefits], quality: [...source.quality],
      support: source.support.map(item => ({ ...item })),
      suggestedUse: source.suggestedUse,
      facts: [
        "Serving size: 29g (1 scoop)", "Servings per container: 16",
        "Protein: 25g per serving", "Calories: 110 per serving",
        "Total carbohydrate: 1g per serving",
        ...(flavor === "Chocolate"
          ? ["Total sugars: <1g per serving", "Total fat: 1g per serving", "Calcium: 118mg", "Chromium: 2mcg", "Sodium: 65mg", "Potassium: 170mg"]
          : ["Total sugars: 0g per serving", "Total fat: 0.5g per serving", "Niacin: 4mg", "Calcium: 120mg", "Phosphorus: 135mg", "Sodium: 65mg", "Potassium: 135mg"]),
      ],
      servings: 16,
      warnings: [...source.warnings, milkDisclaimer, powderNutritionDisclaimer],
      sourceNote: "Nutrition facts follow the merchant-supplied photographs of the matching 1 lb package. Label views retain the photographed text, with the merchant-supplied UPC replacing the barcode in place.",
    };
  }
  const original = getPackageCopy(product);
  const decision = getPowderServingDecision(product);
  const mixedBerry = product.component === "ProteinMixedBerry";
  // Mixed Berry is confirmed by its own listing and package, not the PDF's Strawberry entry.
  if (mixedBerry) return {
    ...original,
    description: isolateDescription(product.flavor),
    facts: [...original.facts, "Calories: 110 per serving", "Total carbohydrate: 1g per serving", "Total sugars: 0g per serving"],
    warnings: [...original.warnings, milkDisclaimer, powderNutritionDisclaimer],
  };
  const source = getOutlineProduct(product.component);
  const whey = product.formula === "isolate" || product.formula === "blend";
  return {
    ...original,
    facts: decision ? [...decision.approvedFacts, ...original.facts.slice(2)] : original.facts,
    servings: decision?.servings ?? original.servings,
    description: product.formula === "isolate" ? isolateDescription(product.flavor)
      : product.formula === "blend" ? wheyLines.blend.description
      : product.formula === "electrolyte" ? original.description : source.description,
    benefits: [...source.benefits],
    quality: product.formula === "electrolyte"
      ? [...source.quality, "5 Major Electrolytes"]
      : [...source.quality],
    support: source.support.map(item => ({ ...item })),
    suggestedUse: source.suggestedUse,
    warnings: [...source.warnings, ...(whey ? [milkDisclaimer, powderNutritionDisclaimer] : [])],
    sourceNote: [outlineSourceNote, servingDecisionNote(product.component)].filter(Boolean).join(" "),
  };
}
