import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const root = path.resolve("artifacts/stellar-review/src/pages/stellar/_shared");
function loader() {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
    if (file.endsWith("/review-links.ts")) return { reviewAsset: value => value };
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(code, { exports, require(specifier) {
      if (!specifier.startsWith(".")) return createRequire(file)(specifier);
      const base = path.resolve(path.dirname(file), specifier);
      return load([base, `${base}.ts`, `${base}.tsx`, `${base}.json`].find(candidate => fs.existsSync(candidate)));
    } }, { filename: file });
    return exports;
  };
}
const load = loader();
const plain = value => JSON.parse(JSON.stringify(value));
const { orderNutrition, orderNutritionFacts } = load(path.join(root, "nutrition-order.ts"));
const { powderNutritionMetrics, shakeCardNutrition } = load(path.join(root, "ProductCardNutrition.tsx"));
const { collectionNutritionSummary } = load(path.join(root, "collection-nutrition-summary.ts"));

test("ordering preserves every item, value and the relative order of other nutrients", () => {
  const items = [
    { label: "Sodium", value: "80mg" }, { label: "Natural sugar", value: "2g" },
    { label: "Protein", value: "24g" }, { label: "Magnesium", value: "51mg" },
    { label: "Carbs", value: "<1g" }, { label: "Calories", value: "130" },
  ];
  const snapshot = structuredClone(items);
  assert.deepEqual(plain(orderNutrition(items)), [items[5], items[2], items[4], items[1], items[3], items[0]]);
  assert.deepEqual(items, snapshot, "Do not mutate the original facts");
  assert.deepEqual(plain(orderNutrition(items.slice(0, 4))).map(item => item.label), ["Protein", "Natural sugar", "Magnesium", "Sodium"]);
  assert.deepEqual(plain(orderNutritionFacts(["Serving size: 31g", "Total sugars: <1g", "Protein: 25g", "Calories: 110", "Total carbohydrate: 1g"])),
    ["Calories: 110", "Protein: 25g", "Total carbohydrate: 1g", "Total sugars: <1g", "Serving size: 31g"]);
});

test("every shake keeps its exact four existing amounts paired to the correct labels", () => {
  for (const [component, original] of Object.entries(shakeCardNutrition)) {
    const metrics = plain(powderNutritionMetrics(component).metrics);
    assert.deepEqual(metrics.map(item => item.label), ["Calories", "Protein", "Carbs", /Blend$/.test(component) ? "Natural sugar" : "Sugar"]);
    assert.deepEqual(metrics.map(item => item.value), [original.calories, original.protein, original.carbs, original.sugar]);
  }
});

test("electrolytes move only calories to the front and add no protein, carbs or sugar", () => {
  for (const component of ["ElectrolyteLemonLime", "ElectrolyteStrawberry"]) {
    const metrics = plain(powderNutritionMetrics(component).metrics);
    assert.deepEqual(metrics.map(item => item.label), ["Calories", "Potassium", "Magnesium", "Sodium", "Calcium"]);
    assert.deepEqual(metrics.map(item => item.value), component === "ElectrolyteLemonLime"
      ? ["5", "280mg", "51mg", "80mg", "47mg"] : ["10", "340mg", "40mg", "500mg", "50mg"]);
  }
  assert.deepEqual(plain(collectionNutritionSummary("isolate")).map(item => item.label), ["Calories", "Protein", "Carbs", "Sugar"]);
  assert.deepEqual(plain(collectionNutritionSummary("electrolyte")).map(item => item.label), ["Calories", "Potassium", "Magnesium", "Sodium", "Calcium"]);
  for (const formula of ["blend", "vegan"]) assert.deepEqual(plain(collectionNutritionSummary(formula)).map(item => item.label), ["Protein"]);
});
