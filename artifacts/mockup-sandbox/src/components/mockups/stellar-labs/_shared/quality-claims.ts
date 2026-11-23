/** Merchant confirmed all products passed heavy-metal testing. */
export const heavyMetalsTestingClaim = "Tested for Heavy Metals";

/** Only genuinely universal claims from the merchant-approved outline. */
export const commonProductQuality = [
  "Non-GMO",
];

export const supplementQuality = [
  ...commonProductQuality,
  "Certified Gluten-Free",
];

export const supplementCollectionQuality = [
  ...commonProductQuality,
  "Certified Gluten-Free",
  "Easy-to-Digest Ingredients",
];
export const proteinQuality = ["Certified Gluten-Free", ...commonProductQuality, "Easy-to-Digest Ingredients", "No Added Sugars"];
export const electrolyteQuality = ["Certified Gluten-Free", ...commonProductQuality, "Vegan", "No Added Sugars"];
