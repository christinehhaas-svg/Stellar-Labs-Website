import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

const directories = [
  "artifacts/stellar-review/src/pages/stellar/_shared",
  "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared",
];

// Exercise the real TypeScript modules, including their JSON dependencies.
function modules(directory) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith(".json")) {
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      cache.set(file, value);
      return value;
    }
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
    });
    return exports;
  }
  return name => load(path.resolve(directory, name));
}

const approved = {
  ProteinMixedBerry: [29, 16, 25],
  ProteinUnflavored: [29, 16, 25],
  ProteinCappuccino: [30, 16, 25],
  ProteinChocolateIsolate: [31, 29, 25],
  ProteinVanillaIsolate: [31, 29, 26],
  ProteinCaramelBlend: [32, 28, 24],
  ProteinVanillaBlend: [33, 28, 24],
  ProteinChocolateBlend: [33, 28, 24],
  VeganChocolate: [32, 28, 20],
  VeganVanilla: [32, 28, 20],
  ElectrolyteLemonLime: [4.5, 30],
  ElectrolyteStrawberry: [6.5, 40],
};
// Preview-only listings are outline-sourced, not verified package transcriptions.
const outlineOnly = ["ProteinChocolateIsolate1lb", "ProteinVanillaIsolate1lb"];

for (const directory of directories) {
  const load = modules(directory);
  const { getPowderCopy } = load("powder-copy.ts");
  const { getPowderServingDecision, servingDecisions, servingDecisionNote } = load("serving-decisions.ts");
  const products = ["protein", "vegan", "electrolyte"].flatMap(category => load(`${category}-products.json`));

  test(`${directory}: Lemon Lime displays verified net weight without changing package identity or serving facts`, () => {
    const lemon = products.find(product => product.component === "ElectrolyteLemonLime");
    const copy = getPowderCopy(lemon);
    const { powderServingSize } = modules(directories[0])("product-servings.ts");
    assert.equal(lemon.size, "30 servings");
    assert.equal(copy.containerWeight, "135 g");
    assert.equal(`${lemon.flavor} · ${copy.containerWeight} · ${copy.servings} servings`, "Lemon Lime · 135 g · 30 servings");
    assert.equal(powderServingSize(copy), "4.5 g per serving");
    assert.throws(() => getPowderCopy({ ...lemon, size: "135 g" }), /Package identity mismatch.*size/);
    for (const product of products.filter(product => product.component !== lemon.component)) {
      assert.equal(getPowderCopy(product).containerWeight, undefined, `${product.component} retains its catalog size`);
    }
    const component = fs.readFileSync(path.join(directory, "ProteinProductPage.tsx"), "utf8");
    assert.ok(component.includes('copy.containerWeight ?? product.size.replace(/(\\d+)lb/i, "$1 lb")'));
  });

  test(`${directory}: every current package retains approved facts or explicit outline provenance`, () => {
    assert.equal(products.length, Object.keys(approved).length + outlineOnly.length);
    for (const product of products) {
      if (outlineOnly.includes(product.component)) {
        const copy = getPowderCopy(product);
        assert.equal(product.size, "1lb");
        assert.equal(copy.servings, 16);
        assert.equal(copy.facts[0], "Calories: 110 per serving");
        assert.equal(copy.facts[1], "Protein: 25g per serving");
        assert.ok(copy.facts.includes("Serving size: 29g (1 scoop)"));
        assert.ok(copy.facts.includes("Servings per container: 16"));
        assert.match(copy.sourceNote, /merchant-supplied photographs/);
        assert.match(copy.sourceNote, /UPC replacing the barcode in place/);
        continue;
      }
      const [grams, servings, protein] = approved[product.component];
      const copy = getPowderCopy(product);
      assert.ok(copy.facts.includes(`Serving size: 1 ${product.formula === "electrolyte" ? "" : "rounded "}scoop (${grams}g)`));
      assert.ok(copy.facts.includes(`${servings} servings per container`));
      assert.equal(copy.servings, servings);
      if (protein !== undefined) assert.ok(copy.facts.includes(`Protein: ${protein}g per serving`), `${product.component} retains its exact protein amount`);
    }
    const cappuccino = servingDecisions.ProteinCappuccino;
    assert.ok(cappuccino.packageFacts.includes("Serving size: 1 rounded scoop (30g)"));
    assert.ok(cappuccino.approvedFacts.includes("Serving size: 1 rounded scoop (30g)"));
    const caramel = servingDecisions.ProteinCaramelBlend;
    assert.ok(caramel.packageFacts.includes("Serving size: 1 rounded scoop (32g)"));
    assert.ok(caramel.approvedFacts.includes("Serving size: 1 rounded scoop (32g)"));
    assert.match(servingDecisionNote("magnesium-complex"), /1–2 capsules/);
  });

  test(`${directory}: reused components cannot inherit facts at another size or identity`, () => {
    for (const product of products) {
      for (const size of [undefined, null, "", "5lb", product.size === "1lb" ? "2lb" : "1lb"]) {
        assert.throws(() => getPowderCopy({ ...product, size }), /Package identity mismatch.*size/);
      }
      for (const field of ["formula", "flavor"]) {
        assert.throws(() => getPowderCopy({ ...product, [field]: "different" }),
          new RegExp(`Package identity mismatch.*${field}`));
      }
      assert.throws(() => getPowderCopy({ ...product, component: `${product.component}NewSize`, size: "5lb" }),
        /Missing verified label facts/);
    }
    assert.throws(() => getPowderCopy({ component: "toString", formula: "isolate", flavor: "Vanilla", size: "2lb" }),
      /Missing verified label facts/);
  });

  test(`${directory}: merchant decisions independently reject mismatched and missing package identity`, () => {
    for (const product of products.filter(product => servingDecisions[product.component])) {
      assert.equal(getPowderServingDecision(product), servingDecisions[product.component]);
      for (const field of ["size", "formula", "flavor"]) {
        assert.throws(() => getPowderServingDecision({ ...product, [field]: "different" }),
          new RegExp(`Package identity mismatch.*${field}`));
      }
      const decision = servingDecisions[product.component];
      const identity = decision.packageIdentity;
      try {
        decision.packageIdentity = { ...identity, size: "5lb" };
        assert.throws(() => getPowderCopy(product), /Package identity mismatch.*size/);
        delete decision.packageIdentity;
        assert.throws(() => getPowderCopy(product), /Missing powder package identity/);
      } finally {
        decision.packageIdentity = identity;
      }
    }
    assert.equal(getPowderServingDecision({ component: "Unknown", formula: "isolate", flavor: "Vanilla", size: "5lb" }), undefined);
  });

  test(`${directory}: homepage summaries use the same validated serving facts`, () => {
    const { nutritionDescriptions } = load("nutrition-data.ts");
    for (const product of products) {
      assert.equal(JSON.stringify(nutritionDescriptions[product.handle].facts), JSON.stringify(getPowderCopy(product).facts));
    }
  });
}

test("review and Canvas keep identical package validation and serving decisions", () => {
  for (const file of ["powder-copy.ts", "serving-decisions.ts"]) {
    assert.equal(fs.readFileSync(path.join(directories[0], file), "utf8"),
      fs.readFileSync(path.join(directories[1], file), "utf8").replace(/from "([^"]+)"/g, (statement, specifier) => {
        const resolved = path.resolve(path.dirname(path.join(directories[1], file)), specifier);
        for (const helper of ["website-copy", "nutrition-order"]) {
          const owner = path.resolve(directories[0], helper);
          if (resolved === owner) {
            assert.ok(fs.existsSync(`${owner}.ts`), `Missing shared ${helper}`);
            return `from "./${helper}"`;
          }
        }
        return statement;
      }), `${file} drifted`);
  }
});
