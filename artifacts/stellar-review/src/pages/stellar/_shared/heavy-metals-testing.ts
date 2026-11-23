/** Merchant-approved testing copy; shared by homepage and product templates. */
export const heavyMetalsTestingStatement = "This product met the testing limits for lead, cadmium, arsenic, and mercury.";
export const heavyMetalsFaqQuestion = "Are Stellar Labs Nutrition products tested for heavy metals?";
export const heavyMetalsFaqAnswer = "Yes. An independent laboratory tested all Stellar Labs Nutrition products for lead, cadmium, arsenic, and mercury. All products met the testing limits for each metal.";

export const heavyMetalsIcon = `<svg data-stellar-icon="heavy-metals-testing" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="color:#32c0cb"><path d="M12 3h8M13 3v9L5.8 25a2.7 2.7 0 0 0 2.4 4h15.6a2.7 2.7 0 0 0 2.4-4L19 12V3M10 18h12"/><path d="m12 23 3 3 5-5"/></svg>`;

export function heavyMetalsBadgeMarkup(compact = false) {
  const size = compact ? 28 : 42;
  return `${heavyMetalsIcon.replace('<svg ', `<svg width="${size}" height="${size}" `)}<span style="display:block;line-height:1.3;white-space:nowrap">Third-Party Tested<br>for Heavy Metals</span>`;
}

/** Keep the homepage badge out of Shop All and comparison snapshots. */
export function addHomepageTestingBadge(doc: Document) {
  const row = doc.querySelector(".stellar-callout-row");
  const glutenFree = [...(row?.querySelectorAll(".stellar-callout") ?? [])]
    .find(item => item.textContent?.trim() === "Certified Gluten-Free");
  if (!glutenFree) return;
  if (!doc.getElementById("stellar-testing-badge-style")) {
    const style = doc.createElement("style");
    style.id = "stellar-testing-badge-style";
    style.textContent = `@media(max-width:767px){
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row [data-heavy-metals-badge="homepage"] {
        grid-column:1 / -1;justify-self:center;
      }
      #shopify-section-template--21473298907310__section_nYadFn .stellar-callout-row [data-heavy-metals-badge="homepage"] > span {
        font-size:13px!important;white-space:nowrap!important;
      }
    }`;
    doc.head.append(style);
  }
  const badge = doc.createElement("div");
  badge.className = "stellar-callout";
  badge.setAttribute("data-heavy-metals-badge", "homepage");
  badge.innerHTML = heavyMetalsBadgeMarkup();
  glutenFree.insertAdjacentElement("afterend", badge);
}
