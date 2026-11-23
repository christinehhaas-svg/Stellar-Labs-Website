import { commonProductQuality } from "./quality-claims";

/** Collection-level wording must not imply every claim applies to every SKU. */
export function initializeOutlineHomepage(doc: Document, localUrl: (path: string) => string) {
  // Captured SVGs and the cow PNG use different source colors. Recolor only
  // their opaque artwork, preserving transparency and the original shapes.
  if (!doc.getElementById("stellar-homepage-claim-color")) {
    const colors = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    colors.id = "stellar-homepage-claim-color";
    colors.setAttribute("width", "0");
    colors.setAttribute("height", "0");
    colors.setAttribute("aria-hidden", "true");
    colors.style.position = "absolute";
    colors.innerHTML = `<defs><filter id="stellar-homepage-claim-teal" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.1960784314 0 0 0 0 0.7529411765 0 0 0 0 0.7960784314 0 0 0 1 0"/></filter></defs>`;
    doc.body.append(colors);
  }
  if (!doc.getElementById("stellar-single-line-claims")) {
    const style = doc.createElement("style");
    style.id = "stellar-single-line-claims";
    style.textContent = `
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row {
        display: flex !important;
        flex-flow: row nowrap !important;
        justify-content: safe center !important;
        gap: 16px 24px !important;
        overflow-x: auto !important;
        max-width: 100% !important;
        padding-block: 8px;
      }
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row .stellar-callout {
        flex: 0 0 auto !important;
        min-width: max-content !important;
        white-space: nowrap !important;
      }
      .stellar-callout-row .stellar-callout span,
      .stellar-callout-row .stellar-callout p { white-space: nowrap !important; }
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row .stellar-callout :is(svg,img) {
        width: 42px !important; height: 42px !important; flex: 0 0 42px !important;
        filter: url("#stellar-homepage-claim-teal") !important;
      }
      @media (max-width: 767px) {
        #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row {
          display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr));
          justify-content: stretch !important; gap: 24px 18px !important;
          overflow: visible !important;
        }
        #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row .stellar-callout {
          min-width: 0 !important; white-space: normal !important; align-items: flex-start;
        }
        #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row .stellar-callout :is(span,p) {
          white-space: normal !important; overflow-wrap: normal;
        }
        #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row .stellar-callout :is(svg,img) {
          width: 38px !important; height: 38px !important; flex: 0 0 38px !important;
        }
      }
    `;
    doc.head.append(style);
  }
  const slogan = doc.querySelector(
    '#shopify-section-template--21473298907310__section_nYadFn img[src*="c15a3b2fc53661a6.svg"]',
  );
  if (slogan) {
    const group = slogan.closest('[data-testid="group-block"]');
    if (group && !group.querySelector(".stellar-callout")) group.remove();
    else slogan.closest(".image-block")?.remove();
  }
  const callouts = [...doc.querySelectorAll<HTMLElement>(".stellar-callout")];
  const statements = [
    ...commonProductQuality,
    "", // Retired captured facility slot; retained empty and hidden to keep icon positions stable.
    "Certified Gluten-Free",
    "Easy-to-Digest Ingredients",
    "rBGH-Free Whey",
    "", // Retired GLP-1 Friendly claim.
  ];
  const container = callouts[0]?.parentElement;
  if (!container) return;
  while (callouts.length < statements.length) {
    const callout = doc.createElement("div");
    callout.className = "stellar-callout";
    const icon = callouts.at(-1)?.querySelector("svg");
    if (icon) callout.append(icon.cloneNode(true));
    callout.append(doc.createElement("span"));
    container.append(callout);
    callouts.push(callout);
  }
  // Assign by meaning, not by the icon order in the captured theme.
  if (!container.hasAttribute("data-stellar-claim-icons-mapped")) {
    const nonGmo = callouts[statements.indexOf("Non-GMO")]?.querySelector("svg, img");
    const facility = callouts[1]?.querySelector("svg, img");
    const cornSource = container.querySelector('[data-stellar-icon="corn"], img[src*="b1f703f6d4d0d5a8.svg"]');
    const glutenFreeSource = container.querySelector('img[src*="702fdffe87ab02f0.svg"]');
    const glutenFreeTarget = callouts[statements.indexOf("Certified Gluten-Free")]?.querySelector("svg, img");
    const lowFodmap = callouts[statements.indexOf("Easy-to-Digest Ingredients")]?.querySelector("svg, img");
    if (nonGmo && facility && lowFodmap && cornSource && glutenFreeSource && glutenFreeTarget) {
      const stomach = (container.hasAttribute("data-stellar-digestive-icon-mapped") ? lowFodmap : nonGmo).cloneNode(true) as Element;
      const corn = cornSource.cloneNode(true) as Element;
      const glutenFree = glutenFreeSource.cloneNode(true) as Element;
      glutenFree.setAttribute("data-stellar-icon", "gluten-free");
      stomach.setAttribute("data-stellar-icon", "stomach");
      corn.setAttribute("data-stellar-icon", "corn");
      nonGmo.replaceWith(corn);
      glutenFreeTarget.replaceWith(glutenFree);
      lowFodmap.replaceWith(stomach);
      container.removeAttribute("data-stellar-digestive-icon-mapped");
      container.setAttribute("data-stellar-claim-icons-mapped", "true");
    }
  }
  const glp1Icon = (callouts[statements.indexOf("rBGH-Free Whey")]?.querySelector("svg")
    ?? callouts[statements.indexOf("GLP-1 Friendly*")]?.querySelector("svg"))?.cloneNode(true);
  callouts.forEach((callout, index) => {
    if (index === 1) {
      callout.hidden = true;
      callout.style.setProperty("display", "none", "important");
      callout.replaceChildren();
      return;
    }
    if (!statements[index]) { callout.remove(); return; }
    if (statements[index] === "rBGH-Free Whey") {
      callout.hidden = false;
      callout.style.removeProperty("display");
      const cow = doc.createElement("img");
      cow.src = localUrl("/__mockup/stellar-current/assets/stellar-rbgh-cow-outline.png");
      cow.alt = "";
      cow.setAttribute("aria-hidden", "true");
      cow.setAttribute("data-stellar-icon", "rbgh-whey");
      cow.style.cssText = "width:36px;height:36px;object-fit:contain;flex-shrink:0";
      const label = doc.createElement("span");
      label.textContent = "rBGH-Free Whey";
      callout.replaceChildren(cow, label);
    }
    if (statements[index] === "GLP-1 Friendly*") {
      const person = glp1Icon;
      if (person) {
        const icon = person.cloneNode(true) as SVGElement;
        icon.setAttribute("data-stellar-icon", "glp1-friendly");
        const existingIcon = callout.querySelector("svg,img");
        if (existingIcon) existingIcon.replaceWith(icon);
        else callout.prepend(icon);
      }
    }
    const label = callout.querySelector("span,p");
    if (label) label.textContent = statements[index];
    else callout.textContent = statements[index];
  });
  const existing = doc.getElementById("stellar-outline-claims-note") ?? [...(container.parentElement?.querySelectorAll("p") ?? [])].find(node =>
    /claims vary by product|Check each product.s complete label/i.test(node.textContent ?? ""));
  const note = existing ?? doc.createElement("p");
  note.id = "stellar-outline-claims-note";
  note.replaceChildren();
  note.style.cssText = "display:block;clear:both;grid-column:1 / -1;flex:0 0 auto;width:100%;max-width:1050px;margin:24px auto 0;padding:0 22px;font-size:12px;font-weight:400;line-height:1.6;text-align:center";
  const link = doc.createElement("a");
  link.textContent = "Complete PDF product information";
  link.href = localUrl("/product-information");
  link.target = "_parent";
  link.style.color = "inherit";
  note.append(link);
  if (!existing) container.insertAdjacentElement("afterend", note);
}
