import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { imageCorrections } from "./stellar-image-corrections.mjs";
import { proteinPanels, panelIdentity } from "./stellar-protein-panels.mjs";
import { localProteinArtwork } from "./stellar-local-protein-artwork.mjs";
import { withCaptureTransaction, recoverCapture } from "./capture-transaction.mjs";
import { merchantWebsitePrice, capturedPrice } from "./stellar-merchant-prices.mjs";

export { recoverCapture };

const proteinProducts = [
  ["ProteinMixedBerry", "100-isolate-whey-protein-shake-mixed-berry", "isolate", "Mixed Berry", "1lb"],
  ["ProteinUnflavored", "whey-protein-shake-unflavored", "isolate", "Unflavored", "1lb"],
  ["ProteinVanillaIsolate", "100-isolate-whey-protein-shake-vanilla", "isolate", "Vanilla", "2lb"],
  ["ProteinChocolateIsolate", "100-isolate-whey-protein-shake-chocolate", "isolate", "Chocolate", "2lb"],
  ["ProteinCappuccino", "100-isolate-whey-protein-shake-cappuccino", "isolate", "Cappuccino", "1lb"],
  ["ProteinCaramelBlend", "whey-protein-salted-caramel-shake", "blend", "Caramel", "2lb"],
  ["ProteinVanillaBlend", "vanilla-whey-protein-shake", "blend", "Vanilla", "2lb"],
  ["ProteinChocolateBlend", "grass-fed-whey-chocolate-protein-shake", "blend", "Chocolate", "2lb"],
];
const electrolyteProducts = [
  ["ElectrolyteLemonLime", "supplements-lemon-lime-electrolyte-powder", "electrolyte", "Lemon Lime", "30 servings"],
  ["ElectrolyteStrawberry", "strawberry-electrolyte-powder", "electrolyte", "Strawberry", "40 servings"],
];
// Merchant-requested preview listings, not Shopify handles to fetch. Matching
// local 1 lb fronts must survive capture; never borrow the separate 2 lb galleries.
const localProteinProducts = [
  ["ProteinChocolateIsolate1lb", "100-isolate-whey-protein-shake-chocolate-1lb", "Chocolate"],
  ["ProteinVanillaIsolate1lb", "100-isolate-whey-protein-shake-vanilla-1lb", "Vanilla"],
];

async function readLocalProteins(root, targets) {
  const catalogs = await Promise.all(targets.map(async target =>
    JSON.parse(await fs.readFile(path.join(root, target.data, "protein-products.json"), "utf8"))));
  return Promise.all(localProteinProducts.map(async ([component, handle, flavor]) => {
    const copies = catalogs.map(catalog => catalog.filter(product => product.component === component));
    if (copies.some(entries => entries.length !== 1) || !isDeepStrictEqual(copies[0], copies[1])) {
      throw new Error(`Local protein preview mismatch for ${component}; restore matching entries in review and Canvas before recapturing`);
    }
    const product = copies[0][0];
    const artwork = localProteinArtwork[component];
    if (product.handle !== handle || product.flavor !== flavor || product.formula !== "isolate" ||
        product.size !== "1lb" || product.title !== `100% Isolate Whey Protein Shake ${flavor} 1lb` ||
        product.source !== "" || product.capturedAt !== "" || product.variantId !== null ||
        product.available !== false || !isDeepStrictEqual(product.images, artwork.images) ||
        !Number.isInteger(product.price) || product.price <= 0) {
      throw new Error(`Local protein preview identity mismatch for ${component}; keep the separate 1 lb listing and its approved local artwork`);
    }
    for (const target of targets) {
      const relative = artwork.images[0].src.replace("/__mockup/", "");
      const filename = path.join(root, target.assets, relative);
      let bytes;
      try {
        bytes = await fs.readFile(filename);
      } catch (error) {
        throw new Error(`Local protein preview asset mismatch for ${component} in ${target.assets}; restore the approved local artwork`, { cause: error });
      }
      if (createHash("sha256").update(bytes).digest("hex") !== artwork.sha256) {
        throw new Error(`Local protein preview asset integrity mismatch for ${component} in ${target.assets}; restore the approved local artwork`);
      }
    }
    return { ...product, price: merchantWebsitePrice(product) ?? product.price };
  }));
}

export async function captureCatalog({
  kind = "proteins",
  root = fileURLToPath(new URL("../", import.meta.url)),
  fetchImpl = fetch,
  transactionFs = fs,
} = {}) {
  if (!["proteins", "electrolytes"].includes(kind)) throw new Error(`Unknown catalog: ${kind}`);
  return withCaptureTransaction(root, commit => prepareCapture({ kind, root, fetchImpl, commit }), transactionFs);
}

async function prepareCapture({ kind, root, fetchImpl, commit }) {
  const isElectrolyte = kind === "electrolytes";
  const products = isElectrolyte ? electrolyteProducts : proteinProducts;
  const assetFolder = isElectrolyte ? "stellar-electrolytes" : "stellar-proteins";
  const dataFile = isElectrolyte ? "electrolyte-products" : "protein-products";
  const targets = [
    {
      assets: "artifacts/mockup-sandbox/public",
      data: "artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared",
    },
    {
      assets: "artifacts/stellar-review/source-assets",
      data: "artifacts/stellar-review/src/pages/stellar/_shared",
    },
  ];
  // Read under the capture lock, after recovery, and fail before network or writes
  // if preserving the local-only listings would hide a mirror/identity problem.
  const localProducts = isElectrolyte ? [] : await readLocalProteins(root, targets);
  // Fetch and validate everything before replacing any checked-in catalog or asset.
  const assets = new Map();
  const captured = await Promise.all(products.map(async ([component, handle, formula, flavor, size]) => {
    const source = `https://www.stellarlabsnutrition.com/products/${handle}`;
    const response = await fetchImpl(`${source}.js`);
    if (!response.ok) throw new Error(`Cannot capture ${handle}: ${response.status}`);
    const product = await response.json();
    const approvedPanels = isElectrolyte ? null : proteinPanels[component];
    if (!isElectrolyte) {
      if (!approvedPanels || product.handle !== handle || product.title !== approvedPanels.title) {
        throw new Error(`Protein label identity mismatch for ${handle}; verify flavor and package before recapturing`);
      }
      if (!Array.isArray(product.images) || product.images.length !== approvedPanels.panels.length + 1) {
        throw new Error(`Protein label panel identity mismatch for ${handle}: unexpected gallery length; verify nutrition/ingredient panels`);
      }
      for (const [offset, panel] of approvedPanels.panels.entries()) {
        const index = offset + 1;
        let actual;
        try { actual = panelIdentity(product.images[index]); } catch { /* Report an actionable identity error below. */ }
        if (actual !== panel.original) {
          throw new Error(`Protein label panel identity mismatch for ${handle} at slot ${index}: expected ${panel.original}, received ${product.images[index]}; verify nutrition/ingredient panels`);
        }
      }
    }
    const corrections = imageCorrections.filter(rule => rule.component === component || rule.handle === handle);
    for (const rule of corrections) {
      const identity = { component, handle, formula, flavor, size, title: product.title };
      if (Object.keys(identity).some(key => rule[key] !== identity[key]) || product.handle !== handle) {
        throw new Error(`Approved image identity mismatch for ${handle}; verify flavor and package before recapturing`);
      }
      if (!product.images[rule.index]) throw new Error(`Missing corrected gallery slot for ${handle}`);
    }
    const images = await Promise.all(product.images.map(async (url, index) => {
      const correction = corrections.find(rule => rule.index === index);
      if (correction) {
        const relative = `images/${assetFolder}/${correction.filename}`;
        // Reuse the exact approved bytes, not mutable CDN content or the live gallery.
        const bytes = await fs.readFile(path.join(root, targets[0].assets, relative));
        if (createHash("sha256").update(bytes).digest("hex") !== correction.sha256) {
          throw new Error(`Approved image integrity mismatch for ${handle}`);
        }
        assets.set(relative, bytes);
        return { src: `/__mockup/${relative}`, original: correction.original };
      }
      const original = url.startsWith("//") ? `https:${url}` : url;
      const extension = new URL(original).pathname.split(".").pop();
      const filename = `${handle}-${index}.${extension}`;
      const image = await fetchImpl(original);
      if (!image.ok) throw new Error(`Cannot capture label image for ${handle}`);
      const bytes = Buffer.from(await image.arrayBuffer());
      const panel = approvedPanels?.panels[index - 1];
      if (panel && createHash("sha256").update(bytes).digest("hex") !== panel.sha256) {
        throw new Error(`Protein label panel integrity mismatch for ${handle} at slot ${index}; verify nutrition/ingredient artwork before recapturing`);
      }
      assets.set(`images/${assetFolder}/${filename}`, bytes);
      return { src: `/__mockup/images/${assetFolder}/${filename}`, original };
    }));
    const pricing = capturedPrice({ component, handle, formula, size }, product.price);
    console.log(`${component}: ${product.title} / $${(pricing.price / 100).toFixed(2)} website / $${(product.price / 100).toFixed(2)} source / ${images.length} captured images`);
    return {
      component, handle, formula, flavor, size, title: product.title,
      ...pricing, available: product.available, variantId: product.variants[0]?.id,
      // Merchant retirement overrides mutable Shopify availability; retain the
      // captured Strawberry artwork only as historical label/reference material.
      ...(component === "ElectrolyteStrawberry" ? { available: false, discontinued: true } : {}),
      source, capturedAt: new Date().toISOString(), images, originalDescription: product.description,
    };
  }));
  const catalog = [...localProducts, ...captured];
  const entries = [];
  for (const target of targets) {
    for (const [relative, bytes] of assets) {
      entries.push([path.join(target.assets, relative), bytes]);
    }
    entries.push([path.join(target.data, `${dataFile}.json`), JSON.stringify(catalog, null, 2) + "\n"]);
  }
  await commit(entries);
  return catalog;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--recover") {
    await recoverCapture({ root: fileURLToPath(new URL("../", import.meta.url)) });
  } else {
    await captureCatalog({ kind: process.argv[2] ?? "proteins" });
  }
}
