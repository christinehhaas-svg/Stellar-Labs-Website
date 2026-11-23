import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
export const brandStorySource = new URL("scripts/content/stellar-brand-story.json", root);
export const brandStorySnapshots = [
  "artifacts/stellar-review/source-assets/stellar-current/homepage-snapshot.html",
  "artifacts/mockup-sandbox/public/stellar-current/homepage-snapshot.html",
];

const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

// The captured theme's stable block IDs locate only the story, not routing,
// artwork, first-paint CSS, or any other part of either saved document.
export function renderBrandStory(html, story) {
  if (typeof story.heading !== "string" || !story.heading.trim() ||
      !Array.isArray(story.paragraphs) || story.paragraphs.length === 0 ||
      story.paragraphs.some((text) => typeof text !== "string" || !text.trim())) {
    throw new Error("Approved brand story requires a heading and at least one nonempty paragraph.");
  }
  const replaceBlock = (block, content) => {
    const pattern = new RegExp(`(<rte-formatter\\b[^>]*\\btext-block--${block}\\b[^>]*>)[\\s\\S]*?(</rte-formatter>)`, "g");
    const matches = [...html.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`Expected exactly one brand-story block: ${block}`);
    html = html.replace(pattern, (_, open, close) => `${open}\n    ${content}\n  ${close}`);
  };
  replaceBlock("AK0VmWnlDVURaSXhRa__text_yYKPh3", `<h2>${escapeHtml(story.heading)}</h2>`);
  replaceBlock("ATXVCWEZXckJoeXJrV__text_rV7mWz",
    story.paragraphs.map((text) => text.startsWith("*")
      ? `<p><small class="stellar-brand-disclaimer" style="display:block;font-size:13px;line-height:1.5">${escapeHtml(text)}</small></p>`
      : `<p>${escapeHtml(text)}</p>`).join("\n    "));
  return html;
}

export async function prepareBrandStory() {
  const story = JSON.parse(await fs.readFile(brandStorySource, "utf8"));
  // Validate both documents before writing either one.
  const outputs = await Promise.all(brandStorySnapshots.map(async (filename) => {
    const url = new URL(filename, root);
    const original = await fs.readFile(url, "utf8");
    return { url, original, generated: renderBrandStory(original, story) };
  }));
  for (const { url, original, generated } of outputs) {
    if (generated !== original) await fs.writeFile(url, generated);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await prepareBrandStory();
}
