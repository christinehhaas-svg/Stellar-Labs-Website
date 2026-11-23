import { electrolyteCopy } from "./electrolyte-copy";
import { getPowderCopy } from "./powder-copy";
import proteinProducts from "./protein-products.json";
import veganProducts from "./vegan-products.json";
import electrolyteProducts from "./electrolyte-products.json";

export type NutritionDescription = {
  category: string;
  description: string;
  benefits: string[];
  use: string;
  facts: string[];
  notes: string;
  source: string;
};

const source = (handle: string) => `https://www.stellarlabsnutrition.com/products/${handle}`;
const proteinNotes = "Check the complete product label for ingredients, allergens, serving size, and nutrition information. Whey protein is milk-derived.";
const plantNotes = "Check the complete product label for ingredients, allergens, serving size, and nutrition information.";
const labelUse = "Prepare according to the directions on your product label. The online listing does not specify a scoop size or mixing quantity.";

function isolate(handle: string, flavor: string, size: string): NutritionDescription {
  return {
    category: "Whey Protein Isolate",
    description: flavor === "Unflavored"
      ? "An unflavored whey isolate powder for a simple way to add protein to your routine. An easy-to-mix, low-sugar formula."
      : `A ${flavor.toLowerCase()} whey isolate powder for everyday protein support. An easy-to-mix, low-sugar formula.`,
    benefits: ["100% whey isolate protein", "Low in sugar", "Easy-to-mix powder"],
    use: labelUse,
    facts: [`Flavor: ${flavor}`, `Container size: ${size}`, "Protein source: whey isolate", "See the product label for protein grams and nutrition facts."],
    notes: proteinNotes,
    source: source(handle),
  };
}

function whey(handle: string, flavor: string, grams: number): NutritionDescription {
  const coldPressed = flavor !== "Salted Caramel";
  return {
    category: "Whey Protein Blend",
    description: `${flavor} Whey Protein Blend combines whey concentrate and isolate. Sweetened with stevia.`,
    benefits: [`${grams}g of protein per serving`, "Sweetened with stevia", "No blender required"],
    use: flavor === "Salted Caramel"
      ? "Mix one rounded scoop with 6–8 ounces of water, milk, or your favorite non-dairy beverage. Adjust the liquid to taste."
      : "Mix one rounded scoop with 6–8 ounces of water or milk. Adjust the liquid to taste.",
    facts: [`Flavor: ${flavor}`, "Container size: 2lb", `Protein: ${grams}g per serving`, ...(coldPressed ? ["Cold-pressed whey; described in the listing as low-lactose and gluten-free."] : [])],
    notes: coldPressed ? `${proteinNotes} Low-lactose does not mean lactose-free.` : proteinNotes,
    source: source(handle),
  };
}

function vegan(handle: string, flavor: string): NutritionDescription {
  return {
    category: "Vegan Protein",
    description: `${flavor} Vegan Protein: 20g of plant protein per serving, made with pea, brown rice, and quinoa proteins and sweetened with stevia.`,
    benefits: ["20g of plant protein per serving", "Vegan formula", "No artificial flavors, colors, or preservatives", "No blender required"],
    use: "Mix with liquid in a shaker, blender, or a glass with a spoon. Follow the product label for scoop size and liquid quantity.",
    facts: [`Flavor: ${flavor}`, "Container size: 2lb", "Protein: 20g per serving", "The listing includes raw sugar and stevia; this is not a sugar-free claim."],
    notes: plantNotes,
    source: source(handle),
  };
}

function electrolytes(handle: string, flavor: string): NutritionDescription {
  const copy = electrolyteCopy[flavor === "Lemon Lime" ? "ElectrolyteLemonLime" : "ElectrolyteStrawberry"];
  return {
    category: "Electrolyte Hydration",
    description: copy.description,
    benefits: copy.benefits,
    use: copy.suggestedUse,
    facts: [`Flavor: ${flavor}`, "Serving preparation: one scoop in 12–16 ounces of water", "See the product label for serving weight, electrolyte amounts, and nutrition facts."],
    notes: copy.allergens.join(" "),
    source: source(handle),
  };
}

/** Description drafts based on the merchant's individual public product listings.
 *  Unconfirmed quantities and clinical claims are intentionally not inferred.
 */
export const nutritionDescriptions: Record<string, NutritionDescription> = {
  "100-isolate-whey-protein-shake-chocolate-1lb": isolate("100-isolate-whey-protein-shake-chocolate-1lb", "Chocolate", "1lb"),
  "100-isolate-whey-protein-shake-vanilla-1lb": isolate("100-isolate-whey-protein-shake-vanilla-1lb", "Vanilla", "1lb"),
  "whey-protein-shake-unflavored": isolate("whey-protein-shake-unflavored", "Unflavored", "1lb"),
  "100-isolate-whey-protein-shake-vanilla": isolate("100-isolate-whey-protein-shake-vanilla", "Vanilla", "2lb"),
  "100-isolate-whey-protein-shake-chocolate": isolate("100-isolate-whey-protein-shake-chocolate", "Chocolate", "2lb"),
  "100-isolate-whey-protein-shake-cappuccino": isolate("100-isolate-whey-protein-shake-cappuccino", "Cappuccino", "1lb"),
  "100-isolate-whey-protein-shake-mixed-berry": isolate("100-isolate-whey-protein-shake-mixed-berry", "Mixed Berry", "1lb"),
  "vanilla-whey-protein-shake": whey("vanilla-whey-protein-shake", "Vanilla", 25),
  "grass-fed-whey-chocolate-protein-shake": whey("grass-fed-whey-chocolate-protein-shake", "Chocolate", 24),
  "whey-protein-salted-caramel-shake": whey("whey-protein-salted-caramel-shake", "Salted Caramel", 24),
  "chocolate-vegan-shake": vegan("chocolate-vegan-shake", "Chocolate"),
  "vanilla-vegan-shake": vegan("vanilla-vegan-shake", "Vanilla"),
  "supplements-lemon-lime-electrolyte-powder": electrolytes("supplements-lemon-lime-electrolyte-powder", "Lemon Lime"),
  "strawberry-electrolyte-powder": electrolytes("strawberry-electrolyte-powder", "Strawberry"),
};

// Keep the homepage summaries in sync with the formatted product pages and
// current labels, rather than older public-listing quantities.
for (const product of [...proteinProducts, ...veganProducts, ...electrolyteProducts]) {
  const copy = getPowderCopy(product);
  const entry = nutritionDescriptions[product.handle];
  if (!entry) throw new Error(`Missing homepage summary for ${product.handle}`);
  Object.assign(entry, {
    description: copy.description,
    benefits: copy.benefits,
    use: copy.suggestedUse,
    facts: copy.facts,
    notes: [copy.sourceNote, ...copy.warnings].filter(Boolean).join(" "),
  });
}

nutritionDescriptions["coming-soon-vanilla-vegan-shake-hidden"] = nutritionDescriptions["vanilla-vegan-shake"];
nutritionDescriptions["coming-soon-chocolate-vegan-shake-hidden"] = nutritionDescriptions["chocolate-vegan-shake"];