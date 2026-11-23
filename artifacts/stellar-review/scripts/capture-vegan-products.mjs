import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "source-assets/images/stellar-vegan");
await fs.mkdir(destination, { recursive: true });
const products = await Promise.all(["chocolate", "vanilla"].map(async (flavor) => {
  const handle = `${flavor}-vegan-shake`;
  const source = `https://www.stellarlabsnutrition.com/products/${handle}`;
  const response = await fetch(`${source}.json`);
  if (!response.ok) throw new Error(`Unable to capture ${handle}: ${response.status}`);
  const { product } = await response.json();
  if (!product?.images?.length || !product.variants?.length) throw new Error(`Incomplete source for ${handle}`);
  const images = await Promise.all(product.images.map(async (image, index) => {
    const filename = `${handle}-${index}.png`;
    const media = await fetch(image.src);
    if (!media.ok) throw new Error(`Unable to capture original artwork: ${media.status}`);
    await fs.writeFile(path.join(destination, filename), Buffer.from(await media.arrayBuffer()));
    return { src: `/__mockup/images/stellar-vegan/${filename}`, original: image.src };
  }));
  return {
    component: flavor === "chocolate" ? "VeganChocolate" : "VeganVanilla",
    handle, formula: "vegan", flavor: flavor === "chocolate" ? "Chocolate" : "Vanilla",
    size: "2lb", title: product.title,
    price: Math.round(Number(product.variants[0].price) * 100),
    source, capturedAt: new Date().toISOString(), images,
  };
}));
await fs.writeFile(path.join(root, "src/pages/stellar/_shared/vegan-products.json"), `${JSON.stringify(products, null, 2)}\n`);
console.log(products.map(({ title, images }) => `${title}: ${images.length} original panels`).join("\n"));
