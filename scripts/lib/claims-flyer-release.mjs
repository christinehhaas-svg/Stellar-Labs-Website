import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { withBuildLock } from "./build-lock.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
export const root = path.resolve(import.meta.dirname, "../..");
export const sandbox = path.join(root, "artifacts/mockup-sandbox");
export const flyer = path.join(sandbox, "src/components/mockups/infographics/StellarClaimsFlyer.tsx");
export const data = path.join(path.dirname(flyer), "stellar-claims-flyer-data.ts");
export const stem = "stellar-labs-claims-and-nutrition-facts";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

// Follow local imports, including canonical JSON and serving/copy helpers.
// A new dependency becomes part of the fingerprint without maintaining a list.
export async function sourceFingerprint(directory = root, entries = [
  flyer, data, import.meta.filename, path.join(root, "scripts/export-claims-flyer.mjs"),
  path.join(root, "scripts/lib/build-lock.mjs"), path.join(root, "pnpm-lock.yaml"),
  path.join(root, "package.json"), path.join(sandbox, "package.json"),
  path.join(sandbox, "src/index.css"),
]) {
  const files = new Map();
  async function visit(filename) {
    if (files.has(filename)) return;
    const bytes = await fs.readFile(filename);
    files.set(filename, hash(bytes));
    if (!/\.[cm]?[jt]sx?$/.test(filename)) return;
    for (const entry of ts.preProcessFile(bytes.toString(), true, true).importedFiles) {
      if (!entry.fileName.startsWith(".")) continue;
      const base = path.resolve(path.dirname(filename), entry.fileName.split("?")[0]);
      const candidates = [base, ...[".ts", ".tsx", ".json", ".mjs", ".js", "/index.ts", "/index.tsx"].map(ext => base + ext)];
      let found;
      for (const candidate of candidates) {
        if (await fs.stat(candidate).then(stat => stat.isFile(), () => false)) { found = candidate; break; }
      }
      assert.ok(found, `Unresolved flyer input: ${entry.fileName} in ${filename}`);
      await visit(found);
    }
  }
  for (const filename of entries) await visit(filename);
  // Printed label artwork is an input too: a corrected UPC or ingredient panel
  // must invalidate the download even when its public URL has not changed.
  for (const folder of files.has(flyer) ? ["stellar-labels", "stellar-supplements"] : []) {
    const directory = path.join(root, "artifacts/stellar-review/public/review-assets/images", folder);
    for (const file of (await fs.readdir(directory)).sort()) {
      if (/\.(?:png|jpe?g|webp)$/i.test(file)) await visit(path.join(directory, file));
    }
  }
  const inputs = Object.fromEntries([...files].map(([filename, digest]) => [path.relative(directory, filename), digest]).sort(([a], [b]) => a.localeCompare(b)));
  return { fingerprint: hash(JSON.stringify(inputs)), inputs };
}

export async function currentRelease(output, fingerprint) {
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(output, "release.json"), "utf8"));
    if (manifest.fingerprint !== fingerprint || !Object.keys(manifest.outputs).length) return false;
    for (const [filename, digest] of Object.entries(manifest.outputs)) {
      if (hash(await fs.readFile(path.join(output, filename))) !== digest) return false;
    }
    return true;
  } catch { return false; }
}

export async function releaseFlyer({ output, fingerprint = sourceFingerprint, generate, force = false }) {
  output = path.resolve(output);
  const releases = `${output}-releases`;
  return withBuildLock(`${output}.lock`, async () => {
    const legacy = path.join(releases, "legacy");
    // Recover an interruption during the one-time ordinary-folder migration
    // before doing anything that can fail (including reading current sources).
    if (!await fs.lstat(output).then(() => true, error => {
      if (error.code !== "ENOENT") throw error;
      return false;
    }) && await fs.stat(legacy).then(() => true, () => false)) {
      await fs.rename(legacy, output);
    }
    const before = await fingerprint();
    if (!force && await currentRelease(output, before.fingerprint)) {
      console.log("Claims flyer is current; no export needed.");
      return { changed: false };
    }
    await fs.mkdir(releases, { recursive: true });
    const stage = await fs.mkdtemp(path.join(releases, ".staging-"));
    const link = `${output}.next-${randomUUID()}`;
    let release;
    let published = false;
    try {
      await generate(stage);
      assert.equal((await fingerprint()).fingerprint, before.fingerprint, "Flyer inputs changed during export; rerun to release a consistent snapshot.");
      const verification = JSON.parse(await fs.readFile(path.join(stage, "verification.json"), "utf8"));
      assert.ok(verification.pages > 0 && verification.products > 0);
      assert.deepEqual(verification.clipping, []);
      assert.deepEqual(verification.errors, []);
      const names = [
        `${stem}.pdf`, `${stem}.html`, "verification.json",
        ...Array.from({ length: verification.pages }, (_, index) => [`page-${index + 1}.png`, `page-${index + 1}.jpg`]).flat(),
      ];
      const outputs = {};
      for (const filename of names) {
        const bytes = await fs.readFile(path.join(stage, filename));
        assert.ok(bytes.length > 0, `Empty flyer output: ${filename}`);
        outputs[filename] = hash(bytes);
      }
      await fs.writeFile(path.join(stage, "release.json"), JSON.stringify({ ...before, outputs }, null, 2));
      release = path.join(releases, `release-${randomUUID()}`);
      await fs.rename(stage, release);
      await fs.symlink(path.relative(path.dirname(output), release), link, "dir");
      // One-time migration of the previous exporter’s ordinary output folder.
      // Keep it as the recovery target if interrupted before installing the link.
      const stat = await fs.lstat(output).catch(error => {
        if (error.code !== "ENOENT") throw error;
      });
      if (stat && !stat.isSymbolicLink()) await fs.rename(output, legacy);
      try {
        await fs.rename(link, output);
        published = true;
      } catch (error) {
        if (stat && !stat.isSymbolicLink()) await fs.rename(legacy, output);
        throw error;
      }
      console.log(`Released verified claims flyer: ${output}`);
      return { changed: true };
    } finally {
      await fs.rm(stage, { recursive: true, force: true });
      await fs.rm(link, { force: true });
      if (release && !published) await fs.rm(release, { recursive: true, force: true });
    }
  });
}
