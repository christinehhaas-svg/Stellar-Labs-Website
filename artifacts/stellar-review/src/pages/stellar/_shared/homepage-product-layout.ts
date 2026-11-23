/** Give captured product cards intrinsic height and readable responsive columns. */
export function initializeHomepageProductLayout(doc: Document) {
  if (doc.getElementById("stellar-product-grid-layout")) return;
  const style = doc.createElement("style");
  style.id = "stellar-product-grid-layout";
  const section = "#ProductList-template--21473298907310__product_list_fa6P9H";
  style.textContent = `
    /* Expanded cards must determine the page height, not overflow a viewport-sized flex item. */
    .page-wrapper > #MainContent {
      display: block !important; flex: 0 0 auto !important;
      height: auto !important; min-height: 0 !important; overflow: visible !important;
    }
    .page-wrapper > #header-group, .page-wrapper > footer { flex-shrink: 0 !important; }
    ${section} {
      width: 100%; max-width: 1440px; margin-inline: auto;
      padding: 56px 32px 64px !important; box-sizing: border-box;
      position: relative; z-index: 0; isolation: isolate;
    }
    html, .page-wrapper { scroll-padding-top: var(--stellar-storefront-header-height, 160px); }
    ${section} #shop-products { scroll-margin-top: 24px !important; }
    ${section} .product-tag-filters { scroll-margin-top: 24px; }
    ${section} .section-resource-list__header { margin-bottom: 28px; }
    ${section} #shop-products h2 { margin: 0; line-height: 1.2; }
    ${section} .product-tag-filters {
      display: flex; flex-wrap: wrap; justify-content: center;
      gap: 12px; margin: 0 0 36px; width: 100%;
      position: static !important; inset: auto !important; z-index: auto !important;
    }
    ${section} .product-tag-filter {
      max-width: 100%; min-width: 0; white-space: normal;
      padding: 12px 18px; font-size: 14px; line-height: 1.4;
      position: static !important; inset: auto !important;
      transform: none !important; z-index: auto !important;
    }
    ${section} .resource-list--grid {
      display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 48px 32px !important; align-items: start;
    }
    ${section} .resource-list__item { min-width: 0; height: auto; }
    ${section} product-card { display: block; width: 100%; min-width: 0; height: auto; }
    ${section} .product-card__content {
      display: flex; flex-direction: column; flex-wrap: nowrap;
      gap: 12px !important; height: auto !important; min-width: 0;
      padding: 0 8px; overflow: visible !important;
    }
    ${section} .product-card__content > * { flex-shrink: 0; min-width: 0; }
    ${section} .card-gallery { width: 100%; margin-bottom: 8px; }
    ${section} [ref="productTitleLink"] .text-block,
    ${section} [ref="productTitleLink"] [role="heading"] {
      font-size: 20px !important; line-height: 1.35 !important;
      letter-spacing: normal; overflow-wrap: anywhere; margin: 0;
    }
    ${section} product-price { font-size: 17px; line-height: 1.5; }
    ${section} .stellar-nutrition-description {
      width: 100%; margin-top: 8px; padding: 0; box-sizing: border-box;
      font-size: 14px; line-height: 1.65; overflow-wrap: anywhere;
    }
    ${section} .stellar-product-store-link { margin-top: 16px !important; }
    @media (max-width: 1099px) {
      ${section} .resource-list--grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 40px 24px !important; }
    }
    @media (max-width: 699px) {
      ${section} { padding: 40px 20px 48px !important; }
      ${section} .resource-list--grid { grid-template-columns: minmax(0, 1fr) !important; gap: 40px !important; }
      ${section} .product-tag-filters { gap: 10px; margin-bottom: 28px; }
      ${section} .product-tag-filter { font-size: 12px; padding: 10px 12px; }
      ${section} .product-card__content { padding-inline: 0; }
    }
  `;
  doc.head.append(style);
  const header = doc.getElementById("header-group");
  if (header) {
    const updateHeaderOffset = () => {
      doc.documentElement.style.setProperty(
        "--stellar-storefront-header-height",
        `${Math.ceil(header.getBoundingClientRect().height)}px`,
      );
    };
    updateHeaderOffset();
    const observer = new ResizeObserver(updateHeaderOffset);
    observer.observe(header);
    doc.defaultView?.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }
}
