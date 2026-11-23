// Shared by the price tests and real SIGKILL worker. Network responses always
// come from these fixtures; approved local artwork is copied only into temp roots.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repository = new URL("../../", import.meta.url);
export const priceTargets = [
  {
    data: "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared",
    assets: "artifacts/mockup-sandbox/public",
  },
  {
    data: "artifacts/stellar-review/src/pages/stellar/_shared",
    assets: "artifacts/stellar-review/source-assets",
  },
];
export const priceFile = "protein-products.json";
export const priceCatalog = JSON.parse(await fs.readFile(new URL(`${priceTargets[0].data}/${priceFile}`, repository)));
export const remotePrices = JSON.parse(await fs.readFile(new URL("./merchant-remote-prices.json", import.meta.url)));

export function priceFetchFixture(initialGeneration = 0) {
  let generation = initialGeneration;
  const requests = [];
  const fetchImpl = async url => {
    requests.push(url);
    if (url.endsWith(".js")) {
      const product = priceCatalog.find(product => `${product.source}.js` === url);
      assert.ok(product, `Never fetch local-only/Classic products: ${url}`);
      return { ok: true, json: async () => ({
        ...product,
        price: remotePrices[product.component] - generation * 100,
        variants: [{ id: product.variantId }],
        images: product.images.map(image => image.original),
        description: product.originalDescription,
      }) };
    }
    const image = priceCatalog.flatMap(product => product.images).find(image => image.original === url);
    assert.ok(image, `Unexpected image: ${url}`);
    const bytes = await fs.readFile(new URL(`${priceTargets[0].assets}/${image.src.replace("/__mockup/", "")}`, repository));
    return { ok: true, arrayBuffer: async () => bytes };
  };
  return { fetchImpl, requests, nextGeneration: () => generation++ };
}

export async function setupPriceCapture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stellar-prices-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const baseline = structuredClone(priceCatalog);
  for (const target of priceTargets) {
    await fs.mkdir(path.join(root, target.data), { recursive: true });
    await fs.writeFile(path.join(root, target.data, priceFile), JSON.stringify(baseline));
    for (const product of baseline) {
      for (const image of product.images) {
        const relative = image.src.replace("/__mockup/", "");
        const destination = path.join(root, target.assets, relative);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(new URL(`${priceTargets[0].assets}/${relative}`, repository), destination);
      }
    }
  }
  return { root, baseline, ...priceFetchFixture() };
}
