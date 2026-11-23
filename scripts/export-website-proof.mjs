import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { root, sourceFingerprint } from "./lib/claims-flyer-release.mjs";

// Read-only capture of current local pages. No historical handout copy is added.
const output = path.join(root, "generated-artifacts/website-proof");
const baseURL = "http://127.0.0.1:80";
const fingerprint = () => sourceFingerprint(root, [
  path.join(root, "artifacts/stellar-review/src/App.tsx"),
  path.join(root, "artifacts/stellar-review/src/ReviewContent.tsx"),
  import.meta.filename,
]);
const before = await fingerprint();
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
const pages = [];
const cachePath = path.join(output, "capture-cache.json");
const cached = await fs.readFile(cachePath, "utf8").then(JSON.parse, () => null);
const cachedPages = cached?.fingerprint === before.fingerprint ? cached.pages : [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", route => {
    const request = route.request(), url = new URL(request.url());
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) ||
        url.origin !== new URL(baseURL).origin ||
        /\/(?:cart|checkout|orders|payments)(?:\/|$)/i.test(url.pathname)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await page.goto(baseURL, { waitUntil: "networkidle" });
  const routes = await page.evaluate(async () => {
    const { reviewPages } = await import("/src/review-pages.ts");
    const { supplements } = await import("/src/pages/stellar/_shared/supplements-data.ts");
    const seen = new Set();
    const routes = reviewPages.filter(item => {
      if (seen.has(item.id) || ["homepage-handoff", "supplement-details"].includes(item.id)) return false;
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
    const previous = cachedPages.find(item => item.path === route.path && item.title === route.title);
    if (previous) {
      pages.push(previous);
      if (route.path === "/") pages.push(cachedPages.find(item => item.title === "Shared navigation and footer"));
      console.log(`Reused verified-source capture ${route.path}`);
      continue;
    }
    await page.goto(new URL(route.path, baseURL).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const doc = document.querySelector("iframe")?.contentDocument;
      return (doc?.querySelector("#supplements-app-mount") || doc?.querySelector("#MainContent") ||
        document.querySelector(".stellar-product-guide"))?.innerText.trim().length > 40;
    });
    const frame = await page.locator("iframe").count()
      ? await (await page.locator("iframe").first().elementHandle()).contentFrame()
      : page;
    const capture = await frame.evaluate(async () => {
      const root = document.querySelector("#supplements-app-mount") || document.querySelector("#MainContent") || document.querySelector(".stellar-product-guide");
      root.querySelectorAll("details").forEach(node => { node.open = true; });
      const labels = [];
      const seen = new Set();
      for (const image of root.querySelectorAll("img")) {
        if (!/label|facts|nutrition|ingredients/i.test(image.alt + " " + image.src) || seen.has(image.src)) continue;
        if (!image.getClientRects().length || getComputedStyle(image).visibility === "hidden") continue;
        seen.add(image.src);
        await image.decode();
        const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        labels.push({ alt: image.alt || "Product label shown on this page", source: image.src, data: canvas.toDataURL("image/jpeg", 0.9) });
      }
      return {
        text: root.innerText.trim(), labels,
        header: document.querySelector("#header-component")?.innerText.trim() || "",
        footer: document.querySelector("footer")?.innerText.trim() || "",
      };
    });
    assert.ok(!/This page isn.t in the review|could not load/i.test(capture.text), `Unavailable page: ${route.path}`);
    pages.push({ ...route, text: capture.text, labels: capture.labels });
    if (route.path === "/") pages.push({
      title: "Shared navigation and footer", path: "/",
      text: `HEADER / NAVIGATION\n${capture.header}\n\nFOOTER\n${capture.footer}`, labels: [],
    });
    await fs.writeFile(cachePath, JSON.stringify({ fingerprint: before.fingerprint, pages }));
    console.log(`Captured ${route.path} (${capture.labels.length} label images)`);
  }
  assert.equal((await fingerprint()).fingerprint, before.fingerprint, "Website changed during capture; rerun before sharing.");
  const wrap = text => text.split("\n").flatMap(line => {
    const result = []; let current = "";
    for (const word of line.trim().split(/\s+/)) {
      if (current && `${current} ${word}`.length > 86) { result.push(current); current = ""; }
      current += (current ? " " : "") + word;
    }
    return [...result, current];
  });
  const chunks = pages.flatMap(section => {
    const lines = wrap(section.text);
    return Array.from({ length: Math.ceil(lines.length / 32) }, (_, index) => ({
      title: section.title, path: section.path, continued: index > 0,
      text: lines.slice(index * 32, (index + 1) * 32).join("\n"),
    }));
  });
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const capturedAt = new Date().toISOString();
  const labelPages = pages.flatMap(section => section.labels.map(label => ({ ...label, title: section.title, path: section.path })));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Stellar Labs — Whole Website Proofreading Copy</title><style>
    @page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#171717}
    article{width:816px;height:1056px;padding:46px;position:relative;break-after:page}article:last-child{break-after:auto}
    h1{font-size:25px;line-height:1.2;margin:12px 0}h2{font-size:19px}.brand{color:#087e91;font-size:12px;font-weight:bold;letter-spacing:1px}
    header{height:150px;border-bottom:2px solid #32c0cb;margin-bottom:18px}.path{font-size:11px;overflow-wrap:anywhere}
    pre{font:14px/1.45 Arial,sans-serif;white-space:pre-wrap;margin:0}
    footer{position:absolute;bottom:28px;left:46px;right:46px;border-top:1px solid #ddd;padding-top:9px;font-size:10px;color:#555}
    .label{height:720px;display:flex;align-items:center;justify-content:center}.label img{max-width:100%;max-height:100%;object-fit:contain}
    .intro{font-size:16px;line-height:1.6}li{margin-bottom:8px}
  </style></head><body><article><div class="brand">STELLAR LABS</div><h1>Whole Website<br>Proofreading Copy</h1><p class="intro">Captured ${esc(capturedAt.slice(0,10))}<br>${pages.length} website pages/sections · ${labelPages.length} displayed label images</p>
    <p class="intro">A searchable, page-by-page copy of the current review website for checking wording, prices, nutrition information, claims, ingredients, and disclaimers.</p>
    <ul class="intro"><li>Includes the homepage, category pages, product pages, comparison, About, contact, locations, shipping/returns, recipes, and product information page.</li><li>Expandable page information is open. Shared navigation and footer are recorded separately.</li><li>Original label images displayed on the website follow the website text. Printed packaging wording may differ from surrounding website copy; those differences are preserved for review.</li><li>This is a text-first proofreading document, not a pixel-for-pixel screenshot of every layout.</li><li>External Shopify/book pages, checkout, account screens, and interactive menus or dialogs are not reproduced. No website changes were made.</li></ul>
    <footer>Current local review website · Proofreading copy, not final approval</footer></article>
    ${chunks.map((chunk,index) => `<article><header><div class="brand">WEBSITE PAGE COPY</div><h1>${esc(chunk.title)}${chunk.continued ? " (continued)" : ""}</h1><p class="path">${esc(chunk.path)}</p></header><pre>${esc(chunk.text)}</pre><footer>Website copy ${index+1} / ${chunks.length}</footer></article>`).join("")}
    ${labelPages.map((label,index) => `<article><header><div class="brand">LABEL ARTWORK DISPLAYED ON THE WEBSITE</div><h1>${esc(label.title)}</h1><p class="path">${esc(label.path)}<br>${esc(label.alt)}</p></header><div class="label"><img src="${label.data}" alt="${esc(label.alt)}"></div><footer>Displayed label ${index+1} / ${labelPages.length} · Original wording preserved</footer></article>`).join("")}
    </body></html>`;
  await fs.writeFile(path.join(output, "website-proof.html"), html);
  await fs.writeFile(path.join(output, "website-proof.json"), JSON.stringify({ capturedAt, fingerprint: before.fingerprint, pages: pages.map(({ labels, ...page }) => ({ ...page, labels: labels.map(({data,...label})=>label) })), chunks, labelImages: labelPages.length }, null, 2));
  await fs.writeFile(path.join(output, "website-proof.txt"), pages.map(section => `${section.title}\nWebsite path: ${section.path}\n\n${section.text}`).join("\n\n"+"=".repeat(70)+"\n\n"));
  const print = await context.newPage();
  await print.setContent(html, { waitUntil: "load", timeout: 60000 });
  const overflow = await print.locator("article").evaluateAll(nodes => nodes.flatMap((node,index) => {
    const content = node.querySelector("pre,.label,ul"), footer = node.querySelector("footer");
    return content && content.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 5 ? [index+1] : [];
  }));
  assert.deepEqual(overflow, [], "Proofreading pages overflow");
  await print.pdf({ path: path.join(output, "stellar-labs-whole-website-proof.pdf"), printBackground: true, preferCSSPageSize: true, timeout: 90000 });
  console.log(JSON.stringify({ websiteSections: pages.length, textPages: chunks.length, labelImages: labelPages.length, output }));
} finally { await browser.close(); }
