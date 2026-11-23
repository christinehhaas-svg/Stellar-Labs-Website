import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import vm from "node:vm";
import ts from "typescript";
import { chromium } from "@playwright/test";
import { exportClaimsFlyer } from "./export-claims-flyer.mjs";
import { root, flyer, sourceFingerprint } from "./lib/claims-flyer-release.mjs";
import { captureHomepageRebuild } from "./lib/homepage-rebuild.mjs";

// An explicit, read-only capture of the local review website. Never uses the
// public Shopify store or changes storefront copy, carts, or handoff packs.
const output = path.resolve("generated-artifacts/web-team-handoff");
const baseURL = process.env.WEB_TEAM_PREVIEW_URL || "http://127.0.0.1:80";
const fingerprint = () => sourceFingerprint(root, [
  flyer,
  path.join(root, "artifacts/stellar-review/src/App.tsx"),
  path.join(root, "artifacts/stellar-review/src/ReviewContent.tsx"),
  import.meta.filename,
]);
const before = await fingerprint();
const shared = path.join(root, "artifacts/stellar-review/src/pages/stellar/_shared");
const source = await fs.readFile(path.join(shared, "SupplementPurchasePage.tsx"), "utf8");
const description = source.match(/className="sl-probiotic-description">([^<]+)</)?.[1];
assert.ok(description, "Missing canonical Probiotic description");
const servingExports = {};
vm.runInNewContext(ts.transpileModule(await fs.readFile(path.join(shared, "product-servings.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: servingExports });
const currentPrices = servingExports.supplementServingInfo;
assert.ok(currentPrices, "Missing canonical supplement prices");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/repl/tools/bin/chromium",
  args: ["--no-sandbox"], timeout: 20_000,
});
const pages = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) ||
        url.origin !== new URL(baseURL).origin ||
        /\/(?:cart|checkout|orders|payments)(?:\/|[?.]|$)/i.test(url.pathname)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  await page.goto(baseURL, { waitUntil: "networkidle" });
  const routes = await page.evaluate(async () => {
    const { reviewPages } = await import("/src/review-pages.ts");
    const { supplements } = await import("/src/pages/stellar/_shared/supplements-data.ts");
    const seen = new Set();
    const routes = reviewPages.filter(item => {
      if (seen.has(item.id) || ["homepage-handoff", "product-information", "supplement-details"].includes(item.id)) return false;
      seen.add(item.id);
      return true;
    }).map(item => ({ title: item.label, path: item.path }));
    routes.push(
      { title: "All Whey collection", path: "/?category=100-isolate-whey-protein" },
      { title: "Whey Isolate collection", path: "/?category=100-isolate-whey-protein&formula=isolate" },
      { title: "Whey Blend collection", path: "/?category=100-isolate-whey-protein&formula=blend" },
      { title: "Vegan Protein collection", path: "/?category=vegan-plant-protein" },
      { title: "Electrolytes collection", path: "/?category=electrolyte" },
      ...supplements.map(item => ({ title: item.name, path: `/supplement-details?product=${item.id}` })),
    );
    return routes;
  });
  for (const route of routes) {
    await page.goto(new URL(route.path, baseURL).href, { waitUntil: "networkidle" });
    const frameElement = page.locator("iframe").first();
    await frameElement.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const frame = document.querySelector("iframe");
      if (!frame || frame.getAttribute("aria-hidden") === "true") return false;
      const doc = frame.contentDocument;
      const content = doc?.querySelector("#supplements-app-mount") || doc?.querySelector("#MainContent");
      return Boolean(content?.innerText.trim().length > 40);
    });
    const frame = await (await frameElement.elementHandle()).contentFrame();
    assert.ok(frame, `Missing content frame: ${route.path}`);
    const copy = await frame.evaluate(() => {
      const root = document.querySelector("#supplements-app-mount") || document.querySelector("#MainContent");
      if (!root) throw new Error("Missing website content");
      // Include actual expandable safety/recipe copy without printing menus.
      root.querySelectorAll("details").forEach(details => { details.open = true; });
      return {
        text: root.innerText.trim(),
        why: [...root.querySelectorAll("h2")].find(heading => heading.textContent.trim() === "Why Stellar Labs?")
          ?.closest('[id^="shopify-section-"]')?.innerText.trim(),
        header: document.querySelector("#header-component")?.innerText.trim(),
        footer: document.querySelector("footer")?.innerText.trim(),
      };
    });
    assert.ok(!/This page isn.t in the review|could not load/i.test(copy.text), `Unavailable page: ${route.path}`);
    const supplementId = new URL(route.path, baseURL).searchParams.get("product");
    if (route.path.startsWith("/supplement-details?")) {
      const cents = currentPrices[supplementId]?.priceCents;
      assert.ok(cents === undefined || copy.text.includes(`$${(cents / 100).toFixed(2)}`),
        `Stale supplement price in preview: ${supplementId}. Restart the existing review workflow.`);
      if (supplementId === "probiotic-40") assert.ok(copy.text.includes(description),
        "Stale Probiotic description in preview. Restart the existing review workflow.");
    }
    pages.push({ ...route, text: copy.text });
    if (route.path === "/") {
      await captureHomepageRebuild({ page, frame, output, baseURL });
      assert.ok(/why stellar labs\?/i.test(copy.why || ""), "Missing Why Stellar Labs website section");
      pages.push({ title: "Why Stellar Labs? — homepage section", path: "/", text: copy.why,
        note: "Homepage section reproduced separately for the web team; not a separate website route." });
      assert.ok(copy.header && copy.footer, "Missing shared navigation/footer wording");
      pages.push({ title: "Shared website navigation and footer", path: "/",
        text: `HEADER / NAVIGATION\n${copy.header}\n\nFOOTER\n${copy.footer}` });
    }
    console.log(`Captured ${route.path}`);
  }
} finally {
  await browser.close();
}
assert.equal((await fingerprint()).fingerprint, before.fingerprint, "Website sources changed during capture; regenerate before sharing.");

// Text-first pagination is deliberately conservative. Export checks every page
// and verifies the actual PDF text, rather than shrinking text to fit.
function wrap(text) {
  return text.replace(/\r/g, "").split("\n").flatMap(line => {
    if (!line.trim()) return [""];
    const result = [];
    let current = "";
    for (const word of line.trim().split(/\s+/)) {
      if (current && (current + " " + word).length > 88) { result.push(current); current = ""; }
      current += (current ? " " : "") + word;
    }
    return [...result, current];
  });
}
const chunks = pages.flatMap((page, section) => {
  const lines = wrap(page.text);
  return Array.from({ length: Math.ceil(lines.length / 34) }, (_, index) => ({
    ...page, section, continued: index > 0, text: lines.slice(index * 34, (index + 1) * 34).join("\n"),
  }));
});
await fs.writeFile(path.join(output, "website-copy.json"), JSON.stringify({ capturedAt: new Date().toISOString(), pages, chunks }, null, 2));
await fs.writeFile(path.join(output, "stellar-labs-web-team-page-copy.txt"), [
  "STELLAR LABS — WEB TEAM PAGE COPY",
  "Current local review wording. Includes expandable information; not live checkout or certification documentation.",
  "Product claims, nutrition and original label artwork are also included in the accompanying PDF.",
  ...pages.map(page => `\n${"=".repeat(72)}\n${page.title}\nWebsite path: ${page.path}\n${page.note || ""}\n\n${page.text}`),
].join("\n\n"));

const escape = value => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Stellar Labs — Website Page Copy</title><style>
@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#23201f;background:#eee}
article{width:816px;height:1056px;padding:48px;background:white;break-after:page;position:relative;overflow:hidden}
article:last-child{break-after:auto}header{height:152px;border-bottom:2px solid #00a8b8;margin-bottom:20px}
.brand{font-size:13px;font-weight:700;letter-spacing:1px;color:#087e91}h1{font-size:23px;line-height:1.15;margin:12px 0 8px}
.path{font-size:11px;overflow-wrap:anywhere;margin:0;line-height:1.4}
pre{font-family:Arial,sans-serif;font-size:14px;line-height:1.45;white-space:pre-wrap;margin:0}
footer{position:absolute;left:48px;right:48px;bottom:32px;font-size:10px;color:#615b57;border-top:1px solid #ddd;padding-top:10px}
@media print{body{background:white}article{print-color-adjust:exact}}
</style></head><body>${chunks.map((chunk, i) => `<article data-copy-page="${i + 1}"><header><div class="brand">STELLAR LABS® · WEB TEAM PAGE COPY</div><h1>${escape(chunk.title)}${chunk.continued ? " (continued)" : ""}</h1><p class="path">${escape(chunk.path)}${chunk.note ? `<br>${escape(chunk.note)}` : ""}</p></header><pre>${escape(chunk.text)}</pre><footer>CURRENT REVIEW WEBSITE WORDING · COPY APPENDIX ${i + 1} / ${chunks.length}</footer></article>`).join("")}</body></html>`;
await fs.writeFile(path.join(output, "stellar-labs-web-team-page-copy.html"), html);
const printBrowser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await printBrowser.newPage();
  await page.setContent(html);
  const clipped = await page.locator("article").evaluateAll(articles => articles.flatMap((article, index) => {
    const footer = article.querySelector("footer").getBoundingClientRect();
    const copy = article.querySelector("pre").getBoundingClientRect();
    return copy.bottom > footer.top - 8 ? [index + 1] : [];
  }));
  assert.deepEqual(clipped, [], "Website copy would overlap a footer");
  await page.pdf({ path: path.join(output, "website-copy.pdf"), printBackground: true, preferCSSPageSize: true, timeout: 30_000 });
} finally { await printBrowser.close(); }

// Generate fresh product facts independently; leave the existing public flyer
// release untouched until this separate web-team deliverable is verified.
await exportClaimsFlyer({ outputDirectory: path.join(output, "claims"), screenshots: false });
assert.equal((await fingerprint()).fingerprint, before.fingerprint, "Website sources changed during export; regenerate before sharing.");
await promisify(execFile)("python", ["scripts/lib/assemble-web-team-handoff.py", output], { timeout: 90_000 });
await promisify(execFile)("zip", ["-q", "-r", "stellar-labs-website-rebuild-bundle.zip",
  "stellar-labs-web-team-complete-handoff.pdf", "stellar-labs-web-team-page-copy.txt",
  "homepage-rebuild.html", "homepage-rebuild.json", "homepage-assets", "homepage-desktop.png", "homepage-mobile.png"],
  { cwd: output, timeout: 90_000 });
console.log(`Verified complete web-team handoff: ${output}/stellar-labs-web-team-complete-handoff.pdf`);
