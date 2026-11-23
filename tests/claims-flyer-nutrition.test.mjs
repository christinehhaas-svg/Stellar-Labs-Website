import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";
import { exportClaimsFlyer } from "../scripts/export-claims-flyer.mjs";
import { readClaimsFlyerPdf, verifyClaimsFlyerPdf } from "../scripts/lib/claims-flyer-pdf.mjs";
import { injectLongFlyerCopy } from "./fixtures/claims-flyer-long-copy.mjs";

const require = createRequire(path.resolve("artifacts/mockup-sandbox/package.json"));
const directory = path.resolve("artifacts/mockup-sandbox/src/components/mockups/infographics");
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const exports = {};
  cache.set(file, exports);
  const javascript = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(javascript, {
    exports,
    require(specifier) {
      if (specifier === "../review-links") return { reviewAsset: url => url.replace("/__mockup/", "/review-assets/") };
      if (specifier === "react/jsx-runtime") return require(specifier);
      assert.ok(specifier.startsWith("."), `Unexpected import: ${specifier}`);
      let resolved = path.resolve(path.dirname(file), specifier);
      if (!path.extname(resolved)) resolved += fs.existsSync(`${resolved}.ts`) ? ".ts" : ".tsx";
      return load(resolved);
    },
  }, { filename: file });
  return exports;
}
const { powderRows, supplementRows, nutritionPages, productDetailPages, flyerPageCount, collectionClaimGroups } = load(path.join(directory, "stellar-claims-flyer-data.ts"));
const rows = [...powderRows, ...supplementRows];
const copyDirectory = path.resolve("artifacts/stellar-review/src/pages/stellar/_shared");
const { getPowderCopy } = load(path.join(copyDirectory, "powder-copy.ts"));
const { powderNutritionMetrics } = load(path.join(copyDirectory, "ProductCardNutrition.tsx"));
const { supplements } = load(path.join(copyDirectory, "supplements-data.ts"));
const products = ["protein-products.json", "vegan-products.json", "electrolyte-products.json"]
  .flatMap(file => load(path.join(copyDirectory, file))).filter(product => !product.discontinued);
const plain = value => JSON.parse(JSON.stringify(value));

test("flyer lists whey isolate and blend separately, with Stevia only on blend", () => {
  const whey = collectionClaimGroups.find(group => group.name === "Whey Proteins");
  const isolate = collectionClaimGroups.find(group => group.name === "Whey Isolate Proteins");
  const blend = collectionClaimGroups.find(group => group.name === "Whey Blend Proteins");
  assert.deepEqual(plain(whey.claims), ["Non-GMO", "Certified Gluten-Free", "Low-FODMAP Ingredients*", "rBGH-Free Whey", "No Added Sugars"]);
  assert.deepEqual(plain(isolate.claims), plain(whey.claims));
  assert.deepEqual(plain(blend.claims), [...plain(whey.claims), "Sweetened with Stevia"]);
  assert.deepEqual(plain(collectionClaimGroups.filter(group => group.claims.includes("Sweetened with Stevia")).map(group => group.name)), ["Whey Blend Proteins"]);
});

test("electrolyte flyer callouts omit the five-major-electrolytes claim absent from the website", () => {
  const electrolytes = collectionClaimGroups.find(group => group.name === "Electrolytes");
  assert.deepEqual(plain(electrolytes.claims), [
    "Non-GMO", "Certified Gluten-Free", "Low-FODMAP Ingredients*", "Vegan", "No Added Sugar",
  ]);
  for (const product of powderRows.filter(row => row.family === "electrolyte")) {
    assert.ok(!product.claims.some(claim => /(?:5|five)\s+major\s+electrolytes/i.test(claim)), product.id);
  }
});

test("every active flavor and package appears exactly once in the facts pages", () => {
  assert.equal(powderRows.length, products.length);
  assert.equal(supplementRows.length, supplements.length);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  const pagedIds = nutritionPages.flatMap(page => page.rows.map(row => row.id));
  assert.deepEqual(plain(pagedIds).sort(), rows.map(row => row.id).sort());
  assert.ok(!rows.some(row => /Strawberry|night-time-fat-burn/i.test(`${row.id} ${row.name}`)));
});

test("complete printout includes current website copy and matching label panels for every product", () => {
  for (const row of rows) {
    assert.ok(row.benefits.length && row.suggestedUse && row.warnings.length, row.id);
    assert.ok(row.labels.length > 0, `${row.id}: missing website label artwork`);
    const pages = productDetailPages.filter(page => page.product.id === row.id);
    assert.equal(pages.filter(page => !page.label).length, 1);
    assert.deepEqual(plain(pages.filter(page => page.label).map(page => page.label)), [...new Set(row.labels)]);
  }
  const expectedUPCs = {
    ElectrolyteLemonLime: "859312006374",
    ProteinChocolateIsolate1lb: "859312006114",
    ProteinVanillaIsolate1lb: "859312006046",
  };
  for (const [id, upc] of Object.entries(expectedUPCs)) assert.equal(rows.find(row => row.id === id).upc, upc);
  for (const product of products) {
    const row = rows.find(row => row.id === product.component);
    assert.equal(row.price, `$${(product.price / 100).toFixed(2)}`);
    assert.equal(row.suggestedUse, getPowderCopy(product).suggestedUse);
    assert.ok(!JSON.stringify(row).includes("sourceNote"), "Internal source notes must not be printed");
  }
});

test("powder facts preserve the current purchase-page numbers and serving sizes", () => {
  for (const product of products) {
    const row = powderRows.find(row => row.id === product.component);
    const copy = getPowderCopy(product);
    assert.deepEqual(plain(row.metrics), plain(powderNutritionMetrics(product.component).metrics), product.component);
    assert.equal(row.servingsPerContainer, `${copy.servings} servings per container`);
    assert.equal(row.servingSize, `${copy.facts.find(fact => /^Serving size:/i.test(fact)).match(/(\d+(?:\.\d+)?)\s*g\b/i)[1]} g`);
    if (product.formula !== "electrolyte") {
      const sugarLabel = /^Protein(?:Vanilla|Chocolate|Caramel)Blend$/.test(product.component) ? "Natural sugar" : "Sugar";
      assert.deepEqual(plain(row.metrics.map(metric => metric.label)), ["Calories", "Protein", "Carbs", sugarLabel]);
    }
  }
});

test("every facts card includes package-matched label ingredients and a UPC", () => {
  for (const row of rows) {
    assert.match(row.upc, /^\d{12}$/, row.id);
    const digits = [...row.upc].map(Number);
    const sum = digits.slice(0, 11).reduce((sum, digit, index) =>
      sum + digit * (index % 2 === 0 ? 3 : 1), 0);
    assert.equal((10 - sum % 10) % 10, digits[11], `${row.id}: UPC check digit`);
    assert.ok(row.ingredients.length, `${row.id}: missing ingredients`);
    for (const item of row.ingredients) assert.ok(item.heading && item.text.length > 20, row.id);
  }
  const unflavored = rows.find(row => row.id === "ProteinUnflavored");
  assert.match(unflavored.upcNote, /crossed out.*confirmation/);
  assert.ok(rows.filter(row => row.id !== unflavored.id).every(row => !row.upcNote));
  const vanilla1 = rows.find(row => row.id === "ProteinVanillaIsolate1lb");
  const vanilla2 = rows.find(row => row.id === "ProteinVanillaIsolate");
  assert.notEqual(vanilla1.upc, vanilla2.upc, "Different package UPCs must not be merged");
  assert.match(rows.find(row => row.id === "VeganVanilla").ingredients.map(item => item.text).join(" "), /Organic sucrose/);
  assert.match(rows.find(row => row.id === "probiotic-40").ingredients[0].text, /Lactobacillus paracasei \(Lpc-37\)/);
});

test("one- and two-pound isolates retain their own serving weights and container counts", () => {
  for (const flavor of ["Vanilla", "Chocolate"]) {
    const small = powderRows.find(row => row.id === `Protein${flavor}Isolate1lb`);
    const large = powderRows.find(row => row.id === `Protein${flavor}Isolate`);
    assert.equal(small.servingSize, "29 g");
    assert.equal(small.servingsPerContainer, "16 servings per container");
    assert.equal(large.servingSize, "31 g");
    assert.equal(large.servingsPerContainer, "29 servings per container");
  }
  const vegan = powderRows.find(row => row.id === "VeganVanilla");
  assert.equal(vegan.servingSize, "32 g");
  assert.equal(vegan.metrics.find(metric => metric.label === "Protein").value, "20g");
  const electrolytes = powderRows.find(row => row.id === "ElectrolyteLemonLime");
  assert.equal(electrolytes.servingSize, "4.5 g");
  assert.equal(electrolytes.servingsPerContainer, "30 servings per container");
});

test("supplement facts keep dose qualifiers and never borrow protein facts", () => {
  for (const product of supplements) {
    const row = supplementRows.find(row => row.id === product.id);
    assert.equal(row.metrics.length, 0);
    for (const fact of product.facts.filter(fact => !/^Serving size:|servings per (?:container|bottle)/i.test(fact))) assert.ok(row.facts.includes(fact));
  }
  const magnesium = supplementRows.find(row => row.id === "magnesium-complex");
  assert.equal(magnesium.servingSize, "1–2 capsules");
  assert.match(magnesium.servingsPerContainer, /30–60.*depending on use/);
  assert.ok(magnesium.facts.includes("Magnesium: 500 mg per two-capsule serving"));
  const fish = supplementRows.find(row => row.id === "omega-3");
  assert.equal(fish.servingSize, "1 softgel");
  assert.ok(fish.facts.some(fact => /EPA: 432 mg; DHA: 288 mg per softgel/.test(fact)));
});

test("current product claims stay intact and removed claims do not return", () => {
  for (const row of rows) {
    assert.ok(row.claims.some(claim => claim === "Low-FODMAP Ingredients*"), row.id);
    assert.doesNotMatch(row.claims.join(" · "), /NSF|GLP-?1 Friendly|ultra.filtered|digestive enzymes?:|papain|protease/i);
  }
  for (const row of powderRows.filter(row => row.family === "vegan")) assert.ok(!row.claims.some(claim => /No Added Sugar/.test(claim)));
});

test("printed flyer preserves every product, page number, serving, nutrient and full disclaimer",
  { timeout: 120_000 }, async t => {
    const root = path.resolve("generated-artifacts");
    fs.mkdirSync(root, { recursive: true });
    const outputDirectory = fs.mkdtempSync(path.join(root, "claims-flyer-pdf-test-"));
    t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));
    const result = await exportClaimsFlyer({
      url: process.env.CLAIMS_FLYER_TEST_URL,
      outputDirectory, screenshots: false,
    });
    assert.equal(result.pdf.products, rows.length);
    assert.equal(result.pdf.pages, flyerPageCount);
    assert.deepEqual(result.expected.products.map(row => row.id).sort(), rows.map(row => row.id).sort());
    const pages = await readClaimsFlyerPdf(result.pdfPath);
    const verify = mutated => verifyClaimsFlyerPdf(mutated, result.expected);
    const clone = () => structuredClone(pages);
    const removeText = (page, text) => {
      const tokens = text.split(/\s+/);
      // Remove matching words only inside one product's region to ensure that
      // another product or the claims appendix cannot satisfy the assertion.
      const card = result.expected.cards[0];
      page.words = page.words.filter(word => !(word.xMin >= card.box.x && word.xMax <= card.box.x + card.box.width &&
        word.yMin >= card.box.y && word.yMax <= card.box.y + card.box.height && tokens.includes(word.text)));
    };
    const card = result.expected.cards[0];
    const product = result.expected.products[0];
    for (const [name, mutate, error] of [
      ["missing physical page", pdf => pdf.pop(), /page count/],
      ["prohibited claim beyond overview", pdf => pdf[1].words.push({ ...pdf[1].words[0], text: "5 Major Electrolytes" }), /prohibited 5 Major Electrolytes/],
      ["extra blank physical page", pdf => pdf.push({ ...pdf[0], words: [] }), /page count/],
      ["wrong page numbering", pdf => { pdf[0].words = pdf[0].words.filter(word => word.text !== "/"); }, /numbering/],
      ["product only in claims appendix", pdf => removeText(pdf[card.page - 1], product.name), /printed PDF missing/],
      ["missing serving weight", pdf => removeText(pdf[card.page - 1], product.servingSize), /printed PDF missing/],
      ["missing container count", pdf => removeText(pdf[card.page - 1], product.servingsPerContainer), /printed PDF missing/],
      ["missing UPC", pdf => removeText(pdf[card.page - 1], product.upc), /printed PDF missing/],
      ["missing ingredients", pdf => removeText(pdf[card.page - 1], product.ingredients[0].text), /printed PDF missing/],
      ["missing nutrient value", pdf => removeText(pdf[card.page - 1], product.metrics[0].value), /PDF missing/],
      ["incomplete disclaimer", pdf => removeText(pdf[card.page - 1], "Individual tolerance varies."), /printed PDF missing/],
      ["unreadably shrunken facts", pdf => {
        const word = pdf[card.page - 1].words.find(word => word.text === "Serving" &&
          word.xMin >= card.box.x && word.xMax <= card.box.x + card.box.width &&
          word.yMin >= card.box.y && word.yMax <= card.box.y + card.box.height);
        word.yMax = word.yMin + 2;
      }, /unreadably small/],
    ]) {
      await t.test(name, () => {
        const pdf = clone();
        mutate(pdf);
        assert.throws(() => verify(pdf), error);
      });
    }
  });

test("generic checkmarks or print-hidden artwork cannot replace website claim icons",
  { timeout: 120_000 }, async t => {
    for (const [name, beforePrint, error] of [
      ["checkmark", page => page.locator(".handoff-claim [data-claim-icon]").first().evaluate(icon => {
        icon.outerHTML = '<svg data-claim-icon="check" width="23" height="23"><path d="M1 10l5 5 10-10"/></svg>';
      }), /Wrong flyer claim icon: Non-GMO/],
      ["print-hidden", page => page.addStyleTag({
        content: "@media print {.handoff-claim [data-claim-icon]{visibility:hidden!important}}",
      }), /Missing\/hidden flyer icon/],
    ]) {
      const outputDirectory = fs.mkdtempSync(path.resolve("generated-artifacts", `claims-icons-${name}-`));
      t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));
      await assert.rejects(exportClaimsFlyer({
        outputDirectory, screenshots: false, beforePrint,
      }), error);
      assert.ok(!fs.existsSync(path.join(outputDirectory, "stellar-labs-claims-and-nutrition-facts.pdf")));
    }
  });

test("text present on screen but hidden in print fails actual PDF verification",
  { timeout: 120_000 }, async t => {
    const root = path.resolve("generated-artifacts");
    fs.mkdirSync(root, { recursive: true });
    const outputDirectory = fs.mkdtempSync(path.join(root, "claims-flyer-print-omission-"));
    t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));
    await assert.rejects(exportClaimsFlyer({
      url: process.env.CLAIMS_FLYER_TEST_URL, outputDirectory, screenshots: false,
      beforePrint: page => page.addStyleTag({
        content: "@media print {.claims-facts-disclaimer {visibility:hidden!important}}",
      }),
    }), /printed PDF missing \*Based on the labeled serving size/);
    for (const filename of ["verification.json", "pending.pdf", "stellar-labs-claims-and-nutrition-facts.pdf"]) {
      assert.ok(!fs.existsSync(path.join(outputDirectory, filename)), `Failure left ${filename}`);
    }
  });

test("long facts and claims fail promptly without publishing a clipped PDF or success report",
  { timeout: 120_000 }, async t => {
    const root = path.resolve("generated-artifacts");
    fs.mkdirSync(root, { recursive: true });
    const outputDirectory = fs.mkdtempSync(path.join(root, "claims-flyer-overflow-test-"));
    t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));
    // A previous success must not make a failed run look successful.
    fs.writeFileSync(path.join(outputDirectory, "verification.json"), '{"stale":true}');
    fs.writeFileSync(path.join(outputDirectory, "stellar-labs-claims-and-nutrition-facts.pdf"), "STALE");
    await assert.rejects(exportClaimsFlyer({
      url: process.env.CLAIMS_FLYER_TEST_URL, outputDirectory, screenshots: false,
      beforePrint: injectLongFlyerCopy,
    }), error => {
      assert.match(error.message, /Content clipped in the flyer \(print\)/);
      assert.ok(error.message.length < 2500, "Overflow diagnostic must stay bounded");
      return true;
    });
    for (const filename of ["verification.json", "pending.pdf", "stellar-labs-claims-and-nutrition-facts.pdf"]) {
      assert.ok(!fs.existsSync(path.join(outputDirectory, filename)), `Failure left ${filename}`);
    }
  });
