import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { captureCatalog, recoverCapture } from "../scripts/capture-stellar-proteins.mjs";
import { products, fixtureFetch } from "./fixtures/capture-worker.mjs";
import {
  priceTargets, priceFile, remotePrices, setupPriceCapture,
} from "./fixtures/merchant-price-capture.mjs";

const targets = [
  {
    assets: "artifacts/mockup-sandbox/public",
    data: "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared/electrolyte-products.json",
  },
  {
    assets: "artifacts/stellar-review/source-assets",
    data: "artifacts/stellar-review/src/pages/stellar/_shared/electrolyte-products.json",
  },
];
const imagePath = (handle, index) => `images/stellar-electrolytes/${handle}-${index}.png`;
const pendingPath = root => path.join(root, "generated-artifacts/catalog-capture/pending");
const diskError = () => Object.assign(new Error("fixture: disk full"), { code: "ENOSPC" });

test("electrolyte recapture cannot reactivate discontinued Strawberry from live availability", async t => {
  const { root } = await setup(t);
  await capture(root);
  for (const target of targets) {
    const catalog = JSON.parse(await fs.readFile(path.join(root, target.data), "utf8"));
    const strawberry = catalog.find(product => product.component === "ElectrolyteStrawberry");
    const lemon = catalog.find(product => product.component === "ElectrolyteLemonLime");
    assert.equal(strawberry.available, false);
    assert.equal(strawberry.discontinued, true);
    assert(strawberry.images.length > 0, "Keep historical reference panels");
    assert.equal(lemon.available, true);
    assert.equal(lemon.discontinued, undefined);
  }
});

async function snapshot(root, catalogTargets = targets) {
  const result = {};
  for (const target of catalogTargets) {
    for (const folder of [target.assets, path.dirname(target.data)]) {
      const directory = path.join(root, folder);
      for (const file of await fs.readdir(directory, { recursive: true, withFileTypes: true })) {
        if (file.isFile()) {
          const filename = path.join(file.parentPath, file.name);
          result[path.relative(root, filename)] = await fs.readFile(filename);
        }
      }
    }
  }
  return result;
}

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "capture-transaction-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const oldCatalog = products.map(product => ({
    handle: product.handle, title: `Previous ${product.title}`, price: 1999,
    images: [{ src: `/__mockup/${imagePath(product.handle, 0)}` }],
  }));
  for (const target of targets) {
    await fs.mkdir(path.join(root, path.dirname(target.data)), { recursive: true });
    await fs.writeFile(path.join(root, target.data), JSON.stringify(oldCatalog));
    for (const product of products) {
      const filename = path.join(root, target.assets, imagePath(product.handle, 0));
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename, `previous generation: ${product.handle}`);
    }
    // Capturing one catalog must not delete unrelated or old gallery files.
    await fs.writeFile(path.join(root, target.assets, "unrelated.txt"), "keep me");
  }
  return { root, before: await snapshot(root) };
}

function capture(root, transactionFs) {
  return captureCatalog({ root, kind: "electrolytes", fetchImpl: fixtureFetch, transactionFs });
}

async function assertClean(root) {
  const entries = await fs.readdir(path.join(root, "generated-artifacts/catalog-capture"));
  assert.deepEqual(entries, []);
}

async function assertNewGeneration(root, captured) {
  for (const target of targets) {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, target.data))), captured);
    for (const product of products) {
      for (const [index, url] of product.images.entries()) {
        assert.equal(await fs.readFile(path.join(root, target.assets, imagePath(product.handle, index)), "utf8"),
          `new generation: ${url}`);
      }
    }
    assert.equal(await fs.readFile(path.join(root, target.assets, "unrelated.txt"), "utf8"), "keep me");
  }
  await assertClean(root);
}

for (const phase of ["next-1", "backup-0", "journal.tmp", "committed.tmp"]) {
  test(`partial ${phase} write preserves all previous files and removes new files`, async t => {
    const { root, before } = await setup(t);
    let fired = false;
    const io = {
      ...fs,
      async open(filename, flags) {
        const handle = await fs.open(filename, flags);
        if (path.basename(filename) !== phase || fired) return handle;
        fired = true;
        return {
          async writeFile(bytes) {
            await handle.writeFile(Buffer.from(bytes).subarray(0, 5));
            throw diskError();
          },
          close: () => handle.close(),
        };
      },
    };
    await assert.rejects(capture(root, io), /disk full/);
    assert.ok(fired);
    assert.deepEqual(await snapshot(root), before);
    await assertClean(root);
    await assertNewGeneration(root, await capture(root));
  });
}

// Three images and one catalog in each destination. Exercise every boundary,
// including the first JSON mirror before any review asset has been installed.
for (let failAt = 1; failAt <= 8; failAt++) {
  test(`replacement ${failAt}/8 failing after rename rolls back both mirrors`, async t => {
    const { root, before } = await setup(t);
    let count = 0;
    await assert.rejects(capture(root, {
      ...fs,
      async rename(from, to) {
        await fs.rename(from, to);
        if (/\/next-\d+$/.test(from) && ++count === failAt) throw diskError();
      },
    }), /disk full/);
    assert.equal(count, failAt);
    assert.deepEqual(await snapshot(root), before);
    await assertClean(root);
  });
}

async function crash(root, mode, index, beforeKill) {
  const child = spawn(process.execPath, [
    new URL("./fixtures/capture-worker.mjs", import.meta.url).pathname, mode, root, String(index),
  ], { stdio: ["ignore", "ignore", "pipe", ...(beforeKill ? ["ipc"] : [])] });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk; });
  let checked;
  if (beforeKill) child.once("message", message => {
    checked = Promise.resolve().then(() => beforeKill(message, child.pid));
    // Always terminate the paused worker, even when a parent assertion fails.
    checked.then(() => child.send("kill"), () => child.kill("SIGKILL"));
  });
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  if (beforeKill) {
    assert.ok(checked, `Recovery checkpoint was not reached: ${stderr}`);
    await checked;
  }
  assert.equal(result.signal, "SIGKILL", stderr);
  return child.pid;
}

for (const index of [0, 1, 4, 5, 8]) {
  test(`SIGKILL after replacement ${index} is recoverable without a download`, async t => {
    const { root, before } = await setup(t);
    await crash(root, "--crash", index);
    if (index > 0) assert.notDeepEqual(await snapshot(root), before);
    await recoverCapture({ root });
    assert.deepEqual(await snapshot(root), before);
    await assertClean(root);
    await recoverCapture({ root }); // Recovery is idempotent.
    await assertNewGeneration(root, await capture(root));
  });
}

async function readPriceMirrors(root) {
  return Promise.all(priceTargets.map(target =>
    fs.readFile(path.join(root, target.data, priceFile), "utf8").then(JSON.parse)));
}

function assertPriceGeneration(catalog, baseline, generation) {
  assert.equal(catalog.length, baseline.length);
  assert.deepEqual(Object.keys(remotePrices).sort(),
    catalog.filter(product => product.source).map(product => product.component).sort());
  for (const product of catalog) {
    const previous = baseline.find(entry => entry.component === product.component);
    assert.ok(previous, product.component);
    assert.equal(product.price, previous.price, `${product.component}: keep approved website price`);
    if (!product.source) {
      assert.deepEqual(product, previous, "Local-only listings must not acquire remote provenance");
      assert.equal(Object.hasOwn(product, "sourcePrice"), false);
      assert.equal(Object.hasOwn(product, "priceAuthority"), false);
      continue;
    }
    assert.equal(product.sourcePrice, remotePrices[product.component] - generation * 100, product.component);
    assert.notEqual(product.sourcePrice, product.price);
    assert.equal(product.priceAuthority, "merchant-approved-website", product.component);
  }
}

// Exercise the actual stale-lock filesystem operations in a killed subprocess.
// Empty locks deliberately require operator confirmation: absence of an owner
// is not proof that no process is still acquiring the lock.
for (const entryPoint of ["capture", "recover"]) {
  for (const boundary of [
    "before-stale-owner-removal", "stale-owner-removed", "lock-removed", "lock-recreated", "owner-recorded",
  ]) {
    test(`${entryPoint}: SIGKILL at ${boundary} preserves recovery and excludes writers`, { timeout: 30000 }, async t => {
      const { root, baseline, fetchImpl, nextGeneration } = await setupPriceCapture(t);
      const catalogTargets = priceTargets.map(target => ({ ...target, data: path.join(target.data, priceFile) }));
      const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
      assertPriceGeneration(previous, baseline, 0);
      const previousFiles = await snapshot(root, catalogTargets);

      // Leave a real dead owner, immutable backups, and split source provenance.
      const stalePid = await crash(root, "--crash-price", 1);
      const interrupted = await readPriceMirrors(root);
      assertPriceGeneration(interrupted[0], baseline, 1);
      assert.deepEqual(interrupted[1], previous);
      assert.notDeepEqual(interrupted[0], interrupted[1]);
      const interruptedFiles = await snapshot(root, catalogTargets);
      const pending = pendingPath(root);
      const recoveryFiles = async () => {
        const files = {};
        for (const name of await fs.readdir(pending)) {
          files[name] = await fs.readFile(path.join(pending, name));
        }
        return files;
      };
      const backups = await recoveryFiles();
      assert.ok(backups["journal.json"]);
      assert.ok(backups["backup-0"]);
      const lock = path.join(path.dirname(pending), "lock");
      assert.deepEqual(await fs.readdir(lock), [String(stalePid)]);

      const retryPid = await crash(root, `--reclaim-crash-${entryPoint}`, boundary);
      assert.deepEqual(await snapshot(root, catalogTargets), interruptedFiles,
        "Reclamation must not touch either live mirror or any asset");
      assert.deepEqual(await recoveryFiles(), backups,
        "Reclamation must leave the journal and every immutable backup byte intact");

      const empty = ["stale-owner-removed", "lock-recreated"].includes(boundary);
      if (boundary === "lock-removed") {
        await assert.rejects(fs.stat(lock), { code: "ENOENT" });
      } else {
        assert.deepEqual(await fs.readdir(lock), empty ? [] :
          [String(boundary === "owner-recorded" ? retryPid : stalePid)]);
      }
      const offline = t.mock.method(globalThis, "fetch", async () => {
        throw new Error("fixture: network forbidden during recovery");
      });
      let fetchCount = 0;
      let restoredBeforeFetch;
      const offlineCapture = () => captureCatalog({
        root, kind: "proteins",
        async fetchImpl() {
          fetchCount++;
          restoredBeforeFetch ??= (async () => {
            assert.deepEqual(await snapshot(root, catalogTargets), previousFiles,
              "Restore exact prior prices, provenance, and assets before the first fetch");
            assert.deepEqual(await fs.readdir(path.dirname(pending)), ["lock"]);
          })();
          await restoredBeforeFetch;
          throw new Error("fixture: offline after recovery");
        },
      });
      if (empty) {
        const actionable = error => {
          assert.match(error.message, /Incomplete capture lock/);
          assert.ok(error.message.includes(lock), "Identify the exact lock directory");
          assert.match(error.message, /confirm no capture or recovery is running/);
          assert.match(error.message, /only this empty directory with rmdir/);
          assert.match(error.message, /node scripts\/capture-stellar-proteins\.mjs --recover/);
          assert.match(error.message, /Keep pending and its backups intact/);
          return true;
        };
        // Repeated attempts through both entry points may neither steal the
        // ambiguous lock nor begin recovery, downloading, or writing.
        for (let attempt = 0; attempt < 2; attempt++) {
          await assert.rejects(offlineCapture(), actionable);
          await assert.rejects(recoverCapture({ root }), actionable);
          assert.equal(fetchCount, 0);
          assert.deepEqual(await fs.readdir(lock), []);
          assert.deepEqual(await recoveryFiles(), backups);
          assert.deepEqual(await snapshot(root, catalogTargets), interruptedFiles);
        }
        // Model the documented operator action only after both workers exited.
        // Non-recursive rmdir cannot remove a newly registered owner's lock.
        await fs.rmdir(lock);
      }

      if (entryPoint === "capture") {
        await assert.rejects(offlineCapture(), /fixture: offline after recovery/);
        assert.ok(fetchCount > 0);
      } else {
        await recoverCapture({ root });
        assert.equal(fetchCount, 0);
      }
      assert.equal(offline.mock.callCount(), 0, "Explicit recovery never downloads");
      assert.deepEqual(await readPriceMirrors(root), [previous, previous]);
      assert.deepEqual(await snapshot(root, catalogTargets), previousFiles);
      await assertClean(root);
      await recoverCapture({ root });
      assert.deepEqual(await snapshot(root, catalogTargets), previousFiles, "Recovery is idempotent");
      await assertClean(root);

      nextGeneration();
      nextGeneration();
      let exclusion;
      const captured = await captureCatalog({
        root, kind: "proteins",
        async fetchImpl(url) {
          exclusion ??= (async () => {
            assert.deepEqual(await fs.readdir(lock), [String(process.pid)]);
            await assert.rejects(captureCatalog({ root, kind: "proteins", fetchImpl }), /already running/);
            await assert.rejects(recoverCapture({ root }), /already running/);
          })();
          await exclusion;
          return fetchImpl(url);
        },
      });
      assert.ok(exclusion, "Exercise exclusion while the replacement writer owns the lock");
      assertPriceGeneration(captured, baseline, 2);
      assert.deepEqual(await readPriceMirrors(root), [captured, captured]);
      await assertClean(root);
    });
  }
}

// Inject syscall failures, not process death: lock acquisition must reject
// without starting recovery, downloading, or losing either error on cleanup.
for (const entryPoint of ["capture", "recover"]) {
  for (const code of ["EACCES", "EIO", "ENOSPC"]) {
    for (const boundary of ["stale-owner", "lock", "replacement", "registration", "registration-cleanup"]) {
      test(`${entryPoint}: ${code} at ${boundary} retains prices and permits safe recovery`, async t => {
        const { root, baseline, fetchImpl, nextGeneration } = await setupPriceCapture(t);
        const catalogTargets = priceTargets.map(target => ({ ...target, data: path.join(target.data, priceFile) }));
        const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
        assertPriceGeneration(previous, baseline, 0);
        const previousFiles = await snapshot(root, catalogTargets);
        const stalePid = await crash(root, "--crash-price", 1);
        const interruptedFiles = await snapshot(root, catalogTargets);
        const interrupted = await readPriceMirrors(root);
        assertPriceGeneration(interrupted[0], baseline, 1);
        assert.deepEqual(interrupted[1], previous);
        const pending = pendingPath(root);
        const lock = path.join(path.dirname(pending), "lock");
        const owner = path.join(lock, String(process.pid));
        const staleOwner = path.join(lock, String(stalePid));
        const recoveryFiles = async () => {
          const result = {};
          for (const name of await fs.readdir(pending)) {
            result[name] = await fs.readFile(path.join(pending, name));
          }
          return result;
        };
        const backups = await recoveryFiles();
        assert.ok(backups["journal.json"]);
        assert.ok(backups["backup-0"]);
        const failure = Object.assign(new Error(`fixture: ${code}`), { code });
        const cleanupFailure = Object.assign(new Error(`fixture: cleanup ${code}`), { code });
        let fired = 0;
        let cleanupFired = 0;
        let removedLock = false;
        const io = {
          ...fs,
          async rmdir(filename) {
            if ((boundary === "stale-owner" && filename === staleOwner) ||
                (boundary === "lock" && filename === lock)) {
              fired++;
              throw failure;
            }
            if (boundary === "registration-cleanup" && fired && filename === lock) {
              cleanupFired++;
              throw cleanupFailure;
            }
            await fs.rmdir(filename);
            if (filename === lock) removedLock = true;
          },
          async mkdir(filename, options) {
            if ((boundary === "replacement" && filename === lock && removedLock) ||
                (boundary.startsWith("registration") && filename === owner)) {
              fired++;
              throw failure;
            }
            return fs.mkdir(filename, options);
          },
        };
        let fetchCount = 0;
        const offline = t.mock.method(globalThis, "fetch", async () => {
          throw new Error("fixture: network forbidden during recovery");
        });
        const offlineCapture = transactionFs => captureCatalog({
          root, kind: "proteins", transactionFs,
          async fetchImpl() {
            fetchCount++;
            assert.deepEqual(await snapshot(root, catalogTargets), previousFiles,
              "Recovery must restore exact approved prices, provenance and assets before fetching");
            throw new Error("fixture: offline after recovery");
          },
        });
        const failedPath = {
          "stale-owner": staleOwner, lock, replacement: lock,
          registration: owner, "registration-cleanup": owner,
        }[boundary];
        const operation = {
          "stale-owner": "remove stale capture owner",
          lock: "remove stale capture lock",
          replacement: "create replacement capture lock",
          registration: "register capture owner",
          "registration-cleanup": "register capture owner",
        }[boundary];
        await assert.rejects(entryPoint === "capture"
          ? offlineCapture(io) : recoverCapture({ root, transactionFs: io }), error => {
          assert.ok(error.message.includes(failedPath), "Identify the failed filesystem path");
          assert.ok(error.message.includes(operation), "Identify the failed operation");
          assert.ok(error.message.includes(code));
          assert.match(error.message, /node scripts\/capture-stellar-proteins\.mjs --recover/);
          assert.match(error.message, /Keep pending and its backups intact/);
          assert.match(error.message, /confirm no capture or recovery is running/);
          assert.match(error.message, /only this empty directory with rmdir/);
          assert.match(error.message, {
            EACCES: /Fix filesystem permissions/,
            EIO: /Resolve the filesystem I\/O error/,
            ENOSPC: /Free disk space/,
          }[code]);
          const primary = boundary === "registration-cleanup" ? error.errors[0] : error;
          assert.equal(primary.code, code);
          assert.equal(primary.cause, failure);
          if (boundary === "registration-cleanup") {
            assert.ok(error instanceof AggregateError);
            assert.equal(error.errors.length, 2);
            assert.equal(error.errors[1].cause, cleanupFailure);
          }
          return true;
        });
        assert.equal(fired, 1);
        assert.equal(cleanupFired, boundary === "registration-cleanup" ? 1 : 0);
        assert.equal(fetchCount, 0);
        assert.equal(offline.mock.callCount(), 0);
        assert.deepEqual(await snapshot(root, catalogTargets), interruptedFiles);
        assert.deepEqual(await recoveryFiles(), backups);
        const empty = ["lock", "registration-cleanup"].includes(boundary);
        if (boundary === "stale-owner" || empty) {
          assert.deepEqual(await fs.readdir(lock), empty ? [] : [String(stalePid)]);
        } else {
          await assert.rejects(fs.stat(lock), { code: "ENOENT" });
        }
        if (empty) {
          // Even after the injected fault is gone, never steal an ambiguous
          // empty lock. Both entry points remain non-writing on repeated retry.
          for (let attempt = 0; attempt < 2; attempt++) {
            await assert.rejects(offlineCapture(), /Incomplete capture lock/);
            await assert.rejects(recoverCapture({ root }), /Incomplete capture lock/);
            assert.deepEqual(await fs.readdir(lock), []);
            assert.deepEqual(await recoveryFiles(), backups);
            assert.deepEqual(await snapshot(root, catalogTargets), interruptedFiles);
            assert.equal(fetchCount, 0);
          }
          // All workers have exited; model only the documented non-recursive
          // operator action, not deletion of any journal, backup, or owner.
          await fs.rmdir(lock);
        }
        if (entryPoint === "capture") {
          await assert.rejects(offlineCapture(), /fixture: offline after recovery/);
          assert.ok(fetchCount > 0);
        } else {
          await recoverCapture({ root });
          assert.equal(fetchCount, 0);
        }
        assert.equal(offline.mock.callCount(), 0);
        assert.deepEqual(await snapshot(root, catalogTargets), previousFiles);
        assert.deepEqual(await readPriceMirrors(root), [previous, previous]);
        await assertClean(root);
        await recoverCapture({ root });
        assert.deepEqual(await snapshot(root, catalogTargets), previousFiles);
        await assertClean(root);

        nextGeneration();
        nextGeneration();
        const captured = await captureCatalog({ root, kind: "proteins", fetchImpl });
        assertPriceGeneration(captured, baseline, 2);
        assert.deepEqual(await readPriceMirrors(root), [captured, captured]);
        await assertClean(root);
      });
    }
  }
}

for (const boundary of [1, 9]) {
  test(`approved prices and provenance survive SIGKILL ${boundary === 1 ? "after the first catalog mirror" : "after commit"} and offline recovery`, async t => {
    const { root, baseline, fetchImpl, nextGeneration } = await setupPriceCapture(t);
    // Seed a real previous capture: rollback must restore existing provenance,
    // not merely a pre-provenance checked-in catalog.
    const previous = await captureCatalog({ root, fetchImpl });
    assertPriceGeneration(previous, baseline, 0);
    const previousBytes = await Promise.all(priceTargets.map(target =>
      fs.readFile(path.join(root, target.data, priceFile))));
    await crash(root, "--crash-price", boundary);
    const interrupted = await readPriceMirrors(root);
    assertPriceGeneration(interrupted[0], baseline, 1);
    assertPriceGeneration(interrupted[1], baseline, boundary === 1 ? 0 : 1);
    if (boundary === 1) {
      assert.deepEqual(interrupted[1], previous, "Kill occurs before the second mirror is replaced");
      assert.notDeepEqual(interrupted[0], interrupted[1], "Exercise a genuinely split generation");
    } else {
      assert.deepEqual(interrupted[0], interrupted[1]);
    }
    const expected = boundary === 1 ? previous : interrupted[0];
    const offline = t.mock.method(globalThis, "fetch", async () => {
      throw new Error("fixture: network forbidden during recovery");
    });
    await recoverCapture({ root });
    await recoverCapture({ root }); // Recovery must remain idempotent.
    assert.equal(offline.mock.callCount(), 0);
    assert.deepEqual(await readPriceMirrors(root), [expected, expected]);
    assertPriceGeneration(expected, baseline, boundary === 1 ? 0 : 1);
    if (boundary === 1) {
      for (const [index, target] of priceTargets.entries()) {
        const bytes = await fs.readFile(path.join(root, target.data, priceFile));
        assert.ok(bytes.equals(previousBytes[index]), "Restore the exact prior catalog bytes");
      }
    }
    await assertClean(root);

    // Both the killed refresh and the retry differ from the seeded source
    // prices. A retry may neither revert website approval nor retain stale
    // provenance from either earlier generation.
    nextGeneration();
    nextGeneration();
    const captured = await captureCatalog({ root, fetchImpl });
    assertPriceGeneration(captured, baseline, 2);
    assert.deepEqual(await readPriceMirrors(root), [captured, captured]);
    await assertClean(root);
  });
}

for (const interruptRecovery of [false, true])
test(interruptRecovery
  ? "protein recapture survives SIGKILL during automatic price recovery before an offline fetch"
  : "protein recapture restores approved prices and exact prior provenance before an offline fetch", async t => {
  const { root, baseline, fetchImpl, nextGeneration } = await setupPriceCapture(t);
  const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
  assertPriceGeneration(previous, baseline, 0);
  const previousBytes = await Promise.all(priceTargets.map(target =>
    fs.readFile(path.join(root, target.data, priceFile))));

  await crash(root, "--crash-price", 1);
  const interrupted = await readPriceMirrors(root);
  assertPriceGeneration(interrupted[0], baseline, 1);
  assert.deepEqual(interrupted[1], previous, "Kill occurs before the second mirror is replaced");
  assert.notDeepEqual(interrupted[0], interrupted[1], "Exercise a genuinely split generation");

  if (interruptRecovery) {
    // This retry calls captureCatalog directly, not the explicit recovery API.
    // Kill it after copying the first prior catalog, before installing it.
    await crash(root, "--auto-recover-price-crash");
    assert.deepEqual(await readPriceMirrors(root), interrupted,
      "The second termination must leave the price generation split");
    const journal = JSON.parse(await fs.readFile(path.join(pendingPath(root), "journal.json"), "utf8"));
    for (const [index, target] of priceTargets.entries()) {
      const entryIndex = journal.findIndex(entry => entry.relative === path.join(target.data, priceFile));
      assert.ok(entryIndex >= 0, "Both price mirrors must remain recoverable");
      const backup = await fs.readFile(path.join(pendingPath(root), `backup-${entryIndex}`));
      assert.ok(backup.equals(previousBytes[index]), "Recovery must not consume or alter prior provenance backups");
      if (index === 0) {
        const staged = await fs.readFile(path.join(pendingPath(root), `restore-${entryIndex}`));
        assert.ok(staged.equals(previousBytes[index]), "Kill during restoration of the prior price catalog");
      }
    }
  }

  async function assertPreviousGeneration() {
    assert.deepEqual(await readPriceMirrors(root), [previous, previous]);
    for (const [index, target] of priceTargets.entries()) {
      const bytes = await fs.readFile(path.join(root, target.data, priceFile));
      assert.ok(bytes.equals(previousBytes[index]), "Restore the exact prior catalog bytes and provenance");
    }
  }

  let fetchCount = 0;
  let restoredBeforeFetch;
  // Do not call recoverCapture: captureCatalog must recover both mirrors before
  // its first network request, even when that request immediately fails.
  await assert.rejects(captureCatalog({
    root, kind: "proteins",
    async fetchImpl() {
      fetchCount++;
      restoredBeforeFetch ??= (async () => {
        await assertPreviousGeneration();
        assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["lock"],
          "Recovery files must be cleaned before fetching; only the active capture lock remains");
      })();
      await restoredBeforeFetch;
      throw new Error("fixture: offline");
    },
  }), /fixture: offline/);
  assert.ok(fetchCount > 0, "Reach the offline fetch only after automatic recovery");
  await assertPreviousGeneration();
  await assertClean(root);

  // Use a third source-price generation to distinguish the successful retry
  // from both the prior capture and the interrupted refresh.
  nextGeneration();
  nextGeneration();
  const captured = await captureCatalog({ root, kind: "proteins", fetchImpl });
  assertPriceGeneration(captured, baseline, 2);
  assert.deepEqual(await readPriceMirrors(root), [captured, captured]);
  await assertClean(root);
});

for (const deniedOperation of ["copyFile", "rename"]) for (const deniedIndex of [0, 1]) {
  test(`denied restore ${deniedOperation} of protein mirror ${deniedIndex} retains approved prices and provenance for a direct retry`, async t => {
    const { root, baseline, fetchImpl } = await setupPriceCapture(t);
    const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
    assertPriceGeneration(previous, baseline, 0);
    const catalogPaths = priceTargets.map(target => path.join(root, target.data, priceFile));
    const previousBytes = await Promise.all(catalogPaths.map(filename => fs.readFile(filename)));

    await crash(root, "--crash-price", 1);
    const interrupted = await readPriceMirrors(root);
    assertPriceGeneration(interrupted[0], baseline, 1);
    assert.deepEqual(interrupted[1], previous, "Kill before the second catalog is replaced");
    assert.notDeepEqual(interrupted[0], interrupted[1], "Start recovery with genuinely split provenance");
    const interruptedBytes = await Promise.all(catalogPaths.map(filename => fs.readFile(filename)));
    const journalPath = path.join(pendingPath(root), "journal.json");
    const journalBytes = await fs.readFile(journalPath);
    const journal = JSON.parse(journalBytes);
    const catalogEntries = catalogPaths.map(filename => {
      const index = journal.findIndex(entry => entry.relative === path.relative(root, filename));
      assert.ok(index >= 0, "Both protein catalogs must have usable journal entries");
      assert.equal(journal[index].existed, true, "Restore existing catalogs, not newly created destinations");
      return index;
    });
    const backups = new Map();
    for (const [index, entry] of journal.entries()) {
      if (entry.existed) {
        const filename = path.join(pendingPath(root), `backup-${index}`);
        backups.set(filename, await fs.readFile(filename));
      }
    }
    for (const [index, entryIndex] of catalogEntries.entries()) {
      assert.ok(backups.get(path.join(pendingPath(root), `backup-${entryIndex}`)).equals(previousBytes[index]),
        "Use intact approved-price and provenance backups");
    }
    await assert.rejects(fs.stat(path.join(pendingPath(root), "committed")), { code: "ENOENT" });

    let restoreAttempts = 0;
    let fetchCount = 0;
    const deniedRestore = path.join(pendingPath(root), `restore-${catalogEntries[deniedIndex]}`);
    const deniedBackup = path.join(pendingPath(root), `backup-${catalogEntries[deniedIndex]}`);
    const failure = Object.assign(new Error("fixture: catalog restore denied"), { code: "EACCES" });
    await assert.rejects(captureCatalog({
      root, kind: "proteins",
      async fetchImpl() {
        fetchCount++;
        throw new Error("fixture: fetch forbidden during failed recovery");
      },
      transactionFs: {
        ...fs,
        async copyFile(from, to) {
          // Deny only staging from the intact catalog backup, not backup
          // creation or installation of a successfully staged restore.
          if (deniedOperation === "copyFile" && from === deniedBackup && to === deniedRestore) {
            restoreAttempts++;
            throw failure;
          }
          return fs.copyFile(from, to);
        },
        async rename(from, to) {
          // Deny only installation of this staged restore. Leave lock handling,
          // image restores, journal writes and transaction cleanup untouched.
          if (deniedOperation === "rename" && from === deniedRestore && to === catalogPaths[deniedIndex]) {
            restoreAttempts++;
            throw failure;
          }
          return fs.rename(from, to);
        },
      },
    }), error => error === failure && error.code === "EACCES");
    assert.equal(restoreAttempts, 1, `Reach the intended catalog restore ${deniedOperation}`);
    assert.equal(fetchCount, 0, "Stop automatic recovery before any fetch");
    if (deniedOperation === "copyFile") {
      await assert.rejects(fs.stat(deniedRestore), { code: "ENOENT" },
        "The denied staging copy must not install a restore");
    } else {
      assert.ok((await fs.readFile(deniedRestore)).equals(previousBytes[deniedIndex]),
        "The denied rename leaves the exact staged restore available");
    }
    for (const [index, filename] of catalogPaths.entries()) {
      assert.ok((await fs.readFile(filename)).equals(
        index < deniedIndex ? previousBytes[index] : interruptedBytes[index]),
      "Only restores completed before the denied installation may change catalog bytes");
    }
    assert.ok((await fs.readFile(journalPath)).equals(journalBytes), "Retain the exact usable journal");
    for (const [filename, bytes] of backups) {
      assert.ok((await fs.readFile(filename)).equals(bytes), "Keep every immutable backup intact");
    }
    assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["pending"],
      "Release the failed capture lock without discarding the transaction");

    async function assertPreviousGeneration() {
      assert.deepEqual(await readPriceMirrors(root), [previous, previous]);
      for (const [index, filename] of catalogPaths.entries()) {
        assert.ok((await fs.readFile(filename)).equals(previousBytes[index]),
          "Restore both exact approved-price, sourcePrice and priceAuthority catalogs");
      }
    }

    let restoredBeforeFetch;
    // No explicit recoverCapture call: a direct capture must retry recovery
    // before its first fetch, which is kept offline to preserve the restored bytes.
    await assert.rejects(captureCatalog({
      root, kind: "proteins",
      async fetchImpl() {
        fetchCount++;
        restoredBeforeFetch ??= (async () => {
          await assertPreviousGeneration();
          assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["lock"],
            "Clean journal, backups and staging files before fetching");
        })();
        await restoredBeforeFetch;
        throw new Error("fixture: offline after restore retry");
      },
    }), /fixture: offline after restore retry/);
    assert.ok(fetchCount > 0, "The direct retry reaches fetch only after successful recovery");
    await assertPreviousGeneration();
    await assertClean(root);
  });
}

for (const { name, denials } of [
  {
    name: "repeated alternating protein restore denials retain the same approved-price recovery transaction",
    denials: [0, 1, 0, 1].map(index => ["rename", index]),
  },
  {
    name: "changing protein staging-copy and restore-install denials retain the same approved-price recovery transaction",
    denials: [
      ["copyFile", 0], ["rename", 0], ["copyFile", 0],
      ["rename", 1], ["copyFile", 1], ["rename", 0],
    ],
  },
]) {
for (const freshProcess of [false, true]) {
test(`${name} (${freshProcess ? "fresh subprocess" : "same process"})`, { timeout: 30000 }, async t => {
  const { root, baseline, fetchImpl } = await setupPriceCapture(t);
  const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
  assertPriceGeneration(previous, baseline, 0);
  const catalogPaths = priceTargets.map(target => path.join(root, target.data, priceFile));
  const previousBytes = await Promise.all(catalogPaths.map(filename => fs.readFile(filename)));

  const expectationsPath = path.join(root, "approved-price-expectations.json");
  if (freshProcess) {
    await fs.writeFile(expectationsPath, JSON.stringify(previousBytes.map(bytes => bytes.toString("base64"))));
  }
  await crash(root, "--crash-price", 1);
  const interrupted = await readPriceMirrors(root);
  assertPriceGeneration(interrupted[0], baseline, 1);
  assert.deepEqual(interrupted[1], previous, "Kill before replacing the second protein mirror");
  assert.notDeepEqual(interrupted[0], interrupted[1], "Start with genuinely split source provenance");

  const journalPath = path.join(pendingPath(root), "journal.json");
  const journalBytes = await fs.readFile(journalPath);
  const journal = JSON.parse(journalBytes);
  const catalogEntries = catalogPaths.map(filename => {
    const index = journal.findIndex(entry => entry.relative === path.relative(root, filename));
    assert.ok(index >= 0, "Both protein mirrors must have recovery entries");
    assert.equal(journal[index].existed, true);
    return index;
  });
  const backups = new Map();
  for (const [index, entry] of journal.entries()) {
    if (entry.existed) {
      const filename = path.join(pendingPath(root), `backup-${index}`);
      backups.set(filename, await fs.readFile(filename));
    }
  }
  for (const [index, entryIndex] of catalogEntries.entries()) {
    assert.ok(backups.get(path.join(pendingPath(root), `backup-${entryIndex}`)).equals(previousBytes[index]),
      "Start with intact approved-price and provenance backups");
  }

  // Reuse this one killed transaction throughout: alternating denials must
  // neither consume its backups nor replace them with partially restored data.
  for (const [attempt, [deniedOperation, deniedIndex]] of denials.entries()) {
    const beforeRetry = await Promise.all(catalogPaths.map(filename => fs.readFile(filename)));
    const deniedRestore = path.join(pendingPath(root), `restore-${catalogEntries[deniedIndex]}`);
    const deniedBackup = path.join(pendingPath(root), `backup-${catalogEntries[deniedIndex]}`);
    const stagedBeforeRetry = await fs.readFile(deniedRestore).catch(error => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    const failure = Object.assign(new Error(`fixture: repeated restore denial ${attempt}`), { code: "EACCES" });
    let restoreAttempts = 0;
    let targetInstallAttempts = 0;
    let fetchCount = 0;
    await assert.rejects(captureCatalog({
      root, kind: "proteins",
      async fetchImpl() {
        fetchCount++;
        throw new Error("fixture: fetch forbidden during repeated recovery denial");
      },
      transactionFs: {
        ...fs,
        async copyFile(from, to) {
          if (deniedOperation === "copyFile" && from === deniedBackup && to === deniedRestore) {
            restoreAttempts++;
            throw failure;
          }
          return fs.copyFile(from, to);
        },
        async rename(from, to) {
          if (from === deniedRestore && to === catalogPaths[deniedIndex]) {
            targetInstallAttempts++;
            if (deniedOperation === "rename") {
              restoreAttempts++;
              throw failure;
            }
          }
          return fs.rename(from, to);
        },
      },
    }), error => error === failure && error.code === "EACCES");
    assert.equal(restoreAttempts, 1, `Retry ${attempt} reaches the targeted restore ${deniedOperation}`);
    assert.equal(targetInstallAttempts, deniedOperation === "rename" ? 1 : 0,
      "A denied staging copy must not proceed to installation, even with an earlier staged file");
    assert.equal(fetchCount, 0, `Retry ${attempt} cannot fetch while recovery fails`);
    if (deniedOperation === "rename") {
      assert.ok((await fs.readFile(deniedRestore)).equals(previousBytes[deniedIndex]),
        "Leave the exact staged restore available after an installation denial");
    } else if (stagedBeforeRetry) {
      assert.ok((await fs.readFile(deniedRestore)).equals(stagedBeforeRetry),
        "A denied copy leaves the earlier staged restore unchanged");
    } else {
      await assert.rejects(fs.stat(deniedRestore), { code: "ENOENT" },
        "A denied copy must not create a staged restore");
    }
    for (const [index, filename] of catalogPaths.entries()) {
      assert.ok((await fs.readFile(filename)).equals(
        index < deniedIndex ? previousBytes[index] : beforeRetry[index]),
      "Only installations preceding this denial may change the mirrors");
    }
    assert.ok((await fs.readFile(journalPath)).equals(journalBytes),
      "Keep the same journal bytes across every failed retry");
    for (const [filename, bytes] of backups) {
      assert.ok((await fs.readFile(filename)).equals(bytes),
        "Every immutable backup must survive every failed retry");
    }
    await assert.rejects(fs.stat(path.join(pendingPath(root), "committed")), { code: "ENOENT" });
    assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["pending"],
      "Release each failed retry's lock without discarding recovery metadata");
  }

  async function assertPreviousGeneration() {
    for (const [index, filename] of catalogPaths.entries()) {
      const bytes = await fs.readFile(filename);
      assert.ok(bytes.equals(previousBytes[index]),
        "Recover exact approved-price, sourcePrice and priceAuthority catalog bytes");
      assertPriceGeneration(JSON.parse(bytes), baseline, 0);
    }
  }

  // Keep the subsequent fetch offline so a new generation cannot hide
  // incomplete recovery. The fresh worker gets only on-disk expectations,
  // with no journal, backups or capture state passed from this process.
  if (freshProcess) {
    const child = spawn(process.execPath, [
      new URL("./fixtures/capture-worker.mjs", import.meta.url).pathname,
      "--auto-recover-price-after-denials", root, expectationsPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk; });
    const result = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    assert.equal(result.signal, null, stderr);
    assert.equal(result.code, 0, stderr);
  } else {
    let fetchCount = 0;
    let restoredBeforeFetch;
    await assert.rejects(captureCatalog({
      root, kind: "proteins",
      async fetchImpl() {
        fetchCount++;
        restoredBeforeFetch ??= (async () => {
          await assertPreviousGeneration();
          assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["lock"],
            "Remove journal, backups and restore staging files before fetching");
        })();
        await restoredBeforeFetch;
        throw new Error("fixture: offline after repeated restore denials");
      },
    }), /fixture: offline after repeated restore denials/);
    assert.ok(fetchCount > 0, "The final direct capture reaches fetch after recovery succeeds");
  }
  await assertPreviousGeneration();
  await assertClean(root);
});
}
}

for (const missingIndex of [0, 1]) for (const recoveryState of ["uninterrupted", "interrupted", "modified", "removal-first"]) {
  const interruptRemoval = recoveryState !== "uninterrupted";
  const modifySurvivingCatalog = recoveryState === "modified";
  const missingFirst = recoveryState === "removal-first";
  test(modifySurvivingCatalog
    ? `direct capture restores immutable saved prices after SIGKILL deleting protein mirror ${missingIndex} and a surviving catalog change`
    : missingFirst
    ? `SIGKILL after removing new protein mirror ${missingIndex} before restoring saved prices permits an offline retry`
    : interruptRemoval
    ? `SIGKILL after removing new protein mirror ${missingIndex} permits repeated deletion before an offline fetch`
    : `automatic recovery removes newly created protein mirror ${missingIndex} before an offline fetch`, async t => {
    const { root, baseline, fetchImpl } = await setupPriceCapture(t);
    const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
    assertPriceGeneration(previous, baseline, 0);
    const existingIndex = 1 - missingIndex;
    const missingPath = path.join(root, priceTargets[missingIndex].data, priceFile);
    const existingPath = path.join(root, priceTargets[existingIndex].data, priceFile);
    const previousBytes = await fs.readFile(existingPath);
    await fs.rm(missingPath);
    await assert.rejects(fs.stat(missingPath), { code: "ENOENT" });

    await crash(root, missingFirst ? "--crash-price-missing-first" : "--crash-price-missing", missingIndex);
    for (const catalog of await readPriceMirrors(root)) {
      assertPriceGeneration(catalog, baseline, 1);
      assert.notDeepEqual(catalog, previous, "Both catalogs contain interrupted source prices");
    }
    const interruptedBytes = await fs.readFile(existingPath);
    const journalBytes = await fs.readFile(path.join(pendingPath(root), "journal.json"));
    const journal = JSON.parse(journalBytes);
    for (const [index, target] of priceTargets.entries()) {
      const entry = journal.find(entry => entry.relative === path.join(target.data, priceFile));
      assert.ok(entry, "Each protein catalog must have a recovery entry");
      assert.equal(entry.existed, index !== missingIndex,
        "Recovery must distinguish the absent destination from the existing mirror");
    }
    await assert.rejects(fs.stat(path.join(pendingPath(root), "committed")), { code: "ENOENT" });
    const backupPath = path.join(pendingPath(root), `backup-${missingFirst ? 1 : 0}`);
    async function assertRecoveryIntact() {
      assert.ok((await fs.readFile(path.join(pendingPath(root), "journal.json"))).equals(journalBytes),
        "Keep the unchanged pending journal until restoration finishes");
      assert.ok((await fs.readFile(backupPath)).equals(previousBytes),
        "Keep the immutable surviving catalog backup until restoration finishes");
    }
    await assertRecoveryIntact();

    async function assertPreviousGeneration() {
      await assert.rejects(fs.stat(missingPath), { code: "ENOENT" });
      assert.ok((await fs.readFile(existingPath)).equals(previousBytes),
        "Restore exact prior approved price, sourcePrice and priceAuthority bytes");
      assertPriceGeneration(JSON.parse(await fs.readFile(existingPath, "utf8")), baseline, 0);
    }

    if (interruptRemoval) {
      await crash(root, "--auto-recover-price-missing-crash", missingIndex);
      if (missingFirst) {
        await assert.rejects(fs.stat(missingPath), { code: "ENOENT" });
        assert.ok((await fs.readFile(existingPath)).equals(interruptedBytes),
          "Kill after deletion but before restoring any saved prices in the surviving catalog");
        assertPriceGeneration(JSON.parse(await fs.readFile(existingPath, "utf8")), baseline, 1);
      } else {
        await assertPreviousGeneration();
      }
      await assertRecoveryIntact();
      const existingEntry = { relative: path.relative(root, existingPath), existed: true };
      const missingEntry = { relative: path.relative(root, missingPath), existed: false };
      assert.deepEqual(journal, missingFirst ? [missingEntry, existingEntry] : [existingEntry, missingEntry],
        "Exercise the requested deletion/restoration order");
      await assert.rejects(fs.stat(path.join(pendingPath(root), `backup-${missingFirst ? 0 : 1}`)),
        { code: "ENOENT" });
      const owners = await fs.readdir(path.join(path.dirname(pendingPath(root)), "lock"));
      assert.equal(owners.length, 1, "Real termination leaves its lock for the retry to reclaim");
      assert.match(owners[0], /^\d+$/);
    }

    if (modifySurvivingCatalog) {
      // A live catalog changed between recovery attempts is not a new approval.
      // Keep it valid JSON so the retry must choose the immutable backup rather
      // than merely reject a malformed destination.
      const modified = previous.map(product => product.source ? {
        ...product,
        price: product.price + 777,
        sourcePrice: product.sourcePrice + 333,
        priceAuthority: "fixture: modified between recovery retries",
      } : product);
      await fs.writeFile(existingPath, JSON.stringify(modified, null, 2) + "\n");
      const modifiedBytes = await fs.readFile(existingPath);
      assert.ok(!modifiedBytes.equals(previousBytes), "Actually change the surviving live catalog");
      assert.deepEqual(JSON.parse(modifiedBytes), modified);
      for (const product of modified.filter(product => product.source)) {
        const prior = previous.find(entry => entry.component === product.component);
        for (const field of ["price", "sourcePrice", "priceAuthority"]) {
          assert.notEqual(product[field], prior[field], `${product.component}: change ${field} before retry`);
        }
      }
      await assert.rejects(fs.stat(missingPath), { code: "ENOENT" });
      assert.ok((await fs.readFile(path.join(pendingPath(root), "backup-0"))).equals(previousBytes),
        "Changing the live catalog must leave the immutable prior backup intact");
      assert.ok((await fs.readFile(path.join(pendingPath(root), "journal.json"))).equals(journalBytes),
        "Retry the same interrupted recovery journal after the live catalog changes");
    }

    let removalCount = 0;
    let restoreCount = 0;
    let fetchCount = 0;
    let restoredBeforeFetch;
    // Recovery is global across catalog kinds. Use electrolyte capture so its
    // fetch can run after rollback restores the intentionally absent protein
    // mirror; protein preflight would correctly reject that missing mirror.
    await assert.rejects(captureCatalog({
      root, kind: "electrolytes",
      transactionFs: {
        ...fs,
        async rm(filename, options) {
          if (filename === missingPath) {
            assert.equal(fetchCount, 0, "Finish removal before any network request");
            assert.deepEqual(options, { force: true }, "Deleting an absent catalog must be safe");
            if (interruptRemoval) {
              await assert.rejects(fs.stat(filename), { code: "ENOENT" });
            }
            if (missingFirst) {
              assert.ok((await fs.readFile(existingPath)).equals(interruptedBytes),
                "Repeated deletion must run while the survivor still needs restoration");
              await assertRecoveryIntact();
            }
            await fs.rm(filename, options);
            removalCount++;
            return;
          }
          await fs.rm(filename, options);
        },
        async rename(from, to) {
          const restoringSurvivor = /\/restore-\d+$/.test(from) && to === existingPath;
          if (restoringSurvivor) {
            assert.equal(fetchCount, 0, "Restore the surviving catalog before fetching");
            if (missingFirst) assert.equal(removalCount, 1, "Repeat deletion before restoring saved prices");
            await assertRecoveryIntact();
          }
          await fs.rename(from, to);
          if (restoringSurvivor) {
            restoreCount++;
            assert.ok((await fs.readFile(existingPath)).equals(previousBytes),
              "Install the exact saved catalog bytes");
            await assertRecoveryIntact();
          }
        },
      },
      async fetchImpl() {
        fetchCount++;
        restoredBeforeFetch ??= (async () => {
          assert.equal(removalCount, 1, "Repeat the journal's deletion even if the catalog is already absent");
          assert.equal(restoreCount, 1, "Restore the surviving catalog from its immutable backup");
          await assertPreviousGeneration();
          assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["lock"],
            "Remove journal, backups and staging files before fetching");
        })();
        await restoredBeforeFetch;
        throw new Error("fixture: offline");
      },
    }), /fixture: offline/);
    assert.ok(fetchCount > 0, "Automatic recovery must finish before the offline fetch");
    assert.equal(removalCount, 1);
    await assertPreviousGeneration();
    await assertClean(root);
  });
}

for (const missingIndex of [0, 1]) {
  test(`failed deletion of newly created protein mirror ${missingIndex} retains automatic recovery for a direct retry`, async t => {
    const { root, baseline, fetchImpl } = await setupPriceCapture(t);
    const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
    assertPriceGeneration(previous, baseline, 0);
    const missingPath = path.join(root, priceTargets[missingIndex].data, priceFile);
    const existingPath = path.join(root, priceTargets[1 - missingIndex].data, priceFile);
    const previousBytes = await fs.readFile(existingPath);
    await fs.rm(missingPath);

    await crash(root, "--crash-price-missing", missingIndex);
    for (const catalog of await readPriceMirrors(root)) {
      assertPriceGeneration(catalog, baseline, 1);
      assert.notDeepEqual(catalog, previous, "Both mirrors need recovery from interrupted source prices");
    }
    const newBytes = await fs.readFile(missingPath);
    const journalPath = path.join(pendingPath(root), "journal.json");
    const journalBytes = await fs.readFile(journalPath);
    const journal = JSON.parse(journalBytes);
    const missingEntry = journal.find(entry =>
      entry.relative === path.relative(root, missingPath));
    assert.ok(missingEntry, "The new destination must have a recovery entry");
    assert.equal(missingEntry.existed, false, "Retry must remove the absent-before-install destination");
    const existingEntryIndex = journal.findIndex(entry =>
      entry.relative === path.relative(root, existingPath));
    assert.ok(existingEntryIndex >= 0, "The surviving mirror must have a recovery entry");
    assert.equal(journal[existingEntryIndex].existed, true);
    const backupPath = path.join(pendingPath(root), `backup-${existingEntryIndex}`);
    assert.ok((await fs.readFile(backupPath)).equals(previousBytes));
    await assert.rejects(fs.stat(path.join(pendingPath(root), "committed")), { code: "ENOENT" });

    let removalAttempts = 0;
    let fetchCount = 0;
    const failure = diskError();
    await assert.rejects(captureCatalog({
      root, kind: "electrolytes",
      async fetchImpl() {
        fetchCount++;
        throw new Error("fixture: fetch forbidden during failed recovery");
      },
      transactionFs: {
        ...fs,
        async rm(filename, options) {
          if (filename === missingPath) {
            removalAttempts++;
            throw failure;
          }
          return fs.rm(filename, options);
        },
      },
    }), error => error === failure);
    assert.equal(removalAttempts, 1, "Fail only removal of the newly installed catalog");
    assert.equal(fetchCount, 0, "Failed automatic recovery must stop before any fetch");
    assert.ok((await fs.readFile(missingPath)).equals(newBytes), "Failed deletion leaves the new file in place");
    assert.ok((await fs.readFile(existingPath)).equals(previousBytes),
      "The surviving mirror is already restored when deletion fails");
    assert.ok((await fs.readFile(journalPath)).equals(journalBytes), "Retain the exact usable recovery journal");
    assert.ok((await fs.readFile(backupPath)).equals(previousBytes),
      "Retain the immutable approved-price and provenance backup, not a damaged-backup fixture");
    assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["pending"],
      "Release the failed capture lock without discarding recovery metadata");

    async function assertPreviousGeneration() {
      await assert.rejects(fs.stat(missingPath), { code: "ENOENT" });
      assert.ok((await fs.readFile(existingPath)).equals(previousBytes),
        "Retry must restore the exact approved price, sourcePrice and priceAuthority bytes");
      assertPriceGeneration(JSON.parse(await fs.readFile(existingPath, "utf8")), baseline, 0);
    }

    let restoredBeforeFetch;
    // Retry through captureCatalog, not recoverCapture. Electrolyte capture can
    // reach its offline fetch after restoring the deliberately absent protein mirror.
    await assert.rejects(captureCatalog({
      root, kind: "electrolytes",
      async fetchImpl() {
        fetchCount++;
        restoredBeforeFetch ??= (async () => {
          await assertPreviousGeneration();
          assert.deepEqual(await fs.readdir(path.dirname(pendingPath(root))), ["lock"],
            "Clean recovery metadata before the retry reaches its first fetch");
        })();
        await restoredBeforeFetch;
        throw new Error("fixture: offline after deletion retry");
      },
    }), /fixture: offline after deletion retry/);
    assert.ok(fetchCount > 0, "The direct retry must finish recovery before reaching the offline fetch");
    await assertPreviousGeneration();
    await assertClean(root);
  });
}

test("approved prices and provenance survive SIGKILL during recovery and another offline recovery", async t => {
  const { root, baseline, fetchImpl, nextGeneration } = await setupPriceCapture(t);
  const previous = await captureCatalog({ root, fetchImpl });
  assertPriceGeneration(previous, baseline, 0);
  // Compare only price authority and provenance; gallery interruption has its
  // own coverage and must not determine where this worker stops.
  const prices = catalog => catalog.map(({ component, price, sourcePrice, priceAuthority }) =>
    ({ component, price, sourcePrice, priceAuthority }));
  const approved = prices(previous);
  const previousBytes = await Promise.all(priceTargets.map(target =>
    fs.readFile(path.join(root, target.data, priceFile))));

  await crash(root, "--crash-price", 2);
  for (const catalog of await readPriceMirrors(root)) {
    assertPriceGeneration(catalog, baseline, 1);
    assert.notDeepEqual(prices(catalog), approved, "Both mirrors must need provenance rollback");
  }
  const journal = JSON.parse(await fs.readFile(path.join(pendingPath(root), "journal.json"), "utf8"));
  const catalogBackups = priceTargets.map(target => {
    const index = journal.findIndex(entry => entry.relative === path.join(target.data, priceFile));
    assert.notEqual(index, -1, "Each catalog must have a recovery journal entry");
    assert.equal(journal[index].existed, true);
    return path.join(pendingPath(root), `backup-${index}`);
  });
  const offline = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("fixture: network forbidden during recovery");
  });
  await crash(root, "--recover-crash-price");
  const interrupted = await readPriceMirrors(root);
  assert.deepEqual(prices(interrupted[0]), approved, "First catalog restored before recovery is killed");
  assertPriceGeneration(interrupted[1], baseline, 1);
  assert.notDeepEqual(prices(interrupted[1]), approved, "Second catalog still needs recovery");
  for (const [index, backup] of catalogBackups.entries()) {
    assert.ok((await fs.readFile(backup)).equals(previousBytes[index]),
      "Interrupted recovery must retain the immutable prior catalog backup");
  }

  await recoverCapture({ root });
  await recoverCapture({ root }); // Repeating recovery must preserve the restored prices.
  assert.equal(offline.mock.callCount(), 0);
  for (const catalog of await readPriceMirrors(root)) {
    assert.deepEqual(prices(catalog), approved, "Restore exact prior approved prices and provenance in both mirrors");
    assertPriceGeneration(catalog, baseline, 0);
  }
  await assertClean(root);

  nextGeneration();
  nextGeneration();
  const captured = await captureCatalog({ root, fetchImpl });
  assertPriceGeneration(captured, baseline, 2);
  for (const catalog of await readPriceMirrors(root)) {
    assert.deepEqual(prices(catalog), prices(captured), "Retry installs fresh source prices without changing approval");
    assertPriceGeneration(catalog, baseline, 2);
  }
  await assertClean(root);
});

for (const committed of [false, true]) {
  for (const boundary of ["before-retire-rename", "after-retire-rename", "during-discard-cleanup"]) {
    test(`${committed ? "committed" : "rollback"} recovery: SIGKILL ${boundary} preserves exact prices, provenance, assets and exclusion`,
      { timeout: 30000 }, async t => {
        const { root, baseline, fetchImpl, nextGeneration } = await setupPriceCapture(t);
        const catalogTargets = priceTargets.map(target => ({ ...target, data: path.join(target.data, priceFile) }));
        const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
        assertPriceGeneration(previous, baseline, 0);
        // Only the review copy is stale; Canvas's approved artwork stays valid.
        // This ensures asset rollback is observable, not an identical-byte no-op.
        const reviewImage = previous.find(product => product.source && product.images.length).images[0];
        const reviewAsset = path.join(root, priceTargets[1].assets, reviewImage.src.replace("/__mockup/", ""));
        await fs.writeFile(reviewAsset, "fixture: previous review asset");
        const previousFiles = await snapshot(root, catalogTargets);

        await crash(root, "--crash-price", committed ? 9 : 2);
        for (const catalog of await readPriceMirrors(root)) assertPriceGeneration(catalog, baseline, 1);
        const interruptedFiles = await snapshot(root, catalogTargets);
        assert.notDeepEqual(interruptedFiles, previousFiles, "Exercise different catalog and asset generations");
        const expectedFiles = committed ? interruptedFiles : previousFiles;
        assert.notDeepEqual(interruptedFiles[path.relative(root, reviewAsset)],
          previousFiles[path.relative(root, reviewAsset)], "Capture really replaced the stale review asset");
        const pending = pendingPath(root);
        const workspace = path.dirname(pending);
        const journalBytes = await fs.readFile(path.join(pending, "journal.json"));
        const journal = JSON.parse(journalBytes);
        assert.ok(journal.every(entry => entry.existed), "This matrix only restores existing files");
        const backups = await Promise.all(journal.map((_, index) => fs.readFile(path.join(pending, `backup-${index}`))));
        assert.equal(await fs.stat(path.join(pending, "committed")).then(() => true, error => {
          if (error.code === "ENOENT") return false;
          throw error;
        }), committed);
        const offline = t.mock.method(globalThis, "fetch", async () => {
          throw new Error("fixture: network forbidden during recovery");
        });
        let discarded;
        const recoveryPid = await crash(root, "--recover-retire-crash-price", boundary, async (message, pid) => {
          assert.deepEqual(message, { boundary });
          assert.deepEqual(await snapshot(root, catalogTargets), expectedFiles,
            "Retirement starts only after the correct generation is fully authoritative");
          assert.deepEqual(await fs.readdir(path.join(workspace, "lock")), [String(pid)]);
          const names = await fs.readdir(workspace);
          const discards = names.filter(name => name.startsWith("pending-discard-"));
          assert.equal(discards.length, boundary === "before-retire-rename" ? 0 : 1);
          discarded = discards[0];
          const transaction = discarded ? path.join(workspace, discarded) : pending;
          if (discarded) await assert.rejects(fs.stat(pending), { code: "ENOENT" });
          assert.deepEqual(await fs.readFile(path.join(transaction, "journal.json")), journalBytes);
          for (const [index, bytes] of backups.entries()) {
            const filename = path.join(transaction, `backup-${index}`);
            if (boundary === "during-discard-cleanup" && index === 0) {
              await assert.rejects(fs.stat(filename), { code: "ENOENT" });
            } else {
              assert.deepEqual(await fs.readFile(filename), bytes, "Immutable backups remain intact until cleanup");
            }
          }
          const transactionFiles = await fs.readdir(transaction);
          // Renaming pending away must not release the lock early.
          await assert.rejects(captureCatalog({ root, kind: "proteins", fetchImpl: globalThis.fetch }), /already running/);
          await assert.rejects(recoverCapture({ root }), /already running/);
          assert.deepEqual(await fs.readdir(transaction), transactionFiles, "Rejected contenders cannot clean the journal");
          assert.deepEqual(await snapshot(root, catalogTargets), expectedFiles);
        });
        assert.deepEqual(await fs.readdir(path.join(workspace, "lock")), [String(recoveryPid)],
          "SIGKILL leaves a real dead owner rather than running finally");

        for (let retry = 0; retry < 2; retry++) {
          await recoverCapture({ root });
          assert.deepEqual(await snapshot(root, catalogTargets), expectedFiles,
            "Offline recovery preserves exact catalog bytes, provenance and every asset");
          for (const catalog of await readPriceMirrors(root)) {
            assertPriceGeneration(catalog, baseline, committed ? 1 : 0);
          }
          assert.deepEqual(await fs.readdir(workspace), discarded ? [discarded] : [],
            "Only harmless discarded leftovers may remain; no pending transaction or lock");
        }
        assert.equal(offline.mock.callCount(), 0, "Neither recovery nor rejected writers may download");
        // A partial discarded journal must never be replayed by a later writer.
        nextGeneration();
        nextGeneration();
        const captured = await captureCatalog({ root, kind: "proteins", fetchImpl });
        assertPriceGeneration(captured, baseline, 2);
        assert.deepEqual(await readPriceMirrors(root), [captured, captured]);
        assert.deepEqual(await fs.readdir(workspace), discarded ? [discarded] : []);
      });
  }
}

test("protein recapture keeps committed prices and exact provenance before an offline fetch", async t => {
  const { root, baseline, fetchImpl } = await setupPriceCapture(t);
  const previous = await captureCatalog({ root, kind: "proteins", fetchImpl });
  assertPriceGeneration(previous, baseline, 0);

  await crash(root, "--crash-price", 9);
  const committed = await readPriceMirrors(root);
  for (const catalog of committed) assertPriceGeneration(catalog, baseline, 1);
  assert.deepEqual(committed[0], committed[1], "Both mirrors contain the committed generation");
  assert.notDeepEqual(committed[0], previous, "Committed provenance differs from the prior capture");
  const committedBytes = await Promise.all(priceTargets.map(target =>
    fs.readFile(path.join(root, target.data, priceFile))));
  assert.ok(await fs.stat(path.join(pendingPath(root), "committed")));

  async function assertCommittedGeneration() {
    assert.deepEqual(await readPriceMirrors(root), committed);
    for (const [index, target] of priceTargets.entries()) {
      const bytes = await fs.readFile(path.join(root, target.data, priceFile));
      assert.ok(bytes.equals(committedBytes[index]), "Keep the exact committed catalog bytes and provenance");
    }
  }

  let fetchCount = 0;
  let preservedBeforeFetch;
  // Do not call recoverCapture: the retry must keep the completed update rather
  // than roll back to the previous generation before its first network request.
  await assert.rejects(captureCatalog({
    root, kind: "proteins",
    async fetchImpl() {
      fetchCount++;
      preservedBeforeFetch ??= assertCommittedGeneration();
      await preservedBeforeFetch;
      throw new Error("fixture: offline");
    },
  }), /fixture: offline/);
  assert.ok(fetchCount > 0, "Reach the offline fetch only after automatic recovery");
  await assertCommittedGeneration();
  await assertClean(root);
});

test("SIGKILL while staging a partial file never changes the previous generation", async t => {
  const { root, before } = await setup(t);
  await crash(root, "--crash", -1);
  assert.deepEqual(await snapshot(root), before);
  await recoverCapture({ root });
  assert.deepEqual(await snapshot(root), before);
  await assertClean(root);
});

for (const index of [9, 10]) {
  test(`SIGKILL after completion (${index}) keeps the fully installed new generation`, async t => {
    const { root } = await setup(t);
    await crash(root, "--crash", index);
    const installed = JSON.parse(await fs.readFile(path.join(root, targets[0].data)));
    await recoverCapture({ root });
    // A discarded directory can remain if recursive cleanup was interrupted.
    const workspace = path.dirname(pendingPath(root));
    for (const name of await fs.readdir(workspace)) {
      assert.match(name, /^pending-discard-/);
      await fs.rm(path.join(workspace, name), { recursive: true, force: true });
    }
    await assertNewGeneration(root, installed);
  });
}

test("the next recapture restores an interrupted generation before attempting any fetch", async t => {
  const { root, before } = await setup(t);
  await crash(root, "--crash", 5);
  await assert.rejects(captureCatalog({
    root, kind: "electrolytes",
    async fetchImpl() {
      assert.deepEqual(await snapshot(root), before);
      throw new Error("fixture: offline");
    },
  }), /offline/);
  assert.deepEqual(await snapshot(root), before);
  await assertClean(root);
});

test("a disk error during rollback retains backups and repeatable recovery", async t => {
  const { root, before } = await setup(t);
  let count = 0;
  await assert.rejects(capture(root, {
    ...fs,
    async rename(from, to) {
      await fs.rename(from, to);
      if (/\/next-\d+$/.test(from) && ++count === 5) throw diskError();
    },
    async copyFile() { throw diskError(); },
  }), /backups are retained/);
  assert.ok(await fs.stat(path.join(pendingPath(root), "backup-0")));
  await recoverCapture({ root });
  assert.deepEqual(await snapshot(root), before);
  await assertClean(root);
});

test("SIGKILL during recovery keeps immutable backups for another recovery", async t => {
  const { root, before } = await setup(t);
  await crash(root, "--crash", 5);
  await crash(root, "--recover-crash");
  await recoverCapture({ root });
  assert.deepEqual(await snapshot(root), before);
  await assertClean(root);
});

test("an active capture excludes another capture and recovery", async t => {
  const { root } = await setup(t);
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const running = captureCatalog({
    root, kind: "electrolytes",
    async fetchImpl(url) {
      started();
      await wait;
      return fixtureFetch(url);
    },
  });
  await ready;
  try {
    await assert.rejects(capture(root), /already running/);
    await assert.rejects(recoverCapture({ root }), /already running/);
  } finally {
    release();
    await running;
  }
  await assertClean(root);
});

test("a successful capture replaces both catalogs and assets and leaves no journal", async t => {
  const { root } = await setup(t);
  await assertNewGeneration(root, await capture(root));
});
