import { sortShopAllProducts } from "./shop-all-order";
import proteinProducts from "./protein-products.json";
import veganProducts from "./vegan-products.json";
import electrolyteProducts from "./electrolyte-products.json";
import { supplements } from "./supplements-data";
import { initializeShopAllCards } from "./shop-all-cards";
import { wheyLines } from "./whey-lines";

const featuredHandles = [
  "100-isolate-whey-protein-shake-mixed-berry",
  "vanilla-whey-protein-shake",
  "chocolate-vegan-shake",
  "supplements-lemon-lime-electrolyte-powder",
  "omega-3-fish-oil-supplement",
];

const featuredCategoryTitles: Record<string, string> = {
  "100-isolate-whey-protein-shake-mixed-berry": wheyLines.isolate.name,
  "vanilla-whey-protein-shake": wheyLines.blend.name,
  "chocolate-vegan-shake": "Vegan Protein",
  "supplements-lemon-lime-electrolyte-powder": "Electrolyte Hydration",
  "omega-3-fish-oil-supplement": "Supplements",
};

const featuredCategoryLinks: Record<string, { label: string; route: string }> = {
  "100-isolate-whey-protein-shake-mixed-berry": { label: "Shop Whey Protein Isolate", route: "/?category=100-isolate-whey-protein&formula=isolate" },
  "vanilla-whey-protein-shake": { label: "Shop Whey Protein Blend", route: "/?category=100-isolate-whey-protein&formula=blend" },
  "chocolate-vegan-shake": { label: "Shop Vegan Protein", route: "/?category=vegan-plant-protein" },
  "supplements-lemon-lime-electrolyte-powder": { label: "Shop Hydration", route: "/?category=electrolyte" },
  "omega-3-fish-oil-supplement": { label: "Shop Supplements", route: "/supplements" },
};

/** Keep the homepage focused while preserving the complete captured catalog on /shop. */
export function initializeHomepageFeaturedProducts(
  doc: Document,
  localUrl: (path: string) => string,
  fullCatalog = false,
) {
  const section = doc.querySelector<HTMLElement>("#shopify-section-template--21473298907310__product_list_fa6P9H");
  const storyHeading = [...doc.querySelectorAll<HTMLElement>("h1,h2,h3")]
    .find((heading) => heading.textContent?.replace(/\s+/g, " ").trim() === "Why Stellar Labs?");
  const story = storyHeading?.closest<HTMLElement>('[id^="shopify-section-"]');
  if (!section || !story) return;

  const styleId = "stellar-homepage-featured-products-style";
  if (!doc.getElementById(styleId)) {
    const style = doc.createElement("style");
    style.id = styleId;
    style.textContent = `
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] {
        padding: clamp(34px, 5vw, 68px) clamp(20px, 4vw, 64px) !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .resource-list--grid {
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: clamp(14px, 2vw, 28px) !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .product-tag-filters,
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .stellar-nutrition-description,
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .stellar-product-store-link {
        display: none !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] product-price {
        display: none !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .product-card__content {
        gap: 8px !important;
        text-align: center !important;
        --text-align: center;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] [ref="productTitleLink"],
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] [ref="productTitleLink"] .text-block,
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] [ref="productTitleLink"] [role="heading"] {
        width: 100% !important;
        max-width: 100% !important;
        margin-inline: auto !important;
        text-align: center !important;
        --text-align: center;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .card-gallery,
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .card-gallery > a {
        background: transparent !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .card-gallery {
        aspect-ratio: 1 / 1 !important;
        height: auto !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] [data-stellar-featured-electrolyte] .card-gallery img {
        scale: .78;
        object-fit: contain !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] [ref="productTitleLink"] .text-block,
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] [ref="productTitleLink"] [role="heading"] {
        font-size: clamp(15px, 1.5vw, 19px) !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] [ref="productTitleLink"] [role="heading"] {
        min-height: 2.7em;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] product-card quick-add-component {
        display: none !important;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .stellar-featured-detail-link {
        display: flex; justify-content: center; align-self: center; width: 100%; margin-top: 5px; color: inherit;
        font-size: 13px; font-weight: 700; letter-spacing: .06em; text-decoration-thickness: 1px;
        text-underline-offset: 4px;
      }
      #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .stellar-featured-package {
        display: block !important; text-align: center; margin: 0; min-height: 60px; font-size: 13px; line-height: 20px;
      }
      #stellar-homepage-shop-links {
        display: flex; justify-content: center; flex-wrap: wrap; gap: 14px;
        padding: 32px 20px 52px; background: #f6f3ed;
      }
      #stellar-homepage-shop-links a {
        display: inline-flex; align-items: center; justify-content: center; min-height: 48px;
        padding: 12px 22px; border: 1px solid #192728; color: #192728; background: transparent;
        font-family: inherit; font-size: 13px; font-weight: 700; line-height: 1.2;
        letter-spacing: .1em; text-decoration: none;
      }
      #stellar-homepage-shop-links a:first-child { color: #f8f6f0; background: #192728; }
      @media (max-width: 760px) {
        #ProductList-template--21473298907310__product_list_fa6P9H[data-stellar-home-featured] .resource-list--grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 24px 14px !important;
        }
      }
      @media (min-width: 761px) {
        [data-stellar-full-catalog] .resource-list--grid { row-gap: 24px !important; }
        [data-stellar-full-catalog] product-card { display: block; height: 100%; }
        [data-stellar-full-catalog] .product-card__content {
          display: grid !important; height: 100%;
          grid-template-rows: clamp(240px,24vw,340px) 50px 22px 28px 1fr auto;
          gap: 6px !important;
        }
        [data-stellar-full-catalog] .card-gallery { grid-row: 1; height: 100% !important; }
        [data-stellar-full-catalog] .card-gallery img { object-fit: contain !important; }
        [data-stellar-full-catalog] .product-grid-view-zoom-out--details { display: none !important; }
        [data-stellar-full-catalog] [ref="productTitleLink"] {
          grid-row: 2; display: flex !important; align-items: center; justify-content: center; text-align: center;
        }
        [data-stellar-full-catalog] [ref="productTitleLink"] .text-block,
        [data-stellar-full-catalog] [ref="productTitleLink"] [role="heading"] {
          font-size: 20px !important; line-height: 1.25 !important;
        }
        [data-stellar-full-catalog] .stellar-featured-package {
          grid-row: 3; margin: 0 !important; font-size: 15px !important; line-height: 22px !important;
        }
        [data-stellar-full-catalog] product-price {
          grid-row: 4; align-self: center; font-size: 20px !important; font-weight: 700 !important; text-align: center;
        }
        [data-stellar-full-catalog] .stellar-nutrition-description { grid-row: 5; font-size: 15px !important; }
        [data-stellar-full-catalog] .stellar-nutrition-description .stellar-nutrition-source-link { font-size: 14px !important; }
        [data-stellar-full-catalog] .stellar-product-store-link {
          grid-row: 6; align-self: end; justify-self: center; font-size: 14px !important; min-height: 0; padding: 8px 12px;
        }
      }
    `;
    doc.head.append(style);
  }

  const grid = section.querySelector<HTMLElement>(".resource-list--grid");
  if (!grid) return;
  const productCards = [...grid.querySelectorAll<HTMLElement>("product-card")];
  // Keep the package size on its own line for both vegan flavors.
  for (const card of productCards) {
    const heading = card.querySelector<HTMLElement>('[ref="productTitleLink"] [role="heading"]');
    const title = heading?.textContent?.replace(/\s+/g, " ").trim();
    if (!heading || !title || !/^(Vanilla|Chocolate) Vegan Plant Protein Shake 2lb$/.test(title)) continue;
    if (heading.querySelector("[data-stellar-vegan-size]")) continue;
    const size = doc.createElement("span");
    size.setAttribute("data-stellar-vegan-size", "");
    size.style.display = "block";
    size.textContent = "2lb";
    heading.replaceChildren(doc.createTextNode(title.slice(0, -3)), size);
  }
  if (!fullCatalog) {
    const byHandle = new Map<string, HTMLElement>();
    for (const card of productCards) {
      try {
        const handle = JSON.parse(card.getAttribute("view-event-payload") ?? "{}")?.product?.handle;
        if (typeof handle === "string") {
          byHandle.set(handle.replace(/^coming-soon-/, "").replace(/-hidden$/, ""), card);
        }
      } catch {
        // Ignore malformed captured metadata; only cards with known canonical handles are featured.
      }
    }
    const chosen = featuredHandles.map((handle) => byHandle.get(handle)).filter((card): card is HTMLElement => Boolean(card));
    const chosenItems = chosen
      .map((card) => card.closest<HTMLElement>(".resource-list__item"))
      .filter((item): item is HTMLElement => Boolean(item));
    for (const card of productCards) card.closest<HTMLElement>(".resource-list__item")?.remove();
    for (const item of chosenItems) {
      item.hidden = false;
      grid.append(item);
      const card = item.querySelector<HTMLElement>("product-card");
      if (!card) continue;
      const details = doc.createElement("a");
      const title = card.querySelector<HTMLElement>('[ref="productTitleLink"]');
      // Use category headings on the homepage only; preserve the actual products and detail links.
      const handle = JSON.parse(card.getAttribute("view-event-payload") ?? "{}")?.product?.handle;
      const categoryTitle = typeof handle === "string"
        ? featuredCategoryTitles[handle.replace(/^coming-soon-/, "").replace(/-hidden$/, "")]
        : undefined;
      const heading = title?.querySelector<HTMLElement>('[role="heading"]');
      if (heading && categoryTitle) {
        const splitTitle = categoryTitle === "100% Whey Isolate Protein Powders"
          ? "100% Whey Isolate"
          : null;
        if (splitTitle) {
          heading.replaceChildren(
            doc.createTextNode(splitTitle),
            doc.createElement("br"),
            doc.createTextNode("Protein Powders"),
          );
        } else {
          heading.textContent = categoryTitle;
        }
      }
      if (handle === "supplements-lemon-lime-electrolyte-powder") {
        card.setAttribute("data-stellar-featured-electrolyte", "");
        card.querySelector(".stellar-featured-electrolyte-copy")?.remove();
      }
      if (handle === "omega-3-fish-oil-supplement") {
        const bottle = card.querySelector<HTMLImageElement>(".card-gallery img");
        if (bottle) bottle.src = bottle.src.replace(/omega-3-store-bottle\.png$/, "omega-3-store-bottle-no-bg.png");
      }
      details.className = "stellar-featured-detail-link";
      details.href = title?.getAttribute("href") ?? "#";
      details.target = title?.getAttribute("target") ?? "_top";
      details.rel = "noopener noreferrer";
      card.querySelector(".stellar-featured-package")?.remove();
      const canonicalHandle = typeof handle === "string" ? handle.replace(/^coming-soon-/, "").replace(/-hidden$/, "") : "";
      const category = featuredCategoryLinks[canonicalHandle];
      if (category) {
        details.textContent = category.label;
        details.setAttribute("aria-label", category.label);
        details.href = localUrl(category.route);
        for (const link of card.querySelectorAll<HTMLAnchorElement>("a:not(.stellar-nutrition-source-link)")) {
          link.href = details.href;
          link.setAttribute("aria-label", category.label);
        }
      }
      card.querySelector(".product-card__content")?.append(details);
    }
    const productList = section.querySelector<HTMLElement>("#ProductList-template--21473298907310__product_list_fa6P9H");
    productList?.setAttribute("data-stellar-home-featured", "");
    const title = section.querySelector<HTMLElement>("#shop-products h2");
    if (title) {
      title.textContent = "Featured Products";
      let note = section.querySelector<HTMLElement>("#stellar-new-products-note");
      if (!note) {
        note = doc.createElement("p");
        note.id = "stellar-new-products-note";
        note.style.cssText = "margin:12px 0 0;text-align:center;font-size:16px;font-weight:400;line-height:1.5;letter-spacing:0.02em";
        title.after(note);
      }
      note.textContent = "New Look, Same Formula";
    }
    section.setAttribute("data-stellar-featured-section", "");
    story.before(section);
  } else {
    section.setAttribute("data-stellar-full-catalog", "");
    sortShopAllProducts(grid);
    for (const card of grid.querySelectorAll<HTMLElement>("product-card")) {
      const handle = JSON.parse(card.getAttribute("view-event-payload") ?? "{}")?.product?.handle;
      if (typeof handle !== "string") continue;
      const canonical = handle.replace(/^coming-soon-/, "").replace(/-hidden$/, "");
      const powder = [...proteinProducts, ...veganProducts, ...electrolyteProducts].find(product => product.handle === canonical);
      const supplement = supplements.find(product => product.storePath === `/products/${canonical}`);
      if (!powder && !supplement) continue;
      card.querySelector(".stellar-featured-package")?.remove();
      const note = doc.createElement("p");
      note.className = "stellar-featured-package";
      note.style.cssText = "text-align:center;font-size:13px;line-height:1.6;white-space:pre-line;margin:8px 0";
      if (powder) {
        const size = powder.formula === "electrolyte" ? "4.76 oz (135 g)" : powder.size.replace(/(\d)\s*lb/, "$1 lb");
        note.textContent = [powder.flavor, size].join(" · ");
      } else if (supplement) {
        note.textContent = supplement.count;
      }
      card.querySelector(".product-card__content")?.append(note);
    }
    section.querySelector("#stellar-new-products-note")?.remove();
    const productList = section.querySelector<HTMLElement>("#ProductList-template--21473298907310__product_list_fa6P9H");
    productList?.removeAttribute("data-stellar-home-featured");
    const title = section.querySelector<HTMLElement>("#shop-products h2");
    if (title) title.textContent = "Shop All Products";
    // Keep the full captured product list and its existing category filters on this route.
    story.before(section);
    initializeShopAllCards(doc, section, localUrl);
  }

  // Snapshot links cannot navigate the outer Canvas board. The host app must
  // navigate its own frame, just as it does for the Read More comparison link.
  const bindPreviewNavigation = (link: HTMLAnchorElement) => {
    // Books and tools still use the real store. Keep their native new-tab
    // navigation: sending them into the preview iframe can be blocked by the
    // destination's framing policy and replaces the local review.
    if (new URL(link.href, window.location.href).origin !== window.location.origin) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return;
    }
    link.target = "_parent";
    if (link.hasAttribute("data-stellar-shop-navigation")) return;
    link.setAttribute("data-stellar-shop-navigation", "");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign(link.href);
    });
  };
  for (const link of section.querySelectorAll<HTMLAnchorElement>("product-card a:not(.stellar-nutrition-source-link)")) {
    bindPreviewNavigation(link);
  }
  for (const link of doc.querySelectorAll<HTMLAnchorElement>('a[href="#shop-products"]')) {
    const label = link.textContent?.replace(/\s+/g, " ").trim().toLowerCase();
    if (label?.includes("shop all products")) {
      link.href = localUrl("/shop");
      bindPreviewNavigation(link);
    }
  }

  let ctas = doc.getElementById("stellar-homepage-shop-links");
  if (!ctas) {
    ctas = doc.createElement("nav");
    ctas.id = "stellar-homepage-shop-links";
    ctas.setAttribute("aria-label", "Explore Stellar Labs products");
    const allProducts = doc.createElement("a");
    allProducts.href = localUrl("/shop");
    allProducts.target = "_top";
    allProducts.textContent = "SHOP ALL PRODUCTS";
    allProducts.setAttribute("data-testid", "link-shop-all-products");
    ctas.append(allProducts);
  }
  ctas.querySelector('[data-testid="link-shop-supplements"]')?.remove();
  for (const link of ctas.querySelectorAll<HTMLAnchorElement>("a")) {
    bindPreviewNavigation(link);
  }
  story.insertAdjacentElement("afterend", ctas);
}
