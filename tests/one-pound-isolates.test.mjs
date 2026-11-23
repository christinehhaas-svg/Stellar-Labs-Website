import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const directories = [
  "artifacts/stellar-review/src/pages/stellar",
  "artifacts/mockup-sandbox/src/components/mockups/stellar-labs",
];

// Load the actual copy modules, without a server or a second copy of their logic.
function modules(directory) {
  const cache = new Map();
  function load(filename) {
    const file = path.resolve(directory, filename);
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
    const exports = {};
    cache.set(file, exports);
    const javascript = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(javascript, {
      exports,
      require(specifier) {
        assert.ok(specifier.startsWith("."), `Unexpected import: ${specifier}`);
        return load(path.resolve(path.dirname(file), specifier.endsWith(".json") ? specifier : `${specifier}.ts`));
      },
    }, { filename: file });
    return exports;
  }
  return load;
}

for (const directory of directories) {
  const load = modules(directory);
  const products = load("_shared/protein-products.json");
  const { getPowderCopy } = load("_shared/powder-copy.ts");
  const { packageImages, packageFrontStyle, wheyDisplayOrder } = load("_shared/package-images.ts");
  const { nutritionDescriptions } = load("_shared/nutrition-data.ts");
  test(`${directory}: every isolate uses the approved size price and blends stay unchanged`, () => {
    for (const product of products) {
      if (product.formula === "isolate") assert.equal(product.price, product.size === "1lb" ? 5295 : 8995, product.component);
      if (product.formula === "blend") assert.equal(product.price, 7895, product.component);
    }
  });
  test(`${directory}: only the oversized Chocolate and Vanilla 1 lb mockups are reduced`, () => {
    for (const component of ["ProteinChocolateIsolate1lb", "ProteinVanillaIsolate1lb"]) {
      assert.equal(packageFrontStyle(products.find(product => product.component === component)).transform, "translateY(1%) scale(0.785)");
    }
    for (const component of ["ProteinVanillaIsolate", "ProteinChocolateIsolate", "ProteinMixedBerry"]) {
      assert.equal(packageFrontStyle(products.find(product => product.component === component)), undefined);
    }
    assert.equal(packageFrontStyle(products.find(product => product.component === "ProteinCappuccino")).transform, "scale(0.81)");
  });
  test(`${directory}: whey collection shows 2 lb isolates, 1 lb isolates, then three blends`, () => {
    const ordered = [...products].sort((a, b) => wheyDisplayOrder(a) - wheyDisplayOrder(b));
    assert.deepEqual(Array.from(ordered, item => `${item.formula}:${item.size}`), [
      ...Array(2).fill("isolate:2lb"),
      ...Array(5).fill("isolate:1lb"),
      ...Array(3).fill("blend:2lb"),
    ]);
  });

  for (const [flavor, calories, protein, carbs] of [
    ["Chocolate", "110", "25", "1"],
    ["Vanilla", "110", "25", "1"],
  ]) {
    test(`${directory}: ${flavor} 1 lb is a separate $52.95 preview, not a relabeled 2 lb package`, () => {
      const component = `Protein${flavor}Isolate`;
      const handle = `100-isolate-whey-protein-shake-${flavor.toLowerCase()}`;
      const small = products.filter(product => product.component === `${component}1lb`);
      const large = products.filter(product => product.component === component);
      assert.equal(small.length, 1);
      assert.equal(large.length, 1, "Keep the original 2 lb listing");
      const product = small[0];
      assert.equal(product.handle, `${handle}-1lb`);
      // Keep the current display name separate from the legacy Shopify handle.
      assert.equal(product.title, `${flavor} Whey Protein Isolate · 1 lb`);
      assert.equal(product.size, "1lb");
      assert.equal(product.formula, "isolate");
      assert.equal(product.flavor, flavor);
      assert.equal(product.price, 5295);
      assert.equal(product.available, false);
      assert.equal(product.variantId, null, "Do not invent a purchasable Shopify variant");
      assert.equal(product.source, "", "No verified store listing exists yet");
      assert.equal(product.images.length, 1, "Only an illustrative front, not original label panels");
      assert.match(product.images[0].src, new RegExp(`${flavor.toLowerCase()}-isolate-1lb-mockup\\.webp$`));
      assert.equal(product.images[0].original, "", "Do not invent an original label source");
      assert.equal(packageImages(product).length, 1, "Never borrow 2 lb label artwork");
      assert.equal(large[0].handle, handle);
      assert.equal(large[0].size, "2lb");
      assert.equal(large[0].price, 8995);
      assert.equal(large[0].images.length, 3);
      assert.equal(new Set(products.map(item => item.handle)).size, products.length);
      assert.equal(new Set(products.map(item => item.component)).size, products.length);

      const copy = getPowderCopy(product);
      assert.equal(copy.servings, 16);
      // Independent transcription of the merchant's matching 1 lb photographs.
      assert.deepEqual(Array.from(copy.facts), [
        `Calories: ${calories} per serving`, `Protein: ${protein}g per serving`,
        `Total carbohydrate: ${carbs}g per serving`,
        flavor === "Chocolate" ? "Total sugars: <1g per serving" : "Total sugars: 0g per serving",
        "Serving size: 29g (1 scoop)", "Servings per container: 16",
        ...(flavor === "Chocolate"
          ? ["Total fat: 1g per serving", "Calcium: 118mg", "Chromium: 2mcg", "Sodium: 65mg", "Potassium: 170mg"]
          : ["Total fat: 0.5g per serving", "Niacin: 4mg", "Calcium: 120mg", "Phosphorus: 135mg", "Sodium: 65mg", "Potassium: 135mg"]),
      ]);
      assert.match(copy.sourceNote, /merchant-supplied photographs/);
      assert.match(copy.sourceNote, /UPC replacing the barcode in place/);
      assert.doesNotMatch(copy.sourceNote, /pending|unchanged 2 lb|label reference/);
      assert.doesNotMatch(copy.facts.join(" "), /31g|29 servings/);
      assert.deepEqual(Array.from(nutritionDescriptions[product.handle].facts), Array.from(copy.facts));
      assert.match(nutritionDescriptions[product.handle].notes, /merchant-supplied photographs/);
      for (const field of ["size", "flavor", "formula"]) {
        assert.throws(() => getPowderCopy({ ...product, [field]: "wrong" }), /Package identity mismatch/);
      }
    });
  }
}

test("review and Canvas keep isolate data, nutrition copy and detail presentation in sync", () => {
  for (const file of [
    "_shared/protein-products.json", "_shared/powder-copy.ts",
    "_shared/package-images.ts", "_shared/ProteinProductPage.tsx",
  ]) {
    const review = fs.readFileSync(path.join(directories[0], file), "utf8");
    const canvas = fs.readFileSync(path.join(directories[1], file), "utf8");
    // Canvas consumes these helpers from their owning review artifact. Require
    // identical resolved files before normalizing their relative spellings.
    const normalizedCanvas = file.endsWith(".tsx") || file.endsWith(".ts")
      ? canvas.replace(/from "([^"]+)"/g, (statement, specifier) => {
        const resolved = path.resolve(path.dirname(path.join(directories[1], file)), specifier);
        for (const helper of ["ProductNutritionSummary", "ProductQualityList", "product-servings", "powder-page-notes", "website-copy", "nutrition-order", "HeavyMetalsBadge", "heavy-metals-testing"]) {
          const owner = path.resolve(directories[0], "_shared", helper);
          if (resolved === owner) {
            assert.ok(fs.existsSync(`${owner}.tsx`) || fs.existsSync(`${owner}.ts`));
            return `from "./${helper}"`;
          }
        }
        return statement;
      })
      : canvas;
    assert.equal(review, normalizedCanvas, `${file} drifted`);
  }
});

test("powder ordering remains local state without restoring merchant preview notes", () => {
  for (const directory of directories) {
    const source = fs.readFileSync(path.join(directory, "_shared/ProteinProductPage.tsx"), "utf8");
    assert.match(source, /className="sl-protein-cart" type="button" onClick=\{\(\) => setAdded\(true\)\}/);
    assert.doesNotMatch(source, /<form\b[^>]*action=["'][^"']*\/(?:cart|checkout)/);
    assert.doesNotMatch(source, /sl-protein-preview-note|sl-protein-eyebrow/);
  }
});
