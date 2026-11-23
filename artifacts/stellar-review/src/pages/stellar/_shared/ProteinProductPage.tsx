import { useState } from "react";
import { createPortal } from "react-dom";
import proteinProducts from "./protein-products.json";
import electrolyteProducts from "./electrolyte-products.json";
import veganProducts from "./vegan-products.json";
import styles from "../_protein-products.css?inline";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "../review-links";
import { getPowderCopy, powderDisclaimer } from "./powder-copy";
import { packageImages, packageFrontStyle } from "./package-images";
import { PowderNutritionSummary } from "./ProductNutritionSummary";
import { powderServingSize } from "./product-servings";
import { useProductSnapshot } from "./useProductSnapshot";
import { uploadedPowderLabels } from "./uploaded-powder-labels";
import { powderDisplayName, powderProductBlurb } from "./whey-lines";
import { isolatePageWarnings } from "./powder-page-notes";
import { HeavyMetalsBadge } from "./HeavyMetalsBadge";
import { heavyMetalsTestingStatement } from "./heavy-metals-testing";
import { ProductQualityList } from "./ProductQualityList";

const products = [...proteinProducts, ...veganProducts, ...electrolyteProducts].map((product) => ({
  ...product,
  images: packageImages(product).map((image) => ({ ...image, src: reviewAsset(image.src) })),
}));
type ProteinProduct = (typeof products)[number];

function displayNutritionFact(fact: string) {
  const servingSize = fact.match(/^Serving size:.*\((\d+(?:\.\d+)?)g\)$/i);
  if (servingSize) return `Serving size: ${servingSize[1]} g`;
  return fact.replace(/(\d+(?:\.\d+)?)g\b/g, "$1 g");
}

export function initializeSnapshot(doc: Document, view: Window, initializeLinks = initializeReviewLinks) {
  doc.documentElement.classList.add("stellar-product-compact-header");
  const announcement = doc.querySelector(".announcement-bar__text strong");
  if (announcement) announcement.textContent = "Subscribe & Save 10%";
  const header = doc.querySelector("#header-component");
  header?.querySelectorAll<HTMLAnchorElement>('a[href="#"]').forEach((link) => {
    link.href = "#supplements-app-mount";
  });
  const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  // Complete link setup after parsing too, in case the footer arrives after the mount.
  // Do this only once per document to avoid duplicate navigation listeners.
  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", setupLinks, { once: true });
  } else {
    setupLinks();
  }
  function setupLinks() {
    initializeLinks(doc);
  }
  doc.querySelector("#stellar-protein-product-style")?.remove();
  if (!doc.querySelector("#stellar-protein-product-style")) {
    const style = doc.createElement("style");
    style.id = "stellar-protein-product-style";
    style.textContent = styles.replaceAll("#protein-product-mount", "#supplements-app-mount");
    doc.head.append(style);
  }
  return () => {
    doc.documentElement.classList.remove("stellar-product-compact-header");
    view.removeEventListener("resize", updateHeader);
    doc.removeEventListener("DOMContentLoaded", setupLinks);
  };
}

function ProductDetail({ product }: { product: ProteinProduct }) {
  const uploadedLabel = uploadedPowderLabels[product.component];
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [purchaseOption, setPurchaseOption] = useState<"one-time" | "subscription">("one-time");
  const isolate = product.formula === "isolate";
  const electrolyte = product.formula === "electrolyte";
  const vegan = product.formula === "vegan";
  const copy = getPowderCopy(product);
  const familyProducts = products.filter((item) => !("discontinued" in item && item.discontinued) && item.formula === product.formula && (
    ("available" in item && item.available) || item.component === product.component ||
    ["ProteinChocolateIsolate1lb", "ProteinVanillaIsolate1lb"].includes(item.component)
  ));
  const flavors = [...new Set(familyProducts.map((item) => item.flavor))];
  const sizesForFlavor = [...new Set(familyProducts.filter((item) => item.flavor === product.flavor).map((item) => item.size))].sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b));
  const { benefits, quality, support } = copy;
  const displayedWarnings = isolate ? isolatePageWarnings(copy.warnings, quality) : [...new Set(copy.warnings)];
  const displayedBenefits = isolate
    ? [...support.map(item => item.description), ...benefits.filter(benefit =>
        !support.some(item => benefit.replace(/^Protein for /, "").replace(/\*$/, "") === item.title))]
    : vegan ? benefits.filter(benefit => benefit !== "Protein for Muscle Maintenance & Recovery*") : benefits;
  const benefitsSection = (
    <section id="product-details" className={`sl-protein-section${isolate ? " sl-isolate-benefits" : ""}`}>
      <h2>Benefits &amp; support</h2>
      <ul className="sl-protein-benefits" aria-describedby={electrolyte ? "electrolyte-product-disclaimer" : undefined}>
        {displayedBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
        {!isolate && support.map((item) => <li key={item.title}><strong>{item.title}</strong> — {item.description}</li>)}
      </ul>
    </section>
  );

  return (
    <main className={`sl-protein-page${isolate ? " sl-isolate-purchase-page" : ""}`}>
      <div className="sl-protein-hero">
        <div className="sl-protein-hero-image">
          {product.images[0]
            ? <img src={product.images[0].src} style={packageFrontStyle(product)} alt={`${product.title} — front of package`} />
            : <p style={{ padding: 32, textAlign: "center" }}>Product image unavailable</p>}
        </div>
        <section className="sl-protein-purchase" aria-labelledby="protein-title">
          <h1 id="protein-title">
            {electrolyte || vegan ? product.title : `${product.flavor} ${powderDisplayName(product.formula)}`}
          </h1>
          <p>{isolate ? "Made with ultra-filtered whey protein isolate" : powderProductBlurb(product)}</p>
          <p className="sl-protein-meta">
            {!isolate && <>{product.flavor} <span aria-hidden="true">·</span> </>}{product.component !== "ElectrolyteLemonLime" && <>{copy.containerWeight ?? product.size.replace(/(\d+)lb/i, "$1 lb")} <span aria-hidden="true">·</span> </>}{copy.servings} servings
          </p>
          <p className="sl-protein-price">${(product.price / 100).toFixed(2)}</p>
          <PowderNutritionSummary component={product.component} servingWeight={product.component === "ElectrolyteLemonLime" ? "4.5 gram (1 scoop)" : powderServingSize(copy).replace(" per serving", "")} />
          <p className="sl-protein-flavor-label">Flavor</p>
          <div className="sl-protein-flavors" role="group" aria-label="Select a flavor">
            {flavors.map((flavor) => {
              const flavorItems = familyProducts.filter((item) => item.flavor === flavor);
              const destination = flavorItems.find((item) => item.size === product.size) ?? flavorItems[0];
              return (
                <a
                  key={flavor}
                  className={flavor === product.flavor ? "is-selected" : ""}
                  href={reviewUrl(`/products/${destination.handle}`)}
                  target="_top"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    event.preventDefault();
                    window.location.assign(reviewUrl(`/products/${destination.handle}`));
                  }}
                  aria-current={flavor === product.flavor ? "page" : undefined}
                >{flavor}</a>
              );
            })}
          </div>
          {sizesForFlavor.length > 1 && <>
          <p className="sl-protein-flavor-label sl-protein-size-label">Size</p>
          <div className="sl-protein-flavors sl-protein-sizes" role="group" aria-label="Select a size">
            {sizesForFlavor.map((size) => {
              const destination = familyProducts.find((item) => item.flavor === product.flavor && item.size === size);
              if (!destination) return null;
              return (
                <a
                  key={size}
                  className={size === product.size ? "is-selected" : ""}
                  href={reviewUrl(`/products/${destination.handle}`)}
                  target="_top"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    event.preventDefault();
                    window.location.assign(reviewUrl(`/products/${destination.handle}`));
                  }}
                  aria-current={size === product.size ? "page" : undefined}
                >{size.replace(/(\d+)lb/i, "$1 lb")}</a>
              );
            })}
          </div>
          </>}
          <fieldset className="sl-protein-purchase-options">
            <legend>Purchase option</legend>
            <label><input type="radio" name="purchase-option" value="one-time" checked={purchaseOption === "one-time"} onChange={() => { setPurchaseOption("one-time"); setAdded(false); }} />One-time purchase</label>
            <label><input type="radio" name="purchase-option" value="subscription" checked={purchaseOption === "subscription"} onChange={() => { setPurchaseOption("subscription"); setAdded(false); }} />Subscribe &amp; Save 10%</label>
          </fieldset>
          <div className="sl-protein-buy-row">
            <div className="sl-protein-quantity" aria-label="Quantity">
              <button type="button" onClick={() => { setQuantity((value) => Math.max(1, value - 1)); setAdded(false); }} aria-label="Decrease quantity">−</button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" onClick={() => { setQuantity((value) => value + 1); setAdded(false); }} aria-label="Increase quantity">+</button>
            </div>
            <button className="sl-protein-cart" type="button" onClick={() => setAdded(true)}>Add to Cart</button>
          </div>
          <HeavyMetalsBadge />
          {added && <p className="sl-protein-selection-status" role="status">Selection updated.</p>}
          <nav className="sl-protein-jump-links" aria-label="On this page">
            <a href="#product-details">Product Details</a>
            <a href="#product-facts-label">Nutrition Facts</a>
          </nav>
          {!isolate && benefitsSection}
        </section>
      </div>

      <div className="sl-protein-details">
        {isolate && benefitsSection}
        <section className="sl-protein-section">
          <h2 id="product-claims" className="sl-product-claims-heading" tabIndex={-1}>Product details</h2>
          <ProductQualityList claims={quality} />
          <p data-heavy-metals-statement>{heavyMetalsTestingStatement}</p>
        </section>
          <div className="sl-product-safety-notes">
            <ul className="sl-protein-warnings">{displayedWarnings.filter(warning => !/These statements have not been evaluated/i.test(warning)).map((warning) => <li key={warning}>{warning}</li>)}</ul>
            {!electrolyte && <p className="sl-protein-label-note">{isolate ? "*" : ""}{powderDisclaimer}</p>}
          </div>
        <section className="sl-protein-section">
          <h2>Suggested use</h2>
          <p>{copy.suggestedUse}</p>
        </section>
        <section id="product-facts-label" tabIndex={-1} style={{ scrollMarginTop: 100 }} className="sl-protein-section sl-protein-labels">
          <h2>Complete nutrition / supplement facts</h2>
          {uploadedLabel && <div className="sl-protein-uploaded-label">
            <h3>Product label: {uploadedLabel.name}</h3>
            {uploadedLabel.referenceNote && <p role="note">{uploadedLabel.referenceNote.replace(/^The merchant confirms that the/, "The")}</p>}
            <a href={reviewAsset(uploadedLabel.facts)} target="_blank" rel="noreferrer" aria-label={`Open ${uploadedLabel.name} facts full size`}>
              <img src={reviewAsset(uploadedLabel.facts)} alt={`${uploadedLabel.name} original supplement facts`} loading="lazy" style={{ display: "block", width: "100%", maxWidth: 420, height: "auto", margin: "16px auto" }} />
            </a>
            {uploadedLabel.pdf && <p><a href={reviewAsset(uploadedLabel.pdf)} target="_blank" rel="noreferrer">{uploadedLabel.photoViews ? "Open label views PDF" : uploadedLabel.barcodeUpdated ? "Open complete label PDF" : "Open complete original label PDF"} ↗</a></p>}
            <a href={reviewAsset(uploadedLabel.full)} target="_blank" rel="noreferrer">
              <img src={reviewAsset(uploadedLabel.full)} alt={uploadedLabel.photoViews ? `${uploadedLabel.name} front and back label photographs` : `${uploadedLabel.name} complete label, ingredients, warnings and suggested use`} loading="lazy" style={{ display: "block", width: "100%", height: "auto", margin: "16px 0" }} />
            </a>
          </div>}
          {!uploadedLabel && product.images.length < 2 && <p role="note">The supplied package details are listed below.</p>}
          {!vegan && !electrolyte && <ul className="sl-protein-quality">{copy.facts.filter(fact => !isolate || !/^(?:Serving size:|(?:\d+\s+)?servings per container|Protein:)/i.test(fact)).map((fact) => <li key={fact}>{displayNutritionFact(fact)}</li>)}</ul>}
          {electrolyte && <div className="sl-electrolyte-label-notes">
            <p id="electrolyte-product-disclaimer" className="sl-protein-label-note">*{powderDisclaimer}</p>
          </div>}
          {product.images.length > 1 && !uploadedLabel && <details className="sl-protein-full-label" open>
            <summary>View complete facts, ingredients, and original label panels</summary>
            <div className="sl-protein-label-grid">
            {product.images.slice(1).map((image, index) => (
              <figure key={image.src}>
                <a href={image.src} target="_blank" rel="noreferrer" aria-label={`Open ${product.flavor} original label panel ${index + 1} full size`}>
                  <img src={image.src} loading="lazy" alt={`${product.flavor} ${electrolyte ? "electrolyte" : "protein"} package label panel ${index + 1}`} />
                </a>
                <figcaption><a href={image.src} target="_blank" rel="noreferrer">Open original label full size ↗</a></figcaption>
              </figure>
            ))}
            </div>
          </details>}
        </section>
      </div>
    </main>
  );
}

export function ProteinProductPage({ component }: { component: ProteinProduct["component"] }) {
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initializeSnapshot);
  const product = products.find((item) => item.component === component);

  if (!product) return <div>Product information is unavailable.</div>;
  if ("discontinued" in product && product.discontinued) return (
    <section style={{ padding: "48px 24px", background: "#fff", color: "#23201f" }}>
      <h1>{product.title} is unavailable</h1>
      <p>This flavor has been discontinued.</p>
      <a href={reviewUrl("/products/supplements-lemon-lime-electrolyte-powder")} target="_top">View Lemon Lime electrolytes</a>
    </section>
  );
  return (
    <div className="stellar-protein-product-shell" style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, overflow: "hidden" }}>
      <iframe
        key={attempt}
        ref={iframeRef}
        title={`Stellar Labs ${product.title}`}
         src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=womens-format-powder-copy`}
        loading="eager"
        referrerPolicy="no-referrer"
         sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        className="stellar-protein-product-frame"
        aria-hidden={status !== "ready" ? true : undefined}
        tabIndex={status !== "ready" ? -1 : undefined}
        style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
      />
      {status !== "ready" && (
        <section
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          style={{ position: "absolute", inset: 0, overflow: "auto", padding: "48px 24px", background: "#fff", color: "#23201f", fontFamily: "Arial, sans-serif" }}
        >
          <h1 style={{ fontSize: 24, margin: "0 0 16px" }}>{product.title}</h1>
          <p>{status === "error" ? "The product information could not load. Please try again." : "Loading product information…"}</p>
          {status === "error" && (
            <button type="button" onClick={retry} style={{ padding: "10px 16px", marginRight: 20, cursor: "pointer" }}>Try again</button>
          )}
          <a href={reviewUrl("/")} style={{ color: "#087e91", textDecoration: "underline" }}>Back to review homepage</a>
        </section>
      )}
      {mount ? createPortal(<ProductDetail product={product} />, mount) : null}
    </div>
  );
}
