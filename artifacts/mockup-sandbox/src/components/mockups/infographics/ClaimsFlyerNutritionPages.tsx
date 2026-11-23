import { fodmapDisclaimer } from "../../../../../stellar-review/src/pages/stellar/_shared/fodmap-disclaimer";
import { nutritionPages, flyerPageCount, type FlyerProduct } from "./stellar-claims-flyer-data";
import "./_claims-flyer-nutrition.css";
import { ClaimsFlyerIngredients } from "./ClaimsFlyerIngredients";

function FactsCard({ product }: { product: FlyerProduct }) {
  return <section className="claims-facts-card" data-product-id={product.id} data-metric-count={product.metrics.length}>
    <h2>{product.name}</h2>
    <div className="claims-facts-serving">
      <p><strong>Serving size:</strong> {product.servingSize}{product.kind === "powder" ? " of powder" : ""}</p>
      <p>{product.servingsPerContainer}</p>
    </div>
    {product.metrics.length > 0 && <>
      <dl className="claims-facts-metrics" style={{ gridTemplateColumns: `repeat(${product.metrics.length}, minmax(0, 1fr))` }}>
        {product.metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
      </dl>
      <p className="claims-facts-basis">Per {product.servingSize} serving</p>
    </>}
    {product.kind === "supplement" && <p className="claims-facts-basis">Supplement Facts summary · Amounts and serving bases as stated below</p>}
    {product.facts.length > 0 && <ul className="claims-facts-list">{product.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>}
    <ClaimsFlyerIngredients product={product} />
    <div className="claims-facts-claims">
      <h3>Applicable claims</h3>
      <p>{product.claims.join(" · ")}</p>
    </div>
    {product.claims.some(claim => /FODMAP/i.test(claim)) && <p className="claims-facts-disclaimer">{fodmapDisclaimer}</p>}
  </section>;
}

export function ClaimsFlyerNutritionPages({ onlyPage = null }: { onlyPage?: string | null }) {
  const totalPages = flyerPageCount;
  return <>{nutritionPages.map((page, index) => {
    const pageNumber = index + 3;
    if (onlyPage !== null && onlyPage !== String(pageNumber)) return null;
    return <article className={`handoff-page claims-facts-page ${page.rows[0].kind === "supplement" ? "claims-supplement-facts-page" : ""}`} key={pageNumber} data-flyer-page={pageNumber}>
      <header className="claims-facts-header">
        <div className="handoff-top"><strong>STELLAR<span>LABS®</span></strong><span>NUTRITION & CLAIMS REFERENCE</span></div>
        <p className="handoff-eyebrow">Product-specific facts</p>
        <h1>{page.title}</h1>
        <p>{page.rows[0].kind === "supplement"
          ? "Approved website Supplement Facts. Amounts retain their stated capsule or softgel serving basis."
          : "Approved website values for each flavor and package. Serving size is separate from protein content."}</p>
      </header>
      <div className="claims-facts-grid">{page.rows.map(product => <FactsCard key={product.id} product={product} />)}</div>
      <footer className="handoff-footer claims-facts-footer">
        <div><span>CURRENT APPROVED WEBSITE FACTS & CLAIMS</span><span>{pageNumber} / {totalPages}</span></div>
      </footer>
    </article>;
  })}</>;
}
