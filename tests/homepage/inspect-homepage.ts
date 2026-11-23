import type { Page } from "@playwright/test";

/**
 * Evaluate only in the host document. Calling frame.evaluate() would try to run
 * code inside the script-disabled Shopify capture. Never relax its sandbox.
 */
export async function inspectHomepage(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>(".stellar-current-snapshot iframe");
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!frame || !doc || !win) throw new Error("Homepage snapshot is unavailable");
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.bottom <= 0 ||
          r.x >= win.innerWidth || r.y >= win.innerHeight) return false;
      for (let node: Element | null = el; node; node = node.parentElement) {
        const s = win.getComputedStyle(node);
        if (s.display === "none" || s.visibility !== "visible" || Number(s.opacity) === 0) return false;
        if (node !== el && /(hidden|clip|scroll|auto)/.test(`${s.overflowX} ${s.overflowY}`)) {
          const clip = node.getBoundingClientRect();
          if (r.right <= clip.left || r.left >= clip.right ||
              r.bottom <= clip.top || r.top >= clip.bottom) return false;
        }
      }
      return true;
    };
    const requireElement = (selector: string) => {
      const el = doc.querySelector(selector);
      if (!el) throw new Error(`Missing homepage element: ${selector}`);
      return el;
    };
    const measure = (selector: string) => {
      const el = requireElement(selector);
      return {
        ...rect(el), visible: visible(el),
        text: ((el as HTMLElement).innerText || el.textContent)?.replace(/\s+/g, " ").trim(),
      };
    };
    const hero = requireElement("[data-stellar-home-hero]");
    const headline = requireElement("[data-stellar-lean-headline]");
    const subtitle = requireElement("[data-stellar-hero-copy] p:not(.stellar-formula-note)");
    const photo = requireElement("[data-stellar-hero-art] img") as HTMLImageElement;
    const logo = requireElement("#header-component .header-logo__image") as HTMLImageElement;
    const links = (selector: string) => [...doc.querySelectorAll<HTMLAnchorElement>(selector)].map(el => ({
      ...rect(el), visible: visible(el), text: el.textContent?.trim(), href: el.href, target: el.target,
    }));
    const frameRect = frame.getBoundingClientRect();
    return {
      ready: !!doc.getElementById("stellar-reference-header-hero"),
      sandbox: [...frame.sandbox].sort(),
      scripts: [...doc.scripts].map(script => ({
        src: script.getAttribute("src"), text: script.textContent?.trim(),
      })),
      host: {
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        frame: rect(frame),
        frameVisible: frameRect.width > 0 && frameRect.height > 0 &&
          frameRect.x >= 0 && frameRect.right <= window.innerWidth + 1,
      },
      viewport: { width: win.innerWidth, height: win.innerHeight },
      scrollWidth: doc.documentElement.scrollWidth,
      header: measure("#header-component"),
      hero: measure("[data-stellar-home-hero]"),
      layers: [
        "[data-stellar-home-hero] > .section.section--full-width",
        "[data-stellar-hero-shell]", "[data-stellar-hero-layout]", "[data-stellar-hero-content]",
      ].map(measure),
      headline: measure("[data-stellar-lean-headline]"),
      subtitle: {
        ...measure("[data-stellar-hero-copy] p:not(.stellar-formula-note)"),
        align: win.getComputedStyle(subtitle).textAlign,
        headlineLeft: headline.getBoundingClientRect().left,
      },
      cta: measure("[data-stellar-hero-copy] a.button"),
      photo: {
        ...rect(photo), visible: visible(photo), loaded: photo.complete && photo.naturalWidth > 0,
        src: photo.currentSrc, objectFit: win.getComputedStyle(photo).objectFit,
        naturalWidth: photo.naturalWidth, naturalHeight: photo.naturalHeight,
      },
      logo: {
        ...rect(logo), visible: visible(logo), loaded: logo.complete && logo.naturalWidth > 0,
        src: logo.currentSrc, naturalWidth: logo.naturalWidth, naturalHeight: logo.naturalHeight,
        filter: win.getComputedStyle(logo).filter, transform: win.getComputedStyle(logo).transform,
      },
      headerLinks: links("#header-component .stellar-shop-navigation__links a"),
      categoryLinks: links("#stellar-home-categories a"),
      supplements: links("#header-component .stellar-shop-navigation__links a, #stellar-home-categories a")
        .filter(link => link.text === "Supplements"),
      heroBottom: hero.getBoundingClientRect().bottom,
    };
  });
}
