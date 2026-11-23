/**
 * Focused presentation layer for the captured homepage.  The original Shopify
 * document and its product content remain intact; only its header and hero are
 * arranged to match the supplied merchant reference.
 *
 * Keep this file identical in review and Canvas; pnpm test:homepage:parity
 * enforces this. Route/asset differences belong in the supplied adapters.
 */
export function initializeHomepageTypography(
  doc: Document,
  localUrl: (route: string) => string = route => route,
  localAsset: (path: string) => string = path => path,
) {
  const header = doc.querySelector<HTMLElement>("#header-component");
  const hero = doc.querySelector<HTMLElement>("#shopify-section-template--21473298907310__section_kBK3Vn");
  if (!header || !hero) return;

  const storySection = [...doc.querySelectorAll("h2")]
    .find(element => element.textContent?.trim() === "Why Stellar Labs?")
    ?.closest('[id^="shopify-section-"]');
  const storyPhoto = storySection?.querySelector<HTMLImageElement>(".image-block__image");
  if (storyPhoto) {
    storyPhoto.dataset.stellarStoryPhoto = "";
    storyPhoto.src = localAsset("/__mockup/stellar-current/assets/stellar-berry-shake-lifestyle.png");
    storyPhoto.removeAttribute("srcset");
    storyPhoto.alt = "Berry shake in a glass beside a bowl of raspberries on a marble surface";
    storyPhoto.width = 800;
    storyPhoto.height = 533;
    storyPhoto.style.cssText = "display:block;width:100%;height:auto;aspect-ratio:800 / 533;object-fit:contain;border:0";
    storyPhoto.parentElement?.style.setProperty("--ratio", "800 / 533");
  }

  const announcement = doc.querySelector<HTMLElement>(".announcement-bar__text");
  if (announcement) announcement.textContent = "Subscribe & save 10%";

  const nav = doc.querySelector<HTMLElement>(".stellar-shop-navigation");
  const center = header.querySelector<HTMLElement>('[data-testid="header-top-center"]');
  if (nav && center && nav.parentElement !== center) center.append(nav);
  if (nav) {
    nav.setAttribute("aria-label", "Shop");
    const heading = nav.querySelector<HTMLElement>(".stellar-shop-navigation__heading");
    if (heading) heading.hidden = true;
    nav.querySelectorAll<HTMLAnchorElement>("a").forEach(link => {
      const label = link.textContent?.trim();
      if (label === "Shop All") delete link.dataset.stellarHide;
    });
  }

  const heading = [...hero.querySelectorAll("h1")].find(
    element => element.textContent?.trim().toUpperCase() === "LEAN NUTRITION",
  );
  const copy = heading?.closest<HTMLElement>('[data-testid="group-block"]');
  const art = [...hero.querySelectorAll<HTMLElement>('[data-testid="group-block"]')].find(
    group => group.querySelector(".image-block__image"),
  );
  const sectionContent = hero.querySelector<HTMLElement>('[data-testid="section-content"]');
  if (heading && copy && art && sectionContent) {
    hero.dataset.stellarHomeHero = "";
    heading.dataset.stellarLeanHeadline = "";
    copy.dataset.stellarHeroCopy = "";
    art.dataset.stellarHeroArt = "";
    sectionContent.dataset.stellarHeroContent = "";
    hero.querySelector<HTMLElement>(".custom-section-content")?.setAttribute("data-stellar-hero-shell", "");
    hero.querySelector<HTMLElement>(".section-content-wrapper")?.setAttribute("data-stellar-hero-layout", "");
    const heroPhoto = art.querySelector<HTMLImageElement>(".image-block__image");
    if (heroPhoto) {
      heroPhoto.src = localAsset("/__mockup/stellar-current/assets/stellar-homepage-approved-photo.webp");
      heroPhoto.alt = "Stellar Labs Vanilla Whey Protein Shake bottle beside a shake glass and protein powder";
    }
    const subtitle = heading.parentElement?.parentElement?.querySelector("p");
    if (subtitle) {
      subtitle.replaceChildren(
        doc.createTextNode("High-protein shakes, "),
        Object.assign(doc.createElement("span"), {
          textContent: "electrolyte-rich hydration, and supplements.",
        }),
      );
      subtitle.hidden = false;
      subtitle.style.removeProperty("display");
    }
    let tagline = copy.querySelector<HTMLElement>(".stellar-calorie-note");
    if (!tagline) {
      tagline = doc.createElement("span");
      tagline.className = "stellar-calorie-note";
      heading.parentElement?.insertAdjacentElement("afterend", tagline);
    }
    tagline.textContent = "Make Every Calorie Count";
    copy.querySelectorAll(".stellar-founder-note").forEach(element => element.remove());
    let formula = sectionContent.querySelector<HTMLElement>(".stellar-packaging-note");
    if (!formula) {
      formula = doc.createElement("span");
      formula.className = "stellar-packaging-note";
      sectionContent.append(formula);
    }
    formula.textContent = "New Look, Same Formula";
    const cta = copy.querySelector<HTMLAnchorElement>("a.button");
    if (cta) {
      cta.textContent = "SHOP ALL PRODUCTS";
    }
    art.append(formula);
    const note = copy.querySelector<HTMLElement>(".stellar-formula-note");
    if (note) note.hidden = true;
  }

  // Search and cart are intentionally static review artwork, not commerce tools.
  header.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Search"], button[data-testid="cart-drawer-trigger"]',
  ).forEach(button => {
    button.removeAttribute("on:click");
    button.setAttribute("aria-disabled", "true");
    button.tabIndex = -1;
    button.title = `${button.getAttribute("aria-label") || "Store"} — preview only`;
  });

  let categoryNav = doc.querySelector<HTMLElement>("#stellar-home-categories");
  if (!categoryNav) {
    categoryNav = doc.createElement("nav");
    categoryNav.id = "stellar-home-categories";
    categoryNav.setAttribute("aria-label", "Browse product categories");
    const items = [
      { label: "Whey Proteins", route: "/?category=100-isolate-whey-protein" },
      { label: "Vegan Protein", route: "/?category=vegan-plant-protein" },
      { label: "Electrolytes", route: "/?category=electrolyte" },
      { label: "Supplements", route: "/supplements" },
    ];
    for (const item of items) {
      const link = doc.createElement("a");
      link.textContent = item.label;
      link.href = localUrl(item.route);
      link.target = "_parent";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.assign(link.href);
      });
      categoryNav.append(link);
    }
    hero.insertAdjacentElement("afterend", categoryNav);
  }

  if (!doc.getElementById("stellar-reference-header-hero")) {
    const style = doc.createElement("style");
    style.id = "stellar-reference-header-hero";
    style.textContent = `
      :root { --stellar-reference-ink: #0b0d11; --stellar-reference-cyan: #28b9ef; }
      #header-group {
        position: sticky !important; top: 0; z-index: 50; isolation: isolate;
        background: var(--stellar-reference-ink) !important;
      }
      #shopify-section-sections--21473299005614__header_announcements_9jGBFp .announcement-bar {
        min-height: 36px; box-sizing: border-box; padding: 0 12px !important;
        border-bottom: 1px solid rgba(255,255,255,.52);
        background: var(--stellar-reference-ink) !important;
      }
      #shopify-section-sections--21473299005614__header_announcements_9jGBFp .announcement-bar__text {
        margin: 0; color: #f4f4f4; font: 600 14px/1.15 "TT Hoves", sans-serif;
        letter-spacing: .005em; text-align: center;
      }
      #header-component {
        --color-background-top-row: var(--stellar-reference-ink) !important;
        --color-background-bottom-row: var(--stellar-reference-ink) !important;
        --color-foreground: #f7f7f7 !important;
        --color-foreground-rgb: 247 247 247 !important;
        color: #f7f7f7 !important; background: var(--stellar-reference-ink) !important;
      }
      #header-component .header__row--top {
        display: block !important; padding: 0 !important;
        background: var(--stellar-reference-ink) !important;
      }
      #header-component .header__row--top .header__columns {
        display: grid !important; grid-template-columns: minmax(210px, 28%) minmax(0,1fr) auto !important;
        align-items: center !important; gap: clamp(18px, 3vw, 46px) !important;
        padding: 0 clamp(24px, 3.7vw, 50px) !important; min-height: 80px;
      }
      #header-component [data-testid="header-top-left"] {
        display: flex !important; align-items: center; justify-content: flex-start !important;
        min-width: 0; width: auto !important;
      }
      #header-component .header__drawer,
      #header-component .header-menu-group,
      #header-component .header__navigation-bar-row { display: none !important; }
      #header-component .header-logo {
        display: flex !important; align-items: center; padding: 0 !important; margin: 0 !important;
      }
      #header-component .header-logo__image { display: block !important; width: clamp(220px, 27vw, 276px) !important; height: auto !important; }
      #header-component [data-testid="header-top-center"] {
        display: flex !important; align-items: center; justify-content: center; min-width: 0; width: 100%;
      }
      #header-component [data-testid="header-top-right"] {
        display: flex !important; align-items: center; justify-content: flex-end !important;
        gap: 17px; width: auto !important;
      }
      #header-component header-actions { display: flex !important; align-items: center; gap: 17px; }
      #header-component .account-button { display: none !important; }
      #header-component .header-actions__action {
        display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 30px;
        padding: 0 !important; color: #f6f6f6 !important; opacity: 1;
      }
      #header-component .header-actions__action svg { width: 22px; height: 22px; }
      #header-component .search-action--hidden-on-menu { display: none !important; }
      #header-component .stellar-shop-navigation {
        display: block !important; width: auto !important; min-width: 0; padding: 0 !important;
        background: transparent !important; color: #f7f7f7 !important;
        font-family: "TT Hoves", sans-serif !important;
      }
      #header-component .stellar-shop-navigation__heading { display: none !important; }
      #header-component .stellar-shop-navigation__links {
        display: flex !important; align-items: center; justify-content: center; flex-wrap: nowrap;
        gap: clamp(15px, 2.1vw, 27px); width: auto;
      }
      #header-component .stellar-shop-navigation__links a {
        color: #f1f1f1 !important; font: 500 clamp(11px, 1.03vw, 14px)/1.3 "TT Hoves", sans-serif !important;
        text-decoration: none; text-transform: none; white-space: nowrap;
        transition: color .16s ease;
      }
      #header-component .stellar-shop-navigation__links a:hover,
      #header-component .stellar-shop-navigation__links a:focus-visible { color: var(--stellar-reference-cyan) !important; text-decoration: none; }
      #header-component .stellar-shop-navigation__links a:focus-visible,
      #stellar-home-categories a:focus-visible { outline: 2px solid var(--stellar-reference-cyan); outline-offset: 4px; }
      #header-component .stellar-shop-navigation__links a[data-stellar-hide="true"] { display: none !important; }
      #header-component .header__underlay { background: var(--stellar-reference-ink) !important; }
      #shopify-section-template--21473298907310__section_kBK3Vn[data-stellar-home-hero] {
        display: block !important; height: clamp(360px, 34vw, 540px) !important;
        min-height: clamp(360px, 34vw, 540px) !important; overflow: hidden;
        background: #42464d !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn[data-stellar-home-hero] > .section.section--full-width {
        display: block !important; height: 100% !important; min-height: 100% !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-shell] {
        position: relative !important; display: block !important; width: 100% !important;
        height: 100% !important; min-height: 100% !important; padding: 0 !important;
        /* Extend the photograph's slate surface behind the live headline. */
        overflow: visible; background-color: #42464d !important;
        background-image: linear-gradient(rgba(13,15,20,.48), rgba(13,15,20,.48)), url("${localAsset("/__mockup/stellar-current/assets/stellar-hero-slate-background.jpg")}") !important;
        background-repeat: no-repeat !important; background-size: cover !important;
        background-position: center !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-layout],
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-content] {
        position: relative !important; display: block !important; width: 100% !important;
        height: 100% !important; min-height: 100% !important; max-width: none !important;
        overflow: visible;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] {
        position: absolute !important; inset: 0 0 0 auto !important; z-index: 0;
        display: block !important; flex: none !important; width: 50% !important;
        height: 100% !important; min-height: 100% !important; max-width: none !important;
        padding: 0 !important; overflow: visible !important; transform: none !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] .group-block-content,
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] .image-block {
        width: 100% !important; height: 100% !important; min-height: 100% !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] .image-block__image {
        display: block; width: auto !important; max-width: 100% !important; height: calc(100% - 36px) !important;
        object-fit: contain; object-position: right center; margin: 0 0 0 auto !important;
        mask-image: none;
      }
      @media (min-width: 768px) {
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] {
          left: 45% !important; right: auto !important; width: 55% !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] .image-block__image {
          margin: 0 auto 0 0 !important; object-position: left center;
        }
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] {
        position: relative !important; z-index: 1; display: flex !important; align-items: flex-start !important;
        flex: none !important; justify-content: center !important; width: 100% !important;
        height: 100% !important; min-height: 100% !important; max-width: none !important;
        padding: 0 54% 0 clamp(30px, 4.2vw, 68px) !important; box-sizing: border-box;
        background: transparent !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] .group-block-content {
        display: flex !important; flex-direction: column !important; align-items: flex-start !important;
        justify-content: center !important; flex-wrap: nowrap !important; gap: clamp(13px, 1.35vw, 20px) !important;
        width: 100% !important; height: 100% !important; min-height: 100% !important;
        max-width: none !important; box-sizing: border-box;
        padding: 0 !important; text-align: left !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] .text-block {
        display: block !important; flex: 0 0 auto !important; align-self: flex-start !important;
        width: auto !important; max-width: none !important; min-width: 0 !important; text-align: left !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn h1[data-stellar-lean-headline] {
        width: max-content !important; max-width: none !important; white-space: nowrap !important;
        margin: 0 !important; color: #f6f6f8 !important;
        font: 450 clamp(36px, 4.2vw, 54px)/1.1 "TT Hoves", sans-serif !important;
        letter-spacing: .025em !important; text-transform: uppercase !important; font-style: normal !important;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] p:not(.stellar-formula-note) {
        text-align: left !important;
        max-width: 500px; margin: 0 !important; color: #f4f5f7 !important;
        font: 350 clamp(18px, 1.7vw, 22px)/1.45 "TT Hoves", sans-serif !important;
        letter-spacing: .005em; text-wrap: balance;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] p:not(.stellar-formula-note) span {
        display: block;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] a.button {
        display: inline-flex; min-height: 50px; min-width: 242px; align-items: center; justify-content: center;
        box-shadow: none !important;
        margin-top: 4px; padding: 0 38px !important; border: 0 !important; border-radius: 3px !important;
        background: var(--stellar-reference-cyan) !important; color: #051018 !important;
        font: 700 15px/1 "TT Hoves", sans-serif !important; letter-spacing: .035em;
        text-decoration: none; transition: background-color .16s ease, transform .16s ease;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] a.button:hover {
        background: #57cbf4 !important; transform: translateY(-1px);
      }
      #stellar-home-categories {
        display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); align-items: center;
        min-height: 76px; padding: 0 8%; background: var(--stellar-reference-ink);
      }
      #shopify-section-template--21473298907310__section_kBK3Vn .stellar-founder-note {
        display: block; color: #d1d4db; margin: 0;
        font: 400 clamp(11px, 1.05vw, 13px)/1.4 "TT Hoves", sans-serif;
        letter-spacing: .04em;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn .stellar-calorie-note {
        display: block; color: #f4f4f6; margin: 0;
        max-width: 520px; font: 500 clamp(22px, 2.1vw, 28px)/1.25 "TT Hoves", sans-serif;
      }
      #shopify-section-template--21473298907310__section_kBK3Vn .stellar-packaging-note {
        position: absolute; bottom: 8px; left: 0; width: 100%; text-align: center;
        z-index: 2; display: block; margin: 0; padding: 0 12px;
        max-width: 100%; background: transparent; color: #f0f1f3;
        font: 500 clamp(14px, 1.25vw, 17px)/1.3 "TT Hoves", sans-serif; letter-spacing: .025em;
      }
      #stellar-home-categories a {
        display: flex; align-items: center; justify-content: center; min-height: 28px;
        color: #eeeef0; font: 500 15px/1.2 "TT Hoves", sans-serif; letter-spacing: .16em;
        text-align: center; text-decoration: none; text-transform: uppercase;
        transition: color .16s ease;
      }
      #stellar-home-categories a + a { border-left: 1px solid rgba(255,255,255,.5); }
      #stellar-home-categories a:hover { color: var(--stellar-reference-cyan); }
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row {
        gap: 20px 32px !important;
      }
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout {
        gap: 13px !important; font-size: 15px !important; line-height: 1.35 !important;
      }
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout svg {
        width: 42px !important; height: 42px !important; flex-basis: 42px !important;
      }
      @media (min-width: 768px) and (max-width: 900px) {
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] p:not(.stellar-formula-note) {
          font-size: 16px !important;
        }
      }
      @media (max-width: 767px) {
        #shopify-section-sections--21473299005614__header_announcements_9jGBFp .announcement-bar { min-height: 34px; }
        #shopify-section-sections--21473299005614__header_announcements_9jGBFp .announcement-bar__text { font-size: 12px; }
        #header-component .header__row--top .header__columns {
          grid-template-columns: minmax(0,1fr) auto !important; grid-template-rows: 58px auto;
          gap: 0 !important; padding: 0 17px 10px !important; min-height: 0;
        }
        #header-component [data-testid="header-top-left"] { grid-column: 1; grid-row: 1; }
        #header-component [data-testid="header-top-center"] {
          grid-column: 1 / -1; grid-row: 2; justify-content: flex-start; width: 100%;
        }
        #header-component [data-testid="header-top-right"] { grid-column: 2; grid-row: 1; }
        #header-component .header__column--left .search-action { display: none !important; }
        #header-component .header__column--right .search-action--hidden-on-drawer,
        #header-component .header__column--right .search-action--hidden-on-drawer button {
          display: inline-flex !important; visibility: visible !important; opacity: 1 !important;
        }
        #header-component .header-logo__image { width: min(215px, 56vw) !important; }
        #header-component header-actions { gap: 13px; }
        #header-component .header-actions__action { width: 23px; }
        #header-component .stellar-shop-navigation { width: 100% !important; }
        #header-component .stellar-shop-navigation__links {
          display: grid !important; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 9px 5px;
          justify-content: stretch; width: 100%;
        }
        #header-component .stellar-shop-navigation__links a {
          font-size: 12px !important; text-align: center; white-space: nowrap;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn[data-stellar-home-hero] {
          height: auto !important; min-height: 0 !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn[data-stellar-home-hero] > .section.section--full-width,
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-shell],
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-layout],
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-content] {
          height: auto !important; min-height: 0 !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-content] {
          display: grid !important; grid-template-rows: auto auto; align-content: start;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] {
          position: relative !important; grid-row: 2; inset: auto !important;
          width: 100% !important; height: clamp(280px, 94vw, 360px) !important;
          min-height: 0 !important; margin: 0 !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-art] .image-block__image {
          width: 100% !important; max-width: 440px !important; height: calc(100% - 36px) !important;
          margin: 0 auto !important; object-fit: contain !important; object-position: center !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] {
          grid-row: 1; padding: 27px 24px 18px !important;
          height: auto !important; min-height: 0 !important;
          background: transparent !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] .group-block-content {
          justify-content: flex-start !important; height: auto !important; min-height: 0 !important;
          gap: 12px !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn h1[data-stellar-lean-headline] {
          width: max-content !important; max-width: 100% !important; white-space: nowrap !important;
          text-align: left !important; font-size: clamp(24px, 7.4vw, 30px) !important;
          letter-spacing: .018em !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] p:not(.stellar-formula-note) {
          max-width: 440px; font-size: 17px !important; line-height: 1.42 !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn .stellar-calorie-note {
          font-size: clamp(23px, 7vw, 28px) !important; line-height: 1.18 !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn .stellar-packaging-note {
          font-size: 15px;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] a.button {
          min-height: 50px; margin-top: 3px; padding: 0 26px !important; font-size: 14px !important;
        }
        #stellar-home-categories { min-height: 62px; padding: 0 14px; }
        #stellar-home-categories a { min-height: 44px; padding: 0 4px; font-size: 11px; letter-spacing: .035em; }
        #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row {
          display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          align-items: start !important; justify-content: stretch !important;
          width: calc(100% - 32px) !important; gap: 22px 18px !important;
          overflow: visible !important;
        }
        #shopify-section-template--21473298907310__section_nYadFn .stellar-callout {
          display: flex !important; min-width: 0 !important; flex: initial !important;
          align-items: center !important; gap: 11px !important;
          font-size: 15px !important; line-height: 1.35 !important; white-space: normal !important;
        }
        #shopify-section-template--21473298907310__section_nYadFn .stellar-callout svg {
          width: 38px !important; height: 38px !important; flex-basis: 38px !important;
        }
      }
      @media (max-width: 360px) {
        #header-component .stellar-shop-navigation__links { grid-template-columns: repeat(2, minmax(0,1fr)); }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] p:not(.stellar-formula-note) {
          font-size: 15px !important;
        }
        #shopify-section-template--21473298907310__section_kBK3Vn [data-stellar-hero-copy] {
          padding-left: 16px !important; padding-right: 16px !important;
        }
      }
    `;
    doc.head.append(style);
  }
}
