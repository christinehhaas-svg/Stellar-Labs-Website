import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const filename = "artifacts/stellar-review/src/pages/stellar/_shared/product-servings.ts";
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });

test("powders show gram weight, not protein grams, and servings per container", () => {
  for (const [grams, servings] of [[29, 16], [31, 29], [33, 28], [32, 28], [4.5, 30]]) {
    assert.equal(exports.powderServingSummary({
      facts: [`Serving size: 1 rounded scoop (${grams}g)`, "Protein: 25g per serving"],
      servings,
    }), `${grams} g per serving · ${servings} servings per container`);
  }
});

test("missing serving weight fails explicitly", () => {
  assert.throws(() => exports.powderServingSize({ facts: ["Protein: 25g per serving"] }), /Missing verified/);
});

test("supplements distinguish capsule servings from days of supply", () => {
  assert.equal(exports.supplementServingSummary("digestive-enzyme"), "1 capsule per serving · 60 servings per container");
  assert.equal(exports.supplementServingSummary("omega-3"), "1 softgel per serving · 60 servings per container");
  assert.equal(exports.supplementServingSummary("magnesium-complex"), "1–2 capsules per serving · 30–60 servings per container (depending on use)");
  assert.equal(exports.supplementServingSummary("turmeric-w-bioperine"), "2 capsules per serving · 30 servings per container");
});

test("no supplement summary shows cost per serving", () => {
  for (const id of Object.keys(exports.supplementServingInfo)) {
    assert.doesNotMatch(exports.supplementServingSummary(id), /cost|price|\$/i);
  }
});
