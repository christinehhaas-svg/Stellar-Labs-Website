import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareBrandStory } from "../../../scripts/prepare-brand-story.mjs";

await prepareBrandStory();
await import("./export-homepage-handoff.mjs");

// Produce deployable copies from the approved, vendored storefront capture.
// Only the approved brand-story blocks are generated in the saved captures.
// Never enable captured Shopify scripts or rewrite original package artwork.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "source-assets");
const output = path.join(root, "public/review-assets");
const base = process.env.BASE_PATH;
if (!base) throw new Error("BASE_PATH is required to prepare review assets.");
const prefix = `${base.replace(/\/?$/, "/")}review-assets/`;
await fs.mkdir(output, { recursive: true });
await fs.cp(source, output, { recursive: true });
async function relocate(directory) {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) await relocate(filename);
    else if (/\.(html|css|svg)$/i.test(item.name)) {
      const original = await fs.readFile(filename, "utf8");
      let relocated = original.replaceAll("/__mockup/", prefix);
      if (item.name.endsWith(".html")) {
        relocated = relocated.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/gi, "");
        relocated = relocated.replace(/<head\b[^>]*>/i, '$&<meta name="robots" content="noindex, nofollow">');
      }
      if (relocated !== original) await fs.writeFile(filename, relocated);
    }
  }
}
await relocate(output);
console.info("Approved storefront and label assets prepared for this review website.");
