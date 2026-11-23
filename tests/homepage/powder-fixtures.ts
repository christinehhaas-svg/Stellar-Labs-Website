// Approved identities and claims, intentionally independent of production JSON/helpers.
export const isolateClaims = [
  "0–2g carbs per serving", "0–1g sugar per serving", "25g+ protein per serving",
];
export const lowFodmap = "Easy-to-Digest Ingredients";

export const whey = [
  { component: "ProteinVanillaIsolate", handle: "100-isolate-whey-protein-shake-vanilla", title: "Vanilla Whey Protein Isolate · 2 lb", size: "2lb", flavor: "Vanilla", formula: "isolate" },
  { component: "ProteinChocolateIsolate", handle: "100-isolate-whey-protein-shake-chocolate", title: "Chocolate Whey Protein Isolate · 2 lb", size: "2lb", flavor: "Chocolate", formula: "isolate" },
  { component: "ProteinChocolateIsolate1lb", handle: "100-isolate-whey-protein-shake-chocolate-1lb", title: "Chocolate Whey Protein Isolate · 1 lb", size: "1lb", flavor: "Chocolate", formula: "isolate" },
  { component: "ProteinVanillaIsolate1lb", handle: "100-isolate-whey-protein-shake-vanilla-1lb", title: "Vanilla Whey Protein Isolate · 1 lb", size: "1lb", flavor: "Vanilla", formula: "isolate" },
  { component: "ProteinMixedBerry", handle: "100-isolate-whey-protein-shake-mixed-berry", title: "Mixed Berry Whey Protein Isolate · 1 lb", size: "1lb", flavor: "Mixed Berry", formula: "isolate" },
  { component: "ProteinUnflavored", handle: "whey-protein-shake-unflavored", title: "Unflavored Whey Protein Isolate · 1 lb", size: "1lb", flavor: "Unflavored", formula: "isolate" },
  { component: "ProteinCappuccino", handle: "100-isolate-whey-protein-shake-cappuccino", title: "Cappuccino Whey Protein Isolate · 1 lb", size: "1lb", flavor: "Cappuccino", formula: "isolate" },
  { component: "ProteinCaramelBlend", handle: "whey-protein-salted-caramel-shake", title: "Salted Caramel Whey Protein Blend · 2 lb", size: "2lb", flavor: "Caramel", formula: "blend" },
  { component: "ProteinVanillaBlend", handle: "vanilla-whey-protein-shake", title: "Vanilla Whey Protein Blend · 2 lb", size: "2lb", flavor: "Vanilla", formula: "blend" },
  { component: "ProteinChocolateBlend", handle: "grass-fed-whey-chocolate-protein-shake", title: "Chocolate Whey Protein Blend · 2 lb", size: "2lb", flavor: "Chocolate", formula: "blend" },
] as const;

export const electrolytes = [
  { component: "ElectrolyteLemonLime", handle: "supplements-lemon-lime-electrolyte-powder", title: "Lemon Lime Electrolyte Powder", size: "30 servings", flavor: "Lemon Lime", formula: "electrolyte" },
] as const;
export const vegan = [
  { component: "VeganChocolate", handle: "chocolate-vegan-shake", title: "Chocolate Vegan Protein · 2 lb", size: "2lb", flavor: "Chocolate", formula: "vegan" },
  { component: "VeganVanilla", handle: "vanilla-vegan-shake", title: "Vanilla Vegan Protein · 2 lb", size: "2lb", flavor: "Vanilla", formula: "vegan" },
] as const;
export const veganCollectionClaims = [
  "Non-GMO", "Certified Gluten-Free",
];
export const veganProductClaims = [
  "Certified Gluten-Free", "Non-GMO",
  "Vegan", "Sweetened with Stevia", "Tested for Heavy Metals",
];
export type Product = (typeof whey)[number] | (typeof electrolytes)[number] | (typeof vegan)[number];
export function collectionRepresentatives(products: readonly Product[]) {
  const preferred = products.every(product => product.formula === "isolate") ? "1lb" : "2lb";
  const groups = new Map<string, Product>();
  for (const product of products) {
    const key = product.formula === "isolate" || product.formula === "blend" ? `${product.formula}:${product.flavor}` : product.component;
    if (!groups.has(key) || product.size === preferred) groups.set(key, product);
  }
  return [...groups.values()];
}
export type Family = "whey" | "electrolyte" | "vegan";
export const filters = {
  whey: [
    { name: "All whey", query: "", products: [...whey] },
    { name: "Whey Protein Isolate", query: "&formula=isolate", products: whey.filter(p => p.formula === "isolate") },
    { name: "Whey Protein Blend", query: "&formula=blend", products: whey.filter(p => p.formula === "blend") },
  ],
  electrolyte: [
    { name: "All electrolytes", query: "", products: [...electrolytes] },
  ],
  vegan: [
    { name: "All vegan protein", query: "", products: [...vegan] },
  ],
};
export type Filter = (typeof filters)[Family][number];

export const wheyClaimLabels = [
  "Non-GMO", "Certified Gluten-Free", lowFodmap, "rBGH-Free Whey", "No Added Sugars",
];
export function reviewPath(family: Family, filter: Filter) {
  const category = family === "whey" ? "100-isolate-whey-protein"
    : family === "vegan" ? "vegan-plant-protein" : "electrolyte";
  return `/?category=${category}${filter.query}`;
}

export function frontFilename(product: Product) {
  if (product.component.endsWith("Isolate1lb")) return `${product.flavor.toLowerCase()}-isolate-1lb-mockup.webp`;
  if (product.component === "ProteinCappuccino") return `${product.handle}-front-verified.png`;
  if (product.component === "ProteinVanillaIsolate" || product.component === "ProteinChocolateIsolate") {
    return `${product.handle}-0-black-bottle-clean-rim.png`;
  }
  return `${product.handle}-0.png`;
}

// Deliberately literal expectations: never import the production parser or
// compute the expected selection with URLSearchParams. Duplicates use the first
// value (including an invalid/empty first value), decoding happens exactly once,
// and only whey formula participates in selection. Electrolytes always show
// Lemon Lime with the All electrolytes tab, including retired flavor URLs.
export const queryCases: Record<Exclude<Family, "vegan">, QueryCase[]> = {
  whey: [
    { name: "unknown formula", query: "&formula=unknown", expected: filters.whey[0] },
    { name: "empty formula", query: "&formula=", expected: filters.whey[0] },
    { name: "bare formula", query: "&formula", expected: filters.whey[0] },
    { name: "duplicate isolate first", query: "&formula=isolate&formula=blend", expected: filters.whey[1] },
    { name: "duplicate blend first", query: "&formula=blend&formula=isolate", expected: filters.whey[2] },
    { name: "duplicate invalid first", query: "&formula=unknown&formula=isolate", expected: filters.whey[0] },
    { name: "duplicate empty first", query: "&formula=&formula=isolate", expected: filters.whey[0] },
    { name: "duplicate invalid second", query: "&formula=isolate&formula=unknown", expected: filters.whey[1] },
    { name: "encoded isolate", query: "&formula=%69solate", expected: filters.whey[1] },
    { name: "encoded blend and key", query: "&%66ormula=%62lend", expected: filters.whey[2] },
    { name: "encoded duplicate key", query: "&%66ormula=blend&formula=isolate", expected: filters.whey[2] },
    { name: "double encoded formula", query: "&formula=%2569solate", expected: filters.whey[0] },
    { name: "encoded space", query: "&formula=%20isolate", expected: filters.whey[0] },
    { name: "plus is not trimmed", query: "&formula=isolate+", expected: filters.whey[0] },
    { name: "malformed encoding", query: "&formula=%ZZ", expected: filters.whey[0] },
    { name: "wrong-family value", query: "&formula=lemon-lime", expected: filters.whey[0] },
    { name: "wrong-family key", query: "&flavor=strawberry", expected: filters.whey[0] },
    { name: "both keys isolate", query: "&flavor=strawberry&formula=isolate", expected: filters.whey[1] },
    { name: "both keys blend", query: "&formula=blend&flavor=lemon-lime", expected: filters.whey[2] },
    { name: "invalid formula with valid flavor", query: "&formula=unknown&flavor=lemon-lime", expected: filters.whey[0] },
  ],
  electrolyte: [
    { name: "legacy Lemon Lime", query: "&flavor=lemon-lime", expected: filters.electrolyte[0] },
    { name: "retired Strawberry", query: "&flavor=strawberry", expected: filters.electrolyte[0] },
    { name: "unknown flavor", query: "&flavor=unknown", expected: filters.electrolyte[0] },
    { name: "empty flavor", query: "&flavor=", expected: filters.electrolyte[0] },
    { name: "bare flavor", query: "&flavor", expected: filters.electrolyte[0] },
    { name: "duplicate Lemon Lime first", query: "&flavor=lemon-lime&flavor=strawberry", expected: filters.electrolyte[0] },
    { name: "duplicate Strawberry first", query: "&flavor=strawberry&flavor=lemon-lime", expected: filters.electrolyte[0] },
    { name: "duplicate invalid first", query: "&flavor=unknown&flavor=lemon-lime", expected: filters.electrolyte[0] },
    { name: "duplicate empty first", query: "&flavor=&flavor=lemon-lime", expected: filters.electrolyte[0] },
    { name: "duplicate invalid second", query: "&flavor=strawberry&flavor=unknown", expected: filters.electrolyte[0] },
    { name: "encoded Lemon Lime", query: "&flavor=lemon%2Dlime", expected: filters.electrolyte[0] },
    { name: "encoded Strawberry and key", query: "&%66lavor=%73trawberry", expected: filters.electrolyte[0] },
    { name: "encoded duplicate key", query: "&%66lavor=strawberry&flavor=lemon-lime", expected: filters.electrolyte[0] },
    { name: "double encoded flavor", query: "&flavor=lemon%252Dlime", expected: filters.electrolyte[0] },
    { name: "encoded space", query: "&flavor=%20lemon-lime", expected: filters.electrolyte[0] },
    { name: "plus is not a hyphen", query: "&flavor=lemon+lime", expected: filters.electrolyte[0] },
    { name: "malformed encoding", query: "&flavor=%ZZ", expected: filters.electrolyte[0] },
    { name: "wrong-family value", query: "&flavor=isolate", expected: filters.electrolyte[0] },
    { name: "wrong-family key", query: "&formula=isolate", expected: filters.electrolyte[0] },
    { name: "both keys Lemon Lime", query: "&formula=blend&flavor=lemon-lime", expected: filters.electrolyte[0] },
    { name: "both keys Strawberry", query: "&flavor=strawberry&formula=isolate", expected: filters.electrolyte[0] },
    { name: "invalid flavor with valid formula", query: "&flavor=unknown&formula=isolate", expected: filters.electrolyte[0] },
  ],
};

type QueryCase = { name: string; query: string; expected: Filter };

// Literal per-serving facts, independent of production nutrition helpers.
export const expectedCardNutrition: Record<string, string[]> = {
  ProteinVanillaIsolate: ["120", "26g", "1g", "1g"],
  ProteinChocolateIsolate: ["110", "25g", "2g", "1g"],
  ProteinVanillaIsolate1lb: ["110", "25g", "1g", "0g"],
  ProteinChocolateIsolate1lb: ["110", "25g", "1g", "<1g"],
  ProteinMixedBerry: ["110", "25g", "1g", "0g"],
  ProteinCappuccino: ["110", "25g", "2g", "0g"],
  ProteinUnflavored: ["110", "25g", "<1g", "0g"],
  ProteinVanillaBlend: ["130", "24g", "3g", "2g"],
  ProteinChocolateBlend: ["130", "24g", "4g", "2g"],
  ProteinCaramelBlend: ["130", "24g", "3g", "2g"],
  VeganVanilla: ["130", "20g", "6g", "3g"],
  VeganChocolate: ["130", "20g", "6g", "2g"],
  ElectrolyteLemonLime: ["5", "280mg", "51mg", "47mg", "80mg"],
  ProteinClassicChocolate: ["24g", "130", "4g", "2g"],
  ProteinClassicVanilla: ["24g", "130", "4g", "2g"],
  ProteinClassicCookiesCream: ["24g", "130", "4g", "2g"],
};

export function detailHeading(product: Product) {
  return product.formula === "isolate" ? `${product.flavor} Whey Protein Isolate`
    : product.formula === "blend" ? `${product.flavor} Whey Protein Blend`
    : product.title;
}

export const suppliedLabels: Record<string, { slug: string; name: string; fullSlug?: string; barcodeUpdated?: boolean }> = {
  ElectrolyteLemonLime: { slug: "lemon-lime-electrolytes", name: "Lemon Lime electrolytes", fullSlug: "lemon-lime-electrolytes-updated-upc", barcodeUpdated: true },
  ProteinChocolateIsolate1lb: { slug: "chocolate-whey-isolate-1lb", name: "Chocolate whey isolate, 1 lb label views" },
  ProteinVanillaIsolate1lb: { slug: "vanilla-whey-isolate-1lb", name: "Vanilla whey isolate, 1 lb label views" },
  ProteinChocolateIsolate: { slug: "chocolate-whey-isolate-2lb", name: "Chocolate whey isolate, 2 lb" },
  ProteinVanillaIsolate: { slug: "vanilla-whey-isolate-2lb", name: "Vanilla whey isolate, 2 lb" },
  ProteinMixedBerry: { slug: "berry-whey-isolate-1lb", name: "Berry whey isolate, 1 lb" },
  ProteinUnflavored: { slug: "unflavored-whey-isolate-1lb", name: "Unflavored whey isolate, 1 lb" },
  ProteinCappuccino: { slug: "cappuccino-whey-isolate-1lb", name: "Cappuccino whey isolate, 1 lb" },
  ProteinCaramelBlend: { slug: "salted-caramel-whey-blend-2lb", name: "Salted Caramel whey blend, 2 lb" },
  ProteinVanillaBlend: { slug: "vanilla-whey-blend-2lb", name: "Vanilla whey blend, 2 lb" },
  ProteinChocolateBlend: { slug: "chocolate-whey-blend-2lb", name: "Chocolate whey blend, 2 lb" },
  VeganChocolate: { slug: "chocolate-vegan-2lb", name: "Chocolate vegan protein, 2 lb" },
  VeganVanilla: { slug: "vanilla-vegan-2lb", name: "Vanilla vegan protein, 2 lb" },
};
