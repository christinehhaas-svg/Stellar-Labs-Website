import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const sourceDir = path.join(root, "artifacts/stellar-review/src/pages/stellar/_shared");
const assetDir = path.join(root, "artifacts/stellar-review/public/review-assets");
const outputDir = path.join(root, "exports/stellar-website-handoff");
const editableDir = path.join(outputDir, "web-team-files");
const previewDir = path.join(root, "artifacts/mockup-sandbox/public/handoff");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(editableDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });
const cache = new Map();

function loadSource(filename) {
  const absolute = path.resolve(filename);
  if (cache.has(absolute)) return cache.get(absolute);
  if (absolute.endsWith(".json")) {
    const value = JSON.parse(fs.readFileSync(absolute, "utf8"));
    cache.set(absolute, value);
    return value;
  }
  const exports = {};
  cache.set(absolute, exports);
  const javascript = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(javascript, {
    exports,
    require(specifier) {
      if (specifier === "../review-links") return {
        reviewAsset: (url) => url.replace("/__mockup/", "/review-assets/"),
      };
      if (!specifier.startsWith(".")) throw new Error(`Unexpected source import: ${specifier}`);
      return loadSource(path.resolve(path.dirname(absolute), specifier.endsWith(".json") ? specifier : `${specifier}.ts`));
    },
  }, { filename: absolute });
  return exports;
}

const claims = loadSource(path.join(sourceDir, "quality-claims.ts"));
const pdfOutline = loadSource(path.join(sourceDir, "outline-copy.ts"));
const { servingDecisions, servingDecisionNote } = loadSource(path.join(sourceDir, "serving-decisions.ts"));
const { packageImages } = loadSource(path.join(sourceDir, "package-images.ts"));
const approvedOutlinePdf = path.join(assetDir, "documents/stellar-product-info-claims-outline.pdf");
for (const directory of [outputDir, editableDir, previewDir]) {
  fs.copyFileSync(approvedOutlinePdf, path.join(directory, "stellar-product-info-claims-outline.pdf"));
}
const supplementData = loadSource(path.join(sourceDir, "supplements-data.ts"));
const { electrolyteCopy } = loadSource(path.join(sourceDir, "electrolyte-copy.ts"));
const proteinProducts = JSON.parse(fs.readFileSync(path.join(sourceDir, "protein-products.json"), "utf8"))
  .map(product => ({ ...product, images: packageImages(product) }));
const electrolyteProducts = JSON.parse(fs.readFileSync(path.join(sourceDir, "electrolyte-products.json"), "utf8"));
const veganProducts = JSON.parse(fs.readFileSync(path.join(sourceDir, "vegan-products.json"), "utf8"));
const { getPowderCopy, wheyBaselineQuality, veganQuality, powderDisclaimer } = loadSource(path.join(sourceDir, "powder-copy.ts"));
const { wheyLines } = loadSource(path.join(sourceDir, "whey-lines.ts"));
const formulaContext = { baselineQuality: wheyBaselineQuality };
function formulaData(isolate) {
  return getPowderCopy(proteinProducts.find((product) => product.formula === (isolate ? "isolate" : "blend")));
}

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
const paragraph = (text) => `<p>${esc(text)}</p>`;
const section = (title, body) => `<section class="copy-section"><h2>${esc(title)}</h2>${body}</section>`;
const support = (items) => `<dl>${items.map((item) => `<div><dt>${esc(item.title)}</dt><dd>${esc(item.description)}</dd></div>`).join("")}</dl>`;
const mediaFiles = new Map();

function localAsset(url) {
  if (url.startsWith("/__mockup/")) return path.join(assetDir, url.slice("/__mockup/".length));
  if (url.startsWith("/review-assets/")) return path.join(assetDir, url.slice("/review-assets/".length));
  throw new Error(`Unexpected local asset: ${url}`);
}
function image(url, alt, className = "") {
  const filename = localAsset(url);
  if (!fs.existsSync(filename)) throw new Error(`Missing original artwork: ${filename}`);
  const extension = path.extname(filename).toLowerCase();
  const mime = extension === ".svg" ? "image/svg+xml" : extension === ".png" ? "image/png" : "image/jpeg";
  mediaFiles.set(filename, path.relative(assetDir, filename));
  return `<img class="${esc(className)}" alt="${esc(alt)}" data-original-file="${esc(path.relative(assetDir, filename))}" src="data:${mime};base64,${fs.readFileSync(filename).toString("base64")}" />`;
}
const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m7 12 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`;
const leaf = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 3C10 2 3 7 5 15c2 6 13 5 15-12ZM3 21 15 9" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`;
const flask = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6M10 2v7L4 20q-1 2 2 2h12q3 0 2-2L14 9V2M7 15h10" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`;
function callouts(items) {
  return `<div class="claims">${items.map((item) => {
    let graphic = /^(Vegan|Vegetarian)/.test(item) ? leaf : /Heavy Metals/.test(item) ? flask : icon;
    if (item === "Certified Gluten-Free") graphic = image("/__mockup/stellar-current/assets/702fdffe87ab02f0.svg", "");
    if (item === "Non-GMO") graphic = image("/__mockup/stellar-current/assets/b1f703f6d4d0d5a8.svg", "");
    return `<div class="claim">${graphic}<span>${esc(item.replace(/^Tested for Heavy Metals:.*$/, "Tested for Heavy Metals"))}</span></div>`;
  }).join("")}</div>`;
}
function header(title, eyebrow = "Exact website copy") {
  return `<header><div class="brand"><b>STELLAR <small>LABS®</small></b><span>WEB TEAM HANDOFF · CURRENT REVIEW COPY</span></div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1></header>`;
}
function footer(text = "Current review copy · Original package artwork preserved · Facility wording is not a product certification mark.") {
  return `<footer>${esc(text)}</footer>`;
}
function sheet(title, body, eyebrow, className = "") {
  return `<article class="sheet ${className}">${header(title, eyebrow)}${body}${footer()}</article>`;
}
function productTable(products) {
  return `<table><thead><tr><th>Website product title</th><th>Flavor / size</th><th>Review price</th></tr></thead><tbody>${products.map((product) =>
    `<tr><td>${esc(product.title)}</td><td>${esc(product.flavor)} · ${esc(product.size)}</td><td>$${(product.price / 100).toFixed(2)}</td></tr>`
  ).join("")}</tbody></table>`;
}
const implementation = `<aside class="note"><b>Website implementation</b>${paragraph(pdfOutline.outlineSourceNote)}<p>Use each product’s own PDF description, Quality and Featured Support sections, directions and warnings, with the explicit merchant serving corrections documented below. Retain original labels without relabeling them; do not substitute facts between package sizes or flavors.</p><p><a href="serving-review.html">Serving review — merchant-approved copy, unchanged printed facts, and outline references</a></p><p><a href="stellar-product-info-claims-outline.pdf">Complete supplied PDF — all 20 products, including Strawberry isolate</a></p><p>Prices are review-copy prices, not a live price feed.</p></aside>`;
function labelsPage(product, family) {
  if (product.images.length < 2) {
    return sheet(product.title,
      paragraph(`${product.flavor} · ${product.size} · $${(product.price / 100).toFixed(2)}`) +
      section("Original artwork pending", paragraph("The bottle front is an illustrative mockup, not a verified label proof. The matching original 1 lb photo and complete label panels are not yet available. Nutrition copy is sourced from the supplied Product Info & Claims Outline, not verified against a 1 lb label image. No 2 lb artwork has been substituted.")),
      family);
  }
  return sheet(product.title,
    `<p class="meta">${esc(product.flavor)} · ${esc(product.size)} · $${(product.price / 100).toFixed(2)}</p>` +
    (product.component === "ProteinCappuccino"
      ? `<div class="hero">${image(product.images[0].src, product.title + " front of package")}<p>Verified Cappuccino 1 lb front artwork from Stellar Labs’ Shopify CDN. Matching original side panels are preserved below.</p></div>`
      : "") +
    section("SUPPLEMENT FACTS + INGREDIENTS", paragraph(`Flavor-specific label panels for ${product.flavor}. Refer to the original package artwork below.`) +
      `<div class="label-grid">${product.images.slice(1).map((panel, index) =>
        `<figure>${image(panel.src, `${product.flavor} original label panel ${index + 1}`, "label-panel")}<figcaption>Original label panel ${index + 1} · ${esc(path.basename(panel.src))}</figcaption></figure>`
      ).join("")}</div>`) +
    section("WARNINGS + ALLERGEN INFORMATION", list(getPowderCopy(product).warnings)) +
    paragraph("Nutrition and ingredient details are shown on the flavor-specific package artwork. Always read the complete product label.") +
    `<aside class="note"><b>Do not substitute another flavor’s label.</b><p>The original high-resolution panels are embedded here and in the editable HTML. Zoom in for the complete facts, ingredients, and printed directions; source image files are also included in the handoff archive.</p></aside>`,
    "Flavor-specific website label section", "label-sheet");
}
function powderCopyPage(product) {
  const data = getPowderCopy(product);
  return sheet(product.title,
    `<p class="meta">${data.servings} servings · ${esc(product.size)} · ${esc(product.flavor)}</p>` +
    paragraph(data.description) +
    paragraph(data.sourceNote ?? pdfOutline.outlineSourceNote) +
    (product.component === "ProteinMixedBerry" ? `<p><a href="${esc(pdfOutline.mixedBerrySource)}">Merchant-supplied original Mixed Berry store listing</a></p>` : "") +
    section("More information", "") +
    section("Benefits:", list(data.benefits)) +
    section("Quality:", list(data.quality)) +
    section("Featured support:", support(data.support)) +
    section("Suggested use", paragraph(data.suggestedUse)) +
    section("Supplement facts", list(data.facts)) +
    section("Warnings", list(data.warnings)) +
    paragraph(powderDisclaimer) +
    paragraph(product.images.length > 1 ? "The complete, matching label panels follow on the next page." : "Original 1 lb bottle artwork and complete label panels are pending; the next page records their status."),
    "Women’s Daily Multivitamin format · Product-specific copy", "supplement-sheet")
    .replace("<article ", `<article id="product-${esc(product.handle)}" `);
}
function wheyPack(isolate) {
  const family = isolate ? "isolate" : "blend";
  const title = isolate ? "Whey Protein Isolate" : "Whey Protein Blend";
  const products = proteinProducts.filter((product) => product.formula === family);
  const coverProduct = products.find(product => product.images.length > 0);
  const data = formulaData(isolate);
  const additional = data.quality.filter((item) => !formulaContext.baselineQuality.includes(item));
  const cover = sheet(title,
    `<div class="hero">${coverProduct ? image(coverProduct.images[0].src, coverProduct.title) : paragraph("Bottle photo pending")}<div><h2>${isolate ? "100% isolate formula" : "Concentrate + isolate formula"}</h2><p>A matching callout design with formula-specific website copy.</p></div></div>` +
    callouts(formulaContext.baselineQuality) +
    section("Formula-specific Quality", list(additional)) +
    section("Product pages covered", productTable(products)) +
    `<aside class="note"><b>Whey-specific wording</b>${paragraph(pdfOutline.milkDisclaimer)}${paragraph(pdfOutline.powderNutritionDisclaimer)}${paragraph(pdfOutline.lowFodmapDisclaimer)}</aside>` +
    implementation, "Flyer mockup + copy handoff", "cover");
  return { title, pages: [cover, ...products.flatMap((product) => [powderCopyPage(product), labelsPage(product, family)])] };
}
function electrolytePack() {
  const stripClaims = [...claims.electrolyteQuality];
  stripClaims.splice(stripClaims.indexOf("Non-GMO") + 1, 0, "5 Major Electrolytes");
  const cover = sheet("Electrolyte Powder",
    `<div class="hero">${image(electrolyteProducts[0].images[0].src, electrolyteProducts[0].title)}<div><h2>Lemon Lime + Strawberry</h2><p>Both flavors use the shared callouts below. Keep their descriptions, ingredient details, and allergen statements independent.</p></div></div>` +
    callouts(stripClaims) +
    section("Product pages covered", productTable(electrolyteProducts)) +
    section("Flavor-specific Quality", paragraph("Strawberry Electrolytes excludes Low-FODMAP Ingredients. Both flavors have No Added Sugars; this is not a sugar-free claim.") + paragraph(pdfOutline.lowFodmapDisclaimer)) +
    implementation, "Flyer mockup + copy handoff", "cover");
  const pages = [cover];
  for (const product of electrolyteProducts) {
    const data = electrolyteCopy[product.component];
    if (!data) throw new Error(`Missing flavor copy: ${product.component}`);
    pages.push(powderCopyPage(product));
    pages.push(labelsPage(product, "electrolyte"));
  }
  return { title: "Electrolyte Powder", pages };
}
function veganPack() {
  const cover = sheet("Vegan Plant Protein",
    `<div class="hero">${image(veganProducts[0].images[0].src, veganProducts[0].title)}<div><h2>Chocolate + Vanilla</h2><p>Same product-copy format as Women’s Daily Multivitamin, with plant-specific claims and original label panels.</p></div></div>` +
    callouts([...claims.commonProductQuality, "Vegan"]) +
    section("Quality", list(veganQuality)) +
    section("Product pages covered", productTable(veganProducts)) +
    `<aside class="note"><b>Plant-specific claims</b><p>Sweetened with Stevia; contains added sugars. Do not apply No Added Sugars or whey-only claims to these formulas.</p>${paragraph(pdfOutline.lowFodmapDisclaimer)}</aside>` +
    implementation, "Flyer mockup + copy handoff", "cover");
  return { title: "Vegan Plant Protein", pages: [cover, ...veganProducts.flatMap((product) => [powderCopyPage(product), labelsPage(product, "vegan")])] };
}
function supplementPack() {
  const { supplements, getSupplementQuality, labelDisclaimer } = supplementData;
  const collectionClaims = [...claims.supplementQuality];
  const cover = sheet("Supplements",
    `<div class="hero">${image(supplements[0].bottle, `${supplements[0].name} bottle mockup`)}<div><h2>All eight supplement formulas</h2><p>Dietary callouts remain label-specific.</p></div></div>` +
    section("Individual-product shared callouts", callouts(claims.supplementQuality)) +
    section("Supplement collection callouts", callouts(collectionClaims) + paragraph(pdfOutline.collectionClaimNote)) +
    `<table><thead><tr><th>Supplement</th><th>Additional dietary wording</th></tr></thead><tbody>${supplements.map((product) =>
      `<tr><td>${esc(product.name)}</td><td>${esc((product.labeledDietaryClaims ?? []).join(" · ") || "No Vegan or Vegetarian callouts")}</td></tr>`
    ).join("")}</tbody></table>` +
    `<aside class="note"><b>Content scope</b>${paragraph(pdfOutline.outlineSourceNote)}<p>Night Time Fat Burn excludes Certified Gluten-Free and Low-FODMAP Ingredients. Capsule wording is not a vegan-formula claim. Magnesium Complex uses the merchant-confirmed 1–2 capsules; its unchanged printed panel states two capsules.</p></aside>` +
    implementation, "Flyer mockup + complete supplement copy", "cover");
  const pages = [cover];
  for (const product of supplements) {
    const detail = product.detailCopy;
    const disclaimer = detail
      ? "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."
      : labelDisclaimer;
    let body = `<div class="hero">${image(product.bottle, product.name)}<div>${paragraph(product.subtitle)}<p class="meta">${esc(product.supply)} · ${esc(product.count)}</p>${paragraph(product.bottleCaption)}</div></div>` +
      callouts(getSupplementQuality(product));
    if (detail) body += paragraph(detail.description) + section("More information", "");
    body += section(detail ? "Benefits:" : "On the label", list(product.benefits.map((benefit) => `${benefit}*`))) +
      section("Quality:", list(getSupplementQuality(product)));
    if (detail) body += section("Featured support:", support(detail.support));
    body += section("Suggested use", paragraph(product.use)) +
      section("Supplement facts", list(product.facts)) +
      (product.sourceNote ? paragraph(product.sourceNote) : "") +
      section("Warnings", list(product.warnings)) +
      paragraph(disclaimer) +
      section("Complete label artwork", `<figure class="supplement-label">${image(product.label, `${product.name} complete label`)}<figcaption>Original complete label · ${esc(path.basename(product.label))}</figcaption></figure>`);
    pages.push(sheet(product.name, body, "Copy in website section order", "supplement-sheet")
      .replace("<article ", `<article id="product-${esc(product.id)}" `));
    if (product.pdf) {
      const originalPdf = localAsset(product.pdf);
      if (!fs.existsSync(originalPdf)) throw new Error(`Missing supplied label PDF: ${originalPdf}`);
      mediaFiles.set(originalPdf, path.relative(assetDir, originalPdf));
    }
  }
  return { title: "Supplements", pages };
}

const css = `
@page{size:letter;margin:0}
*{box-sizing:border-box}html,body{margin:0;background:#e8e5e1;font-family:Arial,sans-serif;color:#23201f}
.sheet{width:816px;background:#fff;padding:34px 42px;break-after:page}.sheet:last-child{break-after:auto}
.cover{min-height:1056px}header{margin-bottom:18px}.brand{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d8d3cf;padding-bottom:12px;margin-bottom:18px}.brand b{font-size:25px;letter-spacing:2px}.brand small{font-size:10px;letter-spacing:1px}.brand>span{font-size:8px;color:#78716c;letter-spacing:.5px}
.eyebrow{font-size:9px!important;letter-spacing:1.3px;text-transform:uppercase;color:#087e91;font-weight:700;margin:0 0 7px}h1{font-size:29px;line-height:1.12;letter-spacing:-.5px;margin:0}
h2{font-size:11px;letter-spacing:.7px;text-transform:uppercase;line-height:1.35;margin:0 0 6px;color:#23201f;break-after:avoid}p,li,dt,dd{font-size:11px;line-height:1.5}p{margin:6px 0;color:#615b57}ul{margin:0;padding-left:18px}li{color:#615b57;margin:2px 0}.meta{font-size:11px;font-weight:600;color:#78716c}.copy-section{margin:15px 0;break-inside:avoid}dl{margin:0}dl>div{margin:0 0 7px}dt{font-weight:700;display:inline}dt:after{content:" — "}dd{display:inline;margin:0;color:#615b57}
.sheet:not(.cover) .copy-section{margin:9px 0}.supplement-sheet p,.supplement-sheet li,.supplement-sheet dt,.supplement-sheet dd{font-size:10.5px;line-height:1.45}
.hero{display:flex;align-items:center;gap:26px;margin:22px 0}.hero>img{width:145px;height:145px;object-fit:contain}.hero h2{font-size:23px;letter-spacing:-.3px;text-transform:none}.hero p{font-size:12px}
.claims{background:#23201f;color:#fff;padding:17px 19px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px 20px;break-inside:avoid;margin:14px 0}.claim{display:flex;align-items:center;gap:8px;min-height:24px;font-size:11px;line-height:1.35;font-weight:700}.claim svg,.claim img{width:23px;height:23px;object-fit:contain;flex:none;color:#00a8b8}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:10px;break-inside:avoid}th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;background:#f3f1ee}td,th{padding:7px 8px;border-bottom:1px solid #e3ded9;vertical-align:top;line-height:1.4}td:first-child{font-weight:600}
.note{padding:12px 15px;background:#eef7f7;border-left:3px solid #00a8b8;margin:17px 0;break-inside:avoid;font-size:11px}.note p{font-size:10px;line-height:1.5}.label-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.label-grid figure{margin:0;padding:8px;border:1px solid #e7e2dd;break-inside:avoid}.label-panel{width:100%;height:auto;max-height:430px;object-fit:contain}figcaption{font-size:8px;color:#78716c;line-height:1.4;margin-top:7px;overflow-wrap:anywhere}.supplement-label{margin:0;border:1px solid #e7e2dd;padding:10px;break-inside:avoid}.supplement-label img{width:100%;height:auto;max-height:460px;object-fit:contain}
footer{font-size:8px;line-height:1.5;letter-spacing:.25px;color:#78716c;border-top:1px solid #d8d3cf;padding-top:11px;margin-top:20px;break-inside:avoid}
@media print{html,body{background:#fff}.sheet{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;

// Keep a portable, exact-product comparison alongside every handoff.
// An unmatched outline flavor is not used as a substitute for a catalog item.
const servingReview = [
  ...supplementData.supplements.map(product => ({
    id: product.id,
    name: product.name,
    package: product.count,
    reviewFacts: product.facts,
    reviewDirections: product.use,
    supply: product.supply,
    labels: [path.basename(product.label)],
  })),
  ...[...proteinProducts, ...veganProducts, ...electrolyteProducts].map(product => ({
    id: product.component,
    name: product.title,
    package: `${product.flavor} · ${product.size}`,
    reviewFacts: getPowderCopy(product).facts,
    reviewDirections: getPowderCopy(product).suggestedUse,
    labels: product.images.slice(1).map(panel => path.basename(panel.src)),
  })),
].map(product => {
  const reference = pdfOutline.outlineProducts.find(item => item.id === product.id);
  return {
    ...product,
    printedServingFacts: servingDecisions[product.id]?.packageFacts
      ?? product.reviewFacts.filter(fact => /serving size|servings per container/i.test(fact)),
    outlinePage: reference?.page ?? null,
    outlineFacts: reference?.facts ?? [],
    decision: servingDecisionNote(product.id) ?? (reference
      ? "No additional serving discrepancy identified in the existing records. Retain this exact product's own package facts. A daily supply is not the same as servings per container; outline omissions are not replacement values."
      : "No exact-flavor outline entry. Do not substitute Strawberry isolate facts for Mixed Berry."),
    status: servingDecisions[product.id] ? "merchant-corrected-review-copy" : reference ? "retain-package-values" : "no-exact-outline-match",
  };
});
const servingReviewHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stellar Labs — Serving Review</title><style>body{max-width:960px;margin:auto;padding:24px;font:16px/1.6 Arial,sans-serif;color:#23201f}article{border-top:1px solid #ccc;padding:24px 0}h1,h2{color:#164647}li{overflow-wrap:anywhere}.reference{background:#f2f2ee;padding:16px}</style></head><body><h1>Serving review</h1>
<p>Final merchant confirmation: 2 lb isolates use 31 g and 29 servings per container; 2 lb blends use 33 g; 2 lb vegan uses 32 g. One-pound isolates use 29 g and 16 servings. Magnesium Complex uses 1–2 capsules. These final package-specific values supersede earlier general answers. Original label artwork is unchanged. All 20 catalog products are compared below; approved review copy, printed serving facts, and outline references are separate.</p>
${servingReview.map(product => `<article id="${esc(product.id)}"><h2>${esc(product.name)}</h2>${paragraph(`Catalog package: ${product.package}`)}<h3>Facts used in review copy and handoff</h3>${list(product.reviewFacts)}${product.supply ? paragraph(`Daily supply used in review: ${product.supply}`) : ""}${paragraph(`Directions used in review: ${product.reviewDirections}`)}<h3>Unchanged printed serving facts</h3>${list(product.printedServingFacts)}${paragraph(`Original label files: ${product.labels.join(", ")}`)}<div class="reference"><h3>Outline reference only${product.outlinePage ? ` — page ${product.outlinePage}` : ""}</h3>${product.outlineFacts.length ? list(product.outlineFacts) : paragraph("No exact-flavor reference in the supplied outline.")}</div>${paragraph(product.decision)}</article>`).join("")}
<article><h2>Strawberry isolate — outline reference only</h2><p>The outline's page 17 has no exact matching catalog package in this review. It is not a replacement for Mixed Berry; this serving correction does not rename or add products.</p></article></body></html>`;
for (const directory of [outputDir, editableDir, previewDir]) {
  fs.writeFileSync(path.join(directory, "serving-review.json"), JSON.stringify(servingReview, null, 2));
  fs.writeFileSync(path.join(directory, "serving-review.html"), servingReviewHtml);
}
const packs = [
  ["stellar-electrolytes-website-handoff", electrolytePack],
  ["stellar-whey-isolate-website-handoff", () => wheyPack(true)],
  ["stellar-whey-blend-website-handoff", () => wheyPack(false)],
  ["stellar-vegan-website-handoff", veganPack],
  ["stellar-supplements-website-handoff", supplementPack],
  ["stellar-product-info-matched-bottles-website-handoff", () => ({
    title: "Product Info & Claims — Bottle-Matched Revision",
    pages: [
      sheet("Product information · bottle-matched revision",
        paragraph("Updated to the merchant’s final package-specific instructions. The supplied source PDF and original label artwork remain unchanged. This document governs review copy, not relabeling of existing packages.") +
        list(["1 lb isolates: 29g · 16 servings · white containers", "2 lb isolates: 31g · 29 servings · black containers", "2 lb blends: 33g · 28 servings · black containers", "2 lb vegan: 32g · 28 servings", "Magnesium Complex: 1–2 capsules; 30–60 servings depending on use"]) +
        paragraph("Supplements: Certified Gluten-Free and Low-FODMAP Ingredients, except Night Time Fat Burn. These are not low-FODMAP certification claims.") +
        paragraph(pdfOutline.lowFodmapDisclaimer) +
        paragraph("Current-store differences: the outline’s Strawberry isolate differs from the confirmed Mixed Berry listing. Live multivitamin listings use Ultra rather than Daily. The live Magnesium Citrate listing contains digestive-enzyme copy; no exact Turmeric Curcumin listing was found in the public catalog. Do not substitute those listings for the supplied labels.") +
        paragraph("Women's Daily Multivitamin uses its verified current-store bottle photo. The other seven supplements use product-specific illustrations with the store's bottle shape and their own supplied front artwork, not finished-product photographs. The store's Image Coming Soon placeholders are not used as product pictures. Black 2 lb isolate presentation follows merchant instructions; captured source photos remain preserved. Cappuccino uses the matching white 1 lb front artwork visually verified on Stellar Labs' own Shopify CDN, alongside its unchanged side panels. The public listing's incorrect Chocolate 2 lb front is not used."),
        "Stellar Labs · Revised review reference", "cover"),
      ...supplementData.supplements.map(product => sheet(product.name,
        `<div class="hero">${image(product.bottle, product.name)}<div>${paragraph(product.subtitle)}${paragraph(`${product.count} · ${product.supply}`)}${paragraph(product.bottleCaption)}</div></div>` +
        paragraph(product.detailCopy.description) +
        section("Benefits", list(product.benefits)) +
        section("Quality", list(supplementData.getSupplementQuality(product))) +
        section("Featured support", support(product.detailCopy.support)) +
        section("Suggested use", paragraph(product.use)) +
        section("Product facts", list(product.facts)) +
        (product.sourceNote ? paragraph(product.sourceNote) : "") +
        section("Warnings", list(product.warnings)),
        "Bottle-matched product information", "supplement-sheet")),
      ...[...proteinProducts, ...veganProducts, ...electrolyteProducts].map(product => {
        const copy = getPowderCopy(product);
        return sheet(product.title,
          `<div class="hero">${product.images[0] ? image(product.images[0].src, product.title) : paragraph("Matching 1 lb bottle photo and label panels pending. Nutrition copy is based on the supplied outline, not a verified 1 lb label image.")}<div>${paragraph(`${product.flavor} · ${product.size} · ${copy.servings} servings`)}</div></div>` +
          paragraph(copy.description) +
          section("Benefits", list(copy.benefits)) +
          section("Quality", list(copy.quality)) +
          section("Featured support", support(copy.support)) +
          section("Suggested use", paragraph(copy.suggestedUse)) +
          section("Product facts", list(copy.facts)) +
          paragraph(copy.sourceNote) +
          section("Warnings", list(copy.warnings)),
          "Bottle-matched product information", "supplement-sheet");
      }),
    ],
  })],
];
// A focused export uses the same render/PDF/archive paths as the full handoff.
const selectedPack = process.argv.find((argument) => argument.startsWith("--pack="))?.slice("--pack=".length);
if (selectedPack !== undefined && !packs.some(([slug]) => slug === selectedPack)) {
  throw new Error(`Unknown handoff pack: ${selectedPack}`);
}
for (const [slug, buildPack] of packs) {
  if (selectedPack !== undefined && slug !== selectedPack) continue;
  const pack = buildPack();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Stellar Labs — ${esc(pack.title)} Website Handoff</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${pack.pages.join("")}</body></html>`;
  const plainCopy = html.replace(/data:image\/[^"]*/g, "");
  // The merchant approved this exact Natural description. Continue rejecting
  // other artificial-sweetener claims; do not make a broad exception for them.
  const claimsToCheck = plainCopy.replaceAll(esc(wheyLines.blend.description), "");
  if (/artificial.{0,65}sweetener/i.test(claimsToCheck)) throw new Error(`Unapproved wording in ${slug}`);
  fs.writeFileSync(path.join(outputDir, `${slug}.html`), html);
  const linkedHtml = html.replace(
    /data-original-file="([^"]+)" src="data:[^"]+"/g,
    'data-original-file="$1" src="original-assets/$1"',
  );
  fs.writeFileSync(path.join(editableDir, `${slug}.html`), linkedHtml);
  fs.writeFileSync(path.join(previewDir, `readable-${slug}.html`), linkedHtml.replaceAll("<img ", '<img loading="lazy" '));
  fs.writeFileSync(path.join(previewDir, `${slug}.html`), html);
  if (process.argv.includes("--pdf")) {
    const pdf = path.join(outputDir, `${slug}.pdf`);
    execFileSync("chromium", [
      "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
      `--print-to-pdf=${pdf}`, pathToFileURL(path.join(outputDir, `${slug}.html`)).href,
    ], { stdio: "pipe", timeout: 120_000 });
    // Raster streams can contain runs of angle brackets that resemble conflict
    // markers to binary-unaware scanners. ASCII encoding preserves the artwork.
    if (["<", "=", ">"].some((character) => fs.readFileSync(pdf).includes(character.repeat(7)))) {
      const encodedPdf = `${pdf}.encoded.pdf`;
      execFileSync("mutool", ["clean", "-a", pdf, encodedPdf], { stdio: "pipe", timeout: 120_000 });
      fs.renameSync(encodedPdf, pdf);
    }
    fs.writeFileSync(path.join(outputDir, `${slug}.txt`),
      execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" }));
    fs.copyFileSync(pdf, path.join(previewDir, `${slug}.pdf`));
    console.log(`Printed ${slug}.pdf and extracted text reference.`);
  }
  console.log(`${slug}: ${pack.pages.length} logical sections, ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB HTML`);
}
for (const [filename, relative] of mediaFiles) {
  const target = path.join(editableDir, "original-assets", relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(filename, target);
  const previewAsset = path.join(previewDir, "original-assets", relative);
  fs.mkdirSync(path.dirname(previewAsset), { recursive: true });
  fs.copyFileSync(filename, previewAsset);
}
fs.writeFileSync(path.join(outputDir, "READ-ME.txt"), [
  "STELLAR LABS — WEBSITE HANDOFF",
  "",
  "Five separate packs: electrolytes, whey isolate, whey blend, vegan plant protein, and supplements.",
  "Each PDF begins with a flyer-style mockup and continues with the exact current review copy.",
  "HTML files are self-contained, editable, and open without a web server.",
  "Original artwork is embedded in each HTML and supplied separately in original-assets.",
  "Descriptions, benefits, quality claims, suggested use, and warnings follow the supplied Product Info & Claims Outline.",
  "The supplied source PDF is included as stellar-product-info-claims-outline.pdf.",
  "See serving-review.html and serving-review.json for all 20 exact catalog packages, merchant serving decisions, unchanged printed values, and separate outline references.",
  "Certified Gluten-Free excludes Night Time Fat Burn. Low-FODMAP ingredient claims exclude Night Time Fat Burn and Strawberry Electrolytes.",
  "Keep the serving-size/tolerance/not-certified low-FODMAP disclaimer, FDA disclaimer, and whey milk/nutrition disclaimers with the claims.",
  "Keep each product's own title, flavor, original labels, package facts, ingredients, and allergens.",
  pdfOutline.mixedBerryNote,
  `Merchant-supplied Mixed Berry source: ${pdfOutline.mixedBerrySource}`,
  "Whey formula copy is shared within its own family, not between isolate and blend.",
  "Powder descriptions follow the Women's Daily Multivitamin section order, with each flavor's own serving summary.",
  "Complete Supplement Facts, ingredients, and printed directions remain available as original artwork.",
  "All eight supplements include merchant-approved descriptions and Featured Support; original label details remain unchanged.",
  "Prices are the current review-copy prices, not a live Shopify price feed.",
  "This handoff does not change the live store or checkout.",
].join("\n"));
console.log(`Included ${mediaFiles.size} original media files.`);
fs.writeFileSync(path.join(editableDir, "READ-ME.txt"), [
  "STELLAR LABS — EDITABLE WEBSITE HANDOFF",
  "",
  "Open any of the five HTML documents in a browser. They contain the exact current review copy in website section order.",
  "Keep the original-assets folder next to the HTML files so all original artwork renders.",
  "Edit the HTML as needed, or select and copy the text into your website editor.",
  "Original label images and available supplied supplement-label PDFs are included in original-assets.",
  "Descriptions and claims follow the included stellar-product-info-claims-outline.pdf, including product-specific exceptions and disclaimers.",
  "Use each product's own original Nutrition / Supplement Facts, ingredients, and allergens. Package sizes and original artwork are unchanged.",
  pdfOutline.mixedBerryNote,
  `Merchant-supplied Mixed Berry source: ${pdfOutline.mixedBerrySource}`,
  "Final merchant confirmation: 2 lb isolates use 31 g and 29 servings; 2 lb blends use 33 g; 2 lb vegan uses 32 g; 1 lb isolates use 29 g and 16 servings; Magnesium Complex uses 1–2 capsules. Artwork remains unchanged. See serving-review.html for the separate approved, printed, and outline values.",
  "Do not merge whey isolate and whey blend copy, or substitute Lemon Lime and Strawberry labels.",
  "All eight supplements include merchant-approved full descriptions and Featured Support sections.",
  "The separate five PDF handoff packs are the print-ready reference versions.",
].join("\n"));
if (process.argv.includes("--zip")) {
  const archive = path.join(root, "exports/stellar-website-editable-handoff.zip");
  fs.rmSync(archive, { force: true });
  execFileSync("zip", ["-qr", archive, "web-team-files"], { cwd: outputDir, stdio: "pipe" });
  console.log(`Regenerated ${path.relative(root, archive)}.`);
}
