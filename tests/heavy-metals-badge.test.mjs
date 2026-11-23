import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const root = path.resolve("artifacts/stellar-review/src/pages/stellar/_shared");
const { renderToStaticMarkup } = createRequire(path.join(root, "HeavyMetalsBadge.tsx"))("react-dom/server");
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require(specifier) {
    if (!specifier.startsWith(".")) return createRequire(file)(specifier);
    const base = path.resolve(path.dirname(file), specifier);
    return load([`${base}.ts`, `${base}.tsx`].find(candidate => fs.existsSync(candidate)));
  } }, { filename: file });
  return exports;
}

test("compact badge keeps the two-line label and decorative checked flask", () => {
  const { HeavyMetalsBadge } = load(path.join(root, "HeavyMetalsBadge.tsx"));
  const html = renderToStaticMarkup(HeavyMetalsBadge());
  assert.match(html, /Third-Party Tested<br\/?>for Heavy Metals/);
  assert.match(html, /data-heavy-metals-badge="product"/);
  assert.match(html, /width="28" height="28"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /m12 23 3 3 5-5/);
});

test("FAQ contains the merchant's exact heavy-metals question and answer once", () => {
  const { FaqContent, faqQuestions } = load(path.join(root, "FaqContent.tsx"));
  const html = renderToStaticMarkup(FaqContent());
  const question = "Are Stellar Labs Nutrition products tested for heavy metals?";
  const answer = "Yes. An independent laboratory tested all Stellar Labs Nutrition products for lead, cadmium, arsenic, and mercury. All products met the testing limits for each metal.";
  assert.equal(faqQuestions.filter(item => item === question).length, 1);
  assert.equal(html.split(answer).length - 1, 1);
  assert.match(html, /id="heavy-metals"/);
});

test("product testing statement preserves the exact approved wording", () => {
  const copy = load(path.join(root, "heavy-metals-testing.ts"));
  assert.equal(copy.heavyMetalsTestingStatement, "This product met the testing limits for lead, cadmium, arsenic, and mercury.");
});
