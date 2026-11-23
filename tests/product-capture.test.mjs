import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { captureCatalog } from "../scripts/capture-stellar-proteins.mjs";
import { imageCorrections } from "../scripts/stellar-image-corrections.mjs";
import { proteinPanels, panelIdentity } from "../scripts/stellar-protein-panels.mjs";
import { localProteinArtwork } from "../scripts/stellar-local-protein-artwork.mjs";

const repository = new URL("../", import.meta.url);
const targets = [
  {
    data: "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared",
    assets: "artifacts/mockup-sandbox/public",
  },
  {
    data: "artifacts/stellar-review/src/pages/stellar/_shared",
    assets: "artifacts/stellar-review/source-assets",
  },
];
const fixture = JSON.parse(await fs.readFile(new URL("./fixtures/cappuccino-incorrect-gallery.json", import.meta.url)));
const galleryChanges = JSON.parse(await fs.readFile(new URL("./fixtures/protein-panel-gallery-changes.json", import.meta.url)));
const rule = imageCorrections[0];
const approvedPath = `images/stellar-proteins/${rule.filename}`;
const catalog = JSON.parse(await fs.readFile(new URL(`${targets[0].data}/protein-products.json`, repository)));
const liveCatalog = catalog.filter(product => product.source);
const localCatalog = catalog.filter(product => !product.source);
const cappuccino = catalog.find(product => product.component === rule.component);

async function setup(t, kind = "proteins") {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stellar-capture-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = kind === "proteins" ? "protein-products.json" : "electrolyte-products.json";
  const baseline = JSON.parse(await fs.readFile(new URL(`${targets[0].data}/${file}`, repository)));
  for (const target of targets) {
    await fs.mkdir(path.join(root, target.data), { recursive: true });
    await fs.writeFile(path.join(root, target.data, file), JSON.stringify(baseline));
    await fs.mkdir(path.dirname(path.join(root, target.assets, approvedPath)), { recursive: true });
    await fs.copyFile(new URL(`${target.assets}/${approvedPath}`, repository), path.join(root, target.assets, approvedPath));
    for (const product of baseline) {
      for (const image of product.images) {
        const relative = image.src.replace("/__mockup/", "");
        const destination = path.join(root, target.assets, relative);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(new URL(`${target.assets}/${relative}`, repository), destination);
      }
    }
  }
  const requests = [];
  const fetchImpl = async url => {
    requests.push(url);
    if (url.endsWith(".js")) {
      const product = baseline.find(product => `${product.source}.js` === url);
      assert.ok(product, `Unexpected product request: ${url}`);
      const live = {
        ...product,
        variants: [{ id: product.variantId }],
        images: product.images.map(image => image.original),
        description: product.originalDescription,
      };
      // Reproduce only the historical gallery error, not its superseded price.
      // Merchant-price preservation is independent of approved artwork capture.
      if (product.component === rule.component) live.images = structuredClone(fixture.images);
      return { ok: true, json: async () => live };
    }
    assert.notEqual(url, rule.original, "Approved bytes must not be replaced from the CDN");
    const product = baseline.find(product => product.images.some(image => image.original === url));
    const image = product?.images.find(image => image.original === url);
    assert.ok(image, `Unexpected image request: ${url}`);
    const bytes = await fs.readFile(new URL(`${targets[0].assets}/${image.src.replace("/__mockup/", "")}`, repository));
    return { ok: true, arrayBuffer: async () => bytes };
  };
  return { root, fetchImpl, requests, baseline, file };
}

// Include every local file and its path so failures cannot silently add or replace
// any panel, front, or catalog in either preview.
async function snapshot(root) {
  const files = (await fs.readdir(root, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => path.relative(root, path.join(entry.parentPath ?? entry.path, entry.name)))
    .sort();
  return Promise.all(files.map(async relative => [
    relative, createHash("sha256").update(await fs.readFile(path.join(root, relative))).digest("hex"),
  ]));
}

test("panel identity normalizes protocol-relative CDN links and cache queries, but not host or artwork path", () => {
  const original = proteinPanels.ProteinCappuccino.panels[0].original;
  assert.equal(panelIdentity(`${original.replace("https:", "")}?v=new-version`), original);
  assert.notEqual(panelIdentity(original.replace("cdn.shopify.com", "example.com")), original);
  assert.notEqual(panelIdentity(original.replace("-Left", "-Right")), original);
});

test("panel manifest matches both checked-in catalogs and their existing local artwork", async () => {
  assert.deepEqual(Object.keys(proteinPanels), liveCatalog.map(product => product.component));
  for (const target of targets) {
    const stored = JSON.parse(await fs.readFile(new URL(`${target.data}/protein-products.json`, repository)));
    assert.deepEqual(stored, catalog);
    for (const product of stored.filter(product => product.source)) {
      const approved = proteinPanels[product.component];
      assert.equal(product.title, approved.title);
      assert.equal(product.images.length, approved.panels.length + 1);
      for (const [offset, panel] of approved.panels.entries()) {
        const image = product.images[offset + 1];
        assert.equal(panelIdentity(image.original), panel.original);
        const bytes = await fs.readFile(new URL(`${target.assets}/${image.src.replace("/__mockup/", "")}`, repository));
        assert.equal(createHash("sha256").update(bytes).digest("hex"), panel.sha256);
      }
    }
  }
});

for (const change of galleryChanges) {
  test(`${change.name} is flagged without changing either preview's catalog or local assets`, async t => {
    const { root, fetchImpl, baseline } = await setup(t);
    const before = await snapshot(root);
    const changedFetch = async url => {
      const response = await fetchImpl(url);
      if (url === `${baseline.find(product => product.component === change.component).source}.js`) {
        const live = await response.json();
        if (change.order) live.images = change.order.map(index => live.images[index]);
        else live.images[change.slot] = baseline.find(product => product.component === change.donor).images[change.slot].original;
        return { ok: true, json: async () => live };
      }
      return response;
    };
    await assert.rejects(captureCatalog({ root, fetchImpl: changedFetch }), error => {
      assert.match(error.message, /panel identity mismatch/);
      assert.ok(error.message.includes(baseline.find(product => product.component === change.component).handle));
      assert.match(error.message, /nutrition\/ingredient/);
      return true;
    });
    assert.deepEqual(await snapshot(root), before);
  });
}

for (const product of liveCatalog) {
  for (const slot of [1, 2]) {
    test(`${product.component} slot ${slot}: different artwork at the same URL is rejected without writes`, async t => {
      const { root, fetchImpl } = await setup(t);
      const before = await snapshot(root);
      const changedFetch = async url => {
        const response = await fetchImpl(url);
        if (url === product.images[slot].original) {
          const donor = liveCatalog.find(candidate => candidate.component !== product.component);
          const relative = donor.images[slot].src.replace("/__mockup/", "");
          const bytes = await fs.readFile(new URL(`${targets[0].assets}/${relative}`, repository));
          return { ok: true, arrayBuffer: async () => bytes };
        }
        return response;
      };
      await assert.rejects(captureCatalog({ root, fetchImpl: changedFetch }),
        new RegExp(`panel integrity mismatch for ${product.handle} at slot ${slot}`));
      assert.deepEqual(await snapshot(root), before);
    });
  }
}

test("incorrect live gallery cannot replace approved front in either mirror, even on repeated capture", async t => {
  const { root, fetchImpl, requests, baseline, file } = await setup(t);
  // Exercise repair of a missing review copy from the checked-in Canvas original.
  await fs.rm(path.join(root, targets[1].assets, approvedPath));
  for (let run = 0; run < 2; run++) {
    const captured = await captureCatalog({ root, fetchImpl });
    // The same Chocolate URL can legitimately be fetched for the Chocolate product,
    // but Cappuccino must not add another request for it.
    const wrongFront = `https:${fixture.images[0]}`;
    const legitimateRequests = baseline.flatMap(product => product.images)
      .filter(image => image.original === wrongFront).length;
    assert.equal(requests.filter(url => url === wrongFront).length, legitimateRequests * (run + 1));
    for (const target of targets) {
      const stored = JSON.parse(await fs.readFile(path.join(root, target.data, file)));
      assert.deepEqual(stored, captured);
      for (const [index, product] of stored.entries()) {
        const { capturedAt, sourcePrice, priceAuthority, ...content } = product;
        const { capturedAt: oldTimestamp, ...previous } = baseline[index];
        if (product.source) assert.ok(!Number.isNaN(Date.parse(capturedAt)));
        else assert.equal(capturedAt, "");
        // All metadata, descriptions, price, variant, side panels and facts remain intact.
        if (product.source) {
          assert.equal(priceAuthority, "merchant-approved-website");
          assert.equal(sourcePrice, baseline[index].price);
        }
        assert.deepEqual(content, previous);
        for (const image of product.images) {
          const relative = image.src.replace("/__mockup/", "");
          assert.deepEqual(
            await fs.readFile(path.join(root, target.assets, relative)),
            await fs.readFile(new URL(`${targets[0].assets}/${relative}`, repository)),
          );
        }
      }
      const current = stored.find(product => product.component === rule.component);
      assert.deepEqual(current.images, cappuccino.images);
      assert.ok(!JSON.stringify(current.images).includes("Chocolate"));
    }
  }
});

test("repeated recapture preserves both local 1 lb isolates without Shopify requests or borrowed 2 lb artwork", async t => {
  const { root, fetchImpl, requests, baseline, file } = await setup(t);
  assert.equal(localCatalog.length, 2);
  for (let run = 0; run < 2; run++) {
    const captured = await captureCatalog({ root, fetchImpl });
    assert.deepEqual(captured.filter(product => !product.source), localCatalog);
    assert.equal(captured.length, baseline.length);
    for (const local of localCatalog) {
      assert.ok(!requests.some(url => url.includes(local.handle)));
      assert.deepEqual(local.images, localProteinArtwork[local.component].images);
      assert.equal(local.variantId, null);
      assert.equal(local.available, false);
      assert.equal(local.price, 5295);
      const larger = captured.find(product => product.flavor === local.flavor &&
        product.formula === "isolate" && product.size === "2lb");
      assert.ok(larger?.source);
      assert.ok(larger.images.length > 0);
      assert.notEqual(larger.handle, local.handle);
      assert.notEqual(larger.component, local.component);
      for (const target of targets) {
        for (const image of local.images) {
          const bytes = await fs.readFile(path.join(root, target.assets, image.src.replace("/__mockup/", "")));
          assert.equal(createHash("sha256").update(bytes).digest("hex"), localProteinArtwork[local.component].sha256);
        }
      }
    }
    for (const target of targets) {
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, target.data, file))), captured);
    }
  }
});

test("local-only prices follow explicit merchant approval independently of artwork validation", async t => {
  const { root, fetchImpl, baseline, file } = await setup(t);
  const changed = structuredClone(baseline);
  for (const product of changed.filter(product => !product.source)) product.price = 5495;
  for (const target of targets) {
    await fs.writeFile(path.join(root, target.data, file), JSON.stringify(changed));
  }
  const captured = await captureCatalog({ root, fetchImpl });
  assert.deepEqual(captured.filter(product => !product.source), baseline.filter(product => !product.source));
  for (const target of targets) {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, target.data, file))), captured);
  }
});

for (const failure of [
  "missing local", "duplicate local", "different mirrors", "borrowed artwork", "fake source", "wrong size",
  "wrong handle", "wrong flavor", "wrong formula", "wrong title", "fake capture", "fake variant",
  "purchasable local", "invalid price", "empty artwork", "swapped flavor", "extra artwork", "fake original",
]) {
  test(`${failure}: local preview validation stops capture before requests or writes`, async t => {
    const { root, fetchImpl, requests, baseline, file } = await setup(t);
    for (const [index, target] of targets.entries()) {
      const changed = structuredClone(baseline);
      if (failure === "missing local") changed.shift();
      if (failure === "duplicate local") changed.push(structuredClone(changed[0]));
      if (failure === "different mirrors" && index === 1) changed[0].price++;
      if (failure === "borrowed artwork") changed[0].images = liveCatalog.find(product => product.size === "2lb").images;
      if (failure === "fake source") changed[0].source = `https://www.stellarlabsnutrition.com/products/${changed[0].handle}`;
      if (failure === "wrong size") changed[0].size = "2lb";
      if (failure === "wrong handle") changed[0].handle = liveCatalog[0].handle;
      if (failure === "wrong flavor") changed[0].flavor = "Vanilla";
      if (failure === "wrong formula") changed[0].formula = "blend";
      if (failure === "wrong title") changed[0].title = changed[0].title.replace("1lb", "2lb");
      if (failure === "fake capture") changed[0].capturedAt = new Date().toISOString();
      if (failure === "fake variant") changed[0].variantId = 123;
      if (failure === "purchasable local") changed[0].available = true;
      if (failure === "invalid price") changed[0].price = 0;
      if (failure === "empty artwork") changed[0].images = [];
      if (failure === "swapped flavor") changed[0].images = changed[1].images;
      if (failure === "extra artwork") changed[0].images.push(liveCatalog[0].images[0]);
      if (failure === "fake original") changed[0].images[0].original = liveCatalog[0].images[0].original;
      await fs.writeFile(path.join(root, target.data, file), JSON.stringify(changed));
    }
    const before = await snapshot(root);
    await assert.rejects(captureCatalog({ root, fetchImpl }), /Local protein preview.*mismatch/);
    assert.deepEqual(requests, []);
    assert.deepEqual(await snapshot(root), before);
  });
}

for (const local of localCatalog) {
  for (const target of targets) {
    for (const failure of ["missing", "corrupt", "other flavor", "2 lb artwork"]) {
      test(`${local.component} in ${target.assets}: ${failure} artwork stops capture atomically before requests`, async t => {
        const { root, fetchImpl, requests } = await setup(t);
        const filename = path.join(root, target.assets, local.images[0].src.replace("/__mockup/", ""));
        if (failure === "missing") await fs.rm(filename);
        if (failure === "corrupt") await fs.writeFile(filename, "not approved artwork");
        if (failure === "other flavor" || failure === "2 lb artwork") {
          const donor = failure === "other flavor"
            ? localCatalog.find(product => product.component !== local.component)
            : liveCatalog.find(product => product.flavor === local.flavor && product.size === "2lb");
          await fs.copyFile(path.join(root, target.assets, donor.images[0].src.replace("/__mockup/", "")), filename);
        }
        const before = await snapshot(root);
        await assert.rejects(captureCatalog({ root, fetchImpl }), /Local protein preview asset.*mismatch/);
        assert.deepEqual(requests, []);
        assert.deepEqual(await snapshot(root), before);
      });
    }
  }
}

for (const failure of ["missing approved file", "corrupt approved file", "different package", "image download failure"]) {
  test(`${failure} fails explicitly without overwriting either catalog or approved asset`, async t => {
    const { root, fetchImpl, file } = await setup(t);
    const approved = path.join(root, targets[0].assets, approvedPath);
    if (failure === "missing approved file") await fs.rm(approved);
    if (failure === "corrupt approved file") await fs.writeFile(approved, "not approved");
    const snapshots = await Promise.all(targets.map(async target => ({
      catalog: await fs.readFile(path.join(root, target.data, file)),
      image: await fs.readFile(path.join(root, target.assets, approvedPath)).catch(() => null),
    })));
    const failingFetch = async url => {
      const response = await fetchImpl(url);
      if (failure === "different package" && url === `${cappuccino.source}.js`) {
        const live = await response.json();
        return { ok: true, json: async () => ({ ...live, title: live.title.replace("1lb", "2lb") }) };
      }
      if (failure === "image download failure" && !url.endsWith(".js")) return { ok: false, status: 503 };
      return response;
    };
    await assert.rejects(captureCatalog({ root, fetchImpl: failingFetch }),
      failure === "missing approved file" ? /ENOENT/ :
        failure === "corrupt approved file" ? /integrity mismatch/ :
          failure === "different package" ? /identity mismatch/ : /Cannot capture label image/);
    for (const [index, target] of targets.entries()) {
      assert.deepEqual(await fs.readFile(path.join(root, target.data, file)), snapshots[index].catalog);
      assert.deepEqual(await fs.readFile(path.join(root, target.assets, approvedPath)).catch(() => null), snapshots[index].image);
    }
  });
}

test("electrolyte capture still uses its own live galleries and writes both mirrors", async t => {
  const { root, fetchImpl, baseline, file } = await setup(t, "electrolytes");
  const captured = await captureCatalog({ root, fetchImpl, kind: "electrolytes" });
  assert.deepEqual(captured.map(product => product.images), baseline.map(product => product.images));
  for (const target of targets) {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, target.data, file))), captured);
    for (const product of captured) {
      for (const image of product.images) {
        const relative = image.src.replace("/__mockup/", "");
        assert.deepEqual(await fs.readFile(path.join(root, target.assets, relative)),
          await fs.readFile(new URL(`${targets[0].assets}/${relative}`, repository)));
      }
    }
  }
});
