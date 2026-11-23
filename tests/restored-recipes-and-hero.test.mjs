import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

const root = "artifacts/stellar-review/";
const recipes = JSON.parse(fs.readFileSync(`${root}src/pages/stellar/_shared/recipes.json`, "utf8"));
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
test("homepage uses the merchant-selected original photograph without altering its pixels", () => {
  const expected = hash("attached_assets/home_page_1792786606069.webp");
  for (const file of [
    `${root}source-assets/stellar-current/assets/stellar-homepage-approved-photo.webp`,
    "artifacts/mockup-sandbox/public/stellar-current/assets/stellar-homepage-approved-photo.webp",
  ]) assert.equal(hash(file), expected);
});
test("all original recipes have full safe bodies, unique routes and local photographs", () => {
  assert.equal(recipes.length, 21);
  assert.equal(new Set(recipes.map(recipe => recipe.slug)).size, recipes.length);
  for (const recipe of recipes) {
    assert.ok(recipe.title && recipe.bodyHtml.trim(), recipe.slug);
    assert.match(recipe.sourceUrl, /^https:\/\/www\.stellarlabsnutrition\.com\/blogs\/recipes\/[\w-]+$/);
    assert.doesNotMatch(recipe.bodyHtml, /<(?:script|iframe|form|object|embed)\b|\son\w+=|javascript:/i);
    for (const image of [recipe.image, ...Array.from(recipe.bodyHtml.matchAll(/src="([^"]+)"/g), m => m[1])]) {
      assert.match(image, /^\/__mockup\/images\/stellar-recipes\/[\w.-]+$/);
      assert.ok(fs.statSync(`${root}source-assets/${image.slice("/__mockup/".length)}`).size > 0, image);
    }
  }
});
