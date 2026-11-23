import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const output = "generated-artifacts/website-copy-audit";
fs.mkdirSync(output, { recursive: true });
const terms = /low[- ]fodmap|fodmap|New Products, Same Label|CHRISTINE HANSON|rBGH-Free|artificial flavors|artificial colors|artificial sweeteners|all natural|sustainable energy|Tumeric|Coconut Xtract|no bloat|low sodium|less sodium/gi;
const files = [...new Set(execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { maxBuffer: 20_000_000 }).toString().split("\0").filter(Boolean))];
const rows = [];
const binary = [];
const classify = file => {
  if (/^tests\/|^scripts\/|\/scripts\/|^\.github\//.test(file)) return "Code/test fixture or separate export tooling; not live wording";
  if (/^\.agents\/|\.md$|^attached_assets\//.test(file)) return "Instructions or historical reference; not live wording";
  if (/pdf-product-outline\.json|originalDescription|recipes\.json|protein-products\.json/.test(file)) return "Preserved source/product data; rendered through approved website copy adapters";
  if (/source-assets\/|\/public\/|\/exports\/|^exports\//.test(file)) return "Saved capture, handoff, or legacy content; not an original-artwork edit";
  if (/classic-whey|EditorialConcept|whey-lines/.test(file)) return "Retired product or alternate design; not the active storefront (approved live names share this file)";
  if (/\/infographics\//.test(file)) return "Separate flyer artifact/export; outside website-text-only scope, unchanged";
  if (/recipe-copy/.test(file)) return "Replacement patterns for legacy text; not the rendered recipe wording";
  if (/fodmap-disclaimer|website-copy|powder-page-notes|product-guide-catalog|QualityCallouts|StellarProductInformation|ProteinProductPage|outline-copy/.test(file)) return "Filtering/compatibility code or approved claim; not retired live marketing";
  return "Website source or approved claim; see exact wording and rendered-page QA";
};
const page = file => {
  if (/recipe/i.test(file)) return "Recipes; original slugs retained";
  if (/About|about-story/.test(file)) return "About";
  if (/homepage|brand-story|Homepage/.test(file)) return "Homepage / Shop All";
  if (/Supplements|supplement/.test(file)) return "Supplements collection and details";
  if (/ProductInformation|product-guide/.test(file)) return "Product information guide";
  if (/powder|Powder|Protein|quality|outline|nutrition|electrolyte|whey|claim/.test(file)) return "Product/category pages or shared claims";
  return "Not mapped to an active page / supporting content";
};
for (const file of files) {
  if (/^\.local\/|^generated-artifacts\/|node_modules|pnpm-lock/.test(file) || !fs.existsSync(file)) continue;
  if (/\.(?:pdf|png|jpe?g|gif|webp|zip|mp4|woff2?|ttf)$/i.test(file)) {
    if (/\.pdf$/i.test(file)) {
      try {
        const text = execFileSync("pdftotext", ["-layout", file, "-"], { maxBuffer: 10_000_000, stdio: ["ignore", "pipe", "ignore"] }).toString();
        for (const [index, line] of text.split("\n").entries()) {
          const matches = [...line.matchAll(terms)].map(match => match[0]);
          if (matches.length) rows.push({ file, line: index + 1, page: "PDF text extraction; line is not a PDF page number", category: "Existing label/reference/handoff PDF; unchanged", matches: matches.join(" | "), wording: line.trim() });
        }
      } catch { binary.push(file); }
    } else if (/\.(png|jpe?g|webp)$/i.test(file)) binary.push(file);
    continue;
  }
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) continue;
  for (const [index, line] of buffer.toString().split("\n").entries()) {
    const matches = [...line.matchAll(terms)].map(match => match[0]);
    if (!matches.length) continue;
    rows.push({ file, line: index + 1, page: page(file), category: classify(file), matches: matches.join(" | "), wording: line.trim() });
  }
}
fs.writeFileSync(path.join(output, "remaining-wording.json"), JSON.stringify(rows, null, 2));
const escape = value => String(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
const pending = execFileSync("git", ["diff", "--name-only", "HEAD"]).toString().trim();
const changed = [...new Set(`${pending}\n${execFileSync("git", ["show", "--format=", "--name-only", "HEAD"]).toString().trim()}`.split("\n").filter(Boolean))];
const protectedChanges = changed.filter(file => /\.(png|jpe?g|webp|pdf|svg|zip)$/i.test(file));
const body = `<h1>Website wording audit</h1>
<p>The attached website-text instructions were applied to the active review and Canvas. Original labels, ingredient data, artwork, historical PDFs, recipe nutrition, product prices and UPCs were not edited. Vanilla vegan was restored to 6g carbs at the merchant's separate request.</p>
<h2>Magnesium Citrate: left unchanged</h2><p>Shop All contains a Shopify-derived product card in the saved homepage capture: <b>Stellar Labs® Magnesium Citrate</b>, handle <code>magnesium</code>, Shopify product ID <code>8096490553518</code>. The local website renders this static captured catalog data; it is not a new database entry and is not Magnesium Complex. The active supplement data explicitly says the Citrate listing is not a confirmed match for Complex. A public Shopify check was rate-limited, so current published/hidden Shopify status remains unconfirmed. Confirm before removing or merging it.</p>
<h2>Preserved items</h2><p>The legacy Low-FODMAP recipe URL and original source links remain, with neutral visible recipe copy. Source PDF transcriptions, originalDescription fields, recipe capture JSON, test fixtures, compatibility filters and archival handoffs can still contain old wording; the table classifies each match. Approved <b>rBGH-Free Whey</b> and product-specific artificial-flavor/color statements outside the restricted Natural blends can remain. Retired Classic product data is preserved.</p>
<p>Existing download PDFs/ZIPs were not rewritten in this website-text-only pass. They may contain old marketing copy or the earlier 7g guide value; refreshing generated marketing handoffs (not original labels) requires separate scope approval.</p>
<h2>Checks and limits</h2><p>Rendered-page regressions cover desktop/mobile homepage, About, collections, Shop All, product guide, representative powder/supplement details, recipes and legacy recipe URLs. Source tests verify all active products' claims and recipe nutrition. No assumption is made about current Shopify publishing status. Images are not OCR-searched; their original files remain unchanged. PDF text was searched where extractable; scans without text are listed separately.</p>
<p>Protected artwork/PDF changes in current diff: <b>${protectedChanges.length}</b>. ${escape(protectedChanges.join(", "))}</p>
<h2>Changed files and components</h2><ul>${changed.map(file => `<li><code>${escape(file)}</code></li>`).join("")}</ul>
<h2>Every remaining text match</h2><p>${rows.length} matching lines across ${new Set(rows.map(row => row.file)).size} files. Each row includes the exact line; use your browser's Find to locate a term or file.</p>
<table><thead><tr><th>File / line</th><th>Page / use</th><th>Classification</th><th>Matched terms</th><th>Exact remaining wording</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escape(row.file)}:${row.line}</td><td>${escape(row.page)}</td><td>${escape(row.category)}</td><td>${escape(row.matches)}</td><td><pre>${escape(row.wording)}</pre></td></tr>`).join("")}</tbody></table>
<details><summary>Unchanged image/scanned assets not text-searchable (${binary.length})</summary><ul>${binary.map(file => `<li>${escape(file)}</li>`).join("")}</ul></details>`;
fs.writeFileSync(path.join(output, "website-copy-audit.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Website wording audit</title><style>body{font:15px/1.6 system-ui;margin:32px;color:#23201f}h1,h2{line-height:1.2}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}th{background:#e8f8fb}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-width:700px;margin:0}td:first-child{overflow-wrap:anywhere;max-width:330px}code{overflow-wrap:anywhere}details{margin:24px 0}</style>${body}</html>`);
console.log(JSON.stringify({ matchingLines: rows.length, files: new Set(rows.map(row => row.file)).size, protectedChanges, output }));
