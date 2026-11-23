/** Merchant-confirmed container presentation; original captured photos remain intact. */
export function isIllustrativePackage(product: { component?: string }) {
  return product.component === "ProteinChocolateIsolate1lb" || product.component === "ProteinVanillaIsolate1lb";
}

/** Isolates first: large containers, small containers, then blends. */
export function wheyDisplayOrder(product: { formula: string; size: string }) {
  return product.formula === "isolate" ? (product.size === "2lb" ? 0 : 1) : 2;
}

export function packageFrontStyle(product: { component?: string; formula: string; size: string }) {
  if (product.formula === "isolate" && product.size === "1lb" && isIllustrativePackage(product)) {
    // Match Berry's visible bottle height, accounting for the mockups' tighter canvas.
    return { transform: "translateY(1%) scale(0.785)", transformOrigin: "50% 95%" };
  }
  if (product.component !== "ProteinCappuccino" || product.formula !== "isolate" || product.size !== "1lb") return undefined;
  // Match the visible bottle bounds of Mixed Berry, not just the square image canvas.
  // The verified Cappuccino photo has less surrounding whitespace.
  return { transform: "scale(0.81)", transformOrigin: "50% 95%" };
}

export function packageImages<T extends { src: string }>(product: {
  component?: string;
  formula: string;
  size: string;
  images: T[];
}): T[] {
  if (product.formula !== "isolate" || product.size !== "2lb") return product.images;
  return product.images.map(image => ({
    ...image, src: image.src.replace(/\.png$/, "-black-bottle.png").replace(
      /100-isolate-whey-protein-shake-(vanilla|chocolate)-0-black-bottle\.png$/,
      "100-isolate-whey-protein-shake-$1-0-black-bottle-clean-rim.png",
    ),
  }));
}
