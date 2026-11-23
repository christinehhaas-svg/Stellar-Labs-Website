import { initializeTopNavigation } from "./_shared/top-navigation";
import { ensureFaqFooterLink } from "./_shared/footer-faq-link";

/** The review website owns its assets and routes; it never depends on Canvas URLs. */
export function reviewUrl(route: string) {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${route.replace(/^\//, "")}`;
}

export function reviewAsset(capturedPath: string) {
  if (!capturedPath.startsWith("/__mockup/")) {
    throw new Error(`Unexpected captured asset path: ${capturedPath}`);
  }
  return reviewUrl(`/review-assets/${capturedPath.slice("/__mockup/".length)}`);
}

/** Native top-level navigation works even in our script-disabled snapshot frames. */
export function initializeReviewLinks(doc: Document) {
  restoreCategoryNavigation(doc);
  initializeTopNavigation(doc, reviewUrl);
  ensureFaqFooterLink(doc);
  // The removed Shopify accordion runtime normally opens these desktop menus.
  // Start expanded so the footer remains visible and usable without that script.
  for (const menu of doc.querySelectorAll<HTMLDetailsElement>("footer details")) menu.open = true;
  // The captured Shopify layout fixes its scroll wrapper to viewport height.
  // Portal content must retain its intrinsic height rather than flex-shrinking
  // to that viewport and painting underneath the following storefront footer.
  if (doc.getElementById("supplements-app-mount") && !doc.getElementById("review-flow-layout")) {
    const style = doc.createElement("style");
    style.id = "review-flow-layout";
    style.textContent = `
      .page-wrapper > #MainContent { flex: 0 0 auto !important; height: auto !important; }
      .page-wrapper > footer { flex: 0 0 auto !important; }
    `;
    doc.head.append(style);
  }
  const routes: Record<string, string> = {
    "Store Locator": "/pages/store-locator",
    "About": "/pages/about-us",
    "Contact Us": "/pages/contact",
    "FAQs": "/pages/faqs",
    "FAQ": "/pages/faqs",
    "Shipping & Policies": "/pages/shipping-information",
    "Refund policy": "/pages/shipping-information",
    "Shipping policy": "/pages/shipping-information",
    "Shop Lean Nutrition": "/shop",
    "Whey Protein": "/?category=100-isolate-whey-protein",
    "Vegan Protein": "/?category=vegan-plant-protein",
    "Plant-Based Protein": "/?category=vegan-plant-protein",
    "Electrolytes": "/?category=electrolyte",
    "Supplements": "/supplements",
    "Recipes": "/recipes",
    "Shop All": "/shop",
  };
  const footerPages: Record<string, string> = {
    "Ambassadors": "https://stellarlabs.refersion.com/",
    "Your Privacy Choices": "https://www.stellarlabsnutrition.com/pages/data-sharing-opt-out",
  };
  for (const link of doc.querySelectorAll<HTMLAnchorElement>("a")) {
    const label = link.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (/^Plant-Based Protein$/i.test(label)) link.textContent = "Vegan Protein";
    if (link.closest("footer") && footerPages[label]) {
      link.href = footerPages[label];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    if (routes[label]) {
      link.href = reviewUrl(routes[label]);
      link.target = "_parent";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.assign(link.href);
      });
    }
  }
  for (const logo of doc.querySelectorAll<HTMLAnchorElement>(".header-logo a, a.header-logo, a.header__heading-link")) {
    logo.href = reviewUrl("/");
    logo.target = "_top";
  }
}

/** Product shells omit the homepage's script-free category navigation. */
function restoreCategoryNavigation(doc: Document) {
  const header = doc.querySelector("#header-component");
  if (!header) return;
  if (doc.getElementById("supplements-app-mount")) header.setAttribute("data-stellar-supplement-nav", "");
  let nav = doc.querySelector<HTMLElement>(".stellar-shop-navigation");
  if (!nav) {
    nav = doc.createElement("nav");
    nav.className = "stellar-shop-navigation";
    nav.setAttribute("aria-label", "Shop");
    const navHost = header.querySelector<HTMLElement>('[data-testid="header-top-center"]') ?? header;
    navHost.append(nav);
  }
  if (!nav.querySelector(".stellar-shop-navigation__menu")) {
    let links = nav.querySelector<HTMLElement>(".stellar-shop-navigation__links");
    if (!links) {
      links = doc.createElement("div");
      links.className = "stellar-shop-navigation__links";
      for (const label of ["Whey Protein", "Vegan Protein", "Electrolytes", "Supplements", "Recipes", "Shop All"]) {
        const link = doc.createElement("a");
        link.textContent = label;
        link.href = "#";
        links.append(link);
      }
    }
    const menu = doc.createElement("details");
    menu.className = "stellar-shop-navigation__menu";
    const summary = doc.createElement("summary");
    summary.textContent = "Shop menu";
    summary.setAttribute("aria-label", "Shop menu");
    menu.append(summary, links);
    nav.append(menu);
  }
  const links = nav.querySelector(".stellar-shop-navigation__links");
  if (links) {
    const anchors = Array.from(links.querySelectorAll("a"));
    const recipes = anchors.find(link => link.textContent?.trim().toLowerCase() === "recipes");
    let shopAll = anchors.find(link => link.textContent?.trim().toLowerCase() === "shop all");
    if (!shopAll) {
      shopAll = doc.createElement("a");
      shopAll.textContent = "Shop All";
      shopAll.href = reviewUrl("/shop");
      links.append(shopAll);
    }
    if (recipes) recipes.after(shopAll);
    shopAll.style.display = "inline-flex";
    shopAll.style.alignItems = "center";
    shopAll.style.gap = "6px";
    shopAll.querySelectorAll(".stellar-shop-all-icon").forEach(icon => icon.remove());
  }
  const menu = nav.querySelector<HTMLDetailsElement>(".stellar-shop-navigation__menu");
  if (menu && !menu.hasAttribute("data-stellar-responsive-menu")) {
    const desktop = doc.defaultView?.matchMedia("(min-width: 768px)");
    const updateMenu = () => { menu.open = desktop?.matches ?? true; };
    updateMenu();
    desktop?.addEventListener("change", updateMenu);
    menu.setAttribute("data-stellar-responsive-menu", "");
  }
  if (doc.getElementById("stellar-review-shop-navigation-style")) return;
  const style = doc.createElement("style");
  style.id = "stellar-review-shop-navigation-style";
  style.textContent = `
    #header-component .stellar-shop-navigation { display:block!important; padding:0!important; width:100%; }
    #header-component .stellar-shop-navigation__menu > summary { display:none; }
    #header-component .stellar-shop-navigation__links { display:flex!important; align-items:center; justify-content:center; flex-wrap:wrap; gap:clamp(15px,2.1vw,27px); }
    #header-component .stellar-shop-navigation a { font-size:13px; }
    @media(max-width:767px) {
      #header-component { position:relative!important; }
      #header-component .header__row--top .header__columns { grid-template-rows:54px!important; padding-bottom:0!important; min-height:54px!important; }
      #header-component [data-testid="header-top-center"] { display:contents!important; }
      #header-component .header__drawer { visibility:hidden; }
      #header-component .stellar-shop-navigation { position:absolute!important; z-index:40; top:50%; left:10px; right:auto; width:auto!important; padding:0!important; transform:translateY(-50%); }
      #header-component .stellar-shop-navigation__menu { position:relative; }
      #header-component .stellar-shop-navigation__menu > summary {
        display:flex; align-items:center; gap:7px; min-height:42px; padding:0 7px;
        color:inherit; font-size:0; width:42px; justify-content:center; font-weight:600; list-style:none; cursor:pointer;
      }
      #header-component .stellar-shop-navigation__menu > summary::-webkit-details-marker { display:none; }
      #header-component .stellar-shop-navigation__menu > summary::before {
        content:""; display:inline-block; width:17px; height:12px; border-top:2px solid currentColor;
        border-bottom:2px solid currentColor; background:linear-gradient(currentColor,currentColor) center / 100% 2px no-repeat;
      }
      #header-component .stellar-shop-navigation__links {
        display:none!important; position:absolute; top:calc(100% + 5px); left:0; right:auto; width:min(260px, calc(100vw - 28px));
        padding:12px; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px;
        background:#25282d; box-shadow:0 8px 22px rgba(0,0,0,.22);
      }
      #header-component .stellar-shop-navigation__menu[open] .stellar-shop-navigation__links { display:grid!important; }
      #header-component .stellar-shop-navigation__links a { display:flex; align-items:center; min-height:42px; padding:8px; font-size:12px!important; text-align:left; white-space:normal; }
      #header-component .stellar-shop-navigation__links a[data-stellar-hide="true"] { display:flex!important; }
      #header-component .stellar-shop-navigation__links a:focus-visible { outline:2px solid #00b7d3; outline-offset:2px; }
    }
  `;
  doc.head.append(style);
}
