import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reviewPath = "artifacts/stellar-review/src/pages/stellar/_shared/homepage-typography.ts";
const canvasPath = "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared/homepage-typography.ts";
const workspaceRoot = new URL("../../", import.meta.url);

test("homepage and returns replace nested documents after a preview code refresh", async () => {
  const read = file => readFile(new URL(file, workspaceRoot), "utf8");
  for (const file of [
    "artifacts/stellar-review/src/pages/stellar/Homepage.tsx",
    "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/Homepage.tsx",
    "artifacts/stellar-review/src/pages/stellar/ShippingPolicies.tsx",
  ]) {
    const source = await read(file);
    assert.match(source, /const snapshotRevision = import\.meta\.env\.DEV \? Date\.now\(\)\.toString\(36\)/);
    assert.match(source, /key=\{(?:snapshotRevision|`\$\{snapshotRevision\}-\$\{attempt\}`)\}/);
    assert.ok(source.includes("revision=${snapshotRevision}"));
  }
  const homepage = await read("artifacts/stellar-review/src/pages/stellar/Homepage.tsx");
  assert.ok(homepage.includes("[attempt, comparisonPage, fullCatalog, snapshotRevision]"));
  const returns = await read("artifacts/stellar-review/src/pages/stellar/ShippingPolicies.tsx");
  assert.ok(returns.includes("useProductSnapshot(initializeSnapshot, snapshotRevision)"));
  const hook = await read("artifacts/stellar-review/src/pages/stellar/_shared/useProductSnapshot.ts");
  assert.ok(hook.includes("[attempt, initialize, revision]"));
});

test("homepage handoff keeps the readable formula callout beside the photo", async () => {
  const directory = "artifacts/stellar-review/handoff/homepage/";
  const read = path => readFile(new URL(path, workspaceRoot), "utf8");
  const [template, css, readme, exporter] = await Promise.all([
    read(`${directory}stellar-homepage-hero.liquid`),
    read(`${directory}stellar-homepage.css`),
    read(`${directory}README.md`),
    read("artifacts/stellar-review/scripts/export-homepage-handoff.mjs"),
  ]);
  assert.ok(template.includes('<span class="stellar-home-formula">{{ section.settings.formula_note | escape }}</span>'));
  assert.ok(template.includes('"default": "New Look, Same Formula"'));
  assert.ok(exporter.includes('<span class="stellar-home-formula">${esc(copy.formulaNote)}</span>'));
  assert.ok(exporter.includes('formulaNote: "New Look, Same Formula"'));
  assert.match(css, /\.stellar-home-formula \{ position: absolute;[^}]*background: transparent;/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.stellar-home-formula \{ font-size: 15px;/);
  assert.ok(css.includes("object-fit: contain"));
  assert.ok(css.includes("order: 1"));
  assert.ok(css.includes("order: 2"));
  assert.ok(css.includes("background-image: linear-gradient(rgba(13,15,20,.48)"));
  assert.ok(!css.includes("background-blend-mode: multiply"));
  assert.ok(readme.includes("Beside the product image: **New Look, Same Formula**"));
});

test("review and Canvas homepage presentation initializers stay identical", async () => {
  const [review, canvas] = await Promise.all(
    [reviewPath, canvasPath].map(path => readFile(new URL(path, workspaceRoot), "utf8")),
  );

  assert.equal(
    canvas,
    review,
    [
      "Homepage presentation drift detected. Apply presentation fixes to BOTH:",
      `  ${reviewPath}`,
      `  ${canvasPath}`,
      "Keep route/asset differences in each preview's adapters, not in these initializers.",
      "Do not change Homepage.tsx routing or sandbox permissions to resolve this failure.",
    ].join("\n"),
  );
});
