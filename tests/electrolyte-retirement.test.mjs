import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const directories = [
  "artifacts/stellar-review/src/pages/stellar",
  "artifacts/mockup-sandbox/src/components/mockups/stellar-labs",
];
const require = createRequire(path.resolve("artifacts/stellar-review/package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Render the real purchase components without a browser. Only the captured
// document mount and adapter URLs are replaced; product/copy logic stays real.
function loadModules(directory) {
  const cache = new Map();
  function load(filename) {
    const file = path.resolve(directory, filename);
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
    const exports = {};
    cache.set(file, exports);
    const javascript = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(javascript, {
      exports,
      require(specifier) {
        if (specifier.includes("?inline")) return "";
        if (specifier.endsWith("review-links")) return {
          reviewAsset: value => value, reviewUrl: value => value,
          initializeReviewLinks() {},
        };
        if (specifier.endsWith("useProductSnapshot")) return {
          useProductSnapshot: () => ({ mount: {}, status: "ready", iframeRef: null, attempt: 0 }),
        };
        if (specifier === "react-dom") return { createPortal: children => children };
        if (!specifier.startsWith(".")) return require(specifier);
        const resolved = path.resolve(path.dirname(file), specifier);
        const target = [resolved, `${resolved}.ts`, `${resolved}.tsx`].find(candidate => fs.existsSync(candidate));
        if (!target) throw new Error(`Cannot resolve ${specifier} from ${file}`);
        return load(path.relative(directory, target));
      },
    }, { filename: file });
    return exports;
  }
  return load;
}

for (const directory of directories) {
  const load = loadModules(directory);
  const products = load("_shared/electrolyte-products.json");
  const { ProteinProductPage } = load("_shared/ProteinProductPage.tsx");
  test(`${directory}: Lemon Lime is the only selectable electrolyte and keeps its facts and new label`, () => {
    const lemon = products.find(product => product.component === "ElectrolyteLemonLime");
    assert.equal(lemon.available, true);
    assert.equal(lemon.price, 3195);
    const html = renderToStaticMarkup(React.createElement(ProteinProductPage, { component: lemon.component }));
    assert.match(html, /Add to Cart/);
    assert.match(html, /\$31\.95/);
    assert.match(html, /Lemon Lime/);
    assert.doesNotMatch(html, /Strawberry|strawberry-electrolyte/);
    assert.match(html, /supplements-lemon-lime-electrolyte-powder-0\.png/);
    assert.match(html, /lemon-lime-electrolytes-facts\.png/);
    assert.match(html, /lemon-lime-electrolytes-updated-upc\.png/);
    assert.match(html, /lemon-lime-electrolytes-updated-upc\.pdf/);
    assert.doesNotMatch(html, /Package barcode · UPC|lemon-lime-5-calorie-barcode\.png/);
    for (const fact of [/4\.5 g/, /280\s?mg/, /51\s?mg/, /47\s?mg/, /30 servings/]) assert.match(html, fact);
  });
  test(`${directory}: retired Strawberry cannot render purchase controls but retains reference artwork`, () => {
    const strawberry = products.find(product => product.component === "ElectrolyteStrawberry");
    assert.equal(strawberry.available, false);
    assert.equal(strawberry.discontinued, true);
    assert.equal(strawberry.images.length, 3);
    const html = renderToStaticMarkup(React.createElement(ProteinProductPage, { component: strawberry.component }));
    assert.match(html, /Strawberry Electrolyte Powder is unavailable/);
    assert.match(html, /discontinued/);
    assert.match(html, /href="\/products\/supplements-lemon-lime-electrolyte-powder"/);
    assert.doesNotMatch(html, /Add to Cart|Subscribe|Purchase option|iframe/);
  });
}

test("review registry excludes retired product discovery; old URL has an explicit unavailable route", () => {
  const load = loadModules("artifacts/stellar-review/src");
  const { reviewPages } = load("review-pages.ts");
  assert(reviewPages.some(page => page.path === "/products/supplements-lemon-lime-electrolyte-powder"));
  assert(!reviewPages.some(page => page.path === "/products/strawberry-electrolyte-powder"));
  const app = fs.readFileSync("artifacts/stellar-review/src/App.tsx", "utf8");
  assert.match(app, /path="\/products\/strawberry-electrolyte-powder"[\s\S]*?component="ElectrolyteStrawberry"/);
});

test("both product snapshots retain the same retirement metadata and label references", () => {
  for (const filename of ["electrolyte-products.json", "uploaded-powder-labels.ts"]) {
    assert.equal(
      fs.readFileSync(`${directories[0]}/_shared/${filename}`, "utf8"),
      fs.readFileSync(`${directories[1]}/_shared/${filename}`, "utf8"),
    );
  }
  assert.match(fs.readFileSync("scripts/capture-stellar-proteins.mjs", "utf8"),
    /component === "ElectrolyteStrawberry" \? \{ available: false, discontinued: true \}/);
});
