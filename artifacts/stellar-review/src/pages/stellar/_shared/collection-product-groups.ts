type CollectionProduct = { component: string; formula: string; flavor: string; size: string };

/** A reload may select only a real package in this card's own flavor/formula. */
export function initialCollectionPackage<T extends CollectionProduct>(initial: T, variants: readonly T[], search: string): T {
  const requested = new URLSearchParams(search).get("package");
  return variants.find(product => product.component === requested) ?? initial;
}

/** Parent-owned URL: native links work even when snapshot event handlers cannot. */
export function collectionPackageHref(location: Pick<Location, "pathname" | "search">, component: string): string {
  const params = new URLSearchParams(location.search);
  params.set("package", component);
  return `${location.pathname}?${params.toString()}`;
}

/** Group packages only within the same formula and flavor. Keep every actual
 * SKU available for selection; never merge a blend with a matching isolate. */
export function groupCollectionProducts<T extends CollectionProduct>(products: readonly T[], groupByFlavor: boolean, preferredSize = "2lb") {
  const groups = new Map<string, T[]>();
  const seen = new Set<string>();
  for (const product of products) {
    if (seen.has(product.component)) throw new Error(`Duplicate product: ${product.component}`);
    seen.add(product.component);
    const key = groupByFlavor ? `${product.formula}:${product.flavor}` : product.component;
    const variants = groups.get(key) ?? [];
    if (variants.some(variant => variant.size === product.size)) throw new Error(`Duplicate package size: ${key} ${product.size}`);
    variants.push(product);
    groups.set(key, variants);
  }
  return [...groups].map(([key, variants]) => ({
    key,
    variants,
    initialProduct: (groupByFlavor && variants.find(product => product.size === preferredSize)) || variants[0],
  }));
}
