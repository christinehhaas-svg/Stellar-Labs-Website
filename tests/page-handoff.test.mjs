import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { before, test } from "node:test";
import { renderAboutPage, renderReturnsPage } from "../artifacts/stellar-review/scripts/render-page-handoff.mjs";

const app = "artifacts/stellar-review";
const output = "generated-artifacts/stellar-homepage-handoff";
const zip = path.resolve("generated-artifacts/stellar-homepage-handoff.zip");
const read = file => fs.readFileSync(file, "utf8");
const story = JSON.parse(read("scripts/content/stellar-brand-story.json"));
const policy = read("scripts/content/stellar-shipping-returns-policy.md");
const pages = ["about-us.html", "shipping-information.html"];
const decode = text => text.replace(/&#(\d+);|&(?:amp|lt|gt|quot);/g, (entity, code) => code ? String.fromCodePoint(Number(code)) : ({
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
}[entity]));
const textBlocks = html => [...html.matchAll(/<(h[23]|p)>([\s\S]*?)<\/\1>/g)]
  .map(([, , text]) => decode(text.replace(/<[^>]+>/g, "")));
const fileList = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory()
    ? fileList(path.join(directory, entry.name)).map(file => `${entry.name}/${file}`)
    : [entry.name]);

before(() => {
  execFileSync(process.execPath, [`${app}/scripts/export-homepage-handoff.mjs`], { stdio: "pipe" });
});

test("About page preserves every approved text block and the literal medical disclaimer", () => {
  const html = read(`${output}/pages/about-us.html`);
  assert.deepEqual(textBlocks(html), [story.heading, ...story.paragraphs]);
  assert.equal(html, renderAboutPage(story));
  // The approved source may gain clarification; keep its full literal copy
  // rather than requiring an older, shorter version of the disclaimer.
  assert.equal(textBlocks(html).at(-1), story.paragraphs.at(-1));
  assert.doesNotMatch(textBlocks(html).join(" "), /FODMAP|Individual tolerance varies/i);
});

test("returns page contains exactly the approved headings and paragraphs, in source order", () => {
  const html = read(`${output}/pages/shipping-information.html`);
  const approved = policy.trim().split(/\n\s*\n/).map(block => block.replace(/^#{1,2} /, "").replaceAll("**", ""));
  assert.deepEqual(textBlocks(html), approved);
  assert.equal(html, renderReturnsPage(policy));
  const email = policy.match(/\*\*([^\s@]+@[^\s@]+\.[^\s@]+)\*\*/)[1];
  assert.ok(html.includes(`<a href="mailto:${email}">${email}</a>`));
});

test("page bodies have no portrait, legacy content, runtime, or review-server dependencies", () => {
  for (const name of pages) {
    const html = read(`${output}/pages/${name}`);
    const tags = html.match(/<[^>]*>/g);
    for (const tag of tags) {
      assert.match(tag, /^<\/?(?:article|h2|h3|p|strong)>$|^<a href="mailto:[^"<>]+">$|^<\/a>$/);
    }
    assert.doesNotMatch(html, /localhost|replit\.dev|shopifypreview\.com|\/__mockup\/|\/api\/|<img|<script|<iframe|<style|<link/i);
  }
});

test("editable source escaping keeps literal text and refuses unsupported policy syntax", () => {
  const html = renderAboutPage({ heading: '<Why "Stellar"?>', paragraphs: ["*A & B's <note>"] });
  assert.deepEqual(textBlocks(html), ['<Why "Stellar"?>', "*A & B's <note>"]);
  assert.doesNotMatch(html, /<note>/);
  assert.throws(() => renderAboutPage({ heading: "Title", paragraphs: [] }));
  assert.throws(() => renderReturnsPage("# Policy\n\n## Shipping\n\n- Unhandled list"));
});

test("ZIP entries match all generated files and include approved sources verbatim", () => {
  const entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n").filter(name => !name.endsWith("/")).sort();
  assert.deepEqual(entries, fileList(output).sort());
  for (const name of entries) {
    assert.deepEqual(execFileSync("unzip", ["-p", zip, name], { maxBuffer: 32 * 1024 * 1024 }), fs.readFileSync(`${output}/${name}`), name);
  }
  for (const source of ["stellar-brand-story.json", "stellar-shipping-returns-policy.md"]) {
    assert.equal(read(`${output}/source-reference/${source}`), read(`scripts/content/${source}`));
  }
});

test("existing homepage assets and code remain unchanged in the expanded package", () => {
  for (const [name, folder] of [
    ["stellar-homepage.css", "assets"],
    ["stellar-homepage-header.liquid", "snippets"],
    ["stellar-homepage-hero.liquid", "sections"],
  ]) {
    assert.equal(read(`${output}/${folder}/${name}`), read(`${app}/handoff/homepage/${name}`));
  }
  const checksums = JSON.parse(read(`${output}/asset-checksums.json`));
  assert.equal(checksums.length, 5);
  for (const entry of checksums) {
    assert.deepEqual(fs.readFileSync(`${output}/${entry.file}`), fs.readFileSync(`${app}/${entry.source}`));
  }
  assert.ok(read(`${output}/README.md`).startsWith(read(`${app}/handoff/homepage/README.md`)));
});

test("readable preview and both downloadable ZIP copies include the pages", () => {
  const preview = read(`${output}/preview.html`);
  for (const name of pages) assert.ok(preview.includes(read(`${output}/pages/${name}`)));
  for (const directory of [`${app}/public/homepage-handoff`, "artifacts/mockup-sandbox/public/handoff/homepage"]) {
    assert.equal(read(`${directory}/preview.html`), preview);
    assert.deepEqual(fs.readFileSync(`${directory}/stellar-homepage-handoff.zip`), fs.readFileSync(zip));
    assert.equal(read(`${directory}/README.md`), read(`${output}/README.md`));
  }
  for (const name of pages) assert.equal(read(`${app}/public/homepage-handoff/pages/${name}`), read(`${output}/pages/${name}`));
  const instructions = read(`${output}/pages/README.md`);
  for (const handle of ["/pages/about-us", "/pages/shipping-information"]) assert.ok(instructions.includes(handle));
  assert.match(instructions, /Saving its content can change the live store immediately/);
  assert.match(instructions, /unpublished theme does not isolate shared page content/);
  assert.match(instructions, /Do not create duplicate pages, rename handles/);
});
