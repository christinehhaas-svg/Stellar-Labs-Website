import { renderToStaticMarkup } from "react-dom/server";
import proteinProducts from "./protein-products.json";
import veganProducts from "./vegan-products.json";
import electrolyteProducts from "./electrolyte-products.json";
import { supplements } from "./supplements-data";
import { ProductCardNutrition } from "./ProductCardNutrition";
import { SupplementCardCopy } from "./SupplementCardCopy";
import { sortShopAllProducts } from "./shop-all-order";
import styles from "./shop-all-cards.css?inline";
import { powderDisplayName } from "./whey-lines";
import { classicWheyProducts } from "./classic-whey-products";
import { ClassicWheyCard } from "./ClassicWheyCard";
import lineStyles from "../_whey-line-updates.css?inline";
import { bookDescriptions } from "./book-descriptions";

function capturedHandle(card: HTMLElement): string | undefined {
  try {
    const handle = JSON.parse(card.getAttribute("view-event-payload") ?? "{}")?.product?.handle;
    return typeof handle === "string" ? handle : undefined;
  } catch {
    return undefined;
  }
}

function supplementForCard(card: HTMLElement) {
  const handle = capturedHandle(card)?.replace(/^coming-soon-/, "").replace(/-hidden$/, "");
  return supplements.find(product =>
    product.id === card.dataset.catalogSupplement ||
    product.storePath === `/products/${handle}` ||
    (handle === "magnesium" && product.id === "magnesium-complex"));
}

/** Use the category cards' facts and supplement copy, not captured descriptions. */
export function initializeShopAllCards(doc: Document, section: HTMLElement, localUrl: (path: string) => string) {
  let style = doc.getElementById("stellar-shop-all-cards-style");
  if (!style) {
    style = doc.createElement("style");
    style.id = "stellar-shop-all-cards-style";
    doc.head.append(style);
  }
  style.textContent = styles + lineStyles + `
    [data-stellar-full-catalog] .sl-catalog-copy h2{grid-template-rows:minmax(84px,auto) 46px!important}
    [data-stellar-full-catalog] .sl-classic-card .sl-card-name{min-height:84px;display:flex;align-items:center;justify-content:center}
    [data-stellar-full-catalog] .sl-classic-card .sl-card-variant{display:block;font-weight:700;font-size:18px}
    [data-stellar-full-catalog] .sl-classic-card h2{margin:0;text-align:center;font-size:16px;line-height:1.3}
    [data-stellar-full-catalog] .sl-classic-card .sl-product-copy{text-align:center;padding-top:10px}
    [data-stellar-full-catalog] .sl-classic-card .sl-details-button{display:block;margin:10px auto;padding:10px;border:1px solid #111;color:#111;text-decoration:none;font-weight:700}
    [data-stellar-full-catalog] .sl-classic-card .sl-product-image{display:block;aspect-ratio:1/1.08}
    [data-stellar-full-catalog] .sl-classic-card .sl-product-image .sl-classic-photo-placeholder{box-sizing:border-box}
  `;
  const powders = [...proteinProducts, ...veganProducts, ...electrolyteProducts];
  const grid = section.querySelector<HTMLElement>(".resource-list--grid");
  const capturedCards = [...section.querySelectorAll<HTMLElement>("product-card")];
  const capturedSupplementIds = new Set(capturedCards.map(card => supplementForCard(card)?.id));
  const wheyTags = capturedCards.find(card =>
    proteinProducts.some(product => product.formula === "blend" && product.handle === capturedHandle(card)))
    ?.closest<HTMLElement>(".resource-list__item")?.dataset.productTags ?? "100-isolate-whey-protein";
  const supplementTags = capturedCards.find(card =>
    supplements.some(product => product.storePath === `/products/${capturedHandle(card)}`))
    ?.closest<HTMLElement>(".resource-list__item")?.dataset.productTags ?? "supplements";
  // Two active supplements have label-backed category cards but no old Shopify
  // capture. Include them using the very same bottle, package, and price source.
  for (const supplement of supplements) {
    if (!grid || supplement.id === "night-time-fat-burn" ||
      capturedSupplementIds.has(supplement.id) ||
      section.querySelector(`[data-catalog-supplement="${supplement.id}"]`)) continue;
    const item = doc.createElement("div");
    item.className = "resource-list__item";
    item.dataset.productTags = supplementTags;
    const card = doc.createElement("product-card");
    card.dataset.catalogSupplement = supplement.id;
    card.setAttribute("view-event-payload", JSON.stringify({ product: { handle: supplement.id, title: supplement.name } }));
    const content = doc.createElement("div");
    content.className = "product-card__content";
    const image = doc.createElement("div");
    image.className = "card-gallery sl-catalog-added-photo";
    const imageLink = doc.createElement("a");
    const img = doc.createElement("img");
    img.src = supplement.bottle;
    img.alt = supplement.name;
    img.loading = "lazy";
    imageLink.append(img);
    image.append(imageLink);
    content.append(image);
    card.append(content);
    item.append(card);
    grid.append(item);
  }
  const shownSupplements = new Set<string>();
  for (const card of section.querySelectorAll<HTMLElement>("product-card")) {
    const handle = capturedHandle(card);
    if (!handle) continue;
    const bookDescription = bookDescriptions[handle];
    if (bookDescription) {
      const title = card.querySelector('a[ref="productTitleLink"], a.user-select-text');
      if (title) {
        card.dataset.catalogBook = handle;
        card.querySelector(".sl-book-description")?.remove();
        const description = doc.createElement("p");
        description.className = "sl-book-description";
        description.textContent = bookDescription;
        const copy = doc.createElement("div");
        copy.className = "sl-catalog-copy sl-book-copy";
        title.classList.add("sl-card-name");
        const heading = doc.createElement("h2");
        heading.className = "sl-card-name";
        heading.textContent = title.textContent?.trim() ?? "";
        title.replaceChildren(heading);
        copy.append(title, description);
        const price = card.querySelector("product-price");
        if (price) {
          price.classList.add("sl-product-price");
          copy.append(price);
        }
        const action = card.querySelector(".stellar-product-store-link");
        if (action) copy.append(action);
        const content = card.querySelector(".product-card__content");
        if (content) {
          for (const child of [...content.children]) {
            if (!child.classList.contains("card-gallery")) child.remove();
          }
          content.append(copy);
        }
      }
    }
    if (handle === "the-low-lean-lose-fat-high-protein-no-bloat-diet") {
      const title = "E-book: The Low and Lean Eating System";
      card.querySelectorAll<HTMLElement>('h2, h3, [role="heading"]').forEach(heading => {
        heading.textContent = title;
      });
      card.querySelectorAll<HTMLElement>("[aria-label], img[alt]").forEach(element => {
        if (/low.*lean/i.test(element.getAttribute("aria-label") ?? "")) element.setAttribute("aria-label", title);
        if (/low.*lean/i.test(element.getAttribute("alt") ?? "")) element.setAttribute("alt", title);
      });
    }
    if (handle.startsWith("coming-soon-") || handle.endsWith("-hidden")) {
      card.closest(".resource-list__item")?.remove();
      continue;
    }
    const powder = powders.find(product => product.handle === handle);
    if (powder && "discontinued" in powder && powder.discontinued) {
      (card.closest(".resource-list__item") ?? card).remove();
      continue;
    }
    const supplement = supplementForCard(card);
    if (supplement && shownSupplements.has(supplement.id)) {
      (card.closest(".resource-list__item") ?? card).remove();
      continue;
    }
    if (!powder && !supplement) continue;
    const content = card.querySelector<HTMLElement>(".product-card__content");
    const image = card.querySelector<HTMLElement>(".card-gallery");
    if (!content || !image) continue;
    if (supplement) shownSupplements.add(supplement.id);
    const href = localUrl(powder ? `/products/${powder.handle}` : `/supplement-details?product=${encodeURIComponent(supplement!.id)}`);
    const copy = doc.createElement("div");
    copy.className = "sl-catalog-copy";
    if (powder) {
      const name = powder.formula === "electrolyte" ? "Electrolyte Hydration" : powderDisplayName(powder.formula);
      const size = powder.formula === "electrolyte" ? null : powder.size.replace(/(\d)\s*lb/, "$1 lb");
      copy.innerHTML = renderToStaticMarkup(<>
        <h2><span className="sl-card-name">{powder.flavor} {name}</span>{size && <span className="sl-card-variant">{size}</span>}</h2>
        <p className="sl-product-price">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(powder.price / 100)}</p>
        <ProductCardNutrition component={powder.component} omitMetrics={powder.formula === "electrolyte" ? ["Calcium"] : []} />
      </>);
      card.dataset.catalogComponent = powder.component;
    } else {
      card.dataset.catalogSupplement = supplement!.id;
      image.querySelectorAll<HTMLAnchorElement>("a").forEach(anchor => {
        anchor.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%";
      });
      image.querySelectorAll<HTMLImageElement>("img").forEach(img => {
        img.style.cssText = "display:block;width:100%;height:100%;object-fit:contain";
      });
      copy.innerHTML = renderToStaticMarkup(<SupplementCardCopy product={supplement!} />);
      // Supplement category cards show package counts and price; their full
      // product-specific Supplement Facts remain on the individual product page.
      const spacer = doc.createElement("div");
      spacer.className = "sl-catalog-nutrition-placeholder";
      spacer.setAttribute("aria-hidden", "true");
      copy.append(spacer);
      card.dataset.catalogSupplement = supplement!.id;
    }
    const link = doc.createElement("a");
    link.className = "sl-catalog-view-product";
    link.href = href;
    link.textContent = "View Product →";
    copy.append(link);
    card.querySelector(":scope > .product-card__link")?.remove();
    image.querySelectorAll("quick-add-component, .product-grid-view-zoom-out--details").forEach(node => node.remove());
    image.querySelectorAll<HTMLAnchorElement>("a").forEach(anchor => { anchor.href = href; });
    content.replaceChildren(image, copy);
    card.setAttribute("data-stellar-catalog-card", "");
  }
  if (grid) {
    for (const product of classicWheyProducts) {
      if (grid.querySelector(`[data-catalog-classic="${product.id}"]`)) continue;
      const item = doc.createElement("div");
      item.className = "resource-list__item";
      item.dataset.productTags = `${wheyTags},classic-whey`;
      const card = doc.createElement("product-card");
      card.dataset.catalogClassic = product.id;
      card.setAttribute("view-event-payload", JSON.stringify({ product: { handle: product.handle, title: powderDisplayName("classic") } }));
      card.innerHTML = renderToStaticMarkup(<ClassicWheyCard product={product} href={localUrl(`/products/${product.handle}`)} />);
      item.append(card);
      grid.append(item);
    }
    sortShopAllProducts(grid);
  }
}
