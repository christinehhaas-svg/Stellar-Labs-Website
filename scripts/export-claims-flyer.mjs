import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { root, sandbox, flyer, data, stem, releaseFlyer } from "./lib/claims-flyer-release.mjs";
import { readClaimsFlyerPdf, verifyClaimsFlyerPdf } from "./lib/claims-flyer-pdf.mjs";

// Low-level generator: releaseFlyer calls this in an isolated staging directory.
// Tests can use their own directory and inject print regressions without
// touching the current downloadable release.
export async function exportClaimsFlyer({
  url,
  outputDirectory = path.resolve("generated-artifacts/claims-flyer"),
  beforePrint,
  screenshots = true,
} = {}) {
  await fs.mkdir(outputDirectory, { recursive: true });
  const pdfPath = path.join(outputDirectory, `${stem}.pdf`);
  const pendingPdf = path.join(outputDirectory, "pending.pdf");
  await Promise.all(["verification.json", `${stem}.pdf`, "pending.pdf"].map(file =>
    fs.rm(path.join(outputDirectory, file), { force: true })));
  let server;
  let browser;
  let deadline;
  try {
    if (!url) {
      // Serve only the flyer, without preparing either storefront's public assets.
      const require = createRequire(path.join(sandbox, "package.json"));
      const { createServer } = await import(require.resolve("vite"));
      const { default: tailwindcss } = await import(require.resolve("@tailwindcss/vite"));
      server = await createServer({
        configFile: false, root: sandbox, publicDir: path.join(root, "artifacts/stellar-review/public"), base: "/",
        cacheDir: path.join(outputDirectory, ".vite"),
        esbuild: { jsx: "automatic" },
        server: { host: "127.0.0.1", port: 0, strictPort: true, watch: null },
        plugins: [tailwindcss(), {
          name: "claims-flyer-only",
          configureServer(server) {
            server.middlewares.use((req, res, next) => {
              if (req.url !== "/") return next();
              res.setHeader("Content-Type", "text/html");
              res.end(`<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/@id/__x00__claims-flyer-entry"></script></body></html>`);
            });
          },
          resolveId(id) { if (id === "\0claims-flyer-entry") return id; },
          load(id) {
            if (id !== "\0claims-flyer-entry") return;
            return `import React from "react";
              import {createRoot} from "react-dom/client";
              import ${JSON.stringify(path.join(sandbox, "src/index.css"))};
              import {StellarClaimsFlyer} from ${JSON.stringify(flyer)};
              import {powderRows,supplementRows,flyerPageCount,fodmapDisclaimer,collectionClaimGroups} from ${JSON.stringify(data)};
              window.flyerExpected={products:[...powderRows,...supplementRows],totalPages:flyerPageCount,disclaimer:fodmapDisclaimer,groups:collectionClaimGroups};
              createRoot(document.getElementById("root")).render(React.createElement(StellarClaimsFlyer));`;
          },
        }],
      });
      await server.listen();
      url = server.resolvedUrls.local[0];
    }
    const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
      ?? (await fs.access("/repl/tools/bin/chromium").then(() => "/repl/tools/bin/chromium", () => undefined));
    browser = await chromium.launch({ executablePath, args: ["--no-sandbox"], timeout: 20_000 });
    deadline = setTimeout(() => { void browser.close().catch(() => {}); }, 90_000);
    return await verifyAndExport(browser, url, outputDirectory, { beforePrint, screenshots, pdfPath, pendingPdf });
  } finally {
    clearTimeout(deadline);
    try { await browser?.close(); } finally {
      try { await server?.close(); } finally {
        await fs.rm(pendingPdf, { force: true });
        await fs.rm(path.join(outputDirectory, ".vite"), { recursive: true, force: true });
      }
    }
  }
}

async function verifyFlyerIcons(page, groups) {
  const symbols = {
    "Non-GMO": "corn", "Certified Gluten-Free": "gluten-free", "Low-FODMAP Ingredients": "stomach",
    "rBGH-Free Whey": "milk", "No Added Sugars": "sugar", "No Added Sugar": "sugar",
    "Vegan": "leaf", "Sweetened with Stevia": "leaf",
  };
  const claims = await page.locator('[data-flyer-page="1"] .handoff-claim').evaluateAll(elements =>
    elements.map(element => {
      const icon = element.querySelector("[data-claim-icon]");
      const css = icon && getComputedStyle(icon);
      const box = icon?.getBoundingClientRect();
      return { label: element.querySelector("span")?.textContent.trim(),
        symbol: icon?.getAttribute("data-claim-icon"), count: element.querySelectorAll("[data-claim-icon]").length,
        visible: !!box?.width && !!box?.height && css.visibility === "visible" && css.display !== "none" && css.opacity !== "0",
        loaded: !(icon instanceof HTMLImageElement) || (icon.complete && icon.naturalWidth > 0),
      };
    }));
  assert.deepEqual(claims.map(item => item.label), groups.flatMap(group => group.claims), "Flyer claim icon labels changed");
  for (const claim of claims) {
    const expected = symbols[claim.label.replace(/[*†]+$/g, "")];
    assert.ok(expected, `No approved artwork mapping for ${claim.label}`);
    assert.equal(claim.count, 1, `Missing/duplicate flyer icon: ${claim.label}`);
    assert.equal(claim.symbol, expected, `Wrong flyer claim icon: ${claim.label}`);
    assert.ok(claim.visible && claim.loaded, `Missing/hidden flyer icon: ${claim.label}`);
  }
}

async function verifyAndExport(browser, url, outputDirectory, { beforePrint, screenshots, pdfPath, pendingPdf }) {
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".claims-facts-card").first().waitFor();
  await page.waitForFunction(() => document.fonts.status === "loaded");
  const dataUrl = `${new URL(url).pathname.split("/preview/")[0]}/src/components/mockups/infographics/stellar-claims-flyer-data.ts`;
  const expected = await page.evaluate(async dataUrl => {
    if (window.flyerExpected) return window.flyerExpected;
    const data = await import(dataUrl);
    return { products: [...data.powderRows, ...data.supplementRows], totalPages: data.flyerPageCount, disclaimer: data.fodmapDisclaimer, groups: data.collectionClaimGroups };
  }, dataUrl);
  assert.equal(await page.locator(".handoff-page").count(), expected.totalPages);
  assert.equal(await page.locator(".claims-facts-card").count(), expected.products.length);
  // Embed the same website images so both PDF and HTML remain complete offline.
  await page.locator(".claims-label-artwork img, .handoff-claim img").evaluateAll(async images => {
    for (const image of images) {
      const response = await fetch(image.src);
      if (!response.ok) throw new Error(`Missing website label: ${image.src}`);
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error(`Invalid website label: ${image.src}`);
      image.src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await image.decode();
      if (!image.naturalWidth) throw new Error("Empty website label");
    }
  });
  for (const product of expected.products) {
    const references = page.locator(`[data-product-reference="${product.id}"]`);
    assert.equal(await references.count(), 1 + new Set(product.labels).size, `Missing label pages: ${product.id}`);
    const text = await references.first().innerText();
    for (const value of [...product.benefits, product.suggestedUse, ...product.warnings, product.upc, product.price].filter(Boolean)) {
      assert.ok(text.includes(value), `Missing website detail for ${product.id}: ${value}`);
    }
  }
  for (const product of expected.products) {
    const card = page.locator(`[data-product-id="${product.id}"]`);
    assert.equal(await card.count(), 1, `Duplicate/missing product: ${product.id}`);
    const text = await card.innerText();
    for (const value of [product.name, product.servingSize, product.servingsPerContainer, ...product.facts, ...product.claims,
      product.upc, product.upcNote, ...product.ingredients.flatMap(item => [item.heading, item.text])].filter(Boolean)) {
      assert.ok(text.includes(value), `${product.id}: missing ${value}`);
    }
    const metrics = await card.locator("dl>div").evaluateAll(elements => elements.map(element => ({
      label: element.querySelector("dt").textContent,
      value: element.querySelector("dd").textContent,
    })));
    assert.deepEqual(metrics, product.metrics, `Nutrition mismatch: ${product.id}`);
  }
  const checkGeometry = async media => {
    const clipped = await page.locator(".handoff-page").evaluateAll(pages => pages.flatMap((page, index) => {
      const box = page.getBoundingClientRect();
      const invalid = [...page.querySelectorAll("header,section,footer,td,p,li,dt,dd,img")].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > box.bottom + 1 || rect.right > box.right + 1 || element.scrollWidth > element.clientWidth + 1;
      });
      const grid = page.querySelector(".claims-facts-grid");
      const footer = page.querySelector("footer");
      const overlap = grid && footer && grid.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 1;
      // Flex pages can include unused bottom padding in scrollHeight even when
      // every printed element fits. Check content bounds, not that padding.
      return invalid.length || overlap
        ? [{ page: index + 1, overlap: Boolean(overlap), elements: invalid.slice(0, 4).map(element => element.textContent.slice(0, 80)) }] : [];
    }));
    assert.deepEqual(clipped, [], `Content clipped in the flyer (${media})`);
    return clipped;
  };
  const clipped = await checkGeometry("screen");
  assert.deepEqual(errors, [], "Browser errors");
  await page.evaluate(() => { document.title = "Stellar Labs Claims & Nutrition Facts"; });
  if (beforePrint) await beforePrint(page, expected);
  await page.emulateMedia({ media: "print" });
  await verifyFlyerIcons(page, expected.groups);
  await checkGeometry("print");
  expected.cards = await page.locator(".claims-facts-card").evaluateAll(cards => cards.map(card => {
    const article = card.closest(".handoff-page");
    const pageBox = article.getBoundingClientRect();
    const box = element => {
      const rect = element.getBoundingClientRect();
      return { x: (rect.x - pageBox.x) * 0.75, y: (rect.y - pageBox.y) * 0.75, width: rect.width * 0.75, height: rect.height * 0.75 };
    };
    return { id: card.dataset.productId, page: Number(article.dataset.flyerPage), box: box(card),
      metrics: [...card.querySelectorAll("dl>div")].map(box) };
  }));
  expected.references = await page.locator("[data-product-reference]").evaluateAll(articles => articles.map(article => ({
    id: article.dataset.productReference,
    page: Number(article.dataset.flyerPage),
    label: Boolean(article.querySelector(".claims-label-artwork")),
  })));
  await page.pdf({ path: pendingPdf, printBackground: true, preferCSSPageSize: true, timeout: 20_000 });
  const pdf = verifyClaimsFlyerPdf(await readClaimsFlyerPdf(pendingPdf), expected);
  await page.emulateMedia({ media: "screen" });
  for (let index = 0; screenshots && index < expected.totalPages; index++) {
    await page.locator(".handoff-page").nth(index).screenshot({ path: path.join(outputDirectory, `page-${index + 1}.png`) });
    await page.locator(".handoff-page").nth(index).screenshot({ path: path.join(outputDirectory, `page-${index + 1}.jpg`), type: "jpeg", quality: 95 });
  }
  const html = await page.evaluate(() => {
    const styles = [...document.querySelectorAll("style")].map(style => style.textContent).join("\n");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stellar Labs Claims & Nutrition Facts</title><style>${styles}\nbody{margin:0;background:#e8e5e1}.stellar-handoff{width:816px;margin:auto}@media print{body{background:white}}</style></head><body>${document.querySelector(".stellar-handoff").outerHTML}</body></html>`;
  });
  assert.ok(!html.includes("<script"), "Offline preview must not need scripts");
  assert.ok(!/\b(?:src|href)=["'](?:https?:|\/)/.test(html), "Offline preview must not need external assets");
  await fs.writeFile(path.join(outputDirectory, `${stem}.html`), html);
  assert.deepEqual(errors, [], "Browser errors during printing");
  await fs.rename(pendingPdf, pdfPath);
  await fs.writeFile(path.join(outputDirectory, "verification.json"), JSON.stringify({ pages: expected.totalPages, products: expected.products.length, pdf, clipping: clipped, errors }, null, 2));
  console.log(`Verified ${expected.products.length} products across ${expected.totalPages} unclipped pages. PDF, self-contained HTML preview, and page images saved in ${outputDirectory}.`);
  return { pdfPath, expected, pdf };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.every(arg => arg === "--force" || arg.startsWith("--output=") || arg.startsWith("--output-dir=")),
    "Usage: pnpm export:claims-flyer [--force] [--output=directory]. No running preview is needed.");
  const output = path.resolve(root, args.find(arg => arg.startsWith("--output="))?.slice(9)
    ?? args.find(arg => arg.startsWith("--output-dir="))?.slice(13) ?? "generated-artifacts/claims-flyer");
  await releaseFlyer({
    output, force: args.includes("--force"),
    generate: outputDirectory => exportClaimsFlyer({ outputDirectory }),
  });
}
