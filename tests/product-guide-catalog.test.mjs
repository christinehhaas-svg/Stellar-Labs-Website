import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const root = path.resolve("artifacts/stellar-review/src/pages/stellar/_shared");
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  // Only URL-prefix handling is browser-dependent; it does not supply guide facts.
  if (file.endsWith("/review-links.ts")) return { reviewAsset: value => value };
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, { exports, require(specifier) {
    if (!specifier.startsWith(".")) return createRequire(file)(specifier);
    const base = path.resolve(path.dirname(file), specifier);
    return load([base, `${base}.ts`, `${base}.tsx`].find(candidate => fs.existsSync(candidate)));
  } }, { filename: file });
  return exports;
}
const { productGuideCatalog: guide, guideSpecificWarnings } = load(path.join(root, "product-guide-catalog.ts"));
const { collectionClaimNote, milkDisclaimer, powderNutritionDisclaimer } = load(path.join(root, "outline-copy.ts"));
const { powderDisclaimer } = load(path.join(root, "powder-copy.ts"));

test("current website copy follows product-specific claim restrictions", () => {
  const { getPowderCopy } = load(path.join(root, "powder-copy.ts"));
  const { outlineProducts } = load(path.join(root, "outline-copy.ts"));
  for (const product of outlineProducts) {
    assert.doesNotMatch(JSON.stringify(product.quality), /fodmap|^rBGH-Free$/i);
    assert.doesNotMatch(JSON.stringify(product.warnings), /fodmap/i);
  }
  for (const name of ["protein-products", "vegan-products", "electrolyte-products"]) {
    for (const product of load(path.join(root, `${name}.json`)).filter(product => !product.discontinued)) {
      const copy = getPowderCopy(product);
      assert.doesNotMatch(JSON.stringify(copy), /fodmap|low sodium|less sodium|reduced sodium/i, product.component);
      if (product.formula === "blend") {
        assert.match(copy.description, /Natural Whey Protein Blend/);
        assert.match(copy.description, /Sweetened with stevia/);
        assert.doesNotMatch(JSON.stringify(copy), /artificial (?:flavors|colors|sweeteners)/i);
      }
      if (product.formula === "vegan") {
        assert.match(copy.description, /20g of plant protein per serving, made with pea, brown rice, and quinoa proteins and sweetened with stevia/);
        assert.ok(!copy.quality.some(claim => /No Added Sugar|Easy-to-Digest/i.test(claim)));
      }
    }
  }
});

test("recipe text is corrected without breaking legacy routes or changing nutrition", () => {
  const { recipes } = load(path.join(root, "recipe-copy.ts"));
  const original = load(path.join(root, "recipes.json"));
  assert.deepEqual(Array.from(recipes, recipe => recipe.slug), original.map(recipe => recipe.slug));
  for (const recipe of recipes) {
    assert.doesNotMatch(recipe.title + recipe.bodyHtml, /fodmap|guilt-free|healthy enough for breakfast|just 2g of sugar|no bloat|sustainable energy|all natural|while on a diet|Tumeric|Coconut Xtract|fiber6|3-5 ice cubes, 3-5 cubes/i);
    const old = original.find(item => item.slug === recipe.slug);
    // Ingredient quantities, nutrition amounts, images and links are retained.
    assert.equal(recipe.image, old.image);
    assert.equal(recipe.sourceUrl, old.sourceUrl);
    const amounts = text => [...text.matchAll(/\d+(?:[.,]\d+)?\s*(?:calories|g\b|mg\b)/gi)].map(match => match[0]);
    const nutrition = text => text.slice(text.indexOf("Nutrition Information"));
    assert.deepEqual(amounts(nutrition(recipe.bodyHtml)), amounts(nutrition(old.bodyHtml)));
  }
  assert.equal(recipes.find(recipe => recipe.slug === "vegan-vanilla-anti-inflammatory-protein-shake").title,
    "Vegan Vanilla Ginger-Turmeric Protein Shake");
  assert.ok(recipes.some(recipe => recipe.slug === "low-fodmap-strawberry-banana-vanilla-smoothie"));
});

test("vanilla vegan retains the confirmed 6g carbs without changing chocolate", () => {
  const { powderNutritionMetrics } = load(path.join(root, "ProductCardNutrition.tsx"));
  const carbs = component => powderNutritionMetrics(component).metrics.find(metric => metric.label === "Carbs").value;
  assert.equal(carbs("VeganVanilla"), "6g");
  assert.equal(carbs("VeganChocolate"), "6g");
  const canvas = fs.readFileSync("artifacts/mockup-sandbox/src/components/mockups/stellar-labs/PowderCollectionPage.tsx", "utf8");
  assert.match(canvas, /import \{ ProductCardNutrition \} from "[^"]*stellar-review\/src\/pages\/stellar\/_shared\/ProductCardNutrition"/);
  const vanilla = guide.vegan.find(product => /Vanilla/i.test(product.name));
  assert.equal(vanilla.metrics.find(metric => metric.label === "Carbs").value, "6g");
});

test("guide qualifications are shared once without removing actual product warnings", () => {
  const specific = ["Contains milk and soy.", "Keep out of reach of children."];
  assert.deepEqual(Array.from(guideSpecificWarnings([
    collectionClaimNote, milkDisclaimer, powderNutritionDisclaimer, powderDisclaimer,
    `†${collectionClaimNote.slice(1)} This product is not certified low-FODMAP.`,
    ...specific, ...specific,
  ])), specific);
  for (const product of Object.values(guide).flat()) {
    const filtered = guideSpecificWarnings(product.warnings);
    for (const warning of product.warnings.filter(text => /allerg|contains |pregnan|nurs|children/i.test(text))) {
      assert.ok(filtered.includes(warning), `${product.name}: ${warning}`);
    }
  }
});

test("every included product has its own approved claim list without retired FODMAP copy", () => {
  for (const product of Object.values(guide).flat()) {
    assert.ok(product.quality.length > 0, product.name);
    assert.ok(!product.quality.some(claim => /^GLP-?1 Friendly/i.test(claim)));
    assert.ok(!product.quality.includes("Certified Gluten-Free*"));
    assert.doesNotMatch(JSON.stringify(product), /fodmap/i);
  }
  assert.ok(guide.isolate.every(product => product.quality.includes("Non-GMO")));
  assert.ok(guide.vegan.every(product => !product.quality.some(claim => /rBGH/i.test(claim))));
});

test("the guide includes current packages except the explicitly deferred Classic line", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(guide).map(([family, products]) => [family, products.length])),
    { supplements: 7, isolate: 7, blend: 3, vegan: 2, electrolyte: 1 });
  const products = Object.values(guide).flat();
  assert.equal(new Set(products.map(product => product.href)).size, 20);
  assert.ok(products.every(product => product.serving && product.facts && product.name));
  assert.ok(products.every(product => !/night.?time|Strawberry|Classic/i.test(product.name)));
});

test("all seven isolate packages expose the same highlighted metrics as the category cards", () => {
  for (const product of guide.isolate) {
    assert.deepEqual(Array.from(product.metrics, metric => metric.label), ["Protein", "Calories", "Carbs", "Sugar"]);
  }
  const vanilla = guide.isolate.find(product => product.name.includes("Vanilla · 1 lb"));
  const chocolate = guide.isolate.find(product => product.name.includes("Chocolate · 1 lb"));
  assert.deepEqual(Array.from(vanilla.metrics, metric => metric.value), ["25g", "110", "1g", "0g"]);
  assert.deepEqual(Array.from(chocolate.metrics, metric => metric.value), ["25g", "110", "1g", "<1g"]);
  assert.equal(vanilla.serving, "Per 29 g serving · 16 servings per container");
  const large = guide.isolate.find(product => product.name.includes("Vanilla · 2 lb"));
  assert.deepEqual(Array.from(large.metrics, metric => metric.value), ["26g", "120", "1g", "1g"]);
});

test("Natural blends identify naturally occurring sugar without changing the amounts or other categories", () => {
  for (const product of guide.blend) {
    const sugar = product.metrics.at(-1);
    assert.equal(sugar.label, "Natural sugar");
    assert.equal(sugar.value, "2g");
  }
  for (const product of [...guide.isolate, ...guide.vegan]) {
    assert.equal(product.metrics.at(-1).label, "Sugar");
  }
});

test("category-specific values remain correct and Classic is temporarily withdrawn everywhere", () => {
  assert.deepEqual(Array.from(guide.electrolyte[0].metrics, metric => metric.value), ["280mg", "51mg", "47mg", "80mg", "5"]);
  assert.deepEqual(Array.from(guide.vegan, product => product.metrics[0].value), ["20g", "20g"]);
  const classic = guide.blend.filter(product => product.name.includes("Classic"));
  assert.equal(classic.length, 0);
  const { classicWheyProducts } = load(path.join(root, "classic-whey-products.ts"));
  assert.equal(classicWheyProducts.length, 0);
});
