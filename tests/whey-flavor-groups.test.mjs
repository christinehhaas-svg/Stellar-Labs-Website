import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("artifacts/stellar-review/src/pages/stellar/_shared/collection-product-groups.ts", "utf8");
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { groupCollectionProducts } = module.exports;
const products = JSON.parse(fs.readFileSync("artifacts/stellar-review/src/pages/stellar/_shared/protein-products.json", "utf8"));

test("Whey Isolate can feature 1 lb packages while keeping both size options", () => {
  const groups = groupCollectionProducts(products.filter(product => product.formula === "isolate"), true, "1lb");
  assert.equal(groups.length, 5);
  assert.ok(groups.every(group => group.initialProduct.size === "1lb"));
  for (const flavor of ["Vanilla", "Chocolate"]) {
    const group = groups.find(group => group.key === `isolate:${flavor}`);
    assert.equal(group.initialProduct.price, 5295);
    assert.deepEqual(Array.from(group.variants, product => product.size).sort(), ["1lb", "2lb"]);
  }
});

test("All Whey contains eight flavor/formula cards without losing its ten packages", () => {
  const groups = groupCollectionProducts(products, true);
  assert.equal(groups.length, 8);
  assert.equal(groups.reduce((sum, group) => sum + group.variants.length, 0), 10);
  assert.equal(groups.filter(group => group.key.startsWith("isolate:")).length, 5);
  assert.equal(groups.filter(group => group.key.startsWith("blend:")).length, 3);
});

test("Vanilla and Chocolate keep both sizes, current prices, and distinct product routes", () => {
  for (const flavor of ["Vanilla", "Chocolate"]) {
    const group = groupCollectionProducts(products, true).find(group => group.key === `isolate:${flavor}`);
    assert.equal(group.initialProduct.size, "2lb");
    assert.equal(group.initialProduct.price, 8995);
    assert.equal(group.variants.find(product => product.size === "1lb").price, 5295);
    assert.equal(new Set(group.variants.map(product => product.handle)).size, 2);
  }
});

test("Single-size flavors never acquire nonexistent two-pound packages", () => {
  const groups = groupCollectionProducts(products.filter(product => product.formula === "isolate"), true);
  for (const group of groups.filter(group => !["isolate:Vanilla", "isolate:Chocolate"].includes(group.key))) {
    assert.equal(group.variants.length, 1);
    assert.equal(group.variants[0].size, "1lb");
  }
});

test("Other categories stay ungrouped and malformed duplicate sizes fail explicitly", () => {
  assert.equal(groupCollectionProducts(products, false).length, products.length);
  assert.throws(() => groupCollectionProducts([products[0], products[0]], true), /Duplicate product/);
  assert.throws(() => groupCollectionProducts([products[0], { ...products[0], component: "DuplicateSize" }], true), /Duplicate package size/);
});
