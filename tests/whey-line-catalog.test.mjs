import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const base = path.resolve("artifacts/stellar-review/src/pages/stellar/_shared");
const expectedIsolateBenefits = [
  "Dietary protein supplies amino acids that support muscle maintenance and recovery.*",
  "Provides all nine essential amino acids, including BCAAs.",
  "Convenient Everyday Nutrition",
  "Easy Mixing",
];
const requireApp = createRequire(path.resolve("artifacts/stellar-review/package.json"));
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = specifier => {
    if (!specifier.startsWith(".")) return requireApp(specifier);
    const candidate = path.resolve(path.dirname(filename), specifier);
    const resolved = ["", ".ts", ".tsx", ".json"].map(ext => candidate + ext).find(file => fs.existsSync(file));
    if (!resolved) throw new Error(`Unresolved import ${specifier}`);
    return resolved.endsWith(".json") ? JSON.parse(fs.readFileSync(resolved, "utf8")) : load(resolved);
  };
  new vm.Script(`(function(require,module,exports){${output}\n})`, { filename }).runInThisContext()(localRequire, module, module.exports);
  return module.exports;
}
const { classicReference, classicWheyProducts, archivedClassicWheyProducts } = load(path.join(base, "classic-whey-products.ts"));
const { wheyLines, powderDisplayName, powderProductBlurb } = load(path.join(base, "whey-lines.ts"));
const { isolatePageWarnings } = load(path.join(base, "powder-page-notes.ts"));
const { ClassicWheyCard } = load(path.join(base, "ClassicWheyCard.tsx"));
const { createElement } = requireApp("react");
const { renderToStaticMarkup } = requireApp("react-dom/server");
const proteinProducts = JSON.parse(fs.readFileSync(path.join(base, "protein-products.json"), "utf8"));

test("every isolate flavor and package shares the same four distinct benefits in both previews", () => {
  const isolates = JSON.parse(fs.readFileSync(path.join(base, "protein-products.json"), "utf8"))
    .filter(product => product.formula === "isolate");
  assert.equal(isolates.length, 7);
  for (const directory of [base, path.resolve("artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared")]) {
    const { getPowderCopy } = load(path.join(directory, "powder-copy.ts"));
    for (const product of isolates) {
      const copy = getPowderCopy(product);
      assert.deepEqual(
        JSON.parse(JSON.stringify([...copy.support.map(item => item.description), ...copy.benefits])),
        expectedIsolateBenefits, `${directory}: ${product.component}`,
      );
    }
  }
});

test("the three product lines use the merchant's exact names and descriptions", () => {
  assert.equal(powderDisplayName("isolate"), "Whey Protein Isolate");
  assert.equal(powderDisplayName("blend"), "Whey Protein Blend");
  assert.equal(powderDisplayName("vegan"), "Vegan Protein");
  assert.equal(powderDisplayName("classic"), "Stellar Labs Classic Whey Protein Blend");
  assert.match(wheyLines.blend.description, /Sweetened with stevia/);
  assert.doesNotMatch(wheyLines.blend.description, /artificial/i);
  assert.match(wheyLines.classic.description, /sucralose.*added BCAAs.*natural and artificial flavors/);
});
test("active powder blurbs lead with the selected flavor without a repeated brand name", () => {
  for (const formula of ["isolate", "blend", "vegan", "electrolyte"]) {
    for (const flavor of ["Chocolate", "Vanilla", "Lemon Lime"]) {
      const blurb = powderProductBlurb({ formula, flavor });
      assert.ok(blurb.startsWith(flavor + " "));
      assert.doesNotMatch(blurb, /Stellar Labs/);
    }
  }
});
test("isolate page notes preserve safety warnings and qualify only claims actually displayed", () => {
  const safety = "Contains milk and soy. Keep out of reach of children.";
  const milk = "‡Whey products are made with milk from cows not treated with rBGH/rbST. No significant difference has been shown between milk derived from rbST-treated and non-rbST-treated cows.";
  const warnings = [
    safety, safety,
    "*These statements have not been evaluated by the Food and Drug Administration.",
    "†Based on the labeled serving size. Individual tolerance varies.",
    milk,
    "Nutrition limits apply to powder per labeled serving. No added sugars does not mean sugar-free.",
  ];
  assert.deepEqual(Array.from(isolatePageWarnings(warnings, [])), [safety]);
  assert.deepEqual(Array.from(isolatePageWarnings(warnings, ["rBGH-Free", "No Added Sugars"])), [
    safety, milk, "No added sugars does not mean sugar-free.",
  ]);
});
test("only three Natural blends remain active while Classic is archived for later", () => {
  assert.equal(proteinProducts.filter(product => product.formula === "blend").length, 3);
  assert.equal(classicWheyProducts.length, 0);
  assert.deepEqual(archivedClassicWheyProducts.map(product => product.flavor), ["Chocolate", "Vanilla", "Cookies & Cream"]);
  assert.equal(new Set(archivedClassicWheyProducts.map(product => product.handle)).size, 3);
});
test("the supplied reference keeps serving weight distinct from protein and warns about flavor variation", () => {
  assert.equal(classicReference.servingGrams, 34);
  assert.equal(classicReference.servings, 27);
  assert.equal(classicReference.size, "2 lb");
  assert.deepEqual(classicReference.metrics.map(item => item.value), ["24g", "130", "4g", "2g"]);
  assert.match(classicReference.basis, /Nutrition may vary by flavor/);
});
test("Classic cards have no borrowed photo, fabricated price, claims, or purchase controls", () => {
  for (const product of archivedClassicWheyProducts) {
    assert.equal(product.price, null);
    assert.equal(product.image, null);
    assert.equal(product.available, false);
    const html = renderToStaticMarkup(createElement(ClassicWheyCard, { product, href: `/products/${product.handle}` }));
    assert.match(html, /Product photo coming soon/);
    assert.match(html, /Coming soon/);
    assert.match(html, /Nutrition may vary by flavor/);
    assert.match(html, new RegExp(`/products/${product.handle}`));
    assert.doesNotMatch(html, /<img|\$\d|Add to Cart|Certified Gluten-Free|Non-GMO|No Added Sugar|Low-FODMAP|rBGH|Papain|Protease/i);
  }
});
