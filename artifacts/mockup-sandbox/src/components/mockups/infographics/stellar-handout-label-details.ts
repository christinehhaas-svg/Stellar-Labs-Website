// Handout-only transcriptions of the label artwork already displayed on the
// website. Keep package-specific UPCs distinct, even when formulas are shared.
export type HandoutLabelDetails = {
  upc: string;
  upcNote?: string;
  ingredients: { heading: string; text: string }[];
};

const vanillaIsolate = "Whey protein isolate, natural & artificial flavor, xanthan gum, sucralose, digestive enzyme blend (protease, papain), BCAA blend (leucine, isoleucine, valine).";
const chocolateIsolate = "Whey protein isolate, Dutch cocoa powder, natural & artificial flavor, xanthan gum, sucralose, digestive enzyme blend (protease, papain), BCAA blend (leucine, isoleucine, valine).";
const veganFormula = "Vpro Vegan Blend (pea protein isolate, brown rice powder, quinoa); sunflower oil powder 50%; MCT oil (medium chain triglycerides); Berry Blend (pomegranate fruit, raspberry, blueberry juice, maqui berry, acai berry, goji berry, orange juice, organic beets).";
const multiVitamins = "Vitamin A (beta-carotene), vitamin C (ascorbic acid), vitamin D (cholecalciferol), vitamin E (DL-alpha tocopheryl acetate), thiamin (thiamine mononitrate), riboflavin (B2), niacin, vitamin B6 (pyridoxine HCl), folate (folic acid), vitamin B12 (cyanocobalamin), biotin, pantothenic acid (D-calcium pantothenate), calcium (calcium carbonate), magnesium (magnesium oxide), zinc (zinc oxide), selenium (selenium amino acid chelate), copper (copper gluconate), manganese (manganese amino acid chelate), chromium (chromium picolinate), molybdenum.";
const antioxidantBlend = "Antioxidant Fruit & Energy Blend: green tea extract (leaf), Chinese hawthorn powder (fruit), cassia cinnamon (bark), bilberry extract (fruit), grape seed extract, black currant extract (fruit), pomegranate extract (fruit).";
const multiOther = "Rice flour, hypromellose (vegetable capsule), magnesium stearate, silicon dioxide.";
const ingredient = (text: string) => ({ heading: "Ingredients (as listed on the label)", text });
const formula = (text: string) => ({ heading: "Formula ingredients (Supplement Facts)", text });
const other = (text: string) => ({ heading: "Other ingredients", text });

export const handoutLabelDetails: Record<string, HandoutLabelDetails> = {
  ProteinChocolateIsolate1lb: { upc: "859312006114", ingredients: [ingredient(chocolateIsolate)] },
  ProteinVanillaIsolate1lb: { upc: "859312006046", ingredients: [ingredient(vanillaIsolate)] },
  ProteinVanillaIsolate: { upc: "859312006404", ingredients: [ingredient(vanillaIsolate)] },
  ProteinChocolateIsolate: { upc: "859312006411", ingredients: [ingredient(chocolateIsolate)] },
  ProteinMixedBerry: {
    upc: "859312006435",
    ingredients: [ingredient("Whey protein isolate, citric acid, natural flavors, xanthan gum, sucralose, silica, BCAA blend (leucine, isoleucine, valine), digestive enzyme blend (protease, papain).")],
  },
  ProteinUnflavored: {
    upc: "859312006145",
    upcNote: "This number is crossed out on the website's supplied label. Current UPC requires confirmation.",
    ingredients: [ingredient("Whey protein isolate, BCAA blend (leucine, isoleucine, valine), digestive enzyme blend (protease, papain).")],
  },
  ProteinCappuccino: {
    upc: "859312006442",
    ingredients: [ingredient("Whey protein isolate, instant coffee, natural & artificial flavor, xanthan gum, sucralose, BCAA blend (leucine, isoleucine, valine), digestive enzyme blend (protease, papain).")],
  },
  ProteinCaramelBlend: {
    upc: "859312006367",
    ingredients: [ingredient("Protein blend (whey protein concentrate, whey protein isolate), natural flavors, sodium chloride, stevia, digestive enzyme blend (protease, papain).")],
  },
  ProteinVanillaBlend: {
    upc: "859312006145",
    ingredients: [ingredient("Protein blend (whey protein concentrate, whey protein isolate), natural flavor, stevia, digestive enzyme blend (protease, papain).")],
  },
  ProteinChocolateBlend: {
    upc: "859312006138",
    ingredients: [ingredient("Protein blend (whey protein concentrate, whey protein isolate), Dutch cocoa powder, natural flavors, stevia, digestive enzyme blend (protease, papain).")],
  },
  VeganChocolate: {
    upc: "859312006152",
    ingredients: [formula(veganFormula), other("Organic sucrose, natural flavors, cocoa, stevia, xanthan gum.")],
  },
  VeganVanilla: {
    upc: "859312006169",
    ingredients: [formula(veganFormula), other("Organic sucrose, natural flavors, stevia.")],
  },
  ElectrolyteLemonLime: {
    upc: "859312006374",
    ingredients: [
      formula("Calcium; magnesium (as magnesium aspartate); sodium (as pink Himalayan salt); potassium (as potassium citrate)."),
      other("Natural flavors, (soluble corn fiber) Fibersol-2, citric acid, malic acid, silicon dioxide, stevia."),
    ],
  },
  "womens-multi": {
    upc: "859312006237",
    ingredients: [
      formula(multiVitamins),
      formula("Female Support Blend: Chinese yam extract (root), red clover extract (aerial), lutein (flower), cranberry extract (fruit), alpha lipoic acid (ALA), lycopene (fruit). Immune Support Blend: goldenseal (root), echinacea purpurea extract (aerial), spirulina powder (whole plant), garlic (bulb). " + antioxidantBlend),
      other(multiOther),
    ],
  },
  "mens-multivitamin": {
    upc: "859312006244",
    ingredients: [
      formula(multiVitamins),
      formula("Male Support: lutein (flower), lycopene (fruit), stinging nettle extract (root), saw palmetto (fruit). Immune Support: echinacea purpurea extract (aerial), beta glucan (Saccharomyces cerevisiae), spirulina powder (whole plant), garlic (bulb). " + antioxidantBlend),
      other(multiOther),
    ],
  },
  "probiotic-40": {
    upc: "859312006268",
    ingredients: [
      formula("Proprietary Blend of Probiotic Bacteria, MAKTREK® (Bi-Pass Technology): Lactobacillus acidophilus (La-14), Bifidobacterium lactis (Bl-04), Lactobacillus plantarum (Lp-115), Lactobacillus paracasei (Lpc-37). Complex Marine Polysaccharide; fructooligosaccharide."),
      other("Hypromellose (capsule), rice maltodextrin, L-leucine."),
    ],
  },
  "digestive-enzyme": {
    upc: "859312006022",
    ingredients: [
      formula("Makzyme-Pro™ Enzyme Blend: fungal protease from Aspergillus oryzae, Lactobacillus acidophilus, Lactobacillus casei, Lactobacillus plantarum, bromelain, papain, fungal lipase, fungal lactase, alpha galactosidase."),
      other("Hypromellose (vegetable capsule), vegetable magnesium stearate, silicon dioxide."),
    ],
  },
  "omega-3": {
    upc: "859312006251",
    ingredients: [
      formula("Fish oil, including omega-3 (EPA and DHA)."),
      other("Gelatin, glycerol, water, natural lemon flavor. May contain porcine. Contains fish (anchovy)."),
    ],
  },
  "magnesium-complex": {
    upc: "859312006077",
    ingredients: [
      formula("Magnesium hydroxide (Aquamin Mg®), magnesium malate, magnesium oxide, magnesium citrate, magnesium glycinate."),
      other("Hypromellose (capsule), rice flour, silicon dioxide."),
    ],
  },
  "turmeric-w-bioperine": {
    upc: "859312006008",
    ingredients: [
      formula("Organic turmeric (Curcuma longa) (root); turmeric 95% curcuminoids (Curcuma longa) (root); BioPerine® (black pepper extract) (Piper nigrum) (fruit)."),
      other("Hypromellose (capsule), magnesium stearate."),
    ],
  },
};

export function getHandoutLabelDetails(id: string): HandoutLabelDetails {
  const details = handoutLabelDetails[id];
  if (!details) throw new Error(`Missing handout ingredients and UPC for ${id}`);
  return details;
}
