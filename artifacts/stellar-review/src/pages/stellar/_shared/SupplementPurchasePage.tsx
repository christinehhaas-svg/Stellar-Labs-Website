import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import type { Supplement } from "./supplements-data";
import { getSupplementQuality, labelDisclaimer } from "./supplements-data";
import { supplementServingInfo } from "./product-servings";
import { SupplementNutritionSummary } from "./ProductNutritionSummary";
import { ProductPurchaseControls } from "./ProductPurchaseControls";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "../review-links";
import { initializeSnapshot } from "./ProteinProductPage";
import { useProductSnapshot } from "./useProductSnapshot";
import styles from "../_protein-products.css?inline";
import { ProductQualityList } from "./ProductQualityList";

type SupplementPageProps = {
  supplements: Supplement[];
  assetUrl?: typeof reviewAsset;
  localUrl?: typeof reviewUrl;
  initializeLinks?: typeof initializeReviewLinks;
};

export function SupplementPurchasePage({
  supplements, assetUrl = reviewAsset, localUrl = reviewUrl, initializeLinks = initializeReviewLinks,
}: SupplementPageProps) {
  const initialize = useCallback((doc: Document, view: Window) =>
    initializeSnapshot(doc, view, initializeLinks), [initializeLinks]);
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initialize);
  return <div className="stellar-protein-product-shell" style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, overflow: "hidden" }}>
    <iframe
      key={attempt}
      ref={iframeRef}
      title="Stellar Labs supplement product"
      src={`${assetUrl("/__mockup/stellar-current/supplements-shell.html")}?review=supplement-purchase`}
      loading="eager"
      referrerPolicy="no-referrer"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      className="stellar-protein-product-frame"
      aria-hidden={status !== "ready" ? true : undefined}
      tabIndex={status !== "ready" ? -1 : undefined}
      style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
    />
    {status !== "ready" && <section role={status === "error" ? "alert" : "status"} aria-live="polite" style={{ position: "absolute", inset: 0, overflow: "auto", padding: "48px 24px", background: "#fff", color: "#23201f", fontFamily: "Arial, sans-serif" }}>
      <h1>Supplement product information</h1>
      <p>{status === "error" ? "The product information could not load. Please try again." : "Loading product information…"}</p>
      {status === "error" && <button type="button" onClick={retry}>Try again</button>}
      <a href={localUrl("/supplements")}>Back to supplements</a>
    </section>}
    {mount && createPortal(<SupplementDetail supplements={supplements} localUrl={localUrl} />, mount)}
  </div>;
}

function SupplementDetail({ supplements, localUrl = reviewUrl }: SupplementPageProps) {
  const requested = new URLSearchParams(window.location.search).get("product");
  const [selected, setSelected] = useState(supplements.find(item => item.id === requested) ?? supplements[0]);
  const servingInfo = supplementServingInfo[selected.id];
  const probiotic = selected.id === "probiotic-40";
  const turmeric = selected.id === "turmeric-w-bioperine";
  const warnings = [...new Set(selected.warnings)].filter(item =>
    item.replace(/^[*†‡]\s*/, "") !== labelDisclaimer);
  const displayedFacts = probiotic
    ? selected.facts.filter(item => /Lactobacillus|Bifidobacterium/.test(item)).flatMap(item => item.split(", "))
    : selected.facts;
  if (requested === "night-time-fat-burn") {
    return <main><h1>This product is no longer available.</h1><a href={localUrl("/supplements")}>View supplements</a></main>;
  }
  return <main className="sl-protein-page sl-supplement-purchase">
    <style>{styles.replaceAll("#protein-product-mount", "#supplements-app-mount")}</style>
    <style>{`
      .sl-supplement-purchase{background:#fff;color:#23201f}
      .sl-supplement-purchase .sl-details-navigation{margin:16px 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;font-size:12px}
      .sl-supplement-purchase .sl-details-navigation a{color:#23201f;text-underline-offset:3px}
      .sl-supplement-purchase .sl-details-navigation select{max-width:100%;padding:8px;border:1px solid #777;background:#fff;color:#222;font:inherit}
      .sl-supplement-purchase #supplement-nutrition-facts{scroll-margin-top:18px}
      .sl-supplement-purchase .sl-original-label{display:block;width:100%;height:auto;max-width:900px;margin:12px auto}
      #supplements-app-mount .sl-supplement-purchase .sl-protein-details{max-width:1328px;padding-inline:5.2%;box-sizing:border-box}
      @media(max-width:700px){.sl-supplement-purchase .sl-details-navigation label{max-width:100%}#supplements-app-mount .sl-supplement-purchase .sl-protein-details{padding-inline:16px}}
    `}</style>
    <div className="sl-protein-hero">
      <div className="sl-protein-hero-image">
        <img src={selected.bottle} alt={`${selected.name} — ${selected.bottleCaption}`} />
      </div>
      <section className="sl-protein-purchase" aria-labelledby="supplement-title">
        <h1 id="supplement-title">{selected.name}</h1>
        {probiotic && <>
          <p className="sl-probiotic-potency">40 billion CFU per serving</p>
          <p className="sl-probiotic-description">Contains 4 probiotic strains</p>
        </>}
        <p className="sl-protein-meta">{selected.count} {probiotic ? "•" : "·"} {servingInfo.servings}{servingInfo.maxServings ? `–${servingInfo.maxServings}` : ""} servings{servingInfo.maxServings ? " (depending on use)" : ""}</p>
        {probiotic && <>
          <p className="sl-probiotic-serving-size">Serving size: 2 capsules</p>
        </>}
        <p className="sl-protein-price">{servingInfo.priceCents !== undefined ? `$${(servingInfo.priceCents / 100).toFixed(2)}` : "Contact us for pricing"}</p>
        {!probiotic && <SupplementNutritionSummary product={selected} />}
        <nav className="sl-details-navigation" aria-label="Supplement detail navigation">
          <label>Product: <select aria-label="Choose supplement" value={selected.id} onChange={event => {
            const next = supplements.find(item => item.id === event.target.value);
            if (!next) return;
            setSelected(next);
            const url = new URL(window.location.href);
            url.searchParams.set("product", next.id);
            window.history.replaceState(null, "", url);
          }}>{supplements.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <a href={localUrl("/supplements")} target="_parent" onClick={event => { event.preventDefault(); window.location.assign(localUrl("/supplements")); }}>← All supplements</a>
        </nav>
        <ProductPurchaseControls key={selected.id} />
        <nav className="sl-protein-jump-links" aria-label="On this page">
          <a href="#supplement-product-details">Product Details</a>
          <a href="#supplement-nutrition-facts">Nutrition Facts</a>
        </nav>
      </section>
    </div>
    <div className="sl-protein-details">
      <section id="supplement-product-details" className="sl-protein-section" tabIndex={-1} style={{ scrollMarginTop: 100 }}>
        <h2>Benefits &amp; support</h2>
        <ul className="sl-protein-benefits" aria-describedby={turmeric ? "label-disclaimer" : undefined}>
          {(!turmeric || !selected.detailCopy?.support.length) && selected.benefits.map(item => <li key={item}>{item}*</li>)}
          {selected.detailCopy?.support.map(item => <li key={item.title}><strong>{item.title}</strong> — {item.description}</li>)}
        </ul>
      </section>
      <section className="sl-protein-section">
        <h2 id="product-claims" className="sl-product-claims-heading" tabIndex={-1}>Product details</h2>
        <ProductQualityList claims={getSupplementQuality(selected)} />
      </section>
        <div className="sl-product-safety-notes">
          <ul className="sl-protein-quality">{warnings.filter(item => !/These statements have not been evaluated/i.test(item)).map(item => <li key={item}>{item}</li>)}</ul>
          <p id="label-disclaimer" className={turmeric ? "sl-protein-label-note" : undefined}>{turmeric ? "*" : ""}{labelDisclaimer}</p>
        </div>
      <section className="sl-protein-section">
        <h2>Suggested use</h2>
        <p>{selected.use}</p>
      </section>
      <section id="supplement-nutrition-facts" className="sl-protein-section" tabIndex={-1}>
        <h2>{probiotic ? "Supplement Facts" : "Complete nutrition / supplement facts"}</h2>
        <ul className="sl-protein-quality">{displayedFacts.map(item => <li key={item}>{item}</li>)}</ul>
        <a href={selected.label} target="_blank" rel="noreferrer">
          <img className="sl-original-label" src={selected.label} alt={`${selected.name} complete original label, facts and ingredients`} loading="lazy" />
        </a>
        <a href={selected.pdf ?? selected.label} target="_blank" rel="noreferrer">Open original complete label ↗</a>
      </section>
      <p className="sl-protein-label-note sl-supplement-medication-note">Check with your medical provider before taking supplements with medications.</p>
    </div>
  </main>;
}
