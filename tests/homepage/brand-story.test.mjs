import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { brandStorySnapshots, brandStorySource, renderBrandStory } from "../../scripts/prepare-brand-story.mjs";

const story = JSON.parse(await readFile(brandStorySource, "utf8"));
const storyBlock = /(<rte-formatter\b[^>]*\btext-block--(?:AK0VmWnlDVURaSXhRa__text_yYKPh3|ATXVCWEZXckJoeXJrV__text_rV7mWz)\b[^>]*>)[\s\S]*?(<\/rte-formatter>)/g;

test("homepage uses the merchant's lean-nutrition wording", () => {
  assert.equal(story.paragraphs.length, 3);
  assert.equal(story.paragraphs[0], "Founded by a licensed nutritionist, Stellar Labs Nutrition was created to bridge the gap between traditional performance products and everyday nutritional needs.");
  assert.equal(story.paragraphs[1], "Our lean nutrition approach focuses on delivering more protein with less sugar and fewer calories, while being mindful of sodium and supporting lean muscle maintenance and everyday wellness.");
  assert.equal(story.paragraphs[2], "We also prioritize digestive comfort through thoughtfully selected, easy-to-digest ingredients and great-tasting formulas designed to make everyday nutrition simple and convenient.");
  assert.doesNotMatch(JSON.stringify(story), /fodmap/i);
});

test("About uses its merchant-approved copy without replacing the homepage story", async () => {
  const about = await readFile(new URL("../../artifacts/stellar-review/src/pages/stellar/About.tsx", import.meta.url), "utf8");
  const aboutStory = JSON.parse(await readFile(new URL("../../scripts/content/stellar-about-story.json", import.meta.url), "utf8"));
  assert.match(about, /import aboutStory from "[^"]*stellar-about-story\.json"/);
  assert.match(about, /aboutStory\.paragraphs\.map/);
  assert.equal(aboutStory.paragraphs.length, 3);
  assert.ok(aboutStory.paragraphs.every(text => typeof text === "string" && text.trim()));
  assert.match(aboutStory.paragraphs[0], /^Founded by a licensed nutritionist, Stellar Labs Nutrition/);
  assert.doesNotMatch(JSON.stringify(aboutStory), /fodmap|HANSON/i);
  assert.equal(aboutStory.founderName, "CHRISTINE HAAS, MS, LDN, CNS");
  assert.equal(aboutStory.founderTitle, "Licensed Nutritionist & Stellar Labs Founder");
  assert.notDeepEqual(aboutStory.paragraphs, story.paragraphs);
});

for (const filename of brandStorySnapshots) {
  test(`${filename}: generation is current, repeatable, and changes only story text`, async () => {
    const html = await readFile(new URL(`../../${filename}`, import.meta.url), "utf8");
    assert.equal(renderBrandStory(html, story), html, "Run node scripts/prepare-brand-story.mjs");
    assert.ok(html.includes(story.paragraphs[1]));
    assert.doesNotMatch([...html.matchAll(storyBlock)].map(match => match[0]).join(""), /fodmap/i);
    assert.ok(!html.includes("with the exceptions noted below"));
    assert.doesNotMatch(html, /claim excludes Nighttime Fat Burn and Strawberry Electrolyte/i);
    const changed = renderBrandStory(html, {
      heading: "Stellar Labs & <story>",
      paragraphs: ["First & foremost.", "Second <paragraph>.", "Third \"paragraph\"."],
    });
    assert.match(changed, /Stellar Labs &amp; &lt;story&gt;/);
    assert.match(changed, /<p>Second &lt;paragraph&gt;\.<\/p>/);
    assert.equal(changed.replace(storyBlock, "$1$2"), html.replace(storyBlock, "$1$2"),
      "Artwork, first-paint protection, and all non-story markup must remain byte-identical");
    assert.equal(renderBrandStory(changed, story), html);
    assert.equal(renderBrandStory(changed, { ...story, heading: "$& $1" }).includes("<h2>$&amp; $1</h2>"), true);
    assert.throws(() => renderBrandStory(html.replace(storyBlock, ""), story), /exactly one/);
    assert.throws(() => renderBrandStory(html + html, story), /exactly one/);
    assert.throws(() => renderBrandStory(html, { ...story, paragraphs: [] }), /at least one nonempty/);
    assert.throws(() => renderBrandStory(html, { ...story, paragraphs: [""] }), /at least one nonempty/);
  });
}

test("both preview startup and build paths prepare the approved story", async () => {
  const canvas = JSON.parse(await readFile(new URL("../../artifacts/mockup-sandbox/package.json", import.meta.url), "utf8"));
  for (const command of ["dev", "build"]) assert.match(canvas.scripts[command], /prepare-brand-story\.mjs && vite/);
  const review = await readFile(new URL("../../artifacts/stellar-review/scripts/prepare-assets.mjs", import.meta.url), "utf8");
  assert(review.indexOf("await prepareBrandStory()") < review.indexOf("await fs.cp(source, output"));
});
