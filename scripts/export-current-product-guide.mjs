import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";

const output = path.resolve("generated-artifacts/product-guide/stellar-product-information-guide.pdf");
await fs.mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/repl/tools/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:80/product-information", { waitUntil: "networkidle" });
  await page.locator(".stellar-product-guide__product").first().waitFor({ state: "attached" });
  assert.equal(await page.locator(".stellar-product-guide__product").count(), 20);
  const names = await page.locator(".stellar-product-guide__product-name").allTextContents();
  assert.ok(names.every(name => !/night.?time|classic/i.test(name)));
  const summaries = await page.locator(".stellar-product-guide__nutrition").count();
  assert.equal(summaries, 13, "Seven isolates, three Natural blends, two vegan and one electrolyte");
  assert.equal(await page.locator(".stellar-product-guide__product-claims").count(), 20);
  const claimLists = await page.locator(".stellar-product-guide__product-claims").allTextContents();
  assert.ok(claimLists.every(text => text.trim()), "Every included product needs its own claims list");
  await page.evaluate(() => {
    document.querySelectorAll("details").forEach(details => { details.open = true; });
    document.querySelectorAll('a[href*=".pdf"]').forEach(link => link.closest("p")?.remove());
    document.querySelectorAll(".stellar-product-guide__product-body a").forEach(link => link.closest("p")?.remove());
    // Consolidate repeated warnings without dropping the supplied safety text.
    const warnings = new Map();
    document.querySelectorAll(".stellar-product-guide__product-body").forEach(body => {
      for (const heading of body.querySelectorAll("h3")) {
        if (heading.textContent !== "Warnings and disclaimers") continue;
        let next = heading.nextElementSibling;
        while (next && next.tagName === "P") {
          const text = next.textContent.trim();
          const productName = body.closest(".stellar-product-guide__product")
            .querySelector(".stellar-product-guide__product-name").textContent.trim();
          const products = warnings.get(text) ?? new Set();
          products.add(productName);
          warnings.set(text, products);
          const current = next;
          next = next.nextElementSibling;
          current.remove();
        }
        heading.remove();
      }
    });
    const appendix = document.createElement("section");
    appendix.className = "guide-print-warnings";
    const title = document.createElement("h2");
    title.textContent = "Important product information";
    appendix.append(title);
    for (const [warning, products] of warnings) {
      // The exact shared FDA statement remains in the guide's final footnote.
      if (/^These statements have not been evaluated by the Food and Drug Administration\.\s*This product is not intended to diagnose, treat, cure, or prevent any disease\.$/.test(warning)) continue;
      const paragraph = document.createElement("p");
      paragraph.textContent = warning;
      appendix.append(paragraph);
      const applies = document.createElement("p");
      applies.style.color = "#555";
      applies.textContent = products.size === 20
        ? "Applies to all products in this guide."
        : `Applies to: ${[...products].join("; ")}.`;
      appendix.append(applies);
    }
    document.querySelector(".stellar-product-guide__inner").append(appendix);
    const guide = document.querySelector(".stellar-product-guide");
    // Native disclosure elements and the app's fixed-height root clip browser
    // printing. Flatten only this export document, not the interactive website.
    for (const summary of guide.querySelectorAll("summary")) {
      const heading = document.createElement("div");
      heading.className = summary.parentElement.classList.contains("stellar-product-guide__family")
        ? "guide-print-family-heading" : "guide-print-product-heading";
      heading.append(...summary.childNodes);
      summary.replaceWith(heading);
    }
    for (const details of [...guide.querySelectorAll("details")].reverse()) {
      const section = document.createElement("section");
      section.className = details.className;
      section.append(...details.childNodes);
      details.replaceWith(section);
    }
    // Retain the guide's existing presentation but remove clipping ancestors.
    document.querySelectorAll("style").forEach(style => document.head.append(style.cloneNode(true)));
    document.body.replaceChildren(guide);
  });
  await page.addStyleTag({ content: `
    @page { size:A4; margin:14mm 14mm 18mm; }
    html,body,.stellar-product-guide { background:#fff!important;color:#111!important;height:auto!important;max-height:none!important;overflow:visible!important;position:static!important; }
    .guide-print-family-heading { display:flex;justify-content:space-between;align-items:center;min-height:40px; }
    .guide-print-product-heading { display:block;padding:10px 0 4px; }
    .stellar-product-guide { padding:0!important; }
    .stellar-product-guide__inner { max-width:none; }
    .stellar-product-guide h2 { font-size:24px;line-height:1.2; }
    .stellar-product-guide__intro { font-size:11px;line-height:1.4;margin:12px 0 18px; }
    .stellar-product-guide__family > summary { min-height:40px;grid-template-columns:1fr auto; }
    .stellar-product-guide__family-title { font-size:16px;font-weight:700; }
    summary::after { display:none!important; }
    .stellar-product-guide__product { break-inside:avoid; }
    .stellar-product-guide__product > summary { display:block;min-height:0;padding:10px 0 4px; }
    .stellar-product-guide__product-name { font-size:12px;font-weight:700; }
    .stellar-product-guide__nutrition { max-width:420px;margin-top:5px; }
    .stellar-product-guide__nutrition strong { font-size:15px; }
    .stellar-product-guide__serving,.stellar-product-guide__facts { font-size:10px;line-height:1.4; }
    .stellar-product-guide__claims-label { font-size:10px;margin-top:7px; }
    .stellar-product-guide__product-claims { gap:5px 10px; }
    .stellar-product-guide__product-claim { font-size:10px;gap:4px; }
    .stellar-product-guide__product-claim .review-quality-icon { width:18px;height:18px;flex-basis:18px; }
    .stellar-product-guide__product-body { max-width:none;padding:4px 0 12px; }
    .stellar-product-guide__description,.stellar-product-guide__benefits li { font-size:10px;line-height:1.4; }
    .stellar-product-guide__product-body h3 { font-size:11px;margin:8px 0 3px; }
    .stellar-product-guide__disclaimer,.guide-print-warnings p { font-size:9px;line-height:1.4; }
    .guide-print-warnings { break-before:page; }
    a { text-decoration:none;color:#111; }
  ` });
  await page.evaluate(() => document.fonts.ready);
  const text = await page.locator(".stellar-product-guide").innerText();
  assert.doesNotMatch(text, /Night.?Time Fat Burn|Classic Whey/i);
  for (const phrase of [
    "Based on the labeled serving size.",
    "These statements have not been evaluated by the Food and Drug Administration.",
    "No significant difference has been shown between milk derived from rbST-treated and non-rbST-treated cows.",
    "No added sugars does not mean sugar-free.",
  ]) {
    assert.equal(text.split(phrase).length - 1, 1, `Print this qualification only once: ${phrase}`);
  }
  await page.pdf({
    path: output, format: "A4", printBackground: true,
    displayHeaderFooter: true, headerTemplate: "<span></span>",
    footerTemplate: '<div style="font:9px Arial;width:100%;margin:0 14mm;color:#555">Stellar Labs · Product information <span style="float:right"><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  // Do not publish a clipped or incomplete print, or a retired product.
  execFileSync("python3", ["-c", `
import json,re,sys,pymupdf
d=pymupdf.open(sys.argv[1])
t="\\n".join(p.get_text() for p in d)
assert len(d)>1, "Guide print was clipped"
assert not re.search(r"Night.?Time Fat Burn|Classic Whey",t,re.I)
normalize=lambda s: re.sub(r"\\s+","",s).casefold()
for name in json.loads(sys.argv[2]):
    assert normalize(name) in normalize(t), "Missing printed product: "+name
assert t.count("Product claims")==20, "Missing printed claims lists"
print("Verified all 20 products in",len(d),"PDF pages")
`, output, JSON.stringify(names)], { stdio: "inherit" });
  for (const directory of [
    "artifacts/stellar-review/source-assets/documents",
    "artifacts/stellar-review/public/review-assets/documents",
    "artifacts/mockup-sandbox/public/documents",
  ]) {
    await fs.mkdir(directory, { recursive: true });
    await fs.copyFile(output, path.join(directory, path.basename(output)));
  }
  console.log(`Exported ${names.length} products: ${output}`);
} finally {
  await browser.close();
}
