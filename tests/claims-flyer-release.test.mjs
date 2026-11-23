import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { currentRelease, releaseFlyer, sourceFingerprint, stem } from "../scripts/lib/claims-flyer-release.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "claims-release-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const output = path.join(root, "flyer");
  let version = "first";
  let runs = 0;
  return {
    root, output, change: () => { version = "second"; }, runs: () => runs,
    fingerprint: async () => ({ fingerprint: version, inputs: {} }),
    generate: async stage => {
      runs++;
      await fs.writeFile(path.join(stage, "verification.json"), JSON.stringify({ pages: 1, products: 1, clipping: [], errors: [] }));
      for (const filename of [`${stem}.pdf`, `${stem}.html`, "page-1.png", "page-1.jpg"]) {
        await fs.writeFile(path.join(stage, filename), `${version}:${filename}`);
      }
    },
  };
}

test("release is idempotent; changed inputs, missing files, corruption and force refresh it", async t => {
  const f = await fixture(t);
  await releaseFlyer(f);
  const firstTarget = await fs.readlink(f.output);
  assert.equal((await releaseFlyer(f)).changed, false);
  assert.equal(f.runs(), 1);
  f.change();
  assert.equal((await releaseFlyer(f)).changed, true);
  assert.notEqual(await fs.readlink(f.output), firstTarget);
  await fs.rm(path.join(f.output, "page-1.jpg"));
  assert.equal((await releaseFlyer(f)).changed, true);
  await fs.writeFile(path.join(f.output, `${stem}.pdf`), "corrupt");
  assert.equal((await releaseFlyer(f)).changed, true);
  assert.equal((await releaseFlyer({ ...f, force: true })).changed, true);
});

test("generation, verification, and mid-export source changes leave the usable release untouched", async t => {
  const f = await fixture(t);
  await releaseFlyer(f);
  const previous = await fs.readlink(f.output);
  f.change();
  for (const generate of [
    async () => { throw new Error("renderer unavailable"); },
    async stage => { await f.generate(stage); await fs.rm(path.join(stage, "page-1.jpg")); },
    async stage => { await f.generate(stage); await fs.writeFile(path.join(stage, "verification.json"), JSON.stringify({ pages: 1, products: 1, clipping: ["bad"], errors: [] })); },
  ]) {
    await assert.rejects(releaseFlyer({ ...f, generate }));
    assert.equal(await fs.readlink(f.output), previous);
    assert.equal(await currentRelease(f.output, "first"), true);
  }
  const changing = await fixture(t);
  await assert.rejects(releaseFlyer({ ...changing, generate: async stage => {
    await changing.generate(stage);
    changing.change();
  } }), /inputs changed/);
  assert.equal(await fs.stat(changing.output).then(() => true, () => false), false);
});

test("legacy folder survives failures and recovers an interrupted migration", async t => {
  const f = await fixture(t);
  await fs.mkdir(f.output);
  await fs.writeFile(path.join(f.output, "old.pdf"), "usable");
  await assert.rejects(releaseFlyer({ ...f, generate: async () => { throw new Error("failed"); } }));
  assert.equal(await fs.readFile(path.join(f.output, "old.pdf"), "utf8"), "usable");
  await fs.mkdir(`${f.output}-releases`, { recursive: true });
  await fs.rename(f.output, path.join(`${f.output}-releases`, "legacy"));
  await assert.rejects(releaseFlyer({ ...f, fingerprint: async () => { throw new Error("bad source"); } }));
  assert.equal(await fs.readFile(path.join(f.output, "old.pdf"), "utf8"), "usable");
  await releaseFlyer(f);
  assert.equal((await fs.lstat(f.output)).isSymbolicLink(), true);
  assert.equal(await fs.readFile(path.join(`${f.output}-releases`, "legacy", "old.pdf"), "utf8"), "usable");
});

test("simultaneous releases serialize and export the same inputs only once", async t => {
  const f = await fixture(t);
  const results = await Promise.all([releaseFlyer(f), releaseFlyer(f)]);
  assert.equal(results.filter(result => result.changed).length, 1);
  assert.equal(f.runs(), 1);
});

test("fingerprint follows nested product JSON, CSS query imports, additions and deletion", async t => {
  const f = await fixture(t);
  const entry = path.join(f.root, "flyer.tsx");
  await fs.writeFile(entry, 'import "./data"; import "./style.css?inline";');
  await fs.writeFile(path.join(f.root, "data.ts"), 'import facts from "./facts.json";');
  await fs.writeFile(path.join(f.root, "style.css"), "body{}");
  await fs.writeFile(path.join(f.root, "facts.json"), '{"protein":"25g"}');
  const fingerprint = () => sourceFingerprint(f.root, [entry]);
  const original = await fingerprint();
  assert.equal(Object.keys(original.inputs).length, 4);
  await fs.writeFile(path.join(f.root, "facts.json"), '{"protein":"26g"}');
  assert.notEqual((await fingerprint()).fingerprint, original.fingerprint);
  await fs.appendFile(path.join(f.root, "data.ts"), 'import "./new.json";');
  await fs.writeFile(path.join(f.root, "new.json"), "{}");
  assert.equal(Object.keys((await fingerprint()).inputs).length, 5);
  await fs.rm(path.join(f.root, "facts.json"));
  await assert.rejects(fingerprint(), /Unresolved flyer input/);
});

test("a failing flyer export cannot prevent the Shopify handoff regeneration", async t => {
  const f = await fixture(t);
  const log = path.join(f.root, "commands.log");
  // Exercise the actual shell script, replacing only its external commands.
  // No database, storefront assets, packages or browsers are touched.
  const stub = `#!/bin/bash
printf '%s\\n' "$*" >> "$CLAIMS_TEST_LOG"
if [[ "$*" == "export:claims-flyer" ]]; then exit 37; fi
`;
  for (const name of ["node", "pnpm"]) {
    await fs.writeFile(path.join(f.root, name), stub, { mode: 0o755 });
  }
  await assert.rejects(promisify(execFile)("bash", [
    path.resolve(import.meta.dirname, "../scripts/post-merge.sh"),
  ], {
    env: { ...process.env, PATH: `${f.root}:${process.env.PATH}`, CLAIMS_TEST_LOG: log },
  }), error => error.code === 37);
  const commands = (await fs.readFile(log, "utf8")).trim().split("\n");
  assert.deepEqual(commands, [
    "install --frozen-lockfile",
    "--filter db push",
    "artifacts/stellar-review/scripts/prepare-assets.mjs",
    "artifacts/stellar-review/scripts/check-product-outline.mjs",
    "artifacts/stellar-review/scripts/export-handoff.mjs --pdf --zip",
    "artifacts/stellar-review/scripts/check-product-outline.mjs --handoff",
    "export:claims-flyer",
  ]);
});
