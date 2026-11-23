export const wheyLines = {
  isolate: {
    name: "Whey Protein Isolate",
    description: "Ultra-filtered 100% whey isolate with up to 26g of protein and minimal carbohydrates per serving, designed with digestive comfort in mind.",
  },
  blend: {
    name: "Whey Protein Blend",
    description: "Whey Protein Blend combines whey concentrate and isolate. Sweetened with stevia.",
  },
  classic: {
    name: "Stellar Labs Classic Whey Protein Blend",
    description: "Whey concentrate and isolate, sweetened with sucralose, with added BCAAs and natural and artificial flavors.",
  },
} as const;

export function powderDisplayName(formula: string) {
  return formula === "isolate" ? wheyLines.isolate.name
    : formula === "blend" ? wheyLines.blend.name
    : formula === "classic" ? wheyLines.classic.name
    : formula === "vegan" ? "Vegan Protein" : "Electrolyte Powder";
}

export function powderProductBlurb(product: { formula: string; flavor: string }) {
  const name = `${product.flavor} ${powderDisplayName(product.formula)}`;
  if (product.formula === "isolate") {
    return `${name}. ${wheyLines.isolate.description}`;
  }
  if (product.formula === "vegan") {
    return `${name}: 20g of plant protein per serving, made with pea, brown rice, and quinoa proteins and sweetened with stevia.`;
  }
  if (product.formula === "blend") {
    return `${name} combines whey concentrate and isolate. Sweetened with stevia.`;
  }
  if (product.formula === "electrolyte") {
    return `${product.flavor} electrolyte-packed hydration sweetened with stevia.`;
  }
  throw new Error(`No product blurb for formula: ${product.formula}`);
}
