import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const out = "generated-artifacts/website-copy-review";
await fs.mkdir(out, { recursive: true });
const files = [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { maxBuffer: 20_000_000 })
  .toString().split("\0").filter(Boolean))];
const terms = /Low[- ]FODMAP|FODMAP|New Products, Same Label|CHRISTINE HANSON|rBGH-Free|artificial flavors|artificial colors|artificial sweeteners|all natural|sustainable energy|Tumeric|Coconut Xtract|no bloat|low sodium|less sodium/gi;
const matches = [];
function classify(file) {
  if (/attached_assets|\.agents\/|replit\.md|\.local\//.test(file)) return ["Reference instructions", "Not a live website page"];
  if (/test|verify-|audit-|check-|SKILL|\.md$/.test(file)) return ["Verification/reference code; not changed automatically", "Tests, documentation or validation"];
  if (/pdf-product-outline\.json|protein-products\.json|vegan-products\.json|recipes\.json/.test(file)) return ["Original captured product/recipe data; live adapters override withdrawn wording", "Product/recipe pages (historical source, not current displayed wording)"];
  if (/source-assets|public\/stellar-current|public\/handoff|\.html$/.test(file)) return ["Legacy captured/generated content; current storefront uses live adapters", "Captured homepage/shell or previous web-team reference"];
  if (/infographics|flyer|handoff|export-|EditorialConcept/.test(file)) return ["Separate printout/export or legacy concept; not current storefront copy", "Flyer, handoff or unused design concept"];
  if (/quality-claims|outline-homepage|outline-copy|QualityCallouts|claim-icons|fodmap-disclaimer|product-guide-catalog|powder-page-notes/.test(file)) return ["Approved callout or compatibility/filtering code; not an old live marketing claim", "Shared homepage, collections, product details and product-information guide"];
  if (/supplement/i.test(file)) return ["Product-page compatibility/filtering code", "/supplements and /supplement-details"];
  if (/ProteinProductPage|powder-copy|whey-lines|electrolyte-copy|nutrition-data|ProductInformation/.test(file)) return ["Approved live wording or non-rendered fallback/reference code", "Powder product pages and product-information guide"];
  if (/recipe-copy|review-pages/.test(file)) return ["Legacy route preservation or replacement rules", "/recipes and preserved original recipe URLs"];
  return ["Source/code reference; not changed automatically", "See component/file; not identified as current visible marketing"];
}
for (const file of files) {
  if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip|mp4|mp3|lock)$/.test(file) || file.endsWith("pnpm-lock.yaml")) continue;
  let bytes;
  try { bytes = await fs.readFile(file); } catch { continue; }
  if (bytes.includes(0)) continue;
  const text = bytes.toString();
  for (const match of text.matchAll(terms)) {
    let [classification, page] = classify(file);
    if (file.endsWith("/recipes.json")) {
      const slug = [...text.slice(0, match.index).matchAll(/"slug":\s*"([^"]+)"/g)].at(-1)?.[1];
      if (slug) page = `/recipes/${slug} (captured source; live copy adapted)`;
    }
    if (file.endsWith("StellarProductInformation.tsx")) {
      classification = match.index < text.indexOf("const styles")
        ? "Legacy hard-coded guide reference; displayed products are replaced by the current catalog"
        : "Guide compatibility/filtering code; not displayed claim wording";
      page = "/product-information";
    }
    if (match[0].toLowerCase() === "rbgh-free" && text.slice(match.index + match[0].length).startsWith(" Whey")
      && /quality-claims|outline-homepage/.test(file)) {
      classification = "Live website copy: approved rBGH-Free Whey wording, retained as instructed";
    }
    matches.push({
      file, line: text.slice(0, match.index).split("\n").length, page,
      wording: match[0],
      excerpt: text.slice(Math.max(0, match.index - 80), match.index + match[0].length + 120),
      classification,
    });
  }
}
const changed = execFileSync("git", ["diff", "--name-only"]).toString().trim().split("\n").filter(Boolean);
const protectedChanges = changed.filter(file => /\.(png|jpe?g|gif|webp|svg|pdf|woff2?)$/.test(file)
  || /(?:protein|vegan|electrolyte)-products\.json$|pdf-product-outline\.json$|pricing|barcodes|serving-decisions|package-images/.test(file));
for (const file of changed.filter(file => file.endsWith("supplements-data.ts"))) {
  const stripDisclaimer = text => text.replace(/^export const labelDisclaimer = .*;\s*$/m, "");
  if (stripDisclaimer(execFileSync("git", ["show", `HEAD:${file}`]).toString()) !== stripDisclaimer(await fs.readFile(file, "utf8"))) protectedChanges.push(file);
}
if (protectedChanges.length) throw new Error(`Unexpected protected data/artwork changes: ${protectedChanges.join(", ")}`);
const qa = JSON.parse(await fs.readFile(`${out}/live-page-checks.json`, "utf8"));
const esc = text => String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const summary = {
  changed, remainingMatches: matches.length, checkedPages: qa.length, passedPages: qa.filter(result => result.passed).length,
  protectedAssetsOrProductDataChanged: protectedChanges,
  magnesium: "Magnesium Citrate comes from the captured Shopify homepage product-card metadata, handle magnesium. The existing local Shop All sorter suppresses it in favor of the separately approved Magnesium Complex. This request did not delete or restore either listing or change that rule. Current live Shopify status cannot be established from the saved snapshot; no connected Shopify catalog or database authority was used.",
  unchanged: "Original package/label images, nutrition-fact artwork, historical PDFs, product facts, serving sizes, prices, UPCs, product ingredients and image references remain unchanged. Supplement data changed only the explicitly requested FDA disclaimer punctuation. The isolate collection carbohydrate highlight now retains <1g as requested; underlying product nutrition is unchanged. Legacy recipe slugs and source URLs remain unchanged.",
  locationFindings: "All requested wording changes were located in live adapters or their captured source. The legacy Low-FODMAP recipe already used the visible title Whey Banana Berry Smoothie; its original slug was retained. Coconut Xtract was also corrected in Whey Tropical Shake. The previous Magnesium Citrate listing was already suppressed before this request; its state was left unchanged.",
};
await fs.writeFile(`${out}/remaining-wording.json`, JSON.stringify({ summary, matches, qa }, null, 2));
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Stellar Labs website wording report</title><style>body{font:15px/1.55 system-ui,sans-serif;color:#202020;max-width:1300px;margin:35px auto;padding:20px}h1,h2{line-height:1.2}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}td{overflow-wrap:anywhere}th{background:#eef5f6}pre{white-space:pre-wrap;margin:0;font:12px/1.45 monospace}summary{cursor:pointer}li{margin:5px 0}@media print{body{margin:0}thead{display:table-header-group}tr{break-inside:avoid}}</style><h1>Stellar Labs website wording report</h1><p>Website text only. Original labels and historical PDFs were not edited.</p><h2>Pages updated</h2><p>Homepage and Why Stellar Labs; About; Shop All product names; supplement collection and all seven supplement details; whey isolate and Natural Whey Protein Blend collections/products; Vegan Protein collection/products; electrolyte collection/product; product-information guide; recipe listing and requested recipe pages. Matching Canvas components were updated where present.</p><h2>Verification</h2><p>${summary.passedPages} of ${summary.checkedPages} page/viewport checks passed, including desktop/mobile Home and About. Each active product page was checked for withdrawn wording and one exact FDA disclaimer.</p><p>${esc(summary.unchanged)}</p><h2>Magnesium Citrate — confirmation needed before changing its listing</h2><p>${esc(summary.magnesium)}</p><h2>Located wording and intentional exceptions</h2><p>${esc(summary.locationFindings)}</p><p>Old text remains in historical source captures, original PDF transcriptions, previous print/export references, tests and compatibility/filtering code. These are not claims displayed on the checked live storefront. Unused design concepts and previous printable handoffs were not rewritten. Original package wording may intentionally differ from the website.</p><p>No new product or sodium claims were introduced. “5 Major Electrolytes” remains on the live electrolyte page as instructed. Live remote-store inventory/checkout and Safari/Firefox rendering are not certified by these checks.</p><h2>Files/components changed</h2><ul>${[...changed, ...files.filter(file => /(?:recipe-copy\.ts|(?:audit|verify)-website-copy\.mjs)$/.test(file) && !changed.includes(file))].map(file => `<li>${esc(file)}</li>`).join("")}</ul><h2>Every remaining requested-term match</h2><p>${matches.length} text-source matches. Each row gives exact matched wording, its surrounding source text, location, page/scope and classification. Binary label artwork and PDFs were preserved rather than edited or treated as live marketing text.</p><table><thead><tr><th>File and line</th><th>Page / scope</th><th>Exact wording and context</th><th>Classification</th></tr></thead><tbody>${matches.map(match => `<tr><td>${esc(match.file)}:${match.line}</td><td>${esc(match.page)}</td><td><strong>${esc(match.wording)}</strong><pre>${esc(match.excerpt)}</pre></td><td>${esc(match.classification)}</td></tr>`).join("")}</tbody></table></html>`;
await fs.writeFile(`${out}/stellar-labs-website-wording-report.html`, html);
console.log(JSON.stringify(summary, null, 2));
