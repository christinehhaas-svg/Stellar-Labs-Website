import { useEffect, useRef, useState } from "react";
import { initializeHomepageProducts } from "./_homepageProducts";
import { initializeHomepageTypography } from "./_shared/homepage-typography";
import { initializeOutlineHomepage } from "./_shared/outline-homepage";
import { addHomepageTestingBadge } from "./_shared/heavy-metals-testing";
import { initializeHomepageComparisons } from "./_shared/homepage-comparisons";
import { initializeHomepageFeaturedProducts } from "./_shared/homepage-featured-products";
import "./_group.css";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";

// Fast Refresh preserves component state, but not the updated DOM inside a
// script-disabled snapshot. Reload that document when this module is replaced.
const snapshotRevision = import.meta.env.DEV ? Date.now().toString(36) : "approved-content";

export function initializeSnapshot(frame: HTMLIFrameElement, comparisonPage = false, fullCatalog = false) {
  const view = frame.contentWindow;
  const doc = frame.contentDocument;
  const header = doc?.querySelector("#header-component");
  if (!view || !header) return;
  if (doc) initializeHomepageTypography(doc, reviewUrl, reviewAsset);

  // Restore the website's original callout icon artwork, keeping the updated
  // gut illustration for digestion and the person icon for GLP-1.
  const originalCalloutIcons = [
    reviewAsset("/__mockup/stellar-current/assets/702fdffe87ab02f0.svg"),
    reviewAsset("/__mockup/stellar-current/assets/b1f703f6d4d0d5a8.svg"),
    reviewAsset("/__mockup/stellar-current/assets/8239652b37aee7a1.svg"),
    reviewAsset("/__mockup/stellar-current/assets/8239652b37aee7a1.svg"),
    reviewAsset("/__mockup/stellar-current/assets/16abbe8e520da198.png"),
  ];
  doc?.querySelectorAll(".stellar-callout").forEach((callout, index) => {
    if (index === 0 || index === 4) return;
    const icon = callout.querySelector("svg, img");
    const src = originalCalloutIcons[index - 1];
    if (!icon || !src || icon.tagName === "IMG" || icon.hasAttribute("data-stellar-icon")) return;
    const image = doc.createElement("img");
    image.src = src;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.width = 32;
    image.height = 32;
    image.style.cssText = "display:block;width:32px;height:32px;flex:0 0 32px;object-fit:contain";
    icon.replaceWith(image);
  });

  // Header and hero are styled in the shared document initializer; no
  // captured Shopify menu, search, or cart runtime is loaded.
  header.setAttribute("data-menu-style", "menu");
  if (frame.contentDocument) initializeHomepageProducts(frame.contentDocument);
  if (doc) initializeReviewLinks(doc);
  if (doc) initializeOutlineHomepage(doc, reviewUrl);
  if (doc && !comparisonPage && !fullCatalog) addHomepageTestingBadge(doc);
  if (doc) initializeHomepageComparisons(doc, reviewUrl, comparisonPage);
  if (doc && !comparisonPage) initializeHomepageFeaturedProducts(doc, reviewUrl, fullCatalog);
}

/**
 * Read-only, locally served snapshot of the existing Stellar Labs Shopify
 * homepage. The source theme styles and first-party assets are kept inside an
 * isolated document so its global styles cannot leak into the preview host.
 * All source JavaScript, forms, cart actions, trackers, and preview chrome
 * have been removed. Product browsing links open the original Shopify preview.
 */
export function Homepage({ comparisonPage = false, fullCatalog = false }: { comparisonPage?: boolean; fullCatalog?: boolean }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [canView, setCanView] = useState(false);

  useEffect(() => {
    setStatus("loading");
    setCanView(false);
    let initialized: Document | null = null;
    let stopped = false;
    const started = Date.now();
    const finish = (next: "ready" | "error") => {
      stopped = true;
      setStatus(next);
      window.clearInterval(timer);
    };
    const check = () => {
      if (stopped) return;
      try {
        const frame = frameRef.current;
        const doc = frame?.contentDocument;
        // about:blank and an HTML error/fallback response are not a snapshot.
        if (frame && doc && doc.readyState !== "loading" &&
            doc.querySelector("#header-component") &&
            doc.querySelector("#MainContent")) {
          if (initialized !== doc) {
            initializeSnapshot(frame, comparisonPage, fullCatalog);
            initialized = doc;
            setCanView(true);
          }
          // Do not wait for offscreen images, fonts, or the iframe load event.
          // Local styles plus the visible header/hero are the readiness boundary.
          const styles = [...doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
          const images = [
            doc.querySelector<HTMLImageElement>(".header-logo img"),
            comparisonPage ? null : doc.querySelector<HTMLImageElement>("[data-stellar-hero-art] img"),
          ];
          const painted = doc.querySelector<HTMLElement>(comparisonPage ? "#stellar-comparison-title" : "[data-stellar-lean-headline]");
          if (images.some(image => image?.complete && image.naturalWidth === 0)) {
            finish("error");
            return;
          }
          if (styles.every(style => style.sheet) &&
              images.filter(Boolean).every(image => image && image.complete && image.naturalWidth > 0) &&
              painted && painted.getBoundingClientRect().height > 0) {
            finish("ready");
            return;
          }
        }
      } catch {
        // Includes an inaccessible document or failed snapshot initializer.
        finish("error");
        return;
      }
      if (Date.now() - started >= 8_000) finish("error");
    };
    const timer = window.setInterval(check, 100);
    check();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [attempt, comparisonPage, fullCatalog, snapshotRevision]);

  const retry = () => {
    setStatus("loading");
    setCanView(false);
    setAttempt(value => value + 1);
  };

  return (
    <main className="stellar-current-snapshot" aria-label="Stellar Labs homepage snapshot" aria-busy={status === "loading"}>
      {status !== "ready" && (
        <section className="stellar-snapshot-status" role={status === "error" ? "alert" : "status"}>
          <h1>{status === "loading" ? "Loading Stellar Labs…" : "The homepage couldn’t finish loading"}</h1>
          <p>{status === "loading"
            ? "Preparing the homepage preview."
            : canView
              ? "Some local preview assets are slow or unavailable. Try again, or view the available page with missing images or styling."
              : "The local homepage preview is slow or unavailable. Try loading it again."}</p>
          {status === "error" && (
            <div>
              <button type="button" onClick={retry}>Retry homepage</button>
              {canView && <button type="button" onClick={() => setStatus("ready")}>View available homepage</button>}
            </div>
          )}
        </section>
      )}
      <iframe
        key={`${snapshotRevision}-${attempt}`}
        ref={frameRef}
        style={{ visibility: status === "ready" ? "visible" : "hidden" }}
        title="Stellar Labs original Shopify homepage — read-only snapshot"
        src={`${reviewAsset("/__mockup/stellar-current/homepage-snapshot.html")}?review=approved-everyday-nutrition&revision=${snapshotRevision}`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      />
    </main>
  );
}
