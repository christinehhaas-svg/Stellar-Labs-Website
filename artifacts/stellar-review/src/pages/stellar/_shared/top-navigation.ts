import styles from "./navigation-and-controls.css?inline";

/** Shared presentation; each preview continues to supply its own local routes. */
export function initializeTopNavigation(doc: Document, localUrl: (path: string) => string) {
  const header = doc.querySelector<HTMLElement>("#header-component");
  const nav = header?.querySelector<HTMLElement>(".stellar-shop-navigation");
  const links = nav?.querySelector<HTMLElement>(".stellar-shop-navigation__links");
  if (!header || !nav || !links) return;
  header.dataset.stellarLeanNav = "";
  const center = header.querySelector('[data-testid="header-top-center"]');
  if (center && nav.parentElement !== center) center.append(nav);
  let lean = links.querySelector<HTMLAnchorElement>(".stellar-lean-navigation");
  if (!lean) {
    lean = doc.createElement("a");
    lean.className = "stellar-lean-navigation";
  }
  lean.textContent = "Shop Lean Nutrition";
  lean.href = localUrl("/shop");
  links.prepend(lean);
  let style = doc.getElementById("stellar-top-navigation-style");
  if (!style) {
    style = doc.createElement("style");
    style.id = "stellar-top-navigation-style";
    doc.head.append(style);
  }
  style.textContent = styles;
}
