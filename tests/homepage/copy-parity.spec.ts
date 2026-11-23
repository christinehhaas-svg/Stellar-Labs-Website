import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { approvedCopy, approvedReviewNavigation } from "./approved-copy";
import { inspectHomepage } from "./inspect-homepage";

const read = (relative: string) =>
  readFileSync(path.resolve(__dirname, "../..", relative), "utf8");
const app = "artifacts/stellar-review";
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const brandStory = JSON.parse(read("scripts/content/stellar-brand-story.json")) as {
  heading: string;
  paragraphs: string[];
};

test("homepage Liquid header and hero retain the approved wording", () => {
  const hero = read(`${app}/handoff/homepage/stellar-homepage-hero.liquid`);
  const schema = JSON.parse(hero.match(/{% schema %}([\s\S]*?){% endschema %}/)![1]);
  const defaults = Object.fromEntries(
    schema.settings.map((setting: { id: string; default: string }) => [setting.id, setting.default]),
  );
  expect(defaults).toEqual({
    heading: approvedCopy.heading,
    tagline: approvedCopy.tagline,
    formula_note: approvedCopy.formulaNote,
    subtitle_line_1: approvedCopy.subtitle[0],
    subtitle_line_2: approvedCopy.subtitle[1],
    cta_label: approvedCopy.cta,
  });
  // Check the actual template bindings too: correct defaults alone do not prove
  // that the section will display them in the approved order.
  expect(hero).toMatch(/<h1\b[^>]*>{{ section.settings.heading \| escape }}<\/h1>/);
  expect(hero).toContain('<span class="stellar-home-tagline">{{ section.settings.tagline | escape }}</span>');
  expect(hero).toContain('<span class="stellar-home-formula">{{ section.settings.formula_note | escape }}</span>');
  expect(hero).toContain(
    "<p>{{ section.settings.subtitle_line_1 | escape }}<br>{{ section.settings.subtitle_line_2 | escape }}</p>",
  );
  expect(hero).toMatch(/<a class="stellar-home-cta"[^>]*>{{ section.settings.cta_label \| escape }}<\/a>/);
  const categories = hero.match(/<nav\b[^>]*class="stellar-home-categories"[^>]*>([\s\S]*?)<\/nav>/)![1];
  expect([...categories.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)].map((match) => match[1].toUpperCase()))
    .toEqual(approvedCopy.categories);

  const header = read(`${app}/handoff/homepage/stellar-homepage-header.liquid`);
  expect(header.match(/class="stellar-home-announcement">([^<]*)</)![1].replace(/&amp;/g, "&"))
    .toBe(approvedCopy.announcement);
  const navigation = header.match(/<nav\b[^>]*class="stellar-home-nav"[^>]*>([\s\S]*?)<\/nav>/)![1];
  expect([...navigation.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)].map((match) => match[1]))
    .toEqual(approvedCopy.navigation);
});

test("homepage exporter retains independently approved copy", () => {
  const exporter = read(`${app}/scripts/export-homepage-handoff.mjs`);
  const literal = exporter.match(/const copy = (\{[\s\S]*?\n\});/);
  expect(literal, "Exporter must declare its homepage copy object").not.toBeNull();
  // Evaluate only the copy literal, never the exporter: importing it would
  // regenerate the files under test and could hide a stale handoff.
  const copy = runInNewContext(`(${literal![1]})`, Object.create(null), { timeout: 1000 });
  expect(JSON.parse(JSON.stringify(copy))).toEqual(approvedCopy);
});

for (const file of [
  "generated-artifacts/stellar-homepage-handoff/approved-copy.json",
  `${app}/public/homepage-handoff/approved-copy.json`,
]) {
  test(`generated homepage copy matches approval: ${file}`, () => {
    expect(JSON.parse(read(file))).toEqual(approvedCopy);
  });
}

for (const surface of [
  { name: "review", path: "/", document: "/review-assets/stellar-current/homepage-snapshot.html" },
  { name: "Canvas", path: "/__mockup/preview/stellar-labs/Homepage", document: "/__mockup/stellar-current/homepage-snapshot.html" },
]) {
  test(`${surface.name} retains generated brand story before and after initialization`, async ({ page, request }) => {
    // Read the actually served generated document, without running Shopify scripts
    // or letting the host initializer conceal stale saved wording.
    const response = await request.get(surface.document);
    expect(response.ok()).toBe(true);
    const savedHtml = await response.text();
    await page.goto(surface.path);
    await expect.poll(async () => {
      try {
        return (await inspectHomepage(page)).ready;
      } catch {
        return false;
      }
    }).toBe(true);
    const states = await page.evaluate((html) => {
      const readStory = (doc: Document) => ({
        heading: doc.querySelector(".text-block--AK0VmWnlDVURaSXhRa__text_yYKPh3 h2")?.textContent?.trim(),
        paragraphs: [...doc.querySelectorAll(".text-block--ATXVCWEZXckJoeXJrV__text_rV7mWz p")]
          .map((element) => element.textContent?.trim()),
      });
      const saved = new DOMParser().parseFromString(html, "text/html");
      const frame = document.querySelector<HTMLIFrameElement>(".stellar-current-snapshot iframe")!;
      return {
        saved: readStory(saved),
        initialized: readStory(frame.contentDocument!),
        firstPaintGuard: !!saved.querySelector("#stellar-approved-first-paint"),
        retiredArtwork: saved.querySelectorAll('img[src*="c15a3b2fc53661a6.svg"]').length,
        sandbox: frame.getAttribute("sandbox"),
      };
    }, savedHtml);
    expect(states.saved).toEqual(brandStory);
    expect(states.initialized).toEqual(brandStory);
    expect(states.firstPaintGuard).toBe(true);
    expect(states.retiredArtwork).toBe(0);
    expect(states.sandbox?.split(/\s+/)).not.toContain("allow-scripts");
  });

  test(`${surface.name} renders the approved homepage header and hero copy`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(surface.path);
    await expect.poll(async () => {
      try {
        return (await inspectHomepage(page)).ready;
      } catch {
        return false;
      }
    }).toBe(true);
    const state = await inspectHomepage(page);
    expect(state.headline.text).toBe(approvedCopy.heading);
    expect(state.subtitle.visible).toBe(true);
    expect(state.subtitle.text).toBe(approvedCopy.subtitle.join(" "));
    expect(state.cta.text).toBe(approvedCopy.cta);
    expect(state.headerLinks.filter((link) => link.visible).map((link) => link.text))
      .toEqual(approvedReviewNavigation);
    expect(state.categoryLinks.map((link) => link.text?.toUpperCase()))
      .toEqual(approvedCopy.categories);
    const announcement = await page.evaluate(() => {
      const doc = document.querySelector<HTMLIFrameElement>(".stellar-current-snapshot iframe")!.contentDocument!;
      return doc.querySelector(".announcement-bar__text")?.textContent ?? "";
    });
    expect(normalize(announcement)).toBe(approvedCopy.announcement);
  });
}
