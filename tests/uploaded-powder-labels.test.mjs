import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const pairs = [
  ["ProteinChocolateBlend", "chocolate-whey-blend-2lb", "StellarLabs_2LB_WHEY_Shake_Chocolate_061225_1792785123049.ai"],
  ["VeganChocolate", "chocolate-vegan-2lb", "StellarLabs_2LB_VEGAN_Shake_Chocolate_061225_OL_1792785152749.ai"],
  ["VeganVanilla", "vanilla-vegan-2lb", "StellarLabs_2LB_VEGAN_Shake_Vanilla_061225_OL_1792785179601.ai"],
  ["ProteinVanillaIsolate", "vanilla-whey-isolate-2lb", "StellarLabs_2LB_WHEY-ISOLATE_Shake_Vanilla_072825_1792785393932.ai"],
  ["ProteinCaramelBlend", "salted-caramel-whey-blend-2lb", "StellarLabs_2LB_WHEY_Shake_SaltedCaramel_061225_1792785278798.ai"],
  ["ProteinVanillaBlend", "vanilla-whey-blend-2lb", "StellarLabs_2LB_WHEY_Shake_Vanilla_061225_1792785393932.ai"],
  ["ProteinChocolateIsolate", "chocolate-whey-isolate-2lb", "StellarLabs_2LB_WHEY-ISOLATE_Shake_Chocolate_072825_OL_1792785393932.pdf"],
  ["ProteinCappuccino", "cappuccino-whey-isolate-1lb", "StellarLabs_1LB_WHEY-ISOLATE_Shake_Capuccino_072825_1792785393932.ai"],
  ["ProteinMixedBerry", "berry-whey-isolate-1lb", "StellarLabs_1LB_WHEY-ISOLATE_Shake_MixedBerry_072825_1792785393932.ai"],
  ["ProteinUnflavored", "unflavored-whey-isolate-1lb", "StellarLabs_1LB_WHEY-ISOLATE_Shake_Unflavored_011725_1792785393932.pdf"],
];
const roots = ["artifacts/stellar-review/source-assets", "artifacts/mockup-sandbox/public"];
const hash = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
test("each uploaded label preserves its exact original document in both previews", async () => {
  for (const [, slug, filename] of pairs) {
    const original = await fs.readFile(`attached_assets/${filename}`);
    for (const root of roots) {
      const pdf = await fs.readFile(`${root}/images/stellar-labels/${slug}-label.pdf`);
      assert.equal(hash(pdf), hash(original), slug);
      for (const suffix of ["facts", "label"]) {
        const png = await fs.readFile(`${root}/images/stellar-labels/${slug}-${suffix}.png`);
        assert.equal(png.subarray(1,4).toString(), "PNG", slug);
      }
    }
  }
});
test("uploaded labels match their package and 1 lb labels use the merchant's matching photographs", async () => {
  const main = await fs.readFile("artifacts/stellar-review/src/pages/stellar/_shared/uploaded-powder-labels.ts", "utf8");
  const canvas = await fs.readFile("artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared/uploaded-powder-labels.ts", "utf8");
  assert.equal(main, canvas);
  for (const [component, slug] of pairs) {
    assert.match(main, new RegExp(`${component}: label\\("[^"]+", "${slug}"\\)`));
  }
  assert.match(main, /ProteinChocolateIsolate1lb: photoLabel\("Chocolate", "chocolate", "859312006114"\)/);
  assert.match(main, /ProteinVanillaIsolate1lb: photoLabel\("Vanilla", "vanilla", "859312006046"\)/);
  assert.doesNotMatch(main, /2 lb label reference|referenceLabel/);
  for (const flavor of ["chocolate", "vanilla"]) {
    for (const suffix of ["facts.png", "label.png", "label.pdf"]) {
      const file = `${flavor}-whey-isolate-1lb-${suffix}`;
      const a = await fs.readFile(`artifacts/stellar-review/source-assets/images/stellar-labels/${file}`);
      const b = await fs.readFile(`artifacts/mockup-sandbox/public/images/stellar-labels/${file}`);
      assert.ok(a.length > 1000);
      assert.deepEqual(a, b, file);
    }
  }
});
