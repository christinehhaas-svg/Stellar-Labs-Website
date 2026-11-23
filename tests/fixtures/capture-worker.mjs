// Offline subprocess used to test real process termination, not a simulated
// exception (which would run capture's rollback/finally handlers).
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { captureCatalog, recoverCapture } from "../../scripts/capture-stellar-proteins.mjs";
import { withCaptureTransaction } from "../../scripts/capture-transaction.mjs";
import { priceFetchFixture, priceTargets, priceFile, remotePrices } from "./merchant-price-capture.mjs";

export const products = JSON.parse(await fs.readFile(new URL("./capture-generation.json", import.meta.url)));
export async function fixtureFetch(url) {
  if (url.endsWith(".js")) {
    const product = products.find(product => url.endsWith(`/products/${product.handle}.js`));
    if (!product) throw new Error(`Unexpected fixture URL: ${url}`);
    return { ok: true, json: async () => product };
  }
  if (!products.some(product => product.images.includes(url))) throw new Error(`Unexpected fixture image: ${url}`);
  return { ok: true, arrayBuffer: async () => Buffer.from(`new generation: ${url}`) };
}

if (process.argv[2] === "--auto-recover-price-after-denials") {
  const root = process.argv[3];
  // Independent expectations saved before interruption, never reconstructed
  // from the possibly damaged mirrors, journal or recovery backups.
  const previousBytes = JSON.parse(await fs.readFile(process.argv[4], "utf8"))
    .map(bytes => Buffer.from(bytes, "base64"));
  assert.equal(previousBytes.length, priceTargets.length);
  const offline = new Error("fixture: offline after fresh-process recovery");
  let fetchCount = 0;
  let restoredBeforeFetch;
  globalThis.fetch = async () => { throw new Error("fixture: real network forbidden"); };
  await assert.rejects(captureCatalog({
    root, kind: "proteins",
    async fetchImpl() {
      fetchCount++;
      restoredBeforeFetch ??= (async () => {
        for (const [index, target] of priceTargets.entries()) {
          const bytes = await fs.readFile(path.join(root, target.data, priceFile));
          assert.ok(bytes.equals(previousBytes[index]),
            "Restore exact approved-price and provenance bytes in both mirrors before fetching");
        }
        assert.deepEqual(await fs.readdir(path.join(root, "generated-artifacts/catalog-capture")), ["lock"],
          "Retire the journal, backups and staged restores before fetching");
      })();
      await restoredBeforeFetch;
      throw offline;
    },
  }), error => error === offline);
  assert.ok(fetchCount > 0, "Fresh capture must reach the offline fetch after recovery");
} else if (process.argv[2] === "--recover-retire-crash-price") {
  const root = process.argv[3];
  const boundary = process.argv[4];
  const pending = path.join(root, "generated-artifacts/catalog-capture/pending");
  globalThis.fetch = async () => { throw new Error("fixture: network forbidden during recovery"); };
  const stop = async phase => {
    if (boundary !== phase) return;
    // Let the parent verify exclusion while this recovery still owns the lock.
    const resume = new Promise(resolve => process.once("message", resolve));
    process.send({ boundary: phase });
    await resume;
    process.kill(process.pid, "SIGKILL");
  };
  await recoverCapture({
    root,
    transactionFs: {
      ...fs,
      async rename(from, to) {
        if (from === pending) await stop("before-retire-rename");
        await fs.rename(from, to);
        if (from === pending) await stop("after-retire-rename");
      },
      async rm(filename, options) {
        if (path.dirname(filename) === path.dirname(pending) &&
            path.basename(filename).startsWith("pending-discard-")) {
          // Model a real partial recursive removal: delete one immutable backup
          // before dying, leaving the journal and remaining backups behind.
          await fs.rm(path.join(filename, "backup-0"));
          await stop("during-discard-cleanup");
        }
        await fs.rm(filename, options);
      },
    },
  });
  throw new Error(`fixture: recovery retirement boundary not reached: ${boundary}`);
} else if (["--crash-price-missing", "--crash-price-missing-first"].includes(process.argv[2])) {
  const root = process.argv[3];
  const missingIndex = Number(process.argv[4]);
  const existingIndex = 1 - missingIndex;
  const order = process.argv[2] === "--crash-price-missing-first"
    ? [missingIndex, existingIndex] : [existingIndex, missingIndex];
  const catalogPath = index => path.join(priceTargets[index].data, priceFile);
  const previous = JSON.parse(await fs.readFile(path.join(root, catalogPath(existingIndex)), "utf8"));
  const next = previous.map(product => product.source
    ? { ...product, sourcePrice: remotePrices[product.component] - 100 }
    : product);
  // Exercise the actual installer with an absent protein destination. Protein
  // capture's local-listing preflight deliberately rejects a missing mirror.
  await withCaptureTransaction(root, commit => commit(
    order.map(index => [catalogPath(index), JSON.stringify(next, null, 2) + "\n"]),
  ), {
    ...fs,
    async rename(from, to) {
      await fs.rename(from, to);
      // Install both interrupted catalogs, regardless of journal order.
      if (/\/next-\d+$/.test(from) && to === path.join(root, catalogPath(order[1]))) {
        process.kill(process.pid, "SIGKILL");
      }
    },
  });
} else if (["--crash", "--crash-price"].includes(process.argv[2])) {
  const root = process.argv[3];
  const isPrice = process.argv[2] === "--crash-price";
  const crashAt = Number(process.argv[4]);
  const firstPriceMirror = path.join(root, priceTargets[0].data, priceFile);
  const secondPriceMirror = path.join(root, priceTargets[1].data, priceFile);
  let installed = 0;
  await captureCatalog({
    root,
    kind: isPrice ? "proteins" : "electrolytes",
    fetchImpl: isPrice ? priceFetchFixture(1).fetchImpl : fixtureFetch,
    transactionFs: {
      ...fs,
      async rename(from, to) {
        await fs.rename(from, to);
        // Target the catalog path, not an image count: the local-photo tests
        // can reuse the worker even when the approved gallery changes size.
        if (isPrice && crashAt === 1 && /\/next-\d+$/.test(from) && to === firstPriceMirror) {
          process.kill(process.pid, "SIGKILL");
        }
        if (isPrice && crashAt === 2 && /\/next-\d+$/.test(from) && to === secondPriceMirror) {
          process.kill(process.pid, "SIGKILL");
        }
        if (isPrice && crashAt === 9 && from.endsWith("/committed.tmp")) {
          process.kill(process.pid, "SIGKILL");
        }
        if (isPrice) return;
        if (/\/next-\d+$/.test(from) && ++installed === crashAt) {
          process.kill(process.pid, "SIGKILL");
        }
        if (crashAt === 0 && from.endsWith("/journal.tmp")) process.kill(process.pid, "SIGKILL");
        if (crashAt === 9 && from.endsWith("/committed.tmp")) process.kill(process.pid, "SIGKILL");
        if (crashAt === 10 && to.includes("/pending-discard-")) process.kill(process.pid, "SIGKILL");
      },
      async open(filename, flags) {
        const handle = await fs.open(filename, flags);
        if (crashAt !== -1 || !filename.endsWith("/next-1")) return handle;
        return {
          async writeFile(bytes) {
            await handle.writeFile(Buffer.from(bytes).subarray(0, 5));
            process.kill(process.pid, "SIGKILL");
          },
          close: () => handle.close(),
        };
      },
    },
  });
} else if (["--reclaim-crash-capture", "--reclaim-crash-recover"].includes(process.argv[2])) {
  const root = process.argv[3];
  const boundary = process.argv[4];
  const directory = path.join(root, "generated-artifacts/catalog-capture/lock");
  const owner = path.join(directory, String(process.pid));
  const stop = phase => {
    if (boundary === phase) process.kill(process.pid, "SIGKILL");
  };
  const transactionFs = {
    ...fs,
    async rmdir(filename) {
      if (path.dirname(filename) === directory) stop("before-stale-owner-removal");
      await fs.rmdir(filename);
      if (path.dirname(filename) === directory) stop("stale-owner-removed");
      if (filename === directory) stop("lock-removed");
    },
    async mkdir(filename, options) {
      await fs.mkdir(filename, options);
      if (filename === directory) stop("lock-recreated");
      if (filename === owner) stop("owner-recorded");
    },
  };
  const forbiddenFetch = async () => {
    throw new Error("fixture: network reached before reclamation crash");
  };
  globalThis.fetch = forbiddenFetch;
  if (process.argv[2] === "--reclaim-crash-recover") {
    await recoverCapture({ root, transactionFs });
  } else {
    await captureCatalog({ root, kind: "proteins", transactionFs, fetchImpl: forbiddenFetch });
  }
  throw new Error(`fixture: reclamation boundary not reached: ${boundary}`);
} else if (process.argv[2] === "--auto-recover-price-missing-crash") {
  const root = process.argv[3];
  const missingIndex = Number(process.argv[4]);
  const missingPath = path.join(root, priceTargets[missingIndex].data, priceFile);
  await captureCatalog({
    root, kind: "electrolytes",
    async fetchImpl() {
      throw new Error("fixture: fetch reached before removal crash");
    },
    transactionFs: {
      ...fs,
      async rm(filename, options) {
        await fs.rm(filename, options);
        // Terminate inside existed:false rollback, after deleting the new
        // catalog but before recovery can retire the still-pending journal.
        if (filename === missingPath) process.kill(process.pid, "SIGKILL");
      },
    },
  });
} else if (process.argv[2] === "--auto-recover-price-crash") {
  const root = process.argv[3];
  const firstPriceMirror = path.join(root, priceTargets[0].data, priceFile);
  await captureCatalog({
    root, kind: "proteins",
    async fetchImpl() {
      throw new Error("fixture: fetch reached before recovery crash");
    },
    transactionFs: {
      ...fs,
      async rename(from, to) {
        // Stop with a fully copied restore file, but before installing the
        // prior catalog. The next capture must reuse the immutable backups.
        if (/\/restore-\d+$/.test(from) && to === firstPriceMirror) {
          process.kill(process.pid, "SIGKILL");
        }
        await fs.rename(from, to);
      },
    },
  });
} else if (["--recover-crash", "--recover-crash-price"].includes(process.argv[2])) {
  const isPrice = process.argv[2] === "--recover-crash-price";
  const firstPriceMirror = path.join(process.argv[3], priceTargets[0].data, priceFile);
  globalThis.fetch = async () => { throw new Error("fixture: network forbidden during recovery"); };
  let restored = 0;
  await recoverCapture({
    root: process.argv[3],
    transactionFs: {
      ...fs,
      async rename(from, to) {
        await fs.rename(from, to);
        if (isPrice) {
          if (/\/restore-\d+$/.test(from) && to === firstPriceMirror) process.kill(process.pid, "SIGKILL");
          return;
        }
        if (/\/restore-\d+$/.test(from) && ++restored === 2) process.kill(process.pid, "SIGKILL");
      },
    },
  });
}
