import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { verifyElectrolyteHandoff, websiteCopies } from "./verify-electrolyte-handoff.mjs";

const root = process.cwd();
const source = path.join(root, "artifacts/stellar-review/src/pages/stellar/_shared");
const canvas = path.join(root, "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared");
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  if (filename.endsWith(".json")) return JSON.parse(fs.readFileSync(filename, "utf8"));
  const exports = {};
  cache.set(filename, exports);
  const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    require(specifier) {
      if (specifier === "../review-links") return { reviewAsset: value => value };
      if (!specifier.startsWith(".")) throw new Error(`Unexpected import: ${specifier}`);
      return load(path.resolve(path.dirname(filename), specifier.endsWith(".json") ? specifier : `${specifier}.ts`));
    },
  });
  return exports;
}

const { outlineProducts, getOutlineProduct } = load(path.join(source, "outline-copy.ts"));
const { supplements, getSupplementQuality } = load(path.join(source, "supplements-data.ts"));
// Reject the shared store-placeholder regression and undisclosed illustrations.
const bottleHashes = new Set();
for (const product of supplements) {
  const filename = path.basename(product.bottle);
  const reviewImage = fs.readFileSync(path.join(root, "artifacts/stellar-review/source-assets/images/stellar-supplements", filename));
  const canvasImage = fs.readFileSync(path.join(root, "artifacts/mockup-sandbox/public/images/stellar-supplements", filename));
  assert(reviewImage.equals(canvasImage), `${product.id}: Canvas bottle differs`);
  bottleHashes.add(createHash("sha256").update(reviewImage).digest("hex"));
  assert.match(product.bottleCaption, product.id === "womens-multi" ? /bottle photo/ : /product-specific bottle illustration/i);
}
assert.equal(bottleHashes.size, supplements.length, "Each supplement must have its own product-specific bottle, not a shared placeholder");
const { getPowderCopy } = load(path.join(source, "powder-copy.ts"));
websiteCopies(root);
const { servingDecisions, servingDecisionNote } = load(path.join(source, "serving-decisions.ts"));
const { nutritionDescriptions } = load(path.join(source, "nutrition-data.ts"));
assert.equal(outlineProducts.length, 19, "The original outline excludes the merchant-retired Night Time Fat Burn");
assert.equal(new Set(outlineProducts.map(product => product.id)).size, outlineProducts.length);
for (const product of outlineProducts) {
  assert(product.description.length > 50, `${product.id}: description`);
  for (const field of ["benefits", "quality", "support", "suggestedUse", "warnings"]) {
    assert(product[field].length, `${product.id}: ${field}`);
  }
  assert(product.warnings.some(warning => warning.includes("Food and Drug Administration")), `${product.id}: FDA disclaimer`);
  assert(!product.quality.some(claim => /FODMAP/i.test(claim)), `${product.id}: withdrawn live FODMAP claim`);
}
const quality = id => getOutlineProduct(id).quality.join(" ");
assert(!outlineProducts.some(product => product.id === "night-time-fat-burn"), "Do not restore the retired supplement");
assert(!/Low-FODMAP/.test(quality("ElectrolyteStrawberry")));
assert(!/FODMAP/i.test(quality("ElectrolyteLemonLime")), "Keep the merchant-withdrawn electrolyte claim out of live copy");
assert(/Certified Gluten-Free/.test(quality("ElectrolyteLemonLime")), "Preserve the approved gluten-free claim");
for (const id of ["VeganChocolate", "VeganVanilla"]) {
  assert(!/No Added Sugars/.test(quality(id)));
  assert(/Sweetened with Stevia/.test(quality(id)));
}
assert.equal(supplements.length, 7);
for (const product of supplements) {
  const approved = getOutlineProduct(product.id);
  assert.equal(product.detailCopy.description, approved.description);
  assert.equal(JSON.stringify(getSupplementQuality(product)), JSON.stringify(approved.quality));
}
let powders = 0;
const catalogPowders = [];
for (const family of ["protein", "vegan", "electrolyte"]) {
  for (const product of JSON.parse(fs.readFileSync(path.join(source, `${family}-products.json`), "utf8"))) {
    catalogPowders.push(product);
    const copy = getPowderCopy(product);
    assert(copy.facts.length, `${product.component}: package facts`);
    if (product.component !== "ProteinMixedBerry") assert(copy.sourceNote, `${product.component}: provenance`);
    const decision = servingDecisions[product.component];
    if (decision) {
      assert.equal(JSON.stringify(copy.facts.slice(0, 2)), JSON.stringify(decision.approvedFacts));
      assert.equal(copy.servings, decision.servings, `${product.component}: corrected serving count`);
      assert(copy.sourceNote.includes("Unchanged printed label:"), `${product.component}: printed values distinguished`);
      assert(copy.sourceNote.includes("Merchant-confirmed review copy"), `${product.component}: merchant correction`);
    }
    assert.equal(JSON.stringify(nutritionDescriptions[product.handle].facts), JSON.stringify(copy.facts), `${product.component}: homepage facts`);
    if (product.size === "2lb") {
      const grams = product.component === "ProteinCaramelBlend" ? 32 : { isolate: 31, blend: 33, vegan: 32 }[product.formula];
      assert.equal(copy.facts[0], `Serving size: 1 rounded scoop (${grams}g)`, `${product.component}: label-specific 2 lb serving weight`);
      if (product.formula === "isolate") assert.equal(copy.servings, 29);
      if (product.formula === "blend" || product.formula === "vegan") assert.equal(copy.servings, 28);
    } else if (product.size === "1lb" && product.formula === "isolate") {
      const grams = product.component === "ProteinCappuccino" ? 30 : 29;
      const suppliedOnePoundLabel = ["ProteinChocolateIsolate1lb", "ProteinVanillaIsolate1lb"].includes(product.component);
      const expected = suppliedOnePoundLabel
        ? "Serving size: 29g (1 scoop)"
        : `Serving size: 1 rounded scoop (${grams}g)`;
      assert.equal(copy.facts[0].replace(/\s+(?=g\))/g, ""), expected, `${product.component}: label-specific 1 lb serving weight`);
      assert.equal(copy.servings, 16);
    }
    if (product.formula === "isolate" || product.formula === "blend") {
      assert(copy.warnings.some(warning => warning.includes("No significant difference")), `${product.component}: milk disclaimer`);
    }
    if (product.component === "ProteinMixedBerry") {
      assert(!copy.description.includes("Strawberry"));
      assert(copy.facts.includes("Protein: 25g per serving"), "Mixed Berry retains its own label facts");
      assert(copy.facts.includes("16 servings per container"), "Mixed Berry retains its own container count");
      assert.doesNotMatch(copy.sourceNote ?? "", /Merchant-confirmed store handoff/i, "Internal provenance must not return in customer copy");
    }
    powders++;
  }
}
assert.equal(Object.keys(servingDecisions).length, 5);
const magnesium = supplements.find(product => product.id === "magnesium-complex");
assert.equal(magnesium.facts[0], "Serving size: 1–2 capsules");
assert(magnesium.facts.includes("30–60 servings per bottle, depending on use"));
assert(magnesium.facts.includes("Magnesium: 500 mg per two-capsule serving"), "Do not reinterpret two-capsule magnesium quantity as a one-capsule quantity");
assert.equal(magnesium.use, getOutlineProduct("magnesium-complex").suggestedUse);
assert.equal(magnesium.supply, "30–60-day supply, depending on use");
assert(magnesium.sourceNote.includes("Unchanged printed label: Serving size: 2 capsules; 30 servings per container"));
// Canvas intentionally imports some shared review helpers directly. Compare
// their resolved module identities, while keeping all component logic strict.
function parityContent(filename) {
  return fs.readFileSync(filename, "utf8").replace(/(\bfrom\s+|\bimport\s*)(["'])(\.{1,2}\/[^"']+)\2/g, (_, prefix, quote, specifier) => {
    const resolved = path.resolve(path.dirname(filename), specifier)
      .replace(`${path.dirname(source)}/`, "stellar/")
      .replace(`${path.dirname(canvas)}/`, "stellar/");
    return `${prefix}${quote}${resolved}${quote}`;
  });
}
for (const file of ["outline-copy.ts", "pdf-product-outline.json", "powder-copy.ts", "quality-claims.ts", "supplements-data.ts", "ProteinProductPage.tsx", "ProductClaimsButton.tsx", "useProductSnapshot.ts", "outline-homepage.ts", "serving-decisions.ts", "nutrition-data.ts", "WheyNutritionSummary.tsx", "whey-nutrition-summary.css"]) {
  assert.equal(parityContent(path.join(source, file)), parityContent(path.join(canvas, file)), `Canvas parity: ${file}`);
}
for (const file of ["SupplementDetails.tsx", "Supplements.tsx", "StellarProductInformation.tsx", "PowderCollectionPage.tsx", "PowderWhey.tsx", "PowderVegan.tsx", "PowderElectrolytes.tsx", "_whey-collection.css"]) {
  assert.equal(parityContent(path.join(source, "..", file)), parityContent(path.join(canvas, "..", file)), `Canvas parity: ${file}`);
}
if (process.argv.includes("--handoff")) {
  verifyElectrolyteHandoff(root);
  const handoff = path.join(root, "exports/stellar-website-handoff");
  const rows = JSON.parse(fs.readFileSync(path.join(handoff, "serving-review.json"), "utf8"));
  const expectedIds = [...catalogPowders.map(product => product.component), ...supplements.map(product => product.id)].sort();
  assert.deepEqual(rows.map(row => row.id).sort(), expectedIds, "Handoff must include every catalog product exactly once, including preview-only 1 lb isolates");
  for (const row of rows) {
    const powder = catalogPowders.find(product => product.component === row.id);
    const supplement = supplements.find(product => product.id === row.id);
    assert.equal(JSON.stringify(row.reviewFacts), JSON.stringify(powder ? getPowderCopy(powder).facts : supplement.facts));
    if (servingDecisions[row.id]) {
      assert.equal(row.decision, servingDecisionNote(row.id));
      assert.equal(row.status, "merchant-corrected-review-copy");
      assert.equal(JSON.stringify(row.printedServingFacts), JSON.stringify(servingDecisions[row.id].packageFacts));
      const slug = powder ? powder.formula === "blend" ? "whey-blend" : "whey-isolate" : "supplements";
      for (const filename of [`stellar-${slug}-website-handoff.html`, `stellar-${slug}-website-handoff.txt`]) {
        const text = fs.readFileSync(path.join(handoff, filename), "utf8");
        assert(text.includes("Merchant-confirmed review copy"), `${filename}: correction missing`);
        // HTML must contain the complete, product-specific decision rather than a shared family note.
        if (filename.endsWith(".html")) {
          const escapedNote = servingDecisionNote(row.id).replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
          }[char]));
          assert(text.includes(escapedNote), `${filename}: ${row.id} decision missing`);
        }
      }
    }
  }
  for (const directory of [path.join(handoff, "web-team-files"), path.join(root, "artifacts/mockup-sandbox/public/handoff")]) {
    assert.equal(fs.readFileSync(path.join(directory, "serving-review.json"), "utf8"), fs.readFileSync(path.join(handoff, "serving-review.json"), "utf8"));
    assert.equal(fs.readFileSync(path.join(directory, "serving-review.html"), "utf8"), fs.readFileSync(path.join(handoff, "serving-review.html"), "utf8"));
  }
  console.log(`PASS: all ${rows.length} handoff records match review copy; five serving decisions retain separate unchanged printed facts.`);
}
console.log(`PASS: ${outlineProducts.length} outline products, ${supplements.length} supplements, ${powders} catalog powders; retired-product exclusions, disclaimers, and Canvas copy parity.`);
