import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import proteinProducts from "./_shared/protein-products.json";
import veganProducts from "./_shared/vegan-products.json";
import electrolyteProducts from "./_shared/electrolyte-products.json";
import styles from "./_supplements.css?inline";
import wheyStyles from "./_whey-collection.css?inline";
import "./_group.css";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";
import { QualityCallouts, qualityCallouts } from "./_shared/QualityCallouts";
import { getPowderCopy } from "./_shared/powder-copy";
import { collectionClaimNote, getOutlineProduct } from "./_shared/outline-copy";
import { packageImages, packageFrontStyle, isIllustrativePackage, wheyDisplayOrder } from "./_shared/package-images";
import { useProductSnapshot } from "./_shared/useProductSnapshot";
import { WheyNutritionSummary } from "./_shared/WheyNutritionSummary";
import { ProductCardNutrition } from "../../../../../stellar-review/src/pages/stellar/_shared/ProductCardNutrition";
import { collectionPackageHref, groupCollectionProducts, initialCollectionPackage } from "../../../../../stellar-review/src/pages/stellar/_shared/collection-product-groups";
import { powderDisplayName, wheyLines } from "./_shared/whey-lines";
import { classicWheyProducts } from "./_shared/classic-whey-products";
import { ClassicWheyCard } from "./_shared/ClassicWheyCard";
import lineStyles from "../../../../../stellar-review/src/pages/stellar/_whey-line-updates.css?inline";

const products = [...proteinProducts, ...veganProducts, ...electrolyteProducts.filter((product) => !product.discontinued)].map((product) => ({
  ...product,
  images: packageImages(product).map((image) => ({ ...image, src: reviewAsset(image.src) })),
}));
type PowderProduct = (typeof products)[number];
export type PowderCollection = "whey" | "vegan" | "electrolyte";
type PowderFilter = "all" | "isolate" | "blend" | "lemon-lime" | "strawberry";

const collectionDetails: Record<PowderCollection, { title: string; description: string }> = {
  whey: { title: "WHEY PROTEIN", description: "Browse whey isolates and blends by flavor." },
  vegan: { title: "VEGAN PROTEIN", description: "20g of plant protein per serving, made with pea, brown rice, and quinoa proteins and sweetened with stevia." },
  electrolyte: { title: "ELECTROLYTES", description: "Low calorie delicious hydration with all major electrolytes that tastes great." },
};

const categoryFilters: Record<PowderCollection, { filter: PowderFilter; label: string; query: string }[]> = {
  whey: [
    { filter: "all", label: "All whey", query: "" },
    { filter: "isolate", label: "Whey Protein Isolate", query: "&formula=isolate" },
    { filter: "blend", label: "Whey Protein Blend", query: "&formula=blend" },
  ],
  vegan: [{ filter: "all", label: "All vegan protein", query: "" }],
  electrolyte: [
    { filter: "all", label: "All electrolytes", query: "" },
  ],
};

function getProductQuality(product: PowderProduct) {
  return product.formula === "electrolyte"
    ? [...getOutlineProduct(product.component).quality, ...getPowderCopy(product).quality]
    : getPowderCopy(product).quality;
}

function getInitialFilter(category: PowderCollection): PowderFilter {
  const params = new URLSearchParams(window.location.search);
  if (category === "whey") {
    const formula = params.get("formula");
    if (formula === "isolate" || formula === "blend") return formula;
  }
  return "all";
}

function collectionClaims(category: PowderCollection, filter: PowderFilter, selected: PowderProduct[]) {
  const qualities = selected.map(getProductQuality);
  const allHave = (...names: string[]) => qualities.length > 0 && qualities.every((claims) => names.some((name) => claims.includes(name)));
  const claims = [
    allHave("Non-GMO") ? "Non-GMO" : null,
    category === "electrolyte" && allHave("5 Major Electrolytes") ? "5 Major Electrolytes" : null,
    allHave("Certified Gluten-Free") ? "Certified Gluten-Free" : null,
    category === "whey" && allHave("Easy-to-Digest Ingredients") ? "Easy-to-Digest Ingredients" : null,
    category === "whey" && allHave("rBGH-Free Whey") ? "rBGH-Free Whey" : null,
    category === "vegan" && allHave("Vegan") ? "Vegan" : null,
    category === "electrolyte" && allHave("Vegan") ? "Vegan" : null,
    category === "electrolyte"
      ? allHave("No Added Sugar", "No Added Sugars") ? "No Added Sugar" : null
      : allHave("No Added Sugars") ? "No Added Sugars" : null,
  ].filter((claim): claim is string => claim !== null);

  return claims;
}

function initializeSnapshot(doc: Document, view: Window, category: PowderCollection) {
  doc.documentElement.classList.add("stellar-whey-page");
  if (category === "whey") {
    const announcement = doc.querySelector(".announcement-bar__text");
    if (announcement) announcement.textContent = "Subscribe & Save 10%";
  }
  const header = doc.querySelector("#header-component");
  header?.querySelectorAll<HTMLAnchorElement>('a[href="#"]').forEach((link) => {
    link.href = "#supplements-app-mount";
  });
  const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  const setupLinks = () => initializeReviewLinks(doc);
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", setupLinks, { once: true });
  else setupLinks();
  doc.getElementById("stellar-powder-collection-style")?.remove();
  if (!doc.getElementById("stellar-powder-collection-style")) {
    const style = doc.createElement("style");
    style.id = "stellar-powder-collection-style";
    style.textContent = `${styles}${wheyStyles}${lineStyles}
      #header-group,.header-section{position:relative!important;top:auto!important}
      #header-component .header__row--top{min-height:64px!important}
      #header-component .header__row--top .header__columns{padding-block:8px!important}
      #header-component .header-logo{padding-block:8px!important;height:auto!important}
      #header-component .header-logo__image{max-height:34px!important;width:auto!important}
      #header-component>.stellar-shop-navigation{padding-block:8px!important}
      @media(max-width:749px){#header-component .header-logo__image{max-height:28px!important}}
    `;
    doc.head.append(style);
  }
  return () => {
    view.removeEventListener("resize", updateHeader);
    doc.removeEventListener("DOMContentLoaded", setupLinks);
  };
}

function ProductCard({ product: initialProduct, variants, showServings = false }: { product: PowderProduct; variants?: PowderProduct[]; showServings?: boolean }) {
  const options = variants ? [...variants].sort((a, b) => Number.parseFloat(a.size) - Number.parseFloat(b.size)) : [initialProduct];
  const [selectedComponent, setSelectedComponent] = useState(() => initialCollectionPackage(initialProduct, options, window.location.search).component);
  const product = options.find(option => option.component === selectedComponent);
  if (!product) throw new Error(`Selected package is unavailable: ${selectedComponent}`);
  const singlePackageSize = Boolean(variants) && options.length === 1;
  const detailHref = reviewUrl(`/products/${product.handle}`);
  return (
    <article className={`sl-product${variants ? " sl-whey-grouped-card" : ""}`} data-testid={`card-product-${product.component}`} data-whey-family={variants ? `${product.formula}:${product.flavor}` : undefined} data-selected-size={product.size} data-illustrative-package={isIllustrativePackage(product) || undefined}>
      <a className="sl-product-image" href={detailHref} target="_parent" onClick={(event) => { event.preventDefault(); window.location.assign(detailHref); }} rel="noopener noreferrer" aria-label={`View ${product.title} product details`}>
        {product.images[0]
          ? <img key={product.component} src={product.images[0].src} alt={`${product.title} — ${isIllustrativePackage(product) ? "illustrative bottle mockup" : "original package front"}`} loading="lazy" style={packageFrontStyle(product)} />
          : <span style={{ padding: 24, textAlign: "center" }}>{product.flavor} Isolate · 1 lb<br /><small>Bottle photo pending</small></span>}
      </a>
      <div className="sl-product-copy">
        <h2 style={{ textAlign: "center" }}>
          <span className="sl-card-name" style={{ flexDirection: "column" }}><strong>{product.flavor}</strong> {powderDisplayName(product.formula)}</span>
          {!variants && product.formula !== "electrolyte" && <span className="sl-card-variant">{product.size.replace(/(\d)\s*lb/, "$1 lb")}</span>}
        </h2>
        {variants && <div className="sl-card-package"><div className="sl-size-options" role={singlePackageSize ? undefined : "group"} aria-label={singlePackageSize ? undefined : `${product.formula === "isolate" ? "Whey isolate" : "Whey blend"} ${product.flavor} size`}>
          {singlePackageSize ? <span className="sl-single-size">{product.size.replace(/(\d)\s*lb/, "$1 lb")}</span> : options.map(option => <a className="sl-size-option" key={option.component} href={collectionPackageHref(window.location, option.component)} target="_parent" aria-current={option.component === selectedComponent ? "true" : undefined} data-testid={`size-${option.component}`} onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
            event.preventDefault();
            setSelectedComponent(option.component);
          }}>
            {option.size.replace(/(\d)\s*lb/, "$1 lb")}
          </a>)}
        </div>
          {showServings && <p className="sl-card-servings">{getPowderCopy(product).servings} servings per container</p>}
        </div>}
        {product.formula === "electrolyte" && <p className="sl-card-servings">{getPowderCopy(product).servings} servings per container</p>}
        <p className="sl-product-price">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(product.price / 100)}</p>
        {product.formula === "vegan" && <p className="sl-card-servings">{getPowderCopy(product).servings} servings</p>}
        <ProductCardNutrition component={product.component} />
        <a className="sl-details-button" href={detailHref} target="_parent" onClick={(event) => { event.preventDefault(); window.location.assign(detailHref); }} rel="noopener noreferrer" data-testid={`button-details-${product.component}`}>
          {product.formula === "isolate" || product.formula === "blend" ? "View Product" : "Product details"} <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

function PowderCollection({ category }: { category: PowderCollection }) {
  const filter = getInitialFilter(category);
  const categoryProducts = useMemo(
    () => products.filter((product) => {
      if (category === "whey") {
        if (product.formula !== "isolate" && product.formula !== "blend") return false;
        return filter === "all" || product.formula === filter;
      }
      if (product.formula !== category) return false;
      return category !== "electrolyte" || product.component === "ElectrolyteLemonLime";
    }).sort((a, b) => category === "whey"
      ? wheyDisplayOrder(a) - wheyDisplayOrder(b)
      : Number(b.component === "ElectrolyteLemonLime") - Number(a.component === "ElectrolyteLemonLime")),
    [category, filter],
  );
  const visibleClaims = collectionClaims(category, filter, categoryProducts);
  const productGroups = useMemo(() => groupCollectionProducts(categoryProducts, category === "whey", filter === "isolate" ? "1lb" : "2lb"), [categoryProducts, category, filter]);
  const electrolyteClaims = [
    "Non-GMO", "Certified Gluten-Free",
    "Easy-to-Digest Ingredients",
    "Vegan",
    "No Added Sugars",
  ];
  const note = collectionClaimNote;
  const details = collectionDetails[category];
  const simplifiedCallouts = category === "vegan" || category === "electrolyte" || (category === "whey" && filter === "blend");
  const proteinClaims = visibleClaims
    .filter(claim => /^(Non-GMO|Certified Gluten-Free|Easy-to-Digest)/.test(claim));
  if (category === "whey" && filter === "blend") proteinClaims.push("rBGH-Free Whey", "No Added Sugars");
  if (category === "vegan") proteinClaims.push("Easy-to-Digest Ingredients", "Vegan");
  const heading = category === "whey" && filter === "isolate" ? wheyLines.isolate.name
    : category === "whey" && filter === "blend" ? wheyLines.blend.name : details.title;
  const description = category === "whey" && filter === "isolate"
    ? wheyLines.isolate.description
    : category === "whey" && filter === "blend"
      ? "Whey concentrate and isolate, sweetened with stevia"
      : details.description;
  const selectedTab = categoryFilters[category].find((item) => item.filter === filter)?.filter ?? "all";
  const showCollectionClaims = category !== "whey" || filter === "all" || filter === "isolate" || filter === "blend";
  const baseCategory = category === "whey" ? "100-isolate-whey-protein" : category === "vegan" ? "vegan-plant-protein" : "electrolyte";
  return (
    <div className="sl-collection sl-whey-collection" data-collection={category} data-collection-filter={selectedTab}>
      <header className="sl-collection-heading">
        <div className="sl-heading-inner">
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
      </header>
      {category === "whey" && <nav className="sl-whey-category-buttons" style={{ gridTemplateColumns: `repeat(${categoryFilters[category].length}, minmax(0, 1fr))` }} aria-label={`${details.title} filters`}>
        {categoryFilters[category].map(item => {
          const href = reviewUrl(`/?category=${baseCategory}${item.query}`);
          const active = item.filter === selectedTab;
          return <a key={item.filter} className={`sl-whey-category-button${active ? " is-active" : ""}`} href={href} target="_parent" onClick={event => { event.preventDefault(); window.location.assign(href); }} aria-current={active ? "page" : undefined}>{item.label}</a>;
        })}
      </nav>}
      <div className={[
        "sl-whey-collection-claims",
        category === "electrolyte" ? "sl-electrolyte-collection-claims"
          : category === "vegan" || category === "whey" && (filter === "isolate" || filter === "blend") ? "sl-whey-nutrition-band" : "",
      ].filter(Boolean).join(" ")}>
        {simplifiedCallouts
          ? <WheyNutritionSummary formula={category === "whey" ? "blend" : category} flavor={filter} />
          : category === "whey" && filter === "isolate" && <WheyNutritionSummary formula="isolate" />}
        {category === "electrolyte" && <style>{`
          .sl-electrolyte-collection-claims .review-quality-strip{background:#111;padding-bottom:24px}
          .sl-electrolyte-collection-claims .review-quality-strip .review-quality-row{
            display:flex;flex-wrap:wrap;justify-content:center;gap:20px 36px;
          }
          .sl-electrolyte-collection-claims .review-quality-strip>p{
            max-width:360px;margin:24px max(0px,calc((100% - 1328px)/2)) 0 auto;
            text-align:right;font-size:10px;line-height:1.45;
          }
          @media(max-width:700px){
            .sl-electrolyte-collection-claims .review-quality-strip .review-quality-row{gap:18px 24px}
            .sl-electrolyte-collection-claims .review-quality-strip>p{max-width:80%;margin-right:0}
          }
        `}</style>}
        {showCollectionClaims && <QualityCallouts
          listing
          items={qualityCallouts(category === "electrolyte" ? electrolyteClaims : simplifiedCallouts ? proteinClaims : visibleClaims)}
          label={`${details.title} quality callouts`}
          singleLine={false}
          note={category === "electrolyte" || category === "whey" || category === "vegan" ? "" : note}
        />}
      </div>
      <section className="sl-grid-section" aria-label={`${details.title.toLowerCase()} products`}>
        <div className="sl-product-grid">
          {productGroups.map(group => (
            <ProductCard
              key={`${group.key}:${group.initialProduct.component}`}
              product={group.initialProduct}
              variants={category === "whey" ? group.variants : undefined}
              showServings={category === "whey" && filter === "isolate"}
            />
          ))}
          {category === "whey" && filter !== "isolate" && classicWheyProducts.map(product => (
            <ClassicWheyCard key={product.id} product={product} href={reviewUrl(`/products/${product.handle}`)} />
          ))}
        </div>
      </section>
      <footer className="sl-label-note" style={category === "whey" || category === "vegan" ? { flexWrap: "wrap" } : undefined}>
        {note && (category === "whey" || category === "vegan") && showCollectionClaims && <p style={{ flexBasis: "100%", margin: "0 0 10px", fontSize: 12, lineHeight: 1.5, color: "#555", scrollMarginTop: 100 }}>{note}</p>}
        <a href={reviewUrl("/product-information")} target="_top" rel="noopener noreferrer">Product information &amp; nutrition guide</a>
      </footer>
    </div>
  );
}

export function PowderCollectionPage({ category = "whey" }: { category?: PowderCollection }) {
  const initialize = useMemo(() => (doc: Document, view: Window) => initializeSnapshot(doc, view, category), [category, styles, wheyStyles]);
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initialize);
  return (
    <main className="stellar-supplements-shell" aria-label={`Stellar Labs ${collectionDetails[category].title.toLowerCase()} collection`} style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        key={attempt}
        ref={iframeRef}
        title={`Stellar Labs ${collectionDetails[category].title.toLowerCase()} collection`}
        src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=category-certifications`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        className="stellar-supplements-frame"
        aria-hidden={status !== "ready" ? true : undefined}
        tabIndex={status !== "ready" ? -1 : undefined}
        style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
      />
      {status !== "ready" && (
        <section role={status === "error" ? "alert" : "status"} aria-live="polite" style={{ position: "absolute", inset: 0, overflow: "auto", padding: "42px 24px", background: "#fff", color: "#23201f" }}>
          <h1>{collectionDetails[category].title}</h1>
          <p>{status === "error" ? "The collection preview could not load." : "Loading the collection preview…"}</p>
          {status === "error" && <button type="button" onClick={retry}>Try again</button>}
        </section>
      )}
      {mount ? createPortal(<PowderCollection category={category} />, mount) : null}
    </main>
  );
}
