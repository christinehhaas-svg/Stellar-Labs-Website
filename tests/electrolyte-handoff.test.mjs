import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  labelFacts, electrolytePacks, websiteCopies, assertHandoffHtml, verifyElectrolyteHandoff,
} from "../artifacts/stellar-review/scripts/verify-electrolyte-handoff.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = "artifacts/stellar-review/src/pages/stellar/_shared";
const canvas = "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared";
const exporter = path.join(root, "artifacts/stellar-review/scripts/export-handoff.mjs");

test("both website previews retain independently verified electrolyte label amounts", () => {
  websiteCopies(root);
});

test("fresh electrolyte and bottle-matched handoffs preserve flavor facts and original artwork in every format",
  { timeout: 300_000 }, () => {
    for (const tool of ["chromium", "pdftotext", "mutool", "zip", "unzip"]) {
      assert.doesNotThrow(() => execFileSync("which", [tool], { stdio: "pipe" }), `Missing ${tool}; see tests/handoff/README.md`);
    }
    const scratch = path.join(root, "generated-artifacts");
    fs.mkdirSync(scratch, { recursive: true });
    const fixture = fs.mkdtempSync(path.join(scratch, "electrolyte-handoff-"));
    try {
      for (const directory of [source, canvas]) fs.cpSync(path.join(root, directory), path.join(fixture, directory), { recursive: true });
      for (const directory of [
        "artifacts/stellar-review/source-assets",
        "artifacts/stellar-review/public/review-assets",
        "artifacts/mockup-sandbox/public/images",
      ]) {
        fs.mkdirSync(path.dirname(path.join(fixture, directory)), { recursive: true });
        fs.symlinkSync(path.join(root, directory), path.join(fixture, directory), "dir");
      }
      // Require replacement of stale artifacts, not just successful first output.
      for (const slug of electrolytePacks) {
        for (const [directory, filenames] of [
          ["exports/stellar-website-handoff", [`${slug}.html`, `${slug}.pdf`, `${slug}.txt`]],
          ["exports/stellar-website-handoff/web-team-files", [`${slug}.html`]],
          ["artifacts/mockup-sandbox/public/handoff", [`${slug}.html`, `readable-${slug}.html`, `${slug}.pdf`]],
        ]) {
          fs.mkdirSync(path.join(fixture, directory), { recursive: true });
          for (const filename of filenames) fs.writeFileSync(path.join(fixture, directory, filename), "STALE_HANDOFF");
        }
      }
      fs.writeFileSync(path.join(fixture, "exports/stellar-website-editable-handoff.zip"), "STALE_HANDOFF");
      for (const slug of electrolytePacks) {
        execFileSync(process.execPath, [exporter, `--pack=${slug}`, "--pdf", "--zip"], {
          cwd: fixture, stdio: "pipe", timeout: 150_000,
        });
      }
      verifyElectrolyteHandoff(fixture);
      const copies = websiteCopies(fixture);
      const html = fs.readFileSync(path.join(fixture, "exports/stellar-website-handoff", `${electrolytePacks[0]}.html`), "utf8");
      const check = candidate => assertHandoffHtml(candidate, fixture, copies, { embedded: true, labels: true });
      check(html);
      // Mutate every mineral separately, in either flavor. Values elsewhere
      // (the other product, cover, or labels) must not conceal the error.
      for (const [index, fact] of labelFacts.entries()) {
        const other = labelFacts[1 - index];
        for (const mineral of ["potassium", "magnesium", "calcium"]) {
          assert.throws(() => check(html.replace(`${fact[mineral]}mg ${mineral}`, `${other[mineral]}mg ${mineral}`)),
            undefined, `${fact.flavor}: accepted swapped ${mineral}`);
        }
        assert.throws(() => check(html.replace(`Each ${fact.grams}g scoop`, `Each ${other.grams}g scoop`)));
        const panel = `images/stellar-electrolytes/${fact.handle}-1.png`;
        assert.throws(() => check(html.replace(panel, `images/stellar-electrolytes/${other.handle}-1.png`)));
      }
      assert.throws(() => check(html.replace("5 Major Electrolytes", "4 Major Electrolytes")), undefined, "Accepted stale cover");
      assert.throws(() => check(html.replace("provides 5 major electrolytes", "provides four major electrolytes")));
      const label = html.match(/data-original-file="images\/stellar-electrolytes\/[^"]+-1\.png" src="data:image\/png;base64,([^"]+)"/);
      assert(label);
      assert.throws(() => check(html.replace(label[1], Buffer.from("changed artwork").toString("base64"))));
      // Check that a stale real PDF cannot pass just because its .txt is current.
      const pdf = path.join(fixture, "exports/stellar-website-handoff", `${electrolytePacks[0]}.pdf`);
      const stalePdf = path.join(fixture, "exports/stellar-website-handoff", `${electrolytePacks[1]}.pdf`);
      fs.copyFileSync(stalePdf, pdf);
      assert.throws(() => verifyElectrolyteHandoff(fixture));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
