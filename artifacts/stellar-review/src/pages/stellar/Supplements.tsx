import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { getSupplementQuality, labelDisclaimer, supplements, storePreview, type Supplement } from "./_shared/supplements-data";
import styles from "./_supplements.css?inline";
import collectionStyles from "./_whey-collection.css?inline";
import "./_group.css";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";
import { QualityCallouts, qualityCallouts } from "./_shared/QualityCallouts";
import { ProductClaimsButton } from "./_shared/ProductClaimsButton";
import { supplementCollectionQuality } from "./_shared/quality-claims";
import { SupplementCardCopy } from "./_shared/SupplementCardCopy";
import { supplementServingSummary } from "./_shared/product-servings";

type FilterKey = "all" | Supplement["category"];

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All supplements" },
  { key: "daily", label: "Daily Wellness" },
  { key: "digestion", label: "Digestive Support" },
  { key: "muscle-joint", label: "Muscle and Joint" },
];

function initializeSnapshot(event: SyntheticEvent<HTMLIFrameElement>) {
  const frame = event.currentTarget;
  const view = frame.contentWindow;
  const doc = frame.contentDocument;
  const header = doc?.querySelector("#header-component");
  if (!view || !doc || !header) return;
  doc.documentElement.classList.add("stellar-whey-page");
  header.querySelectorAll<HTMLAnchorElement>('a[href="#"]').forEach((link) => {
    link.href = "#supplements-app-mount";
  });
  const updateHeader = () => header.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  initializeReviewLinks(doc);
  if (!doc.querySelector("#stellar-supplements-style")) {
    const style = doc.createElement("style");
    style.id = "stellar-supplements-style";
    style.textContent = `${styles}${collectionStyles}`;
    doc.head.append(style);
  }
}

function ProductCard({ product, onOpen }: { product: Supplement; onOpen: (product: Supplement) => void }) {
  const detailHref = reviewUrl(`/supplement-details?product=${encodeURIComponent(product.id)}`);
  return (
    <article className="sl-product sl-supplement-card" data-testid={`card-product-${product.id}`}>
      <button className="sl-product-image" onClick={() => onOpen(product)} aria-label={`View ${product.name} product details`} data-testid={`button-image-${product.id}`}>
        <img src={product.bottle} alt={`${product.name} — ${product.bottleCaption}`} loading="lazy" />
      </button>
      <div className="sl-product-copy">
        <SupplementCardCopy product={product} />
        <a className="sl-details-button" href={detailHref} target="_parent" onClick={(event) => { event.preventDefault(); window.location.assign(detailHref); }} rel="noopener noreferrer" data-testid={`button-details-${product.id}`}>
          Product details <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

function MerchantCallouts({ nighttimeOnly = false }: { nighttimeOnly?: boolean }) {
  return (
    <div className="sl-supplement-collection-claims sl-whey-collection-claims">
      <style>{`
        .sl-supplement-collection-claims .review-quality-strip{padding-bottom:24px}
        .sl-supplement-collection-claims .review-quality-strip .review-quality-row{
          display:flex;flex-wrap:wrap;justify-content:center;gap:20px 36px;
        }
        .sl-supplement-collection-claims .review-quality-strip>p{
          max-width:360px;margin:24px max(0px,calc((100% - 1328px)/2)) 0 auto;
          text-align:right;font-size:10px;line-height:1.45;
        }
        @media(max-width:700px){
          .sl-supplement-collection-claims .review-quality-strip .review-quality-row{gap:18px 24px}
          .sl-supplement-collection-claims .review-quality-strip>p{max-width:80%;margin-right:0}
        }
      `}</style>
    <QualityCallouts
      listing
      items={qualityCallouts(nighttimeOnly ? ["Non-GMO"] : supplementCollectionQuality)}
      label="Merchant-supplied brand callouts"
      note=""
    />
    </div>
  );
}

function ProductDialog({ product, onClose }: { product: Supplement; onClose: () => void }) {
  const [showLabel, setShowLabel] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  const artwork = showLabel ? product.label : product.bottle;
  const imageAlt = showLabel ? `${product.name} complete label artwork` : `${product.name} — ${product.bottleCaption}`;
  return (
    <dialog className="sl-dialog" ref={dialogRef} aria-labelledby="sl-dialog-title" onClose={onClose} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
      <QualityCallouts
        items={qualityCallouts(getSupplementQuality(product))}
        label={`${product.name} quality callouts`}
        note="See Product Claims below for complete formula-specific details."
        includeMedicalNote={product.category !== "nighttime"}
      />
      <div className="sl-dialog-layout">
        <div className="sl-dialog-art">
          <button className="sl-dialog-close" onClick={onClose} aria-label="Close product details">×</button>
          <img src={artwork} alt={imageAlt} />
          <div className="sl-art-actions">
            <button onClick={() => setShowLabel((value) => !value)}>{showLabel ? "View bottle" : "View complete label"}</button>
            <a href={product.label} target="_blank" rel="noreferrer">Open label full size ↗</a>
          </div>
        </div>
        <section className="sl-dialog-content">
          <p className="sl-product-subtitle">{product.subtitle}</p>
          <h2 id="sl-dialog-title">{product.name}</h2>
          <p className="sl-dialog-count">{product.supply} <span>·</span> {product.count}</p>
          <p className="sl-card-serving-note">{supplementServingSummary(product.id)}</p>
          <ProductClaimsButton />
          <section className="sl-nutrition-summary" aria-label={`${product.name} supplement facts summary`}>
            <h3>Supplement facts · per labeled serving</h3>
            <ul className="sl-facts">{product.facts.map((item) => <li key={item}>{item}</li>)}</ul>
            {product.sourceNote && <p className="sl-dialog-disclaimer">{product.sourceNote}</p>}
            <a href={product.label} target="_blank" rel="noreferrer">Read the complete facts panel &amp; ingredients full size ↗</a>
          </section>
          {product.detailCopy && (
            <>
              <p className="sl-product-description">{product.detailCopy.description}</p>
              <h3>More information</h3>
            </>
          )}
          <h3>{product.detailCopy ? "Benefits:" : "On the label"}</h3>
          <ul className="sl-benefits sl-dialog-benefits">{product.benefits.map((benefit) => <li key={benefit}>{benefit}<a href="#label-disclaimer" onClick={onClose}>*</a></li>)}</ul>
            <div className="sl-editorial-details">
              <h3 id="product-claims" className="sl-product-claims-heading" tabIndex={-1}>Product Claims</h3>
              <ul className="sl-facts">{getSupplementQuality(product).map((quality) => <li key={quality}>{quality}</li>)}</ul>
              {product.detailCopy && <>
              <h3>Featured support:</h3>
              <dl className="sl-featured-support">
                {product.detailCopy.support.map((support) => (
                  <div key={support.title}>
                    <dt>{support.title}</dt>
                    <dd>{support.description}</dd>
                  </div>
                ))}
              </dl>
              </>}
            </div>
          <h3>Suggested use</h3>
          <p>{product.use}</p>
          <h3>Warnings</h3>
          <ul className="sl-warnings">{product.warnings.filter(warning => !/These statements have not been evaluated/i.test(warning)).map((warning) => <li key={warning}>{warning}</li>)}</ul>
          <p className="sl-dialog-disclaimer">{product.detailCopy
            ? "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."
            : labelDisclaimer}</p>
          <div className="sl-dialog-footer">
            {product.storePath
              ? <a className="sl-store-link" href={`${storePreview}${product.storePath}`} target="_blank" rel="noreferrer">View in store <span aria-hidden="true">↗</span></a>
              : <p className="sl-store-note">Store listing not confirmed for this formula.</p>}
            <a className="sl-source-link" href={product.pdf ?? product.label} target="_blank" rel="noreferrer">{product.pdf ? "Open original label PDF" : "Open original label image"} ↗</a>
          </div>
        </section>
      </div>
    </dialog>
  );
}

function CollectionPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<Supplement | null>(null);
  const filtered = useMemo(() => filter === "all" ? supplements : supplements.filter((product) =>
    product.category === filter || product.additionalCategories?.includes(filter)), [filter]);
  return (
    <div className="sl-collection sl-whey-collection" data-collection="supplements">
      <header className="sl-collection-heading">
        <div className="sl-heading-inner">
          <h1>SUPPLEMENTS</h1>
          <p>Daily supplements designed to complement your nutrition and wellness routine.</p>
        </div>
      </header>
      <nav className="sl-whey-category-buttons sl-supplement-category-buttons" aria-label="Filter supplements">
        {filters.filter(item => item.key !== "all").map(item => <button type="button" key={item.key} className={`sl-whey-category-button${filter === item.key ? " is-active" : ""}`} onClick={() => setFilter(item.key)} aria-pressed={filter === item.key} data-testid={`filter-${item.key}`}>{item.label}</button>)}
      </nav>
      <div className="sl-supplement-filter-footer">
        <button type="button" className="sl-supplement-filter-reset" onClick={() => setFilter("all")} aria-pressed={filter === "all"} data-testid="filter-all">All supplements</button>
      </div>
      <MerchantCallouts nighttimeOnly={filter === "nighttime"} />
      <section className="sl-grid-section" aria-label="Supplement products">
        <div className="sl-product-grid">
          {filtered.map((product) => <ProductCard key={product.id} product={product} onOpen={item => window.location.assign(reviewUrl(`/supplement-details?product=${encodeURIComponent(item.id)}`))} />)}
        </div>
      </section>
      <footer className="sl-label-note">
        <details><summary>Important product information</summary><p id="label-disclaimer">{labelDisclaimer}</p></details>
        <a href={reviewUrl("/product-information")} target="_top">Product information &amp; nutrition guide</a>
      </footer>
      {selected && <ProductDialog key={selected.id} product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function Supplements() {
  return (
    <main className="stellar-supplements-shell" aria-label="Stellar Labs supplements collection" style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        title="Stellar Labs supplements collection"
        src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=category-certifications`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        onLoad={initializeSnapshot}
        className="stellar-supplements-frame"
        style={{ display: "block", width: "100%", height: "100%", border: 0 }}
        onError={(event) => { event.currentTarget.dataset.error = "true"; }}
      />
      <FramePortal />
    </main>
  );
}

function FramePortal() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(".stellar-supplements-frame");
    if (!iframe) return;
    iframeRef.current = iframe;
    const connect = () => {
      const doc = iframe.contentDocument;
      const style = doc?.getElementById("stellar-supplements-style");
      if (style) style.textContent = `${styles}${collectionStyles}`;
      setMount(doc?.getElementById("supplements-app-mount") ?? null);
    };
    iframe.addEventListener("load", connect);
    if (iframe.contentDocument?.readyState === "complete") connect();
    return () => iframe.removeEventListener("load", connect);
  }, [styles, collectionStyles]);
  return mount ? createPortal(<CollectionPage />, mount) : null;
}