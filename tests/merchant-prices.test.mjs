import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { captureCatalog } from "../scripts/capture-stellar-proteins.mjs";
import { merchantWebsitePrice, capturedPrice } from "../scripts/stellar-merchant-prices.mjs";
import {
  priceTargets as targets, priceFile as file, priceCatalog as catalog,
  remotePrices, setupPriceCapture as setup,
} from "./fixtures/merchant-price-capture.mjs";

const repository = new URL("../", import.meta.url);

async function snapshot(root) {
  const files = (await fs.readdir(root, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => path.relative(root, path.join(entry.parentPath ?? entry.path, entry.name))).sort();
  return Promise.all(files.map(async relative => [
    relative, createHash("sha256").update(await fs.readFile(path.join(root, relative))).digest("hex"),
  ]));
}

test("merchant prices match both catalogs and only approved identities, never Classic or other formulas/packages", async () => {
  const approved = catalog.find(product => product.component === "ProteinCappuccino");
  for (const target of targets) {
    const stored = JSON.parse(await fs.readFile(new URL(`${target.data}/${file}`, repository)));
    for (const product of stored) assert.equal(merchantWebsitePrice(product), product.price);
  }
  for (const key of ["handle", "formula", "size"]) {
    assert.throws(() => merchantWebsitePrice({ ...approved, [key]: "unapproved" }), /price identity mismatch/);
  }
  for (const component of ["ClassicChocolate", "ClassicVanilla", "ClassicCookiesCream", "ElectrolyteLemonLime"]) {
    const identity = { ...approved, component };
    assert.equal(merchantWebsitePrice(identity), undefined);
    assert.deepEqual(capturedPrice(identity, 1234), { price: 1234 });
    assert.deepEqual(capturedPrice(identity, null), { price: null }, "Do not invent a missing Classic price");
  }
  for (const invalid of [null, undefined, "4995", -1, 49.95]) {
    assert.throws(() => capturedPrice(approved, invalid), /Invalid captured source price/);
  }
});

test("stale remote prices cannot replace approved website prices in either mirror on repeated captures", async t => {
  const { root, baseline, fetchImpl, requests, nextGeneration } = await setup(t);
  assert.deepEqual(Object.keys(remotePrices).sort(), baseline.filter(product => product.source).map(product => product.component).sort());
  for (let run = 0; run < 2; run++) {
    const captured = await captureCatalog({ root, fetchImpl });
    assert.equal(captured.length, baseline.length);
    for (const target of targets) {
      const stored = JSON.parse(await fs.readFile(path.join(root, target.data, file)));
      assert.deepEqual(stored, captured);
      for (const product of stored) {
        const previous = baseline.find(entry => entry.component === product.component);
        assert.equal(product.price, previous.price);
        if (!product.source) {
          assert.deepEqual(product, previous, "No fabricated Shopify provenance on local listings");
          assert.ok(!requests.some(url => url.includes(product.handle)));
          continue;
        }
        const { capturedAt, sourcePrice, priceAuthority, ...unchanged } = product;
        const { capturedAt: oldTimestamp, ...expected } = previous;
        assert.notEqual(sourcePrice, product.price);
        assert.equal(sourcePrice, remotePrices[product.component] - run * 100);
        assert.equal(priceAuthority, "merchant-approved-website");
        assert.ok(!Number.isNaN(Date.parse(capturedAt)));
        assert.deepEqual(unchanged, expected, "Keep source, variant, availability, descriptions and image provenance");
        for (const image of product.images) {
          const relative = image.src.replace("/__mockup/", "");
          assert.ok((await fs.readFile(path.join(root, target.assets, relative))).equals(
            await fs.readFile(new URL(`${targets[0].assets}/${relative}`, repository))), relative);
        }
      }
    }
    nextGeneration();
  }
});

test("local website prices are repaired from merchant authority without adding remote provenance", async t => {
  const { root, fetchImpl, baseline } = await setup(t);
  for (const target of targets) {
    const stale = baseline.map(product => product.source ? product : { ...product, price: 4995 });
    await fs.writeFile(path.join(root, target.data, file), JSON.stringify(stale));
  }
  const captured = await captureCatalog({ root, fetchImpl });
  assert.deepEqual(captured.filter(product => !product.source), baseline.filter(product => !product.source));
  for (const target of targets) {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, target.data, file))), captured);
  }
});

for (const [label, invalid] of [
  ["null", null],
  ["missing", undefined],
  ["string", "4995"],
  ["negative", -1],
  ["fractional", 49.95],
]) {
  test(`a ${label} Shopify price leaves saved catalogs, provenance and assets intact, then a corrected retry succeeds`, async t => {
    const { root, fetchImpl, nextGeneration } = await setup(t);
    // Save a real capture first, including sourcePrice, so rejection must
    // preserve existing provenance as well as merchant-approved website prices.
    const saved = await captureCatalog({ root, fetchImpl });
    const before = await snapshot(root);
    nextGeneration();
    const component = "ProteinChocolateBlend";
    const source = saved.find(product => product.component === component).source;
    let injected = false;
    const invalidFetch = async url => {
      const response = await fetchImpl(url);
      if (url !== `${source}.js`) return response;
      const product = await response.json();
      if (label === "missing") delete product.price;
      else product.price = invalid;
      injected = true;
      return { ...response, json: async () => product };
    };
    await assert.rejects(
      captureCatalog({ root, fetchImpl: invalidFetch }),
      { message: `Invalid captured source price for ${component}` },
    );
    assert.ok(injected, "Reject the malformed Shopify payload, not an unrelated fixture error");
    assert.deepEqual(await snapshot(root), before, "Both catalogs and every asset remain byte-identical");
    const journal = path.join(root, "generated-artifacts/catalog-capture");
    assert.deepEqual(await fs.readdir(journal), [], "No pending journal, backups or capture lock remain");

    // Retry on the same root without recovery or cleanup; only the remote
    // price is corrected. New source prices must not become website prices.
    const captured = await captureCatalog({ root, fetchImpl });
    for (const target of targets) {
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, target.data, file))), captured);
    }
    for (const product of captured) {
      const previous = saved.find(entry => entry.component === product.component);
      assert.equal(product.price, previous.price);
      assert.equal(product.price, merchantWebsitePrice(product));
      if (!product.source) {
        assert.deepEqual(product, previous, "Local-only listings gain no Shopify provenance");
        continue;
      }
      const { capturedAt, sourcePrice, ...unchanged } = product;
      const { capturedAt: oldTimestamp, sourcePrice: oldSourcePrice, ...expected } = previous;
      assert.equal(sourcePrice, remotePrices[product.component] - 100);
      assert.notEqual(sourcePrice, oldSourcePrice, "The corrected retry refreshes source provenance");
      assert.notEqual(sourcePrice, product.price);
      assert.equal(product.priceAuthority, "merchant-approved-website");
      assert.ok(!Number.isNaN(Date.parse(capturedAt)));
      assert.deepEqual(unchanged, expected, "Keep product identity, artwork and all other provenance");
    }
    const assetsOnly = entries => entries.filter(([relative]) => !targets.some(
      target => relative === path.join(target.data, file),
    ));
    assert.deepEqual(assetsOnly(await snapshot(root)), assetsOnly(before), "Retry keeps every asset byte-identical");
    assert.deepEqual(await fs.readdir(journal), [], "Successful retry also leaves the capture journal clean");
  });
}

test("a failed price refresh rolls back both catalogs and assets, then a retry preserves merchant prices", async t => {
  const { root, fetchImpl } = await setup(t);
  const before = await snapshot(root);
  let failed = false;
  await assert.rejects(captureCatalog({
    root, fetchImpl,
    transactionFs: {
      ...fs,
      async rename(from, to) {
        await fs.rename(from, to);
        if (!failed && /\/next-\d+$/.test(from) &&
            to === path.join(root, targets[1].data, file)) {
          failed = true;
          throw Object.assign(new Error("fixture: price refresh disk full"), { code: "ENOSPC" });
        }
      },
    },
  }), /price refresh disk full/);
  assert.ok(failed);
  assert.deepEqual(await snapshot(root), before);
  const captured = await captureCatalog({ root, fetchImpl });
  for (const target of targets) {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, target.data, file))), captured);
  }
  for (const product of captured) assert.equal(product.price, merchantWebsitePrice(product));
});
