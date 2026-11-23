export const comparisonSections = [
  {
    id: "whey-protein-isolate",
    title: "WHEY PROTEIN ISOLATE",
    basis: "All nutrition values shown at the same 31g of powder",
    columns: ["Full product name", "Weight", "Calories", "Protein", "Carbs", "Total Sugars", "Added Sugars"],
    rows: [
      // Stellar vanilla label: 120 calories, 26g protein and 1g carbs per 31g.
      ["Stellar Labs Whey Protein Isolate · Vanilla", "31g", "120", "26g", "1g", "1g", "0g"],
      // Gold Standard is a whey blend, not a pure whey isolate. Both labels use 31g.
      // https://www.optimumnutrition.com/en-us/products/gold-standard-100-whey-protein-powder
      // https://www.optimumnutrition.com/cdn/shop/files/US_GSW_10LB_Vanilla_NFP.png
      ["Optimum Nutrition Gold Standard 100% Whey - Vanilla Ice Cream (Whey Blend)", "31g", "120", "24g", "4g", "1g", "0g"],
    ],
    highlights: ["26g Protein per 31g", "1g CARB"],
    note: "Both labels use a 31g serving of dry powder. Stellar Labs Vanilla is whey protein isolate; Optimum Nutrition Gold Standard Vanilla Ice Cream is a whey blend, not a pure isolate. Total sugars include naturally occurring sugars; added sugars are part of total sugars, not an additional amount. Optimum Nutrition lists added sugars as not a significant source, shown here as 0g. Values are specific to these formulas, without added milk or other ingredients. Product formulations may change.",
  },
  {
    id: "whey-protein-blend",
    title: "WHEY PROTEIN BLEND - VANILLA",
    basis: "All nutrition values shown at the same 32g of powder",
    columns: ["Full product name", "Weight", "Calories", "Protein", "Carbs", "Total Sugars", "Added Sugars"],
    rows: [
      ["Stellar Labs Whey Protein Blend · Vanilla", "32g", "130", "24g", "3g", "2g", "0g"],
      // Official Body Fortress label: 3g total sugars and 0g added sugars per 44g; scale by 32 / 44.
      // https://www.bodyfortress.com/products/100-whey-premium-protein-powder-vanilla
      ["Body Fortress Super Advanced Whey Protein - Vanilla", "32g", "131", "21.8g", "5.1g", "2.2g", "0g"],
      // Merchant-supplied Naked Vanilla Whey values, per 32g of powder.
      // Official Naked label: 5g total sugars, including 3g added sugars per 37g; scale by 32 / 37.
      // https://nakednutrition.com/products/vanilla-whey-protein
      ["Naked Vanilla Whey", "32g", "130", "21.6g", "7g", "4.3g", "2.6g"],
    ],
    highlights: ["24g PROTEIN", "130 CALORIES", "3g CARBS"],
    note: "Competitor nutrition values are shown per 32g of powder. Body Fortress sugars are normalized from its 44g label serving (3g total, 0g added); Naked sugars are normalized from its 37g label serving (5g total, 3g added), rounded to one decimal. Other Naked Vanilla Whey values were supplied by the merchant. Total sugars include naturally occurring sugars; added sugars are part of total sugars, not an additional amount. N/A means the value is not available in this comparison, not zero. Product formulations may change.",
  },
  {
    id: "vegan-protein",
    title: "VEGAN PROTEIN",
    basis: "All nutrition values shown at the same 32g of powder",
    columns: ["Full product name", "Weight", "Calories", "Protein", "Carbs", "Total Sugars"],
    rows: [
      // Stellar's vanilla label: 130 calories, 20g protein, 6g carbs, 3g total sugars per 32g.
      ["Stellar Labs Vanilla Vegan Protein", "32g", "130", "20g", "6g", "3g"],
      // Vega vanilla label: 110 calories, 15g protein, 7g carbs, 6g total sugars per 26g.
      // Normalize each value by 32 / 26 and round to one decimal.
      // https://myvega.com/products/vega-protein-made-simple
      // https://myvega.com/cdn/shop/files/LAB00150V20_US_PMS_Small_Vanilla_NF_1.png
      ["Vega Protein Made Simple - Vanilla", "32g", "135.4", "18.5g", "8.6g", "7.4g"],
    ],
    highlights: ["20g PROTEIN", "130 CALORIES", "6g CARBS"],
    note: "Vega nutrition values are normalized from its labeled 26g serving to 32g of powder and rounded to one decimal. This comparison is specific to the named vanilla formulas, not all vegan proteins. Both formulas contain added sugars. Product formulations may change.",
  },
  {
    id: "lemon-lime-electrolyte",
    title: "Lemon Lime Electrolytes",
    basis: "Compared at the same powder weight: 4.5 g.",
    columns: ["Full product name", "Weight", "Major electrolytes", "Calories", "Sodium", "Potassium", "Magnesium", "Calcium", "Chloride"],
    rows: [
      ["Stellar Labs Lemon Lime Electrolyte Powder", "4.5g", "5", "5", "80mg", "280mg", "51mg", "47mg", "Not listed"],
      // Label: 10 calories and 330mg sodium per 4.5g.
      // https://dripdrop.com/products/sugar-free-electrolyte-powder-lemon-lime-8oz-32-packets
      ["DripDrop Zero Sugar Electrolyte Powder - Lemon Lime", "4.5g", "4", "10", "330mg", "180mg", "40mg", "Not listed", "Not listed"],
      // LMNT label: 5 calories and 1,000mg sodium per 6g; multiply by 4.5 / 6.
      // https://res.cloudinary.com/drinklmnt/image/upload/v1696530194/lmnt-salt-citrus-nutrition_jz43xt.webp
      // Round the normalized 3.75 calories to 4 calories for display.
      ["LMNT Electrolyte Drink Mix - Citrus Salt", "4.5g", "4", "4", "750mg", "150mg", "45mg", "Not listed", "Not listed"],
    ],
    highlights: ["5 MAJOR ELECTROLYTES", "80mg SODIUM", "280mg POTASSIUM", "51mg MAGNESIUM"],
    note: "Competitor values are normalized to 4.5 g of powder from their labeled serving sizes; LMNT calories are rounded to 4. Chloride is the fifth electrolyte in Stellar Labs, but its amount is not separately declared on the label. “Not listed” means a separate amount is not available in the labels used for this comparison—not zero. Calcium amounts are not quantified on the DripDrop and LMNT labels. Product formulations may change.",
  },
] as const;

export function visibleComparisonColumns(comparison: { id?: string; columns: readonly string[]; rows: readonly (readonly string[])[] }) {
  return comparison.columns.flatMap((metric, index) => {
    if (index === 0) return [];
    if (comparison.id === "lemon-lime-electrolyte" && metric === "Weight") return [];
    if (metric === "Total Sugars" && comparison.id !== "whey-protein-isolate" && comparison.id !== "whey-protein-blend") {
      const stellar = Number.parseFloat(comparison.rows[0][index]);
      if (comparison.rows.slice(1).some(row => Number.parseFloat(row[index]) < stellar)) return [];
    }
    return [{ metric, index }];
  });
}

/** Add the merchant-provided comparison matrix after the existing brand story. */
export function initializeHomepageComparisons(doc: Document, localUrl: (path: string) => string, comparisonPage = false) {
  if (doc.getElementById("stellar-homepage-comparisons")) return;
  const readMore = [...doc.querySelectorAll<HTMLAnchorElement>("a")]
    .find((link) => link.textContent?.replace(/\s+/g, " ").trim() === "Read More");
  if (!readMore) return;
  const section = readMore.closest<HTMLElement>('[id^="shopify-section-"]');
  if (!section) return;
  readMore.href = localUrl("/compare");
  // A snapshot inside a Canvas preview cannot navigate its sandboxed ancestors.
  // Handle the click in the host app so it navigates its own frame instead.
  readMore.target = "_parent";
  if (!readMore.hasAttribute("data-stellar-comparison-link")) {
    readMore.setAttribute("data-stellar-comparison-link", "");
    readMore.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign(localUrl("/compare"));
    });
  }
  if (!comparisonPage) return;

  const style = doc.createElement("style");
  style.id = "stellar-homepage-comparison-styles";
  style.textContent = `
    #stellar-homepage-comparisons {
      --stellar-comparison-accent: #00bce5;
      background: #0b0d11; color: #f5f8f8; padding: clamp(44px, 7vw, 92px) max(20px, calc((100vw - 1200px) / 2));
      font-family: inherit; scroll-margin-top: 160px;
    }
    #stellar-homepage-comparisons *, #stellar-homepage-comparisons *::before, #stellar-homepage-comparisons *::after { box-sizing: border-box; }
    #stellar-homepage-comparisons .stellar-comparison-brand { display:block; font-size:18px; line-height:1.3; color:#fff; }
    #stellar-homepage-comparisons .stellar-comparison-product { display:block; margin-top:5px; font-size:12px; font-weight:400; line-height:1.45; }
    #stellar-homepage-comparisons .stellar-comparison-electrolyte td { font-size:clamp(16px,1.6vw,19px); }
    #stellar-homepage-comparisons .stellar-comparison-electrolyte table { min-width:640px; }
    #stellar-homepage-comparisons .stellar-comparison-electrolyte thead th { min-width:155px; }
    #stellar-homepage-comparisons .stellar-comparison-electrolyte tr > :nth-child(2) { background:#142a34; }
    #stellar-homepage-comparisons .stellar-comparison-electrolyte .stellar-comparison-note { font-size:14px; line-height:1.65; }
    #stellar-homepage-comparisons .stellar-comparison-serving-note { margin:-8px 0 18px; color:#d1d4db; font-size:13px; line-height:1.5; }
    #stellar-homepage-comparisons .stellar-comparison-intro { max-width: 1200px; margin: 0 auto 42px; }
    #stellar-homepage-comparisons h2 { margin: 0; font-size: clamp(28px, 4vw, 48px); line-height: 1.04; letter-spacing: .035em; font-weight: 800; }
    #stellar-homepage-comparisons .stellar-comparison-kicker { color: var(--stellar-comparison-accent); font-size: 12px; font-weight: 700; letter-spacing: .16em; margin: 0 0 12px; }
    #stellar-homepage-comparisons .stellar-comparison-block { max-width: 1200px; margin: 0 auto; padding: 32px 0 42px; border-top: 1px solid #42464d; }
    #stellar-homepage-comparisons h3 { color: #f5f8f8; font-size: clamp(21px, 2.5vw, 30px); line-height: 1.15; margin: 0 0 20px; letter-spacing: .025em; }
    #stellar-homepage-comparisons .stellar-table-scroll { max-width: 100%; overflow-x: auto; overscroll-behavior-inline: contain; border: 1px solid #555961; border-radius: 4px; }
    #stellar-homepage-comparisons .stellar-table-scroll:focus-visible { outline: 3px solid var(--stellar-comparison-accent); outline-offset: 3px; }
    #stellar-homepage-comparisons table { border-collapse: collapse; width: 100%; min-width: 720px; text-align: left; }
    #stellar-homepage-comparisons th, #stellar-homepage-comparisons td { padding: 16px 18px; border-bottom: 1px solid #33373e; vertical-align: middle; }
    #stellar-homepage-comparisons thead th { background: #1b1e24; color: #d1d4db; font-size: 13px; font-weight: 700; line-height: 1.5; white-space: normal; min-width: 180px; }
    #stellar-homepage-comparisons tbody th { color: #f5f8f8; font-size: 15px; font-weight: 500; line-height: 1.5; }
    #stellar-homepage-comparisons .stellar-comparison-basis { color: #d1d4db; font-size: 13px; margin: 0 0 18px; }
    #stellar-homepage-comparisons th:first-child { min-width: 130px; width: 18%; position: sticky; left: 0; z-index: 1; background: #1b1e24; }
    #stellar-homepage-comparisons td { color: #f5f8f8; font-size: 15px; text-align: center; }
    #stellar-homepage-comparisons thead th:not(:first-child) { text-align: center; }
    #stellar-homepage-comparisons tr > :nth-child(2) { color: #f5f8f8; font-weight: 700; background: #242830; }
    #stellar-homepage-comparisons thead th:nth-child(2) { box-shadow: inset 0 3px var(--stellar-comparison-accent); }
    #stellar-homepage-comparisons tr.stellar-sodium-row > * { color: #f5f8f8; font-weight: 800; background: #202c33; border-top: 1px solid var(--stellar-comparison-accent); border-bottom: 1px solid var(--stellar-comparison-accent); }
    #stellar-homepage-comparisons tbody tr:last-child > * { border-bottom: 0; }
    #stellar-homepage-comparisons .stellar-comparison-highlights { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 12px; }
    #stellar-homepage-comparisons .stellar-comparison-why { color: #f5f8f8; font-size: 14px; font-weight: 700; margin: 22px 0 0; }
    #stellar-homepage-comparisons .stellar-comparison-highlights span { border: 1px solid #555961; border-radius: 2px; color: #f5f8f8; padding: 9px 12px; font-size: 12px; font-weight: 800; letter-spacing: .07em; }
    #stellar-homepage-comparisons .stellar-comparison-note { color: #b7c5c6; font-size: 13px; line-height: 1.55; margin: 12px 0 0; max-width: 760px; }
    @media (max-width: 600px) {
      #stellar-homepage-comparisons { padding-inline: 18px; }
      #stellar-homepage-comparisons .stellar-comparison-block { padding-block: 26px 32px; }
      #stellar-homepage-comparisons th, #stellar-homepage-comparisons td { padding: 13px 14px; }
    }
  `;
  doc.head.append(style);

  const wrapper = doc.createElement("section");
  wrapper.id = "stellar-homepage-comparisons";
  wrapper.setAttribute("aria-labelledby", "stellar-comparison-title");
  wrapper.innerHTML = `
    <div class="stellar-comparison-intro">
      <p class="stellar-comparison-kicker">A SIDE-BY-SIDE LOOK</p>
      <h1 id="stellar-comparison-title" style="margin:0;font-size:clamp(28px,4vw,48px);line-height:1.1">HOW DOES STELLAR LABS COMPARE?</h1>
    </div>
    ${[...comparisonSections].sort((a, b) => Number(b.id === "lemon-lime-electrolyte") - Number(a.id === "lemon-lime-electrolyte")).map((comparison) => `
      <section class="stellar-comparison-block${comparison.id === "lemon-lime-electrolyte" ? " stellar-comparison-electrolyte" : ""}" aria-labelledby="stellar-comparison-${comparison.id}">
        <h3 id="stellar-comparison-${comparison.id}">${comparison.title}</h3>
        <p class="stellar-comparison-basis">${comparison.basis}</p>
        ${comparison.id === "lemon-lime-electrolyte" ? '<p class="stellar-comparison-serving-note">These comparison amounts are not necessarily each brand’s recommended serving.</p>' : ""}
        <div class="stellar-table-scroll" role="region" tabindex="0" aria-label="${comparison.title} comparison table. Scroll horizontally to view all columns.">
          <table>
            <caption style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">${comparison.title} nutrition comparison</caption>
            <thead><tr><th scope="col">Nutrition information</th>${comparison.rows.map((row, index) => {
              const brands = [["Stellar Labs", "Lemon Lime Electrolyte Powder"], ["DripDrop", "Zero Sugar · Lemon Lime"], ["LMNT", "Citrus Salt"]];
              return `<th scope="col">${comparison.id === "lemon-lime-electrolyte"
                ? `<span class="stellar-comparison-brand">${brands[index][0]}</span><span class="stellar-comparison-product">${brands[index][1]}</span>`
                : row[0]}</th>`;
            }).join("")}</tr></thead>
            <tbody>${visibleComparisonColumns(comparison).map(({ metric, index }) => `<tr${metric === "Sodium" ? ' class="stellar-sodium-row"' : ""}><th scope="row">${metric}</th>${comparison.rows.map((row) => `<td>${row[index]}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
        ${comparison.id === "lemon-lime-electrolyte" ? "" : `<p class="stellar-comparison-why">Why Stellar Labs</p>
        <div class="stellar-comparison-highlights" aria-label="Why Stellar Labs">
          ${comparison.highlights.map((item) => `<span>${item}</span>`).join("")}
        </div>`}
        <p class="stellar-comparison-note">${comparison.note}</p>
      </section>
    `).join("")}
  `;
  const back = doc.createElement("a");
  back.href = localUrl("/");
  back.target = "_parent";
  back.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.assign(localUrl("/"));
  });
  back.textContent = "Back to Stellar Labs";
  back.style.cssText = "display:inline-block;color:var(--stellar-comparison-accent);margin-top:24px;text-decoration:underline";
  wrapper.append(back);
  doc.querySelector("#MainContent")?.replaceChildren(wrapper);
}
