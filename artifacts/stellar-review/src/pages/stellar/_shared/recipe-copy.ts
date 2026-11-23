import sourceRecipes from "./recipes.json";

/** Keep published recipe URLs and source nutrition/ingredients intact. */
export const recipes = sourceRecipes.map(recipe => {
  let bodyHtml = recipe.bodyHtml
    .replaceAll("3-5 ice cubes, 3-5 cubes", "3-5 ice cubes")
    .replaceAll("Tumeric", "Turmeric")
    .replaceAll("Coconut Xtract", "Coconut Extract")
    .replaceAll("6 g fiber6 g fat", "6 g fiber · 6 g fat");
  if (recipe.slug === "stellar-labs-chocolate-raspberry-shake") {
    bodyHtml = bodyHtml.replace(/^This simple[\s\S]*?dessert\./,
      "A smooth, creamy chocolate raspberry shake made with almond milk, raspberries, cocoa, and vegan chocolate protein.");
  }
  if (recipe.slug === "stellar-labs-chocolate-almond-shake") {
    bodyHtml = bodyHtml.replaceAll("1G saturated fat", "1 g saturated fat");
    bodyHtml = bodyHtml.replace("A delicious, creamy, and smooth chocolate treat and easy to digest with no bloat afterwards.",
      "A delicious, creamy chocolate shake made with ingredients selected with digestive comfort in mind.");
  }
  if (recipe.slug === "peppermint-patty-holiday-shake") {
    bodyHtml = bodyHtml.replaceAll("1 Stellar Labs Chocolate Whey Protein Shake Pack",
      "1 scoop Stellar Labs Chocolate Whey Protein Powder.");
  }
  if (recipe.slug === "salted-caramel-crunch-protein-shake") {
    bodyHtml = bodyHtml.replace(/<p>Our salted caramel[\s\S]*?<\/p>/,
      "<p>Our salted caramel whey protein powder blends easily with water, milk, or almond milk for a smooth, flavorful protein shake.</p>");
  }
  return {
    ...recipe,
    title: recipe.slug === "vegan-vanilla-anti-inflammatory-protein-shake"
      ? "Vegan Vanilla Ginger-Turmeric Protein Shake" : recipe.title,
    bodyHtml,
  };
});

export default recipes;
