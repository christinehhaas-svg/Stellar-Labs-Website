import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { renderAboutPage, renderReturnsPage } from "./render-page-handoff.mjs";
import { withBuildLock } from "../../../scripts/lib/build-lock.mjs";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(app, "../..");
const templates = path.join(app, "handoff/homepage");
const source = path.join(app, "source-assets/stellar-current/assets");
const output = path.join(root, "generated-artifacts/stellar-homepage-handoff");
const publicOutput = path.join(app, "public/homepage-handoff");
const canvasOutput = path.join(root, "artifacts/mockup-sandbox/public/handoff/homepage");
await withBuildLock(path.join(root, "generated-artifacts/.homepage-handoff.lock"), async () => {
const copy = {
  announcement: "Subscribe & save 10%",
  navigation: ["Whey Protein", "Vegan Protein", "Electrolytes", "Supplements", "Recipes"],
  heading: "LEAN NUTRITION",
  tagline: "Make Every Calorie Count",
  formulaNote: "New Look, Same Formula",
  subtitle: ["High-protein shakes,", "electrolyte-rich hydration, and supplements."],
  cta: "SHOP ALL PRODUCTS",
  categories: ["WHEY PROTEINS", "VEGAN PROTEIN", "ELECTROLYTES", "SUPPLEMENTS"],
};
const links = [
  ["Whey Protein / PROTEIN", "/?category=100-isolate-whey-protein", "/collections/whey-protein"],
  ["Vegan Protein", "/?category=vegan-plant-protein", "/collections/vegan-bars"],
  ["Electrolytes / ELECTROLYTES", "/?category=electrolyte", "/collections/electrolytes"],
  ["Supplements / SUPPLEMENTS", "/supplements", "/collections/supplements"],
  ["Recipes", "captured source blog link", "/blogs/recipes"],
  ["SHOP ALL PRODUCTS", "#shop-products (local anchor)", "/collections/products"],
];
const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const data = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const json = (file, value) => fs.writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + "\n");
fs.mkdirSync(output, { recursive: true });
for (const folder of ["assets", "sections", "snippets", "source-reference", "pages"]) fs.mkdirSync(path.join(output, folder), { recursive: true });
for (const [name, folder] of [["stellar-homepage.css", "assets"], ["stellar-homepage-header.liquid", "snippets"], ["stellar-homepage-hero.liquid", "sections"]]) {
  fs.copyFileSync(path.join(templates, name), path.join(output, folder, name));
}
const pageInstructions = fs.readFileSync(path.join(templates, "PAGES.md"), "utf8");
const readme = `${fs.readFileSync(path.join(templates, "README.md"), "utf8")}\n\n---\n\n${pageInstructions}`;
fs.writeFileSync(path.join(output, "README.md"), readme);
fs.writeFileSync(path.join(output, "pages/README.md"), pageInstructions);
const storySource = path.join(root, "scripts/content/stellar-brand-story.json");
const policySource = path.join(root, "scripts/content/stellar-shipping-returns-policy.md");
const pageContent = [
  ["about-us.html", "About Stellar Labs", renderAboutPage(JSON.parse(fs.readFileSync(storySource, "utf8")))],
  ["shipping-information.html", "Shipping & Returns Policy", renderReturnsPage(fs.readFileSync(policySource, "utf8"))],
];
for (const [name, , html] of pageContent) fs.writeFileSync(path.join(output, "pages", name), html);
for (const file of [storySource, policySource]) fs.copyFileSync(file, path.join(output, "source-reference", path.basename(file)));
const names = ["stellar-hero-full-glass.jpg", "stellar-reference-hero-texture.jpg", "d0e3e00a06012d0d.png", "stellar-hero-slate-background.jpg", "stellar-homepage-approved-photo.webp"];
const dimensions = [[1024, 1024], [953, 92], [309, 43], [1024, 1024], [1216, 830]];
for (const name of names) fs.copyFileSync(path.join(source, name), path.join(output, "assets", name));
fs.copyFileSync(path.join(root, "attached_assets/image_1791742060234.png"), path.join(output, "source-reference/merchant-reference.png"));
for (const name of ["Homepage.tsx", "_shared/homepage-typography.ts"]) {
  fs.copyFileSync(path.join(app, "src/pages/stellar", name), path.join(output, "source-reference", path.basename(name)));
}
json("approved-copy.json", copy);
json("link-map.json", links.map(([label, review, shopify]) => ({ label, review, shopify })));
json("asset-checksums.json", names.map((name, index) => ({
  file: `assets/${name}`,
  source: `source-assets/stellar-current/assets/${name}`,
  sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(source, name))).digest("hex"),
  width: dimensions[index][0],
  height: dimensions[index][1],
})));
const themeCss = fs.readFileSync(path.join(source, "eaf2f3394b5f4108.css"), "utf8");
const fonts = [...themeCss.matchAll(/@font-face\s*\{[^}]*TT Hoves[^}]*\}/g)].map(([rule]) => rule.replace(/url\(["']?([^"')]+)["']?\)/g, (_, url) => {
  const font = path.join(source, path.basename(url));
  if (!fs.existsSync(font)) throw new Error(`Missing review font: ${font}`);
  return `url("${data(font, path.extname(font) === ".otf" ? "font/otf" : "font/woff2")}")`;
})).join("\n");
if (!fonts) throw new Error("Missing TT Hoves font declarations.");
const css = fs.readFileSync(path.join(templates, "stellar-homepage.css"), "utf8");
const search = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg>';
const cart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16l1 15H3L4 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg>';
// Review anchors stay inside this document; store destinations are listed below.
const visual = `<header class="stellar-home-header">
<div class="stellar-home-announcement">${esc(copy.announcement)}</div>
<div class="stellar-home-header-row">
<a class="stellar-home-logo" href="#handoff"><img src="${data(path.join(source, names[2]), "image/png")}" alt="Stellar Labs — original logo" width="309" height="43"></a>
<nav class="stellar-home-nav" aria-label="Shop (review only)">${copy.navigation.map(label => `<a href="#destinations">${esc(label)}</a>`).join("")}</nav>
<div class="stellar-home-actions"><span aria-label="Search — artwork only">${search}</span><span aria-label="Cart — artwork only">${cart}</span></div>
</div></header>
<section class="stellar-home-hero" aria-labelledby="hero-heading">
<div class="stellar-home-art" aria-hidden="true"><img src="${data(path.join(source, names[4]), "image/webp")}" alt=""><span class="stellar-home-formula">${esc(copy.formulaNote)}</span></div>
<div class="stellar-home-copy"><h1 id="hero-heading">${copy.heading}</h1><span class="stellar-home-tagline">${copy.tagline}</span><p>${copy.subtitle.map(esc).join("<br>")}</p><a class="stellar-home-cta" href="#destinations">${copy.cta}</a></div></section>
<nav class="stellar-home-categories" aria-label="Browse categories (review only)">${copy.categories.map(label => `<a href="#destinations">${label}</a>`).join("")}</nav>`;
const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Approved homepage handoff | Stellar Labs</title><meta name="description" content="Read the approved Stellar homepage header and hero, copy, Shopify link mapping and installation notes. Review only; no live store changes."><meta property="og:title" content="Approved homepage handoff | Stellar Labs"><style>
${fonts}\n${css.replaceAll('url("stellar-hero-slate-background.jpg")', `url("${data(path.join(source, "stellar-hero-slate-background.jpg"), "image/jpeg")}")`)}
body{margin:0;background:#f5f6f7;color:#18212a;font:16px/1.6 system-ui,sans-serif}
.stellar-home-actions span{display:flex;align-items:center;justify-content:center;width:30px;min-height:44px}
.handoff-notice{padding:10px 20px;background:#edf6fa;font-size:13px;text-align:center}
.handoff-document{max-width:1080px;margin:0 auto;padding:32px 22px}
.handoff-document h2{font-size:26px;line-height:1.3}.handoff-document a{color:#07567c}
.handoff-downloads{display:flex;gap:12px;flex-wrap:wrap}
.handoff-downloads a{background:#fff;border:1px solid #bbc9d2;border-radius:6px;padding:10px 14px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;border:1px solid #d6dee5;padding:20px;font:15px/1.65 system-ui,sans-serif}
.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;background:white;font-size:14px}th,td{text-align:left;padding:12px;border:1px solid #d6dee5}
details{margin:16px 0}summary{cursor:pointer;font-weight:600}code{font-family:monospace}
@media print{.handoff-downloads{display:none}details{display:block}}
</style></head><body>
<div class="handoff-notice">Approved header + hero review only · No live store changes · Search/cart are artwork here</div>
${visual}
<main class="handoff-document" id="handoff"><h2>Homepage handoff for your website team</h2>
<p>The approved design is visible above. All copy and instructions are readable below—no download is needed. The reference's category strip is included; everything below it stays unchanged.</p>
<div class="handoff-downloads"><a href="stellar-homepage-handoff.zip" download>Download editable Shopify package</a><a href="preview.html" download>Save this readable preview</a><a href="README.md" download>Download implementation notes</a></div>
<p>When viewing a saved HTML file, download links work only if the ZIP and notes are saved beside it. The complete design and instructions below remain readable without those files.</p>
<h2 id="destinations">Existing Shopify destinations</h2><p>Preview links scroll here instead of opening the live store. The website team should use these destinations inside Shopify.</p>
<div class="table-scroll"><table><thead><tr><th>Link</th><th>Local review</th><th>Shopify path</th></tr></thead><tbody>${links.map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
<h2>Complete approved copy and implementation notes</h2><pre>${esc(readme)}</pre>
<h2>Approved page content — readable offline</h2>
<p>The following page bodies are also included as ready-to-paste HTML in the ZIP's pages folder. No live store changes have been made.</p>
${pageContent.map(([name, title, html]) => `<section aria-label="${esc(title)}">${html}<details><summary>Copy editable HTML: pages/${name}</summary><pre><code>${esc(html)}</code></pre></details></section>`).join("\n")}
<h2>Editable code</h2><p>The files are editable in the package. They are also readable here for your team.</p>
${["stellar-homepage.css", "stellar-homepage-header.liquid", "stellar-homepage-hero.liquid"].map(name => `<details><summary>${name}</summary><pre><code>${esc(fs.readFileSync(path.join(templates, name), "utf8"))}</code></pre></details>`).join("")}
</main></body></html>`;
fs.writeFileSync(path.join(output, "preview.html"), preview);
const zip = path.join(root, "generated-artifacts/stellar-homepage-handoff.zip");
const pendingZip = path.join(root, `generated-artifacts/.homepage-handoff-${process.pid}.zip`);
try {
  execFileSync("zip", ["-qr", pendingZip, "."], { cwd: output });
  execFileSync("unzip", ["-tqq", pendingZip]);
  // Keep the last valid archive available until its replacement is complete.
  fs.renameSync(pendingZip, zip);
} finally {
  fs.rmSync(pendingZip, { force: true });
}
fs.mkdirSync(publicOutput, { recursive: true });
fs.cpSync(output, publicOutput, { recursive: true });
fs.copyFileSync(zip, path.join(publicOutput, "stellar-homepage-handoff.zip"));
fs.mkdirSync(canvasOutput, { recursive: true });
for (const name of ["preview.html", "README.md"]) fs.copyFileSync(path.join(output, name), path.join(canvasOutput, name));
fs.copyFileSync(zip, path.join(canvasOutput, "stellar-homepage-handoff.zip"));
console.info("Approved homepage handoff, About and Shipping & Returns page bodies, and readable preview prepared.");
});
