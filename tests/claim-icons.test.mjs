import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const review = "artifacts/stellar-review/src/pages/stellar";
const canvas = "artifacts/mockup-sandbox/src/components/mockups/stellar-labs";
function load(filename, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename);
  // Asset routing belongs to Vite, not the product eligibility calculation.
  if (filename.endsWith("/review-links.ts")) return { reviewAsset: value => value, reviewUrl: value => value };
  if (filename.endsWith(".json")) return JSON.parse(fs.readFileSync(filename, "utf8"));
  const exports = {};
  cache.set(filename, exports);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports, require: specifier => {
    assert(specifier.startsWith("."));
    return load(path.resolve(path.dirname(filename), specifier.endsWith(".json") ? specifier : `${specifier}.ts`), cache);
  } });
  return exports;
}

test("claim presentation and its dependencies stay matched across previews", () => {
  for (const file of ["_shared/claim-icons.ts", "_shared/QualityCallouts.tsx", "_quality-callouts.css", "StellarProductInformation.tsx"]) {
    const canvasSource = fs.readFileSync(`${canvas}/${file}`, "utf8").replace(
      /from "\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/stellar-review\/src\/pages\/stellar\/_shared\/product-guide-catalog"/,
      'from "./_shared/product-guide-catalog"',
    );
    assert.equal(fs.readFileSync(`${review}/${file}`, "utf8"), canvasSource, file);
  }
});

for (const directory of [review, canvas]) {
  test(`${directory}: every active product includes merchant-confirmed heavy-metal testing`, () => {
    const { heavyMetalsTestingClaim } = load(path.resolve(directory, "_shared/quality-claims.ts"));
    assert.equal(heavyMetalsTestingClaim, "Tested for Heavy Metals");
    const { outlineProducts } = load(path.resolve(directory, "_shared/outline-copy.ts"));
    for (const product of outlineProducts) {
      assert.equal(product.quality.filter(claim => claim === heavyMetalsTestingClaim).length, 1, product.id);
      for (const claim of product.quality) {
        assert.doesNotMatch(claim, /heavy[\s-]*metal[\s-]*free|certified.*heavy[\s-]*metal/i);
      }
    }
  });

  test(`${directory}: claim meanings do not depend on ordering or exception suffixes`, () => {
    const { claimIcon, stomachArtwork } = load(path.resolve(directory, "_shared/claim-icons.ts"));
    const examples = [
      ["Non-GMO", "corn"],
      ["Certified Gluten-Free · except Night Time Fat Burn", "gluten-free"],
      ["Easy-to-Digest Ingredients", "stomach"],
      ["Vegan Capsules", "leaf"], ["Vegetarian Capsules", "leaf"],
      ["No Added Sugars", "sugar"], ["No Added Sugar", "sugar"],
      ["rBGH-Free", "milk"], ["rBGH-Free Whey", "milk"], ["Tested for Known Contaminants", "testing"],
      ["Tested for Heavy Metals", "testing"],
    ];
    for (const [claim, icon] of examples.reverse()) assert.equal(claimIcon(claim), icon);
    const renderer = fs.readFileSync(`${directory}/_shared/QualityCallouts.tsx`, "utf8");
    assert.doesNotMatch(renderer, /MilkOff|milk-off/, "rBGH-free whey must not show a milk-exclusion pictogram");
    assert.doesNotMatch(renderer, /\bAccessibility\b/, "GLP-1 uses a standing person, not a wheelchair-like accessibility icon");
    assert.match(renderer, /\? PersonStanding/);
    assert.match(renderer, /stellar-rbgh-cow-outline\.png/);
    const homepage = fs.readFileSync("artifacts/stellar-review/source-assets/stellar-current/homepage-snapshot.html", "utf8");
    for (const [, d] of stomachArtwork.matchAll(/<path d="([^"]+)"/g)) assert(homepage.includes(`d="${d}"`));
  });

  test(`${directory}: every powder omits the retired enzyme claim`, () => {
    const { getPowderCopy } = load(path.resolve(directory, "_shared/powder-copy.ts"));
    const products = ["protein", "vegan", "electrolyte"].flatMap(category => load(path.resolve(directory, `_shared/${category}-products.json`)));
    for (const product of products) {
      const copy = getPowderCopy(product);
      assert.doesNotMatch(JSON.stringify({
        description: copy.description, benefits: copy.benefits, quality: copy.quality, support: copy.support,
      }), /digestive enzymes?|papain|protease|pepsin|proteinase/i);
    }
    const { outlineProducts } = load(path.resolve(directory, "_shared/outline-copy.ts"));
    for (const product of outlineProducts) {
      assert.doesNotMatch(product.quality.join(" "), /digestive enzymes?|papain|protease|pepsin|proteinase/i);
    }
  });

  test(`${directory}: all actual formulas retain their dietary exceptions`, () => {
    const { outlineProducts } = load(path.resolve(directory, "_shared/outline-copy.ts"));
    const { getPowderCopy } = load(path.resolve(directory, "_shared/powder-copy.ts"));
    for (const product of outlineProducts) {
      assert.doesNotMatch(product.quality.join(" "), /\bNSF\b/i);
      const whey = ["isolate", "blend"].includes(product.family);
      if (!whey) assert.doesNotMatch(product.quality.join(" "), /rBGH/i);
    }
    for (const filename of ["protein-products.json", "vegan-products.json", "electrolyte-products.json"]) {
      for (const product of load(path.resolve(directory, "_shared", filename))) {
        const copy = getPowderCopy(product);
        const claims = copy.quality.join(" ");
        assert.doesNotMatch(claims, /GLP-?1 Friendly/i);
        assert.doesNotMatch(claims, /\bNSF\b/i);
        if (["isolate", "blend"].includes(product.formula)) assert.match(claims, /rBGH-Free/);
        else assert.doesNotMatch(claims, /rBGH/i);
        assert.doesNotMatch(claims, /FODMAP/i);
      }
    }
    const { supplements, getSupplementQuality } = load(path.resolve(directory, "_shared/supplements-data.ts"));
    for (const product of supplements) {
      const claims = getSupplementQuality(product).join(" ");
      assert.doesNotMatch(claims, /NSF|rBGH/i);
      if (/Night/i.test(product.name)) assert.deepEqual([...getSupplementQuality(product)], ["Non-GMO"]);
      else {
        assert.equal(getSupplementQuality(product).filter(claim => claim === "GLP-1 Friendly*").length, 0);
        assert.equal(product.detailCopy.quality.filter(claim => claim === "GLP-1 Friendly*").length, 0);
        assert.match(claims, /Gluten-Free/);
        assert.doesNotMatch(claims, /FODMAP/i);
      }
    }
  });
}
