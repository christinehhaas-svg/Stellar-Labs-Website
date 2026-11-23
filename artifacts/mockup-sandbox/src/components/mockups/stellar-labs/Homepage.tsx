import type { SyntheticEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { StellarProductInformation } from "./StellarProductInformation";
import { initializeHomepageProducts } from "./_homepageProducts";
import { initializeHomepageTypography } from "./_shared/homepage-typography";
import { initializeOutlineHomepage } from "./_shared/outline-homepage";
import { initializeHomepageComparisons } from "../../../../../stellar-review/src/pages/stellar/_shared/homepage-comparisons";
import { initializeHomepageFeaturedProducts } from "../../../../../stellar-review/src/pages/stellar/_shared/homepage-featured-products";
import "./_group.css";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";
import { PowderCollectionPage, type PowderCollection } from "./PowderCollectionPage";

const productGuideRoots = new WeakMap<HTMLIFrameElement, Root>();

export function initializeSnapshot(event: SyntheticEvent<HTMLIFrameElement>) {
  const frame = event.currentTarget;
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

  const callouts = [...(doc?.querySelectorAll<HTMLElement>(".stellar-callout") ?? [])];
  const updateCallout = (matches: (copy: string) => boolean, replacement: string) => {
    const callout = callouts.find((item) => matches(item.textContent?.replace(/\s+/g, " ").trim() ?? ""));
    const label = callout && [...callout.childNodes].find(
      (node) => node.nodeType === 3 && node.textContent?.trim(),
    );
    if (label) label.textContent = ` ${replacement}`;
  };
  updateCallout(
    (copy) => copy === "Certified Gluten Free",
    "Certified Gluten-Free where applicable",
  );
  updateCallout(
    (copy) => copy === "rGHB Free",
    "Made with milk from cows not treated with rBGH/rbST‡",
  );

  header.setAttribute("data-menu-style", "menu");
  if (frame.contentDocument) initializeHomepageProducts(frame.contentDocument);
  if (doc) initializeReviewLinks(doc);
  if (doc) initializeOutlineHomepage(doc, reviewUrl);
  if (doc) initializeHomepageComparisons(doc, reviewUrl);
  if (doc) initializeHomepageFeaturedProducts(doc, reviewUrl);
  if (!doc) return;
  const categoryAnchor = doc.getElementById("stellar-home-categories");
  const heroAnchor = doc.querySelector("#shopify-section-template--21473298907310__section_kBK3Vn");
  const guideAnchor = categoryAnchor ?? heroAnchor;
  if (!guideAnchor) return;
  productGuideRoots.get(frame)?.unmount();
  let mount = doc.querySelector<HTMLElement>("#stellar-pdf-product-guide-mount");
  if (!mount) {
    mount = doc.createElement("div");
    mount.id = "stellar-pdf-product-guide-mount";
    guideAnchor.insertAdjacentElement("afterend", mount);
  }
  const root = createRoot(mount);
  productGuideRoots.set(frame, root);
  root.render(<StellarProductInformation />);
}

/**
 * Read-only, locally served snapshot of the existing Stellar Labs Shopify
 * homepage. The source theme styles and first-party assets are kept inside an
 * isolated document so its global styles cannot leak into the preview host.
 * All source JavaScript, forms, cart actions, trackers, and preview chrome
 * have been removed. Product browsing links open the original Shopify preview.
 */
const snapshotRevision = import.meta.env.DEV ? Date.now().toString(36) : "approved-content";

export function Homepage() {
  const category = new URLSearchParams(window.location.search).get("category");
  const powderCategory: Record<string, PowderCollection> = {
    "100-isolate-whey-protein": "whey",
    "vegan-plant-protein": "vegan",
    electrolyte: "electrolyte",
  };
  if (category && powderCategory[category]) return <PowderCollectionPage category={powderCategory[category]} />;
  return (
    <main className="stellar-current-snapshot" aria-label="Stellar Labs homepage snapshot">
      <iframe
        key={snapshotRevision}
        title="Stellar Labs original Shopify homepage — read-only snapshot"
        src={`/__mockup/stellar-current/homepage-snapshot.html?copy=approved-everyday-nutrition&revision=${snapshotRevision}`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        onLoad={initializeSnapshot}
      />
    </main>
  );
}
