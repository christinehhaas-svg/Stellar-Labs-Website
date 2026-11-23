/** Presentation order only: preserve every existing item and its exact value. */
function nutritionRank(label: string) {
  const normalized = label.trim().toLowerCase();
  if (/^calories\b/.test(normalized)) return 0;
  if (/^protein\b/.test(normalized)) return 1;
  if (/^(?:total )?carb(?:s|ohydrates?)?\b/.test(normalized)) return 2;
  if (/^(?:(?:total|natural|naturally occurring|added) )?sugars?\b/.test(normalized)) return 3;
  return 4;
}

export function orderNutrition<T extends { label: string }>(items: readonly T[]): T[] {
  return placeSodiumAfterMagnesium([...items].sort((a, b) => nutritionRank(a.label) - nutritionRank(b.label)), item => item.label);
}

export function orderNutritionFacts(items: readonly string[]): string[] {
  return placeSodiumAfterMagnesium([...items].sort((a, b) => nutritionRank(a) - nutritionRank(b)), item => item);
}

function placeSodiumAfterMagnesium<T>(items: T[], label: (item: T) => string): T[] {
  const sodium = items.findIndex(item => /^sodium\b/i.test(label(item).trim()));
  if (sodium < 0 || !items.some(item => /^magnesium\b/i.test(label(item).trim()))) return items;
  const [item] = items.splice(sodium, 1);
  const magnesium = items.findIndex(item => /^magnesium\b/i.test(label(item).trim()));
  items.splice(magnesium + 1, 0, item);
  return items;
}
