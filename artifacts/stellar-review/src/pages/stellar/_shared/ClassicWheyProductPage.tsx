import { createPortal } from "react-dom";
import { classicReference, classicWheyProducts } from "./classic-whey-products";
import { ClassicWheyNutrition } from "./ClassicWheyCard";
import { wheyLines } from "./whey-lines";
import { useProductSnapshot } from "./useProductSnapshot";
import { initializeSnapshot } from "./ProteinProductPage";
import { reviewAsset, reviewUrl } from "../review-links";

type Props = {
  productId: string;
  resolveUrl?: typeof reviewUrl;
  resolveAsset?: typeof reviewAsset;
  initialize?: typeof initializeSnapshot;
};

export function ClassicWheyProductPage({
  productId, resolveUrl = reviewUrl, resolveAsset = reviewAsset, initialize = initializeSnapshot,
}: Props) {
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initialize);
  const product = classicWheyProducts.find(item => item.id === productId);
  if (!product) return <p>Product information is unavailable.</p>;
  const referenceId = `classic-reference-${product.id}`;
  return <div className="stellar-protein-product-shell" style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
    <iframe key={attempt} ref={iframeRef} title={`${wheyLines.classic.name} · ${product.flavor}`}
      src={resolveAsset("/__mockup/stellar-current/supplements-shell.html")} loading="eager"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      className="stellar-protein-product-frame" style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }} />
    {status !== "ready" && <section role={status === "error" ? "alert" : "status"} style={{ position: "absolute", inset: 0, padding: 24, background: "#fff" }}>
      <p>{status === "error" ? "The product page could not load." : "Loading product details…"}</p>
      {status === "error" && <button onClick={retry}>Try again</button>}
    </section>}
    {mount && createPortal(<main className="sl-classic-product">
      <style>{`
        .sl-classic-product{max-width:1180px;margin:auto;padding:28px 24px 48px;color:#151515}
        .sl-classic-product-layout{display:grid;grid-template-columns:1fr 1fr;gap:42px;align-items:start}
        #supplements-app-mount .sl-classic-product h1{font-size:30px;font-weight:700;line-height:1.2;margin:0 0 12px}
        .sl-classic-product p{line-height:1.5}
        .sl-classic-product .sl-classic-photo-placeholder{min-height:390px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;padding:25px;color:#444;text-align:center}
        .sl-classic-product .sl-card-nutrition-row{display:flex;justify-content:space-between;max-width:320px!important;margin:16px 0 4px}
        .sl-classic-product .sl-card-nutrition-row>div{display:flex;flex-direction:column;text-align:center}
        .sl-classic-product dt{order:2;font-size:13px}.sl-classic-product dd{margin:0;font-size:22px;font-weight:700}
        .sl-classic-product .sl-card-per-serving{font-size:13px;margin:4px 0}
        .sl-classic-product .sl-classic-reference{font-size:12px;color:#444;margin:4px 0 16px}
        .sl-classic-product .sl-protein-flavors{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 20px}
        .sl-classic-product .sl-protein-flavors a{padding:9px 12px;border:1px solid #333;color:#111;text-decoration:none}
        #supplements-app-mount .sl-classic-product .sl-protein-flavors [aria-current=page]{color:#fff;background:#111;border-color:#111}
        .sl-classic-product details{border-top:1px solid #bbb;padding:16px 0}
        .sl-classic-product summary{font-weight:700;cursor:pointer}
        .sl-classic-facts{display:grid;grid-template-columns:1fr auto;gap:8px;max-width:420px;margin:16px 0}
        .sl-classic-facts dt{font-size:14px;order:0}.sl-classic-facts dd{font-size:14px;text-align:right;font-weight:500}
        @media(max-width:749px){.sl-classic-product-layout{grid-template-columns:1fr;gap:22px}#supplements-app-mount .sl-classic-product h1{font-size:25px}.sl-classic-product .sl-classic-photo-placeholder{min-height:240px}}
      `}</style>
      <div className="sl-classic-product-layout">
        <div className="sl-classic-photo-placeholder">Product photo coming soon</div>
        <section aria-labelledby="classic-product-title">
          <h1 id="classic-product-title">{wheyLines.classic.name}</h1>
          <p>{product.flavor} · {classicReference.size} · {classicReference.servings} servings*</p>
          <p><strong>Coming soon</strong> · Price to be announced</p>
          <ClassicWheyNutrition />
          <p>Flavor</p>
          <nav className="sl-protein-flavors" aria-label="Classic whey flavors">{classicWheyProducts.map(item => {
            const href = resolveUrl(`/products/${item.handle}`);
            return <a key={item.id} href={href} target="_parent" className={item.id === product.id ? "is-selected" : undefined} aria-current={item.id === product.id ? "page" : undefined} onClick={event => { event.preventDefault(); window.location.assign(href); }}>{item.flavor}</a>;
          })}</nav>
          <p>{wheyLines.classic.description}</p>
          <p>Available to purchase once pricing and final product details are published.</p>
        </section>
      </div>
      <details open><summary>Product Details</summary><p>{wheyLines.classic.description}</p><p>Contains milk. {classicReference.basis} Follow the final product label before use.</p></details>
      <details><summary>Nutrition Facts</summary>
        <p id={referenceId}>Serving size: 34 g (1 rounded scoop) · 27 servings per container.<br />{classicReference.basis}</p>
        <dl className="sl-classic-facts" aria-describedby={referenceId}>
          {[...classicReference.metrics.map(item => [item.label, item.value]), ...classicReference.otherFacts].map(([label, value]) => <div key={label} style={{ display: "contents" }}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </details>
      <p><a href={resolveUrl("/?category=100-isolate-whey-protein&formula=blend")} target="_parent" onClick={event => { event.preventDefault(); window.location.assign(event.currentTarget.href); }}>Back to Whey Blends</a></p>
    </main>, mount)}
  </div>;
}
