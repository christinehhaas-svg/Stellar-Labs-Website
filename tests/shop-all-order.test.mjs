import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const directory = "artifacts/stellar-review/src/pages/stellar/_shared/";
const products = JSON.parse(fs.readFileSync(`${directory}protein-products.json`, "utf8"));
const classic = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${directory}classic-whey-products.ts`, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: classic });
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${directory}shop-all-order.ts`, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: specifier => {
  if (specifier === "./protein-products.json") return products;
  if (specifier === "./classic-whey-products") return classic;
  throw new Error(`Unexpected Shop All dependency: ${specifier}`);
} });

test("Shop All keeps one approved Magnesium Complex and removes the legacy Citrate card on repeated initialization", () => {
  const rows = [];
  for (const [handle, title] of [
    ["magnesium", "Stellar Labs Magnesium Citrate"],
    ["magnesium-complex", "Magnesium Complex"],
    ["omega-3-fish-oil-supplement", "Omega 3 Fish Oil"],
  ]) {
    rows.push({
      handle, dataset: { productTags: "supplements" },
      querySelector: () => ({ getAttribute: () => JSON.stringify({ product: { handle, title } }) }),
      remove() { rows.splice(rows.indexOf(this), 1); },
    });
  }
  const grid = {
    querySelectorAll: selector => selector.startsWith("a[") ? [] : [...rows],
    append(item) { rows.splice(rows.indexOf(item), 1); rows.push(item); },
  };
  for (let pass = 0; pass < 2; pass++) {
    exports.sortShopAllProducts(grid);
    assert.deepEqual(rows.map(row => row.handle), ["magnesium-complex", "omega-3-fish-oil-supplement"]);
  }
});

test("Shop All places large isolates, small isolates, blends, vegan, electrolytes, supplements, tools, then books", () => {
  for (const product of products) {
    const expected = product.formula === "isolate" ? (product.size === "2lb" ? 0 : 1) : 2;
    assert.equal(exports.shopAllRank(product.handle, product.title, ""), expected);
  }
  for (const [handle, title, tags, expected] of [
    ["chocolate-vegan-shake", "Chocolate Vegan", "vegan-plant-protein", 3],
    ["coming-soon-vanilla-vegan-shake-hidden", "Vanilla Vegan", "", 3],
    ["strawberry-electrolyte-powder", "Strawberry", "electrolyte", 4],
    ["omega-3-fish-oil-supplement", "Omega 3", "supplements", 5],
    ["kitchen-scale", "Kitchen Scale", "kitchen-tools-books", 6],
    ["the-low-lean-lose-fat-high-protein-no-bloat-diet", "The Low & Lean Diet", "kitchen-tools-books", 7],
    ["heart-healthy-eating-system", "E-Book: Heart-Healthy Eating System", "kitchen-tools-books", 7],
    ["unknown", "New product", "", 8],
  ]) assert.equal(exports.shopAllRank(handle, title, tags), expected);
});
