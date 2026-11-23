import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { brandStorySource, renderBrandStory } from "../scripts/prepare-brand-story.mjs";

const brandStory = JSON.parse(fs.readFileSync(brandStorySource, "utf8"));
test("Why Stellar Labs uses the merchant's complete replacement paragraph without extra old copy", () => {
  assert.equal(brandStory.heading, "Why Stellar Labs?");
  assert.deepEqual(brandStory.paragraphs, [
    "Founded by a licensed nutritionist, Stellar Labs Nutrition was created to bridge the gap between traditional performance products and everyday nutritional needs.",
    "Our lean nutrition approach focuses on delivering more protein with less sugar and fewer calories, while being mindful of sodium and supporting lean muscle maintenance and everyday wellness.",
    "We also prioritize digestive comfort through thoughtfully selected, easy-to-digest ingredients and great-tasting formulas designed to make everyday nutrition simple and convenient.",
  ]);
});

function loadSource(filename, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename);
  if (filename.endsWith(".json")) return JSON.parse(fs.readFileSync(filename, "utf8"));
  const exports = {};
  cache.set(filename, exports);
  const javascript = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(javascript, {
    exports,
    require(specifier) {
      assert(specifier.startsWith("."), `Unexpected dependency: ${specifier}`);
      return loadSource(path.resolve(path.dirname(filename), specifier.endsWith(".json") ? specifier : `${specifier}.ts`), cache);
    },
  }, { filename });
  return exports;
}

test("live recipes apply approved wording without changing legacy routes, images or source references", () => {
  const directory = path.resolve("artifacts/stellar-review/src/pages/stellar/_shared");
  const original = JSON.parse(fs.readFileSync(path.join(directory, "recipes.json"), "utf8"));
  const live = loadSource(path.join(directory, "recipe-copy.ts")).default;
  for (const recipe of live) {
    const source = original.find(item => item.slug === recipe.slug);
    assert(source);
    for (const field of ["slug", "sourceUrl", "image", "videoUrls"]) {
      assert.equal(JSON.stringify(recipe[field]), JSON.stringify(source[field]), field);
    }
    assert.doesNotMatch(`${recipe.title} ${recipe.bodyHtml}`, /fodmap|guilt.free|healthy enough for breakfast|just 2g of sugar|all natural|sustainable energy|no bloat|Tumeric|Coconut Xtract|6 g fiber6 g fat|3-5 ice cubes, 3-5 cubes/i);
  }
  assert.equal(live.find(recipe => recipe.slug === "vegan-vanilla-anti-inflammatory-protein-shake").title, "Vegan Vanilla Ginger-Turmeric Protein Shake");
  assert(live.some(recipe => recipe.slug === "low-fodmap-strawberry-banana-vanilla-smoothie"));
});

test("recipe photos use bar-free edits while keeping the original photos available", () => {
  const directory = "artifacts/stellar-review";
  const recipes = JSON.parse(fs.readFileSync(`${directory}/src/pages/stellar/_shared/recipes.json`, "utf8"));
  const replacements = [
    ["cc030b1928fb37bfd9b6.jpg", "vanilla-board-no-bar.jpg"],
    ["a650ce6cc4069c4d3df5.jpg", "chocolate-desk-no-bar.jpg"],
    ["c384a128b280764a43b3.jpg", "chocolate-notebook-no-bar.jpg"],
    ["bab4114c356b4e263e9f.jpg", "vanilla-board-no-bar.jpg"],
  ];
  for (const [original, edited] of replacements) {
    assert(fs.existsSync(`${directory}/source-assets/images/stellar-recipes/${original}`), "Keep the original photo");
    assert(fs.existsSync(`${directory}/source-assets/images/stellar-recipes/${edited}`), "Keep the edited photo deployable");
    assert(recipes.some(recipe => recipe.image.endsWith(`/${edited}`)), "Use the edited photo in recipes");
    assert(!JSON.stringify(recipes).includes(original), "Do not expose the original bar photo in cards or bodies");
  }
});

for (const [name, directory, snapshot] of [
  ["review", "artifacts/stellar-review/src/pages/stellar", "artifacts/stellar-review/source-assets/stellar-current/homepage-snapshot.html"],
  ["Canvas", "artifacts/mockup-sandbox/src/components/mockups/stellar-labs", "artifacts/mockup-sandbox/public/stellar-current/homepage-snapshot.html"],
]) {
  test(`${name}: NSF claims are absent from website product copy`, () => {
    const quality = loadSource(path.resolve(directory, "_shared/quality-claims.ts"));
    for (const [name, statements] of Object.entries(quality)) {
      if (name === "heavyMetalsTestingClaim") {
        assert.equal(statements, "Tested for Heavy Metals");
        continue;
      }
      assert(Array.isArray(statements));
      assert.doesNotMatch(statements.join(" "), /\bNSF\b/i);
    }
    const { outlineProducts } = loadSource(path.resolve(directory, "_shared/outline-copy.ts"));
    for (const product of outlineProducts) assert.doesNotMatch(product.quality.join(" "), /\bNSF\b/i);
    assert.doesNotMatch(fs.readFileSync(path.join(directory, "StellarProductInformation.tsx"), "utf8"), /facilityClaim|\bNSF\b/);
  });

  test(`${name}: retired artwork cannot flash before homepage initialization`, () => {
    const html = fs.readFileSync(snapshot, "utf8");
    assert.doesNotMatch(html, /<img\b[^>]*c15a3b2fc53661a6\.svg/i);
    assert.match(html, /id="stellar-approved-first-paint"/);
    assert.match(html, /#MainContent \{ display:block!important; flex:0 0 auto!important; height:auto!important/);
    assert.match(html, /\.stellar-callout-row:not\(\[data-stellar-claim-icons-mapped\]\) \{ visibility:hidden!important/);
  });

  test(`${name}: saved homepage contains the approved brand story`, () => {
    const html = fs.readFileSync(snapshot, "utf8");
    assert.equal(html, renderBrandStory(html, brandStory), "Saved story is stale; run node scripts/prepare-brand-story.mjs");
    assert(!html.includes("Cellar Labs"));
    assert(!html.includes("Our formulas are designed to help you get enough protein to protect lean muscle"));
  });

  test(`${name}: Mixed Berry matches isolate wording without copying another flavor's facts`, () => {
    const { getPowderCopy } = loadSource(path.resolve(directory, "_shared/powder-copy.ts"));
    const mixedBerry = getPowderCopy({ component: "ProteinMixedBerry", formula: "isolate", flavor: "Mixed Berry", size: "1lb" });
    const cappuccino = getPowderCopy({ component: "ProteinCappuccino", formula: "isolate", flavor: "Cappuccino", size: "1lb" });
    assert.equal(mixedBerry.description, cappuccino.description.replace("Cappuccino", "Mixed Berry"));
    assert.equal(mixedBerry.servings, 16);
    assert(mixedBerry.facts.some(fact => /110/.test(fact)));
    assert(mixedBerry.facts.some(fact => /29/.test(fact)));
  });
}
