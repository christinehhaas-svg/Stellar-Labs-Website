import { classicReference, type ClassicWheyProduct } from "./classic-whey-products";
import { wheyLines } from "./whey-lines";

export function ClassicWheyNutrition() {
  return <div className="sl-card-nutrition">
    <dl className="sl-card-nutrition-row sl-card-shake-metrics" aria-label="Manufacturer reference nutrition per serving" style={{ maxWidth: 210 }}>
      {classicReference.metrics.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <p className="sl-card-per-serving">Per {classicReference.servingGrams} g serving*</p>
    <p className="sl-classic-reference">*{classicReference.basis}</p>
  </div>;
}

export function ClassicWheyCard({ product, href }: { product: ClassicWheyProduct; href: string }) {
  return <article className="sl-product sl-whey-grouped-card sl-classic-card" data-product-line="classic" data-testid={`card-product-${product.id}`}>
    <a className="sl-product-image" href={href} target="_parent" onClick={event => { event.preventDefault(); window.location.assign(href); }} aria-label={`View ${product.flavor} Classic Whey Protein Blend`}>
      <span className="sl-classic-photo-placeholder">Product photo coming soon</span>
    </a>
    <div className="sl-product-copy">
      <h2><span className="sl-card-name">{wheyLines.classic.name}</span><span className="sl-card-variant">{product.flavor}</span></h2>
      <div className="sl-size-options"><span className="sl-single-size">{classicReference.size}</span></div>
      <p className="sl-product-price sl-classic-availability">Coming soon</p>
      <ClassicWheyNutrition />
      <a className="sl-details-button" href={href} target="_parent" onClick={event => { event.preventDefault(); window.location.assign(href); }}>View Product <span aria-hidden="true">→</span></a>
    </div>
  </article>;
}
