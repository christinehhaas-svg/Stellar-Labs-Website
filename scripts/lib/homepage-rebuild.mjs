import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** Capture the actual review DOM; no invented homepage copy or remote assets. */
export async function captureHomepageRebuild({ page, frame, output, baseURL }) {
  const assetDirectory = path.join(output, "homepage-assets");
  await fs.mkdir(assetDirectory, { recursive: true });
  const capture = () => frame.evaluate(() => {
    const main = document.querySelector("#MainContent");
    if (!main) throw new Error("Missing homepage content");
    const visible = element => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const nodes = [
      ...document.querySelectorAll(".announcement-bar"),
      document.querySelector("#header-component"),
      ...main.children,
      ...document.querySelectorAll("footer"),
    ].filter(Boolean).filter(visible);
    return nodes.map((element, index) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const headings = [...element.querySelectorAll("h1,h2,h3")].filter(visible).map(heading => {
        const css = getComputedStyle(heading);
        return { text: heading.innerText, font: css.fontFamily, size: css.fontSize,
          weight: css.fontWeight, lineHeight: css.lineHeight, color: css.color };
      });
      const title = element.id === "header-component" ? "Header and navigation"
        : element.matches(".announcement-bar") ? "Announcement bar"
        : element.tagName === "FOOTER" ? "Footer"
        : headings[0]?.text.replace(/\s+/g, " ") || element.innerText.trim().split("\n")[0] || `Section ${index + 1}`;
      const images = [...element.querySelectorAll("img")].filter(visible).map(image => ({
        url: image.currentSrc || image.src, alt: image.alt,
        fit: getComputedStyle(image).objectFit,
        width: Math.round(image.getBoundingClientRect().width),
        height: Math.round(image.getBoundingClientRect().height),
      }));
      for (const node of [element, ...element.querySelectorAll("*")].filter(visible)) {
        const background = getComputedStyle(node).backgroundImage;
        for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          images.push({ url: new URL(match[1], document.baseURI).href, alt: "Section background image", fit: getComputedStyle(node).backgroundSize });
        }
      }
      const svg = [...element.querySelectorAll("svg")].filter(visible).map(icon => {
        const clone = icon.cloneNode(true);
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        // Preserve inherited SVG icon colors when using the standalone asset.
        clone.setAttribute("color", getComputedStyle(icon).color);
        return clone.outerHTML;
      });
      const links = [...element.querySelectorAll("a[href]")].filter(visible).map(link => ({
        label: link.innerText.trim() || link.getAttribute("aria-label") || link.querySelector("img")?.alt || "Image link",
        href: link.href, target: link.getAttribute("target") || "same frame",
      }));
      return {
        id: element.id || `${element.tagName.toLowerCase()}-${index}`, title, text: element.innerText.trim(),
        headings, images, svg, links,
        layout: { width: Math.round(rect.width), height: Math.round(rect.height), display: style.display,
          columns: style.gridTemplateColumns, gap: style.gap, background: style.backgroundColor,
          color: style.color, font: style.fontFamily, padding: style.padding, align: style.textAlign },
        controls: [...element.querySelectorAll("button,summary")].filter(visible)
          .map(control => control.innerText.trim() || control.getAttribute("aria-label") || control.title).filter(Boolean),
      };
    });
  });
  const desktop = await capture();
  assert.ok(desktop.some(section => /lean nutrition/i.test(section.text)), "Missing homepage hero");
  assert.ok(desktop.some(section => /why stellar labs/i.test(section.text)), "Missing homepage story");
  await page.screenshot({ path: path.join(output, "homepage-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  // Captured frames disallow scripts, including scheduled animation callbacks.
  // Observe resize from the host instead of awaiting callbacks in that frame.
  await page.waitForFunction(() => document.querySelector("iframe")?.contentWindow?.innerWidth === 390);
  const mobile = await capture();
  await page.screenshot({ path: path.join(output, "homepage-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });

  const assets = new Map();
  async function saveAsset(bytes, filename, mime, source) {
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (assets.has(hash)) return assets.get(hash);
    const name = `${String(assets.size + 1).padStart(2, "0")}-${filename.replace(/[^a-zA-Z0-9_.-]/g, "-")}`;
    await fs.writeFile(path.join(assetDirectory, name), bytes);
    const asset = { filename: `homepage-assets/${name}`, source, mime, hash };
    assets.set(hash, asset);
    return asset;
  }
  for (const section of desktop) {
    section.assets = [];
    for (const image of section.images) {
      const url = new URL(image.url);
      if (url.protocol === "data:") {
        const match = image.url.match(/^data:(image\/[^;,]+)(;base64)?,(.*)$/s);
        assert.ok(match, "Invalid embedded homepage image");
        const mime = match[1];
        const bytes = match[2] ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));
        const extension = mime === "image/svg+xml" ? "svg" : mime.split("/")[1];
        const asset = await saveAsset(bytes, `embedded-image.${extension}`, mime, "Embedded homepage image");
        section.assets.push({ ...asset, alt: image.alt, fit: image.fit });
        continue;
      }
      assert.equal(url.origin, new URL(baseURL).origin, `Homepage asset must be local: ${url.pathname}`);
      const response = await page.request.get(url.href);
      assert.ok(response.ok(), `Missing homepage image: ${url.pathname}`);
      const mime = response.headers()["content-type"]?.split(";")[0];
      assert.ok(mime?.startsWith("image/"), `Not an image: ${url.pathname}`);
      const asset = await saveAsset(await response.body(), path.basename(url.pathname), mime, url.pathname);
      section.assets.push({ ...asset, alt: image.alt, fit: image.fit });
    }
    for (const [index, svg] of section.svg.entries()) {
      section.assets.push(await saveAsset(Buffer.from(svg), `icon-${index + 1}.svg`, "image/svg+xml", "Inline SVG from homepage"));
    }
    section.links = [...new Map(section.links.map(link => {
      const url = new URL(link.href);
      const href = url.origin === new URL(baseURL).origin ? `${url.pathname}${url.search}${url.hash}` : link.href;
      return [`${link.label}|${href}`, { ...link, href }];
    })).values()];
  }
  const data = {
    capturedAt: new Date().toISOString(), path: "/", desktopViewport: { width: 1440, height: 1000 },
    mobileViewport: { width: 390, height: 844 }, sections: desktop, mobile, assets: [...assets.values()],
  };
  await fs.writeFile(path.join(output, "homepage-rebuild.json"), JSON.stringify(data, null, 2));
  const embed = async filename => `data:image/png;base64,${(await fs.readFile(path.join(output, filename))).toString("base64")}`;
  const sectionHtml = [];
  for (const [index, section] of desktop.entries()) {
    const phone = mobile.find(item => item.id === section.id);
    const title = `${String(index + 1).padStart(2, "0")} ${section.title}`;
    const thumbnails = [];
    for (const asset of [...new Map(section.assets.map(asset => [asset.filename, asset])).values()]) {
      const bytes = await fs.readFile(path.join(output, asset.filename));
      thumbnails.push(`<figure><img src="data:${asset.mime};base64,${bytes.toString("base64")}" alt="${escape(asset.alt || "")}"><figcaption>${escape(asset.filename)}${asset.alt ? `<br>Alt text: ${escape(asset.alt)}` : ""}${asset.fit ? `<br>Image fit: ${escape(asset.fit)}` : ""}</figcaption></figure>`);
    }
    sectionHtml.push(`<section class="rebuild-section"><h2>${escape(title)}</h2>
      <p class="label">Exact visible wording</p><pre>${escape(section.text || "(Visual-only section; use the supplied artwork.)")}</pre>
      <p class="label">Layout reference</p><p>Desktop: ${escape(JSON.stringify(section.layout))}</p>
      ${phone ? `<p>Phone: ${escape(JSON.stringify(phone.layout))}</p>` : "<p>Not separately visible at the captured phone width.</p>"}
      ${section.headings.map(heading => `<p>Heading “${escape(heading.text)}”: ${escape(heading.font)}, ${escape(heading.size)}, weight ${escape(heading.weight)}, line height ${escape(heading.lineHeight)}, ${escape(heading.color)}.</p>`).join("")}
      ${section.links.length ? `<p class="label">Link / button destinations</p><table><thead><tr><th>Visible label</th><th>Destination</th></tr></thead><tbody>${section.links.map(link => `<tr><td>${escape(link.label)}</td><td>${escape(link.href)}</td></tr>`).join("")}</tbody></table>` : ""}
      ${section.controls.length ? `<p>Other visible controls: ${escape(section.controls.join(" · "))}. These are controls, not additional page destinations.</p>` : ""}
      ${thumbnails.length ? `<p class="label">Original images and icons (included in the rebuild bundle)</p><div class="assets">${thumbnails.join("")}</div>` : ""}
      </section>`);
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Stellar Labs Homepage Rebuild Guide</title><style>
    @page{size:letter;margin:40px}*{box-sizing:border-box}body{font:13px/1.45 Arial,sans-serif;color:#23201f;margin:0}
    h1{font-size:27px;color:#087e91}h2{font-size:21px;color:#087e91}p,pre,td,figcaption{overflow-wrap:anywhere}
    .rebuild-section{break-before:page}h2,.label{break-after:avoid}.label{font-weight:bold;margin-bottom:6px}
    pre{white-space:pre-wrap;font:14px/1.5 Arial,sans-serif;margin:0 0 18px}
    table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;text-align:left;padding:7px;vertical-align:top}tr,figure{break-inside:avoid}
    .assets{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;border:1px solid #ddd;padding:10px}figure img{max-width:100%;height:120px;object-fit:contain}
    figcaption{font-size:10px}.views{display:flex;gap:15px;align-items:flex-start}.views img{height:300px;max-width:70%;object-fit:contain}
    </style></head><body><h1>Homepage rebuild guide</h1>
    <p>This guide documents the current homepage in top-to-bottom order: exact copy, section dimensions and colors, heading typography, link destinations, and the original images/icons. Desktop and phone measurements describe the captured 1440px and 390px layouts; they are references, not fixed heights to impose on every screen.</p>
    <p>The supplied image filenames map to files in the accompanying rebuild bundle. The logo, product artwork and testimonials are captured references, not rewritten or invented content. Keep the existing qualifications attached to their claims.</p>
    <p>Recreate layout responsively rather than using the screenshots as a single background image. The website shown is a local review: purchase controls are preview selections only. Live Shopify checkout, forms, search, and other services require separate implementation and verification.</p>
    <p class="label">Desktop and phone visual references (top of homepage)</p><div class="views"><img src="${await embed("homepage-desktop.png")}" alt="Desktop homepage"><img src="${await embed("homepage-mobile.png")}" alt="Phone homepage"></div>
    <h2>Section order</h2><ol>${desktop.map(section => `<li>${escape(section.title)}</li>`).join("")}</ol>
    ${sectionHtml.join("")}</body></html>`;
  await fs.writeFile(path.join(output, "homepage-rebuild.html"), html);
  const printPage = await page.context().newPage();
  try {
    await printPage.setContent(html, { waitUntil: "load" });
    await printPage.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
      // Keep the print/reference document small; the bundle retains untouched
      // full-resolution originals for the web team.
      for (const image of document.querySelectorAll("figure img")) {
        const scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
        if (scale === 1) continue;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        image.src = canvas.toDataURL("image/png");
        await image.decode();
      }
    });
    await fs.writeFile(path.join(output, "homepage-rebuild.html"), await printPage.content());
    await printPage.pdf({ path: path.join(output, "homepage-rebuild.pdf"), printBackground: true, preferCSSPageSize: true, timeout: 30_000 });
  } finally { await printPage.close(); }
  return data;
}
