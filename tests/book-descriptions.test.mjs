import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(
  "artifacts/stellar-review/src/pages/stellar/_shared/book-descriptions.ts", "utf8"
), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });

test("all five current books have distinct, concise descriptions", () => {
  const descriptions = Object.values(exports.bookDescriptions);
  assert.equal(descriptions.length, 5);
  assert.equal(new Set(descriptions).size, 5);
  for (const description of descriptions) {
    assert.ok(description.length > 70 && description.length < 220);
    assert.doesNotMatch(description, /protein bars|prevent|treat|cure|100 percent/i);
  }
});
