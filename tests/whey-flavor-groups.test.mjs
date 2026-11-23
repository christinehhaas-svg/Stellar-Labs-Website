import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("artifacts/stellar-review/src/pages/stellar/_shared/collection-product-groups.ts", "utf8");
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports, URLSearchParams });
const { groupCollectionProducts, initialCollectionPackage, collectionPackageHref } = module.exports;
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

test("Native package URLs preserve review and Canvas paths and active filters", () => {
  for (const pathname of ["/", "/__mockup/preview/stellar-labs/PowderWhey", "/nested/review/"]) {
    const href = collectionPackageHref({
      pathname,
      search: "?category=100-isolate-whey-protein&formula=isolate&formula=blend&package=old&package=duplicate",
    }, "ProteinChocolateIsolate1lb");
    const url = new URL(href, "https://example.test");
    assert.equal(url.pathname, pathname);
    assert.equal(url.searchParams.get("category"), "100-isolate-whey-protein");
    assert.deepEqual(url.searchParams.getAll("formula"), ["isolate", "blend"]);
    assert.deepEqual(url.searchParams.getAll("package"), ["ProteinChocolateIsolate1lb"]);
    assert.equal(url.origin, "https://example.test");
  }
});

test("Reloaded size selection is restricted to the card's real variants", () => {
  const groups = groupCollectionProducts(products, true);
  const chocolate = groups.find(group => group.key === "isolate:Chocolate");
  const small = initialCollectionPackage(chocolate.initialProduct, chocolate.variants, "?package=ProteinChocolateIsolate1lb");
  assert.equal(small.component, "ProteinChocolateIsolate1lb");
  assert.equal(small.price, 5295);
  assert.equal(chocolate.initialProduct.component, "ProteinChocolateIsolate");
  for (const requested of ["unknown", "", "ProteinVanillaIsolate1lb", "ProteinChocolateBlend", "javascript:alert(1)"]) {
    assert.equal(initialCollectionPackage(chocolate.initialProduct, chocolate.variants,
      `?package=${encodeURIComponent(requested)}`), chocolate.initialProduct);
  }
  assert.equal(initialCollectionPackage(chocolate.initialProduct, chocolate.variants,
    "?package=unknown&package=ProteinChocolateIsolate1lb"), chocolate.initialProduct);
  const vanilla = groups.find(group => group.key === "isolate:Vanilla");
  assert.equal(initialCollectionPackage(vanilla.initialProduct, vanilla.variants,
    "?package=ProteinChocolateIsolate1lb"), vanilla.initialProduct);
});
