/** Website marketing policy. Never apply this to labels, facts or ingredients. */
export const easyDigestIngredients = "Easy-to-Digest Ingredients";

export function websiteClaim(statement: string, digestiveCallout = false): string | null {
  if (/fodmap/i.test(statement)) return digestiveCallout ? easyDigestIngredients : null;
  if (/^Certified Gluten-Free[*†‡]*$/i.test(statement)) return "Certified Gluten-Free";
  if (/^rBGH-Free(?: Whey)?[*†‡]*$/i.test(statement)) return "rBGH-Free Whey";
  return statement;
}

export function websiteWarnings(warnings: string[]): string[] {
  return [...new Set(warnings.filter(warning => !/fodmap/i.test(warning)))];
}
