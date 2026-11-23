import { nutritionDescriptions } from "./_shared/nutrition-data";
import proteinProducts from "./_shared/protein-products.json";
import electrolyteProducts from "./_shared/electrolyte-products.json";
import veganProducts from "./_shared/vegan-products.json";
import { reviewAsset, reviewUrl } from "./review-links";
import { packageImages, packageFrontStyle, isIllustrativePackage } from "./_shared/package-images";
import { initializeHomepageProductLayout } from "./_shared/homepage-product-layout";
import { supplements } from "./_shared/supplements-data";

const storefrontPreview = "https://www.stellarlabsnutrition.com";

/**
 * Restore browsing in the sanitized snapshot without loading Shopify scripts,
 * tracking, cart mutations, or checkout into the mockup.
 */
export function initializeHomepageProducts(document: Document) {
  // New preview-only sizes have no captured Shopify card; their fronts are disclosed mockups.
  const grid = document.querySelector(".resource-list--grid");
  for (const product of proteinProducts.filter(isIllustrativePackage)) {
    if (!grid || grid.querySelector(`[data-stellar-product="${product.handle}"]`)) continue;
    const item = document.createElement("div");
    item.className = "resource-list__item";
    item.dataset.productTags = "whey-protein,100-isolate-whey-protein";
    item.dataset.stellarProduct = product.handle;
    const card = document.createElement("product-card");
    card.setAttribute("view-event-payload", JSON.stringify({ product: { handle: product.handle, title: product.title } }));
    card.innerHTML = `<div class="product-card__content">
      <div class="card-gallery"><a href="${reviewUrl(`/products/${product.handle}`)}" style="display:flex;align-items:center;justify-content:center;aspect-ratio:1;background:transparent"><img src="${reviewAsset(product.images[0].src)}" alt="${product.title} — illustrative bottle mockup" loading="lazy" style="width:100%;height:100%;object-fit:contain"></a></div>
      <a ref="productTitleLink" href="${reviewUrl(`/products/${product.handle}`)}"><h3 role="heading">${product.title}</h3></a>
      <p>$${(product.price / 100).toFixed(2)}</p>
    </div>`;
    item.append(card);
    grid.append(item);
  }
  initializeHomepageProductLayout(document);
  const originalMenuPaths: Record<string, string> = {
    "Whey Protein": "/collections/whey-protein",
    "Vegan Protein": "/collections/vegan-bars",
    "Electrolytes": "/collections/electrolytes",
    "Supplements": "/collections/supplements",
    "Recipes": "/blogs/recipes",
    "Shop All": "/collections/products",
  };
  for (const link of document.querySelectorAll<HTMLAnchorElement>("a.menu-list__link, a.menu-drawer__menu-item")) {
    const label = link.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const path = originalMenuPaths[label];
    if (!path) continue;
    link.href = `${storefrontPreview}${path}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  const cards = document.querySelectorAll<HTMLElement>("product-card");
  const regularChocolateVegan = [...cards].find((card) =>
    JSON.parse(card.getAttribute("view-event-payload") ?? "{}")?.product?.handle === "chocolate-vegan-shake");
  for (const card of cards) {
    const metadata = card.getAttribute("view-event-payload");
    if (!metadata) throw new Error("The captured product is missing its metadata.");
    const { product } = JSON.parse(metadata);
    // Subscription variants retain their browsing identity, but not the
    // captured renewal promotion in visible or accessible product names.
    const powder = [...proteinProducts, ...veganProducts].find(item => item.handle === product.handle);
    const cleanTitle = (title: string) => powder ? powder.title : product.handle === "the-low-lean-lose-fat-high-protein-no-bloat-diet"
      ? "The Low and Lean Eating System"
      : title.replace(/\s*(?:\d+(?:\.\d+)?%\s*Off\s*)?Auto[\s-]*renews?\b/gi, "").trim();
    if (typeof product.title === "string" && cleanTitle(product.title) !== product.title) {
      const originalTitle = product.title;
      product.title = cleanTitle(originalTitle);
      const walker = document.createTreeWalker(card, 4);
      let text: Node | null;
      while ((text = walker.nextNode())) {
        if (text.nodeValue?.includes(originalTitle)) text.nodeValue = text.nodeValue.replaceAll(originalTitle, product.title);
      }
      for (const element of card.querySelectorAll<HTMLElement>("*")) {
        for (const attribute of ["aria-label", "data-product-title", "title", "alt"]) {
          const value = element.getAttribute(attribute);
          if (value?.includes(originalTitle)) element.setAttribute(attribute, value.replaceAll(originalTitle, product.title));
        }
      }
      const payload = JSON.parse(metadata);
      payload.product.title = product.title;
      card.setAttribute("view-event-payload", JSON.stringify(payload));
    }
    if (typeof product?.handle !== "string" || !product.handle) {
      throw new Error("The captured product is missing its original store handle.");
    }

    const canonicalHandle = product.handle.replace(/^coming-soon-/, "").replace(/-hidden$/, "");
    if (electrolyteProducts.some((item) => item.handle === canonicalHandle && item.discontinued)) {
      (card.closest(".resource-list__item") ?? card).remove();
      continue;
    }
    // Keep the regular 2 lb bottle, not its captured subscription duplicate.
    if (canonicalHandle === "chocolate-vegan-shake" && regularChocolateVegan && card !== regularChocolateVegan) {
      (card.closest(".resource-list__item") ?? card).remove();
      continue;
    }
    const supplement = supplements.find((item) =>
      item.storePath === `/products/${canonicalHandle}` ||
      (canonicalHandle === "magnesium" && item.id === "magnesium-complex"));
    if (supplement) {
      const gallery = card.querySelector<HTMLElement>(".card-gallery");
      if (gallery) {
        const imageLink = document.createElement("a");
        imageLink.href = reviewUrl(`/supplement-details?product=${encodeURIComponent(supplement.id)}`);
        imageLink.setAttribute("aria-label", `View ${supplement.name} product details and label`);
        imageLink.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;background:#f6f6f5";
        const image = document.createElement("img");
        image.src = supplement.bottle;
        image.alt = `${supplement.name} — bottle mockup`;
        image.loading = "lazy";
        image.width = 400;
        image.height = 400;
        image.style.cssText = "display:block;width:100%;height:100%;object-fit:contain";
        imageLink.append(image);
        gallery.replaceChildren(imageLink);
      }
    }
    const proteinPreview = [...proteinProducts, ...veganProducts, ...electrolyteProducts].find((item) => item.handle === canonicalHandle);
    if (proteinPreview?.formula === "vegan") {
      const gallery = card.querySelector<HTMLElement>(".card-gallery");
      if (gallery && !gallery.querySelector("img")) {
        const imageLink = document.createElement("a");
        imageLink.setAttribute("aria-label", `View ${proteinPreview.title} product details`);
        imageLink.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;background:transparent";
        const image = document.createElement("img");
        image.src = reviewAsset(packageImages(proteinPreview)[0].src);
        image.alt = `${proteinPreview.title} — original package front`;
        image.loading = "lazy";
        image.width = 400;
        image.height = 400;
        image.style.cssText = "display:block;width:100%;height:100%;object-fit:contain";
        imageLink.append(image);
        gallery.replaceChildren(imageLink);
      }
    }
    if (proteinPreview && (
      (proteinPreview.formula === "isolate" && proteinPreview.size === "2lb")
      || proteinPreview.component === "ProteinCappuccino"
      || isIllustrativePackage(proteinPreview)
    )) {
      const photo = card.querySelector<HTMLImageElement>("img");
      if (photo) {
        photo.src = reviewAsset(packageImages(proteinPreview)[0].src);
        photo.removeAttribute("srcset");
        Object.assign(photo.style, packageFrontStyle(proteinPreview));
      }
    }
    const localPreview = Boolean(proteinPreview || supplement);
    const href = supplement
      ? reviewUrl(`/supplement-details?product=${encodeURIComponent(supplement.id)}`)
      : proteinPreview ? reviewUrl(`/products/${proteinPreview.handle}`)
      : `${storefrontPreview}/products/${encodeURIComponent(product.handle)}`;
    for (const link of card.querySelectorAll<HTMLAnchorElement>("a:not(.stellar-nutrition-source-link)")) {
      link.href = href;
      link.target = localPreview ? "_top" : "_blank";
      link.rel = "noopener noreferrer";
    }

    const nutrition = nutritionDescriptions[product.handle];
    const content = card.querySelector<HTMLElement>(".product-card__content");
    if (nutrition && content && !content.querySelector(".stellar-nutrition-description")) {
      const block = document.createElement("section");
      block.className = "stellar-nutrition-description";
      block.setAttribute("aria-label", `${nutrition.category} product information`);

      const category = document.createElement("p");
      category.className = "stellar-nutrition-category";
      category.textContent = nutrition.category;
      block.append(category);

      const description = document.createElement("p");
      description.className = "stellar-nutrition-copy";
      description.textContent = nutrition.description;
      block.append(description);

      const benefits = document.createElement("ul");
      benefits.className = "stellar-nutrition-benefits";
      for (const benefit of nutrition.benefits) {
        const item = document.createElement("li");
        item.textContent = benefit;
        benefits.append(item);
      }
      block.append(benefits);

      const details = document.createElement("details");
      details.className = "stellar-nutrition-details";
      const summary = document.createElement("summary");
      summary.textContent = "Product details";
      details.append(summary);

      const detailSections: [string, string | string[]][] = [
        ["Suggested use", nutrition.use],
        ["Supplement facts", nutrition.facts],
        ["Warnings", nutrition.notes],
      ];
      for (const [headingText, contentValue] of detailSections) {
        const section = document.createElement("div");
        section.className = "stellar-nutrition-detail-section";
        const heading = document.createElement("h4");
        heading.textContent = headingText;
        section.append(heading);
        if (Array.isArray(contentValue)) {
          const list = document.createElement("ul");
          for (const fact of contentValue) {
            const item = document.createElement("li");
            item.textContent = fact;
            list.append(item);
          }
          section.append(list);
        } else {
          const text = document.createElement("p");
          text.textContent = contentValue;
          section.append(text);
        }
        details.append(section);
      }

      const source = document.createElement("a");
      source.className = "stellar-nutrition-source-link";
      source.href = nutrition.source;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "View source listing";
      if (proteinPreview?.source !== "") details.append(source);
      block.append(details);

      const existingStoreLink = content.querySelector(".stellar-product-store-link");
      content.insertBefore(block, existingStoreLink);
    }

    // The captured quick-add controls depend on the removed commerce runtime.
    // Direct visitors to the original product page instead of an inert cart.
    card.querySelectorAll("quick-add-component").forEach((control) => control.remove());
    if (content && !content.querySelector(".stellar-product-store-link")) {
      const link = document.createElement("a");
      link.className = "button stellar-product-store-link";
      link.href = href;
      link.target = localPreview ? "_top" : "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View product";
      link.setAttribute("aria-label", localPreview
        ? `View ${product.title} product-page preview`
        : `View ${product.title} in the original Shopify store preview`);
      link.style.cssText = "align-self:center;margin:12px auto 0;width:fit-content;";
      content.append(link);
    }
  }

  const filters = document.querySelectorAll<HTMLButtonElement>(".product-tag-filter");
  for (const filter of filters) {
    if (filter.dataset.filterTag === "electrolyte") filter.textContent = "Electrolytes";
  }
  const items = document.querySelectorAll<HTMLElement>(".resource-list__item[data-product-tags]");
  const selectFilter = (selected: HTMLButtonElement) => {
    const tag = selected.dataset.filterTag;
    for (const filter of filters) {
      const active = filter === selected;
      filter.classList.toggle("is-active", active);
      filter.setAttribute("aria-pressed", String(active));
    }
    for (const item of items) {
      item.hidden = tag !== "all" && !item.dataset.productTags?.split(",").includes(tag ?? "");
    }
  };
  for (const filter of filters) {
    filter.addEventListener("click", () => selectFilter(filter));
  }
  const requestedTag = new URLSearchParams(window.location.search).get("category");
  const selected = Array.from(filters).find((filter) => filter.dataset.filterTag === requestedTag)
    ?? document.querySelector<HTMLButtonElement>('[data-filter-tag="all"]');
  if (selected) selectFilter(selected);
}