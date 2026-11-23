import proteinProducts from "./pages/stellar/_shared/protein-products.json";
import electrolyteProducts from "./pages/stellar/_shared/electrolyte-products.json";
import veganProducts from "./pages/stellar/_shared/vegan-products.json";
import { recipes } from "./pages/stellar/_shared/recipe-copy";
import { classicWheyProducts } from "./pages/stellar/_shared/classic-whey-products";
import { powderDisplayName, wheyLines } from "./pages/stellar/_shared/whey-lines";

export type ReviewPage = { id: string; path: string; label: string; category: string };
export const reviewPages: ReviewPage[] = [
  { id: "home", path: "/", label: "Homepage", category: "Website" },
  { id: "compare", path: "/compare", label: "How does Stellar Labs compare?", category: "Website" },
  { id: "shop", path: "/shop", label: "Shop all products", category: "Website" },
  { id: "about", path: "/pages/about-us", label: "About Stellar Labs", category: "Website" },
  { id: "contact", path: "/pages/contact", label: "Contact Us", category: "Website" },
  { id: "faqs", path: "/pages/faqs", label: "Frequently Asked Questions", category: "Website" },
  { id: "faqs", path: "/faqs", label: "Frequently Asked Questions", category: "Website" },
  { id: "store-locator", path: "/pages/store-locator", label: "Store Locator", category: "Website" },
  { id: "shipping-policies", path: "/pages/shipping-information", label: "Shipping & Returns Policy", category: "Website" },
  { id: "recipes", path: "/recipes", label: "Recipes", category: "Recipes" },
  { id: "recipes", path: "/blogs/recipes", label: "Recipes", category: "Recipes" },
  ...recipes.flatMap(recipe => [
    { id: `recipe:${recipe.slug}`, path: `/recipes/${recipe.slug}`, label: recipe.title, category: "Recipes" },
    { id: `recipe:${recipe.slug}`, path: `/blogs/recipes/${recipe.slug}`, label: recipe.title, category: "Recipes" },
  ]),
  { id: "product-information", path: "/product-information", label: "PDF product information — all 20 products", category: "Website" },
  { id: "homepage-handoff", path: "/homepage-handoff", label: "Approved homepage handoff", category: "Website" },
  { id: "supplements", path: "/supplements", label: "All supplements", category: "Supplements" },
  { id: "supplement-details", path: "/supplement-details", label: "Supplement descriptions", category: "Supplements" },
  ...proteinProducts.map((product) => ({
    id: product.component, path: `/products/${product.handle}`, label: `${powderDisplayName(product.formula)} · ${product.flavor} · ${product.size}`, category: "Protein",
  })),
  ...classicWheyProducts.map(product => ({
    id: product.id, path: `/products/${product.handle}`, label: `${wheyLines.classic.name} · ${product.flavor}`, category: "Protein",
  })),
  ...veganProducts.map((product) => ({
    id: product.component, path: `/products/${product.handle}`, label: product.title, category: "Vegan",
  })),
  ...electrolyteProducts.filter((product) => !product.discontinued).map((product) => ({
    id: product.component, path: `/products/${product.handle}`, label: product.title, category: "Electrolytes",
  })),
];
