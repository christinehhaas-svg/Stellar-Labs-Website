/** Merchant-supplied, flavor- and package-matched label artwork. */
const base = "/__mockup/images/stellar-labels/";
export const uploadedPowderLabels: Record<string, { name: string; facts: string; full: string; pdf?: string; referenceNote?: string; upc?: string; barcodeUpdated?: boolean; photoViews?: boolean }> = {
  ElectrolyteLemonLime: {
    name: "Lemon Lime electrolytes",
    facts: `${base}lemon-lime-electrolytes-facts.png`,
    full: `${base}lemon-lime-electrolytes-updated-upc.png`,
    pdf: `${base}lemon-lime-electrolytes-updated-upc.pdf`,
    barcodeUpdated: true,
    upc: "859312006374",
  },
  ProteinChocolateIsolate1lb: photoLabel("Chocolate", "chocolate", "859312006114"),
  ProteinVanillaIsolate1lb: photoLabel("Vanilla", "vanilla", "859312006046"),
  ProteinChocolateBlend: label("Chocolate whey blend, 2 lb", "chocolate-whey-blend-2lb"),
  VeganChocolate: label("Chocolate vegan protein, 2 lb", "chocolate-vegan-2lb"),
  VeganVanilla: label("Vanilla vegan protein, 2 lb", "vanilla-vegan-2lb"),
  ProteinVanillaIsolate: label("Vanilla whey isolate, 2 lb", "vanilla-whey-isolate-2lb"),
  ProteinCaramelBlend: label("Salted Caramel whey blend, 2 lb", "salted-caramel-whey-blend-2lb"),
  ProteinVanillaBlend: label("Vanilla whey blend, 2 lb", "vanilla-whey-blend-2lb"),
  ProteinChocolateIsolate: label("Chocolate whey isolate, 2 lb", "chocolate-whey-isolate-2lb"),
  ProteinCappuccino: label("Cappuccino whey isolate, 1 lb", "cappuccino-whey-isolate-1lb"),
  ProteinMixedBerry: label("Berry whey isolate, 1 lb", "berry-whey-isolate-1lb"),
  ProteinUnflavored: label("Unflavored whey isolate, 1 lb", "unflavored-whey-isolate-1lb"),
};
function label(name: string, slug: string) {
  return { name, facts: `${base}${slug}-facts.png`, full: `${base}${slug}-label.png`, pdf: `${base}${slug}-label.pdf` };
}
function photoLabel(flavor: string, slug: string, upc: string) {
  return {
    ...label(`${flavor} whey isolate, 1 lb label views`, `${slug}-whey-isolate-1lb`),
    upc,
    barcodeUpdated: true,
    photoViews: true,
  };
}
