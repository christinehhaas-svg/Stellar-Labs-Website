import { fodmapDisclaimer, flyerPageCount, nutritionPages, productDetailPages } from "./stellar-claims-flyer-data";

export function ClaimsFlyerProductPages({ onlyPage }: { onlyPage: string | null }) {
  return <>{productDetailPages.map(({ product, label }, index) => {
    const number = nutritionPages.length + 3 + index;
    if (onlyPage !== null && onlyPage !== String(number)) return null;
    return <article className="handoff-page claims-product-page" key={number} data-flyer-page={number}
      data-product-reference={product.id}>
      <header className="claims-facts-header">
        <div className="handoff-top"><strong>STELLAR<span>LABS®</span></strong><span>PRODUCT INFORMATION</span></div>
        <h1>{product.name}</h1>
      </header>
      {label
        ? <section className="claims-label-artwork">
          <h2>{/facts\.png$/.test(label) ? "Nutrition / Supplement Facts" : "Complete product label"}</h2>
          <img src={label.replace("/__mockup/", "/review-assets/")} alt={`${product.name} — website label artwork`} />
        </section>
        : <section className="claims-product-copy">
          {product.price && <p className="claims-product-price">{product.price}</p>}
          <p>Serving size: {product.servingSize} · {product.servingsPerContainer}</p>
          {product.upc && <p>{product.upcNote ? "Printed UPC (unconfirmed)" : "UPC"}: {product.upc}</p>}
          {product.upcNote && <p>{product.upcNote}</p>}
          <h2>Benefits &amp; support</h2>
          <ul>{product.benefits.map(item => <li key={item}>{item}</li>)}</ul>
          <h2>Product details</h2>
          <ul>{product.claims.map(item => <li key={item}>{item}</li>)}</ul>
          <h2>Suggested use</h2>
          <p>{product.suggestedUse}</p>
          <h2>Important product information</h2>
          {product.claims.some(item => /FODMAP/i.test(item)) && <p>{fodmapDisclaimer}</p>}
          <ul>{product.warnings.map(item => <li key={item}>{item}</li>)}</ul>
        </section>}
      <footer className="handoff-footer claims-facts-footer">
        <div><span>{product.name}</span><span>{number} / {flyerPageCount}</span></div>
      </footer>
    </article>;
  })}</>;
}
