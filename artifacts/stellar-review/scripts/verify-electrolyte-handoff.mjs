import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Independently transcribed from the original Supplement Facts panels, not
// derived from the copy being tested. Do not interchange these flavor values.
export const labelFacts = [
  { component: "ElectrolyteLemonLime", flavor: "Lemon Lime", handle: "supplements-lemon-lime-electrolyte-powder",
    grams: 4.5, servings: 30, potassium: 280, magnesium: 51, calcium: 47 },
  { component: "ElectrolyteStrawberry", flavor: "Strawberry", handle: "strawberry-electrolyte-powder",
    grams: 6.5, servings: 40, potassium: 340, magnesium: 40, calcium: 50 },
];
export const electrolytePacks = [
  "stellar-electrolytes-website-handoff",
  "stellar-product-info-matched-bottles-website-handoff",
];
const shared = "artifacts/stellar-review/src/pages/stellar/_shared";
const original = "artifacts/stellar-review/source-assets";
const normalize = text => text.replace(/\s+/g, " ").trim();
const htmlText = html => normalize(html.replace(/<img\b[^>]*>/g, "").replace(/<[^>]+>/g, " ")
  .replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"'));
const panelFiles = fact => [1, 2].map(index => `images/stellar-electrolytes/${fact.handle}-${index}.png`);

function load(filename, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename);
  if (filename.endsWith(".json")) return JSON.parse(fs.readFileSync(filename, "utf8"));
  const exports = {};
  cache.set(filename, exports);
  const javascript = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(javascript, { exports, require(specifier) {
    assert(specifier.startsWith("."), `Unexpected import: ${specifier}`);
    return load(path.resolve(path.dirname(filename), specifier.endsWith(".json") ? specifier : `${specifier}.ts`), cache);
  } });
  return exports;
}

export function assertFlavorText(text, fact) {
  text = normalize(text);
  assert(text.includes(`Each ${fact.grams}g scoop contains ${fact.potassium}mg potassium, ${fact.magnesium}mg magnesium, and ${fact.calcium}mg calcium.`),
    `${fact.flavor}: missing or substituted mineral amounts`);
  assert.match(text, /5 major electrolytes—sodium, potassium, magnesium, calcium, and chloride/i);
  for (const other of labelFacts.filter(other => other !== fact)) {
    for (const mineral of ["potassium", "magnesium", "calcium"]) {
      assert(!text.includes(`${other[mineral]}mg ${mineral}`), `${fact.flavor}: ${other.flavor} ${mineral} leaked`);
    }
  }
  assert.doesNotMatch(text, /\b(?:four|4) (?:of the most important |major )?electrolytes/i);
}

export function websiteCopies(root) {
  const copies = [];
  for (const directory of [shared, "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared"]) {
    const { getPowderCopy } = load(path.join(root, directory, "powder-copy.ts"));
    const products = JSON.parse(fs.readFileSync(path.join(root, directory, "electrolyte-products.json"), "utf8"));
    const results = labelFacts.map(fact => {
      const product = products.find(product => product.component === fact.component);
      assert(product, `Missing ${fact.flavor} product`);
      assert.equal(product.flavor, fact.flavor);
      assert.equal(product.handle, fact.handle);
      assert.deepEqual(product.images.slice(1).map(panel => panel.src), panelFiles(fact).map(file => `/__mockup/${file}`));
      const copy = getPowderCopy(product);
      assertFlavorText(copy.description, fact);
      assert(copy.quality.includes("5 Major Electrolytes"));
      assert.equal(copy.facts[0], `Serving size: 1 scoop (${fact.grams}g)`);
      assert.equal(copy.servings, fact.servings);
      assert.equal(copy.quality.some(claim => /FODMAP/i.test(claim)), false);
      return JSON.parse(JSON.stringify(copy));
    });
    copies.push(results);
  }
  assert.deepEqual(copies[0], copies[1], "Review/Canvas electrolyte copy differs");
  return copies[0];
}

export function assertHandoffHtml(html, root, copies, { embedded, labels }) {
  for (const [index, fact] of labelFacts.entries()) {
    const title = `${fact.flavor} Electrolyte Powder`;
    const articles = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
    const productArticles = articles.filter(article => article.includes(`<h1>${title}</h1>`));
    assert.equal(productArticles.length, labels ? 2 : 1, `${title}: missing product or label article`);
    const copy = htmlText(productArticles[0]);
    assertFlavorText(copy, fact);
    assert(copy.includes(normalize(copies[index].description)), `${title}: stale website description`);
    assert(copy.includes("5 Major Electrolytes"), `${title}: missing quality claim`);
    assert(copy.includes(`Serving size: 1 scoop (${fact.grams}g)`));
    assert(copy.includes(`${fact.servings} servings per container`));
    for (const claim of copies[index].quality) assert(copy.includes(claim), `${title}: missing ${claim}`);
    if (fact.flavor === "Strawberry") assert(!/Made with Low-FODMAP/.test(copy), "Strawberry received Lemon Lime's claim");
    if (!labels) continue;
    const panels = [...productArticles[1].matchAll(/data-original-file="([^"]+)" src="([^"]+)"/g)];
    assert.deepEqual(panels.map(match => match[1]), panelFiles(fact), `${title}: wrong flavor artwork`);
    for (const [, file, src] of panels) {
      if (embedded) {
        assert(src.startsWith("data:image/png;base64,"));
        assert(Buffer.from(src.split(",")[1], "base64").equals(fs.readFileSync(path.join(root, original, file))),
          `Changed embedded artwork: ${file}`);
      } else assert.equal(src, `original-assets/${file}`);
    }
  }
  if (labels) {
    const cover = html.slice(0, html.indexOf("</article>"));
    assert(htmlText(cover).includes("5 Major Electrolytes"), "Electrolyte cover claim missing");
  }
}

export function verifyElectrolyteHandoff(root = process.cwd()) {
  const copies = websiteCopies(root);
  const output = path.join(root, "exports/stellar-website-handoff");
  const preview = path.join(root, "artifacts/mockup-sandbox/public/handoff");
  const archive = path.join(root, "exports/stellar-website-editable-handoff.zip");
  for (const slug of electrolytePacks) {
    const labels = slug === electrolytePacks[0];
    for (const [directory, name, embedded] of [
      [output, `${slug}.html`, true],
      [path.join(output, "web-team-files"), `${slug}.html`, false],
      [preview, `${slug}.html`, true],
      [preview, `readable-${slug}.html`, false],
    ]) assertHandoffHtml(fs.readFileSync(path.join(directory, name), "utf8"), root, copies, { embedded, labels });
    const archivedHtml = execFileSync("unzip", ["-p", archive, `web-team-files/${slug}.html`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    assertHandoffHtml(archivedHtml, root, copies, { embedded: false, labels });
    const pdf = path.join(output, `${slug}.pdf`);
    const pdfText = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
    assert.equal(fs.readFileSync(path.join(output, `${slug}.txt`), "utf8"), pdfText, `${slug}: stale extracted text`);
    assert(fs.readFileSync(path.join(preview, `${slug}.pdf`)).equals(fs.readFileSync(pdf)), `${slug}: stale preview PDF`);
    for (const [index, fact] of labelFacts.entries()) {
      assert(normalize(pdfText).includes(normalize(copies[index].description)), `${slug}: ${fact.flavor} PDF description differs`);
    }
    assert((pdfText.match(/5 Major Electrolytes/g) ?? []).length >= (labels ? 3 : 2), `${slug}: PDF quality claims missing`);
    if (labels) for (const fact of labelFacts) for (const file of panelFiles(fact)) {
      assert(pdfText.includes(path.basename(file)), `${slug}: PDF label missing`);
    }
  }
  for (const fact of labelFacts) for (const file of panelFiles(fact)) {
    const bytes = fs.readFileSync(path.join(root, original, file));
    for (const directory of [
      "artifacts/stellar-review/public/review-assets",
      "artifacts/mockup-sandbox/public",
      "exports/stellar-website-handoff/web-team-files/original-assets",
      "artifacts/mockup-sandbox/public/handoff/original-assets",
    ]) assert(fs.readFileSync(path.join(root, directory, file)).equals(bytes), `Changed label artwork: ${directory}/${file}`);
    assert(execFileSync("unzip", ["-p", archive, `web-team-files/original-assets/${file}`], { maxBuffer: 16 * 1024 * 1024 })
      .equals(bytes), `Archive changed artwork: ${file}`);
  }
  console.log("PASS: both electrolyte flavors match original labels and review/Canvas copy across HTML, PDFs, readable previews and editable ZIP.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyElectrolyteHandoff();
}
