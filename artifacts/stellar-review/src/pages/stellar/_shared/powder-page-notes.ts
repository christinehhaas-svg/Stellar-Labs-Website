/** Keep claim qualifications relevant without repeating shared page footnotes. */
export function isolatePageWarnings(warnings: string[], quality: string[]): string[] {
  const hasMilkClaim = quality.some(claim => /rBGH|rbST/i.test(claim));
  const hasNoAddedSugarClaim = quality.some(claim => /no added sugars?/i.test(claim));
  return [...new Set(warnings.flatMap(warning => {
    if (/^[*†]?\s*(These statements have not been evaluated|Based on the labeled serving size)/i.test(warning)) return [];
    if (/^[‡]?\s*Whey products are made with milk from cows/i.test(warning)) {
      return hasMilkClaim ? [warning] : [];
    }
    if (/^Nutrition limits apply to powder/i.test(warning)) {
      return hasNoAddedSugarClaim ? ["No added sugars does not mean sugar-free."] : [];
    }
    return [warning];
  }))];
}
