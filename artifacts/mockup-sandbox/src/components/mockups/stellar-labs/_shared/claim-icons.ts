export type ClaimIcon = "gluten-free" | "corn" | "stomach" | "leaf" | "testing" | "sugar" | "milk" | "hydration" | "check";

/** Match the approved homepage artwork, by meaning rather than strip position. */
export const stomachArtwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#32c0cb" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4v7c0 3 2 5 5 5 2 0 3-2 3-4 0-3 2-4 4-2 3 3 4 9 1 13-3 5-10 6-14 3l-3-3c-2-2-4-1-4 2v3"/><path d="M17 4v6c0 1 1 2 2 2M13 26c-3-3-5-4-8-2"/></svg>`;

export function claimIcon(statement: string): ClaimIcon {
  if (/^All Major Electrolytes$/i.test(statement)) return "hydration";
  if (/certified gluten/i.test(statement)) return "gluten-free";
  if (/^Non-GMO$/i.test(statement)) return "corn";
  if (/^Easy-to-Digest Ingredients/i.test(statement)) return "stomach";
  if (/^(Vegan|Vegetarian|Sweetened with Stevia)/i.test(statement)) return "leaf";
  if (/tested for/i.test(statement)) return "testing";
  if (/^(No Added Sugars?|Sugar-Free)$/i.test(statement)) return "sugar";
  // rBGH-free whey still contains milk: never imply a dairy exclusion.
  if (/^rBGH-Free/i.test(statement)) return "milk";
  return "check";
}
