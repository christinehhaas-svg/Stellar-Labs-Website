import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { withBuildLock } from "../scripts/lib/build-lock.mjs";

const exec = promisify(execFile);

test("overlapping startup and handoff exports both finish with matching valid ZIPs", { timeout: 60_000 }, async () => {
  const script = "artifacts/stellar-review/scripts/export-homepage-handoff.mjs";
  await Promise.all([exec(process.execPath, [script]), exec(process.execPath, [script])]);
  const files = [
    "generated-artifacts/stellar-homepage-handoff.zip",
    "artifacts/stellar-review/public/homepage-handoff/stellar-homepage-handoff.zip",
    "artifacts/mockup-sandbox/public/handoff/homepage/stellar-homepage-handoff.zip",
  ];
  // Other test files or startup may also export; read one consistent generation.
  await withBuildLock("generated-artifacts/.homepage-handoff.lock", async () => {
    const hashes = [];
    for (const filename of files) {
      await exec("unzip", ["-tqq", filename]);
      hashes.push(crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex"));
    }
    assert.equal(new Set(hashes).size, 1);
  });
});

test("a failed build releases its lock", async () => {
  const lock = "generated-artifacts/.failed-build-test.lock";
  await assert.rejects(withBuildLock(lock, () => { throw new Error("expected build failure"); }), /expected build failure/);
  assert.equal(await withBuildLock(lock, () => "next build"), "next build");
  assert.equal(fs.existsSync(lock), false);
});
