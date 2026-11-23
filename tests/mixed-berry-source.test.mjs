import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { test } from "node:test";

function loadCopy(directory, entry = "powder-copy.ts") {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    if (filename.endsWith(".json")) {
      const value = JSON.parse(fs.readFileSync(filename, "utf8"));
      // Strawberry must never supply Mixed Berry copy, even if the outline changes.
      for (const product of value.products ?? []) {
        if (product.id === "ProteinStrawberry") {
          for (const key of ["description", "suggestedUse"]) product[key] = "STRAWBERRY_ONLY";
          for (const key of ["benefits", "quality", "facts", "warnings"]) product[key] = ["STRAWBERRY_ONLY"];
          product.support = [{ title: "STRAWBERRY_ONLY", description: "STRAWBERRY_ONLY" }];
        }
      }
      cache.set(filename, value);
      return value;
    }
    const exports = {};
    cache.set(filename, exports);
    const javascript = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(javascript, {
      exports,
      require(specifier) {
        assert.ok(specifier.startsWith("."), `Unexpected import: ${specifier}`);
        return load(path.resolve(path.dirname(filename), specifier.endsWith(".json") ? specifier : `${specifier}.ts`));
      },
    });
    return exports;
  }
  return load(path.resolve(directory, entry));
}

const directories = [
  "artifacts/stellar-review/src/pages/stellar/_shared",
  "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared",
];

const identity = {
  // Current storefront display title; the original source URL and handle stay
  // unchanged, as do the independent label facts and artwork assertions below.
  title: "Mixed Berry Whey Protein Isolate · 1 lb",
  handle: "100-isolate-whey-protein-shake-mixed-berry",
  source: "https://www.stellarlabsnutrition.com/products/100-isolate-whey-protein-shake-mixed-berry",
};
const facts = [
  "Serving size: 1 rounded scoop (29g)",
  "16 servings per container",
  "Protein: 25g per serving",
  "Calories: 110 per serving",
  "Total sugars: 0g per serving",
];
const labelFiles = [1, 2].map(index => `images/stellar-proteins/${identity.handle}-${index}.png`);
const removedPublicNote = /Merchant-confirmed store handoff:\s*Mixed Berry 1lb/i;

function assertInternalProvenance(text) {
  assert.match(text, removedPublicNote);
  assert.match(text, /Strawberry isolate remains a separate source reference/);
  assert.match(text, /do not substitute Strawberry’s nutrition facts/);
}

for (const directory of directories) {
  test(`${directory}: Mixed Berry retains independent label facts and source`, () => {
    const { getPowderCopy } = loadCopy(directory);
    const copy = getPowderCopy({ component: "ProteinMixedBerry", formula: "isolate", flavor: "Mixed Berry", size: "1lb" });
    assert.ok(!JSON.stringify(copy).includes("STRAWBERRY_ONLY"));
    assert.ok(copy.facts.includes("Serving size: 1 rounded scoop (29g)"));
    assert.ok(copy.facts.includes("16 servings per container"));
    assert.ok(copy.facts.includes("Protein: 25g per serving"));
    assert.ok(copy.facts.includes("Calories: 110 per serving"));
    assert.ok(copy.facts.includes("Total sugars: 0g per serving"));
    assert.ok(copy.warnings.includes("Contains milk and soy."));
    assert.match(copy.suggestedUse, /6–8 ounces/);
    assert.doesNotMatch(JSON.stringify(copy), removedPublicNote,
      "Internal merchant provenance must not return in public product copy");
    const catalog = JSON.parse(fs.readFileSync(path.join(directory, "protein-products.json"), "utf8"));
    const product = catalog.find(product => product.component === "ProteinMixedBerry");
    assert.equal(product.source, identity.source);
    assert.equal(product.title, identity.title);
    assert.equal(product.handle, identity.handle);
    assert.equal(product.flavor, "Mixed Berry");
    assert.equal(product.size, "1lb");
    assert.equal(product.formula, "isolate");
    assert.equal(copy.servings, 16);
    assert.deepEqual(product.images.slice(1).map(image => image.src), labelFiles.map(file => `/__mockup/${file}`));
    assert.equal(product.images.length, 3);
    assert.ok(product.images.every(image => /MixedBerry/.test(image.original)));
    for (const [index, side] of ["Left", "Right"].entries()) {
      assert.equal(path.basename(new URL(product.images[index + 1].original).pathname),
        `SL_WheyIsolateShake_1LB_MixedBerry-${side}.png`);
    }
    assert.ok(!catalog.some(product => product.component === "ProteinStrawberry"));
  });

  test(`${directory}: Mixed Berry provenance remains an internal source record`, () => {
    const { mixedBerryNote, mixedBerrySource } = loadCopy(directory, "outline-copy.ts");
    assertInternalProvenance(mixedBerryNote);
    assert.equal(mixedBerrySource, identity.source);
  });
}

test("Review and Canvas keep the same Mixed Berry copy", () => {
  const copies = directories.map(directory => loadCopy(directory).getPowderCopy({
    component: "ProteinMixedBerry", formula: "isolate", flavor: "Mixed Berry", size: "1lb",
  }));
  assert.equal(JSON.stringify(copies[0]), JSON.stringify(copies[1]));
});

const root = fileURLToPath(new URL("../", import.meta.url));
const slug = "stellar-whey-isolate-website-handoff";
const outlineName = "stellar-product-info-claims-outline.pdf";
const sentinel = "STRAWBERRY_ONLY_EXPORT_SENTINEL";
const normalize = text => text.replace(/\s+/g, " ").trim();
function htmlText(html) {
  return normalize(html.replace(/<img\b[^>]*>/g, "").replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"'));
}
function assertNutrition(text) {
  for (const fact of facts) assert.ok(normalize(text).includes(fact), `Missing Mixed Berry fact: ${fact}`);
  assert.doesNotMatch(text, removedPublicNote,
    "Internal merchant provenance must not return in public handoff descriptions");
  assert.ok(!text.includes(sentinel), "Strawberry outline leaked into Mixed Berry");
  assert.doesNotMatch(text, /Total sugars:\s*(?!0g\b)\d+\s*g/i);
}
function mixedBerryArticles(html) {
  // Match only the copy article and its following label article, not another
  // flavor's nutrition or the cover's historical Strawberry reference.
  const start = html.indexOf(`<article id="product-${identity.handle}"`);
  assert.ok(start >= 0, "Missing Mixed Berry product article");
  const copyEnd = html.indexOf("</article>", start);
  const labelEnd = html.indexOf("</article>", copyEnd + 10);
  assert.ok(copyEnd > start && labelEnd > copyEnd, "Missing Mixed Berry label article");
  return { copy: html.slice(start, copyEnd), labels: html.slice(copyEnd + 10, labelEnd) };
}
function assertHandoffHtml(html, assetDir, embedded) {
  const { copy, labels } = mixedBerryArticles(html);
  assert.ok(copy.includes(`<h1>${identity.title}</h1>`), "Wrong product-page identity");
  assert.ok(htmlText(copy).includes("16 servings · 1lb · Mixed Berry"), "Stale serving summary");
  assert.ok(copy.includes(`href="${identity.source}"`), "Wrong merchant source link");
  assertNutrition(htmlText(copy));
  assert.ok(htmlText(labels).includes(identity.title), "Wrong label-page identity");
  const matches = [...labels.matchAll(/data-original-file="([^"]+)" src="([^"]+)"/g)];
  assert.deepEqual(matches.map(match => match[1]), labelFiles, "Wrong flavor label panels");
  for (const [, file, src] of matches) {
    const bytes = fs.readFileSync(path.join(assetDir, file));
    if (embedded) {
      assert.ok(src.startsWith("data:image/png;base64,"), "Label is not embedded");
      assert.deepEqual(Buffer.from(src.split(",")[1], "base64"), bytes, `Changed artwork: ${file}`);
    } else {
      assert.equal(src, `original-assets/${file}`, "Broken editable label link");
    }
  }
}
function assertHandoffPdf(pdf) {
  // Re-extract from the PDF, never trust a possibly stale .txt sidecar.
  const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  const sections = text.split(identity.title);
  assert.equal(sections.length, 4, "PDF must contain Mixed Berry in the catalog, copy and label pages");
  assert.ok(normalize(sections[2]).includes("16 servings · 1lb · Mixed Berry"), "Stale PDF summary");
  assertNutrition(normalize(sections[2]));
  for (const file of labelFiles) {
    assert.ok(sections[3].includes(path.basename(file)), `Missing PDF label: ${file}`);
  }
  const urls = execFileSync("pdfinfo", ["-url", pdf], { encoding: "utf8" });
  assert.ok(urls.includes(identity.source), "PDF lost the merchant's original listing link");
  return text;
}

test("Mixed Berry survives fresh HTML/PDF export and editable archive regeneration", { timeout: 300_000 }, () => {
  for (const executable of ["chromium", "pdftotext", "pdfinfo", "mutool", "zip", "unzip"]) {
    assert.doesNotThrow(() => execFileSync("which", [executable], { stdio: "pipe" }),
      `Missing ${executable}; see tests/handoff/README.md`);
  }
  const generated = path.join(root, "generated-artifacts");
  fs.mkdirSync(generated, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(generated, "mixed-berry-handoff-"));
  try {
    // The exporter resolves inputs from cwd. Give it disposable source copies
    // and read-only access to real artwork; never overwrite live previews.
    const source = path.join(fixture, directories[0]);
    fs.cpSync(path.join(root, directories[0]), source, { recursive: true });
    const assetDir = path.join(root, "artifacts/stellar-review/public/review-assets");
    const fixturePublic = path.join(fixture, "artifacts/stellar-review/public");
    fs.mkdirSync(fixturePublic, { recursive: true });
    fs.symlinkSync(assetDir, path.join(fixturePublic, "review-assets"), "dir");
    const output = path.join(fixture, "exports/stellar-website-handoff");
    const archive = path.join(fixture, "exports/stellar-website-editable-handoff.zip");
    const preview = path.join(fixture, "artifacts/mockup-sandbox/public/handoff");
    const exporter = path.join(root, "artifacts/stellar-review/scripts/export-handoff.mjs");

    for (const adversarial of [false, true]) {
      if (adversarial) {
        const outlinePath = path.join(source, "pdf-product-outline.json");
        const outline = JSON.parse(fs.readFileSync(outlinePath, "utf8"));
        const strawberry = outline.products.find(product => product.id === "ProteinStrawberry");
        assert.ok(strawberry, "Preserved Strawberry reference must still exist");
        for (const key of ["description", "suggestedUse"]) strawberry[key] = sentinel;
        for (const key of ["benefits", "quality", "warnings"]) strawberry[key] = [sentinel];
        strawberry.facts = [sentinel, "Serving size: 1 rounded scoop (99g)",
          "99 servings per container", "Protein: 99g per serving", "Total sugars: 99g per serving"];
        strawberry.servings = 99;
        strawberry.support = [{ title: sentinel, description: sentinel }];
        fs.writeFileSync(outlinePath, JSON.stringify(outline));
        // A second run must replace stale output in every exported format.
        for (const file of [
          path.join(output, `${slug}.html`), path.join(output, `${slug}.pdf`),
          path.join(output, `${slug}.txt`), path.join(output, "web-team-files", `${slug}.html`),
          path.join(preview, `${slug}.html`), path.join(preview, `readable-${slug}.html`), archive,
        ]) fs.writeFileSync(file, "STALE_HANDOFF");
      }
      execFileSync(process.execPath, [exporter, `--pack=${slug}`, "--pdf", "--zip"], {
        cwd: fixture, stdio: "pipe", timeout: 120_000,
      });
      for (const [directory, filename, embedded] of [
        [output, `${slug}.html`, true],
        [path.join(output, "web-team-files"), `${slug}.html`, false],
        [preview, `${slug}.html`, true],
        [preview, `readable-${slug}.html`, false],
      ]) assertHandoffHtml(fs.readFileSync(path.join(directory, filename), "utf8"), assetDir, embedded);
      const pdfText = assertHandoffPdf(path.join(output, `${slug}.pdf`));
      assert.equal(fs.readFileSync(path.join(output, `${slug}.txt`), "utf8"), pdfText);

      // Extract the actual ZIP instead of just checking the staging folder.
      const extracted = path.join(fixture, adversarial ? "regenerated-archive" : "first-archive");
      execFileSync("unzip", ["-q", archive, "-d", extracted], { stdio: "pipe" });
      const editable = path.join(extracted, "web-team-files");
      assertHandoffHtml(fs.readFileSync(path.join(editable, `${slug}.html`), "utf8"), assetDir, false);
      for (const file of labelFiles) {
        assert.deepEqual(fs.readFileSync(path.join(editable, "original-assets", file)),
          fs.readFileSync(path.join(assetDir, file)), `Archive artwork changed: ${file}`);
      }
      // Historical Strawberry information is allowed in the supplied PDF,
      // which must remain byte-for-byte unchanged in every delivery location.
      for (const directory of [output, path.join(output, "web-team-files"), preview, editable]) {
        assert.deepEqual(fs.readFileSync(path.join(directory, outlineName)),
          fs.readFileSync(path.join(assetDir, "documents", outlineName)), "Original outline PDF changed");
      }
      for (const directory of [output, editable]) {
        const readme = fs.readFileSync(path.join(directory, "READ-ME.txt"), "utf8");
        assert.ok(readme.includes(identity.source));
        assertInternalProvenance(readme);
      }
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("handoff assertions reject Strawberry substitution, stale summaries and restored merchant notes", () => {
  const copy = [
    `<article id="product-${identity.handle}"><h1>${identity.title}</h1>`,
    `<p>16 servings · 1lb · Mixed Berry</p><a href="${identity.source}">Source</a>`,
    ...facts.map(fact => `<p>${fact}</p>`), "</article>",
    `<article><h1>${identity.title}</h1>`,
    ...labelFiles.map(file => `<img data-original-file="${file}" src="original-assets/${file}">`),
    "</article>",
  ].join("");
  const assetDir = path.join(root, "artifacts/stellar-review/public/review-assets");
  assertHandoffHtml(copy, assetDir, false);
  for (const [before, after] of [
    ["Total sugars: 0g per serving", "Total sugars: 1g per serving"],
    ["16 servings ·", "99 servings ·"],
    ["(29g)", "(99g)"],
    ["16 servings per container", "99 servings per container"],
    ["Protein: 25g", "Protein: 99g"],
    [identity.source, identity.source.replace("mixed-berry", "strawberry")],
    [labelFiles[0], labelFiles[0].replace("mixed-berry", "strawberry")],
    [`<h1>${identity.title}`, "<h1>Strawberry isolate"],
    ["</article>", "<p>Merchant-confirmed store handoff: Mixed Berry 1lb</p></article>"],
  ]) assert.throws(() => assertHandoffHtml(copy.replace(before, after), assetDir, false),
    undefined, `Did not reject ${after}`);
});
