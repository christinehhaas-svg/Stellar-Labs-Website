import { collectionClaimNote, milkDisclaimer, powderNutritionDisclaimer } from "./_shared/outline-copy";
import { productGuideCatalog, guideSpecificWarnings } from "./_shared/product-guide-catalog";
import { powderDisclaimer } from "./_shared/powder-copy";
import { reviewAsset, reviewUrl } from "./review-links";
import { QualityIcon, qualityCallouts } from "./_shared/QualityCallouts";

type Product = {
  quality?: string[];
  support?: { title: string; description: string }[];
  suggestedUse?: string;
  warnings?: string[];
  page?: number;
  name: string;
  description: string;
  benefits: string[];
  facts?: string;
  note?: string;
  metrics?: { label: string; value: string }[];
  serving?: string;
  href?: string;
};

type Category = {
  title: string;
  count: string;
  claims: string[];
  note?: string;
  products: Product[];
};

const categories: Category[] = [
  {
    title: "Supplements",
    count: "8 products",
    claims: [
      "Non-GMO",
      "Certified Gluten-Free — except Night Time Fat Burn",
      "Low-FODMAP Ingredients† — except Night Time Fat Burn",
    ],
    note: "Women’s Daily Multivitamin uses vegetarian capsules. Men’s Daily Multivitamin, Digestive Enzyme, Magnesium Complex, and Turmeric Curcumin with BioPerine® use vegan capsules. Omega 3 Fish Oil contains fish. Night Time Fat Burn is stimulant-free.",
    products: [
      {
        name: "Women’s Daily Multivitamin",
        description: "Combines essential vitamins, minerals, antioxidants, and supportive nutrients formulated for women’s daily nutritional needs.",
        benefits: ["Energy & metabolism support", "Muscle function support", "Hair, skin & nails support", "Antioxidant support", "Vegetarian capsules"],
        facts: "60 capsules · 30-day supply when taken as directed.",
        note: "Free of milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat and soy.",
      },
      {
        name: "Men’s Daily Multivitamin",
        description: "Combines essential vitamins, minerals, antioxidants, and supportive nutrients formulated for men’s daily nutritional needs.",
        benefits: ["Energy & metabolism support", "Prostate & heart health support", "Muscle function support", "Antioxidant support", "Vegan capsules"],
        facts: "60 capsules · 30-day supply when taken as directed.",
        note: "Free of milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat and soy.",
      },
      {
        name: "Probiotic 40 Billion CFU",
        description: "Combines four probiotic strains: Lactobacillus acidophilus (La-14), Bifidobacterium lactis (Bl-04), Lactobacillus plantarum (Lp-115), and Lactobacillus paracasei (Lpc-37).",
        benefits: ["Gut balance support", "Digestive health support", "Immune support"],
        facts: "60 capsules · 40 billion CFU per two-capsule serving.",
        note: "Free of milk, eggs, tree nuts, peanuts, wheat and soy.",
      },
      {
        name: "Digestive Enzyme",
        description: "Combines enzymes that help break down proteins, fats, and carbohydrates.*",
        benefits: ["Supports digestion & nutrient breakdown", "Helps reduce bloating & discomfort", "Supports nutrient absorption", "Gut health support", "Vegan capsules"],
        facts: "60 capsules · 30-day supply when taken as directed.",
      },
      {
        name: "Omega 3 Fish Oil",
        description: "Provides EPA and DHA from sea-harvested fish oil for everyday omega-3 nutrition.",
        benefits: ["Heart health support", "Brain health support", "Joint health support", "Healthy inflammatory response support", "Pure sea-harvested pelagic fish oil", "Premium EPA & DHA formula", "Tested for known contaminants"],
        facts: "60 softgels · 60-day supply when taken as directed.",
        note: "Contains fish.",
      },
      {
        name: "Magnesium Complex",
        description: "Combines multiple forms of magnesium for everyday mineral supplementation.",
        benefits: ["Muscle relaxation support", "Cardiovascular & bone health support", "Nervous system support", "Digestive health support", "Vegan capsules"],
        facts: "60 capsules · 30–60 servings per bottle, depending on recommended use.",
      },
      {
        name: "Turmeric Curcumin with BioPerine®",
        description: "Combines turmeric curcumin with black pepper extract for daily botanical support.",
        benefits: ["Antioxidant support", "Healthy aging support", "Joint & mobility support", "Cellular health support", "Vegan capsules"],
        facts: "60 capsules · 30-day supply when taken as directed.",
      },
      {
        name: "Night Time Fat Burn",
        description: "Combines a Night Burn Blend, a Mood and Sleep Blend, and melatonin in a stimulant-free nighttime formula.",
        benefits: ["Non-GMO", "Stimulant-free", "Certified Gluten-Free and Low-FODMAP ingredient claims do not apply"],
        facts: "60 capsules · per two capsules: Night Burn Blend 500 mg, Mood and Sleep Blend 340 mg, melatonin 4 mg.",
        note: "Do not exceed the recommended dose or combine with antidepressants or other sleep aids. Follow the complete package warning.",
      },
    ],
  },
  {
    title: "100% Whey Protein Isolate",
    count: "5 flavors",
    claims: [
      "Certified Gluten-Free · Non-GMO",
      "Low-FODMAP Ingredients† · No Added Sugars",
      "At least 25 g protein per serving",
    ],
    note: "Per labeled serving: 0–2 g naturally occurring sugars, 1–3 g total carbohydrate, 25–26 g protein, and 110–120 calories. Made with milk from cows not treated with rBGH/rbST.‡ Nutrition values refer to powder only; adding milk changes the totals. No Added Sugars does not mean sugar-free. See each product’s facts.",
    products: [
      { name: "Chocolate 100% Whey Isolate", description: "Made with ultra-filtered whey protein isolate, with most of the fat and lactose removed.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per 29 g rounded scoop: 110 calories · 25 g protein · 2 g carbohydrate · 1 g naturally occurring sugar · 16 servings." },
      { name: "Cappuccino 100% Whey Isolate", description: "Made with ultra-filtered whey protein isolate, with most of the fat and lactose removed.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per 29 g rounded scoop: 110 calories · 25 g protein · 2 g carbohydrate · 0 g naturally occurring sugar · 16 servings." },
      { name: "Vanilla 100% Whey Isolate", description: "Made with ultra-filtered whey protein isolate, with most of the fat and lactose removed.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per 29 g rounded scoop: 120 calories · 26 g protein · 1 g carbohydrate · 1 g naturally occurring sugar · 16 servings." },
      { name: "Unflavored 100% Whey Isolate", description: "Made with ultra-filtered whey protein isolate, with most of the fat and lactose removed.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per 29 g rounded scoop: 110 calories · 25 g protein · 1 g carbohydrate · 0 g naturally occurring sugar · 16 servings." },
      { name: "Strawberry 100% Whey Isolate", description: "Made with ultra-filtered whey protein isolate, with most of the fat and lactose removed.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per 29 g rounded scoop: 110 calories · 25 g protein · 1 g carbohydrate · 1 g naturally occurring sugar · 16 servings." },
    ],
  },
  {
    title: "Natural Whey Protein Blend",
    count: "3 flavors",
    claims: [
      "Certified Gluten-Free · Non-GMO",
      "Low-FODMAP Ingredients† · No Added Sugars",
      "24 g protein per serving",
    ],
    note: "Per labeled serving: less than 3 g total sugars, less than 5 g total carbohydrate, and no more than 130 calories. Made with milk from cows not treated with rBGH/rbST.‡ Adding milk changes nutrition totals. No Added Sugars does not mean sugar-free.",
    products: [
      { name: "Chocolate Whey Blend", description: "Combines whey protein concentrate and whey protein isolate in a smooth shake for everyday protein nutrition.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per rounded scoop: 130 calories · 24 g protein · 4 g carbohydrate · 2 g sugars · 28 servings." },
      { name: "Vanilla Whey Blend", description: "Combines whey protein concentrate and whey protein isolate in a smooth shake for everyday protein nutrition.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per rounded scoop: 130 calories · 24 g protein · 3 g carbohydrate · 2 g sugars · 28 servings." },
      { name: "Salted Caramel Whey Blend", description: "Combines whey protein concentrate and whey protein isolate in a smooth shake for everyday protein nutrition.", benefits: ["Protein for muscle maintenance & recovery*", "All nine essential amino acids, including BCAAs", "Papain & protease digestive enzymes"], facts: "Per rounded scoop: 130 calories · 24 g protein · 3 g carbohydrate · 2 g sugars · 28 servings." },
    ],
  },
  {
    title: "Vegan Protein",
    count: "2 flavors",
    claims: [
      "Vegan · Certified Gluten-Free · Non-GMO",
      "Low-FODMAP Ingredients†",
      "20 g plant protein per serving · Sweetened with Stevia",
    ],
    note: "Both shakes blend pea protein isolate, brown rice powder, and quinoa. They contain added sugars; a No Added Sugars claim does not apply.",
    products: [
      { name: "Chocolate Vegan Plant Protein Shake", description: "Blends pea protein isolate, brown rice powder, and quinoa for convenient everyday plant-based nutrition.", benefits: ["Protein for muscle maintenance & recovery*", "Three plant protein sources", "Sweetened with Stevia"], facts: "Per 32 g rounded scoop: 20 g protein · 28 servings per container." },
      { name: "Vanilla Vegan Plant Protein Shake", description: "Blends pea protein isolate, brown rice powder, and quinoa for convenient everyday plant-based nutrition.", benefits: ["Protein for muscle maintenance & recovery*", "Three plant protein sources", "Sweetened with Stevia"], facts: "Per 32 g rounded scoop: 20 g protein · 28 servings per container." },
    ],
  },
  {
    title: "Electrolytes",
    count: "2 flavors",
    claims: [
      "Vegan · Certified Gluten-Free · Non-GMO",
      "No Added Sugars",
      "Five electrolytes: sodium, potassium, chloride, magnesium & calcium",
    ],
    note: collectionClaimNote,
    products: [
      { name: "Lemon Lime Electrolyte Powder", description: "An easy-to-mix option for everyday hydration and replenishment after sweating or exercise.", benefits: ["Fluid & electrolyte balance*", "Normal muscle & nerve function*", "Low-FODMAP Ingredients†"], facts: "Per 4.5 g scoop: 5 calories · 30 servings · 80 mg sodium · 280 mg potassium · 51 mg magnesium · 47 mg calcium. Chloride is not separately declared on the label." },
      { name: "Strawberry Electrolyte Powder", description: "An easy-to-mix option for everyday hydration and replenishment after sweating or exercise.", benefits: ["Fluid & electrolyte balance*", "Normal muscle & nerve function*", "Energy metabolism & immune support*", "Added vitamins B6 & C"], facts: "Per 6.5 g scoop: 10 calories · 40 servings · 500 mg sodium · 340 mg potassium · 40 mg magnesium · 50 mg calcium · 95 mg vitamin C · 1.7 mg vitamin B6. No Low-FODMAP ingredient claim applies. Chloride is not separately declared on the label." },
    ],
  },
];

const guideCss = `
  .stellar-product-guide, .stellar-product-guide * { box-sizing: border-box; }
  .stellar-product-guide {
    --guide-ink: #182c30; --guide-muted: #607275; --guide-rule: #dce4e1;
    --guide-accent: #148795; --guide-paper: #f7f7f2;
    padding: clamp(42px, 7vw, 94px) clamp(22px, 8vw, 112px);
    color: var(--guide-ink); background: var(--guide-paper);
    font-family: var(--font-body--family, "TT Hoves", sans-serif);
  }
  .stellar-product-guide__inner { max-width: 1010px; margin: 0 auto; }
  .stellar-product-guide__eyebrow {
    margin: 0 0 13px; color: var(--guide-accent); font-size: 11px;
    font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
  }
  .stellar-product-guide h2 {
    max-width: 650px; margin: 0; color: var(--guide-ink);
    font-family: var(--font-heading--family, "TT Hoves", sans-serif);
    font-size: clamp(32px, 4vw, 50px); font-weight: 400; line-height: 1.08;
    letter-spacing: -.03em; text-transform: none;
  }
  .stellar-product-guide__intro {
    max-width: 690px; margin: 16px 0 35px; color: var(--guide-muted);
    font-size: 15px; line-height: 1.7;
  }
  .stellar-product-guide__trust {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 38px;
  }
  .stellar-product-guide__trust span {
    padding: 8px 12px; border: 1px solid var(--guide-rule); border-radius: 2px;
    color: #385155; font-size: 12px; line-height: 1.35;
  }
  .stellar-product-guide__family {
    border-top: 1px solid var(--guide-rule);
  }
  .stellar-product-guide__family:last-of-type { border-bottom: 1px solid var(--guide-rule); }
  .stellar-product-guide__family summary,
  .stellar-product-guide__product summary {
    position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto;
    align-items: center; gap: 20px; cursor: pointer; list-style: none;
  }
  .stellar-product-guide__family summary::-webkit-details-marker,
  .stellar-product-guide__product summary::-webkit-details-marker { display: none; }
  .stellar-product-guide__family summary::after,
  .stellar-product-guide__product summary::after {
    content: "+"; color: var(--guide-accent); font-size: 24px; font-weight: 300;
  }
  .stellar-product-guide__family[open] > summary::after,
  .stellar-product-guide__product[open] > summary::after { content: "−"; }
  .stellar-product-guide__family summary { min-height: 75px; }
  .stellar-product-guide__family-title { font-size: 20px; font-weight: 500; }
  .stellar-product-guide__count { color: var(--guide-muted); font-size: 12px; white-space: nowrap; }
  .stellar-product-guide__family-content { padding: 0 0 28px; }
  .stellar-product-guide__claims { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 15px; }
  .stellar-product-guide__claims span {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 9px; background: #e9f0ed; color: #385155; font-size: 11px; line-height: 1.4;
  }
  .stellar-product-guide .review-quality-icon { width: 24px; height: 24px; flex: 0 0 24px; object-fit: contain; color: #087e91; }
  .stellar-product-guide__benefits li:has(.review-quality-icon) { display: flex; align-items: center; gap: 8px; }
  .stellar-product-guide__benefits li:has(.review-quality-icon)::before { content: none; }
  .stellar-product-guide__note {
    max-width: 830px; margin: 0 0 19px; color: var(--guide-muted);
    font-size: 12px; line-height: 1.7;
  }
  .stellar-product-guide__product {
    border-top: 1px solid var(--guide-rule);
  }
  .stellar-product-guide__product summary { min-height: 61px; }
  .stellar-product-guide__product-name { font-size: 14px; font-weight: 500; line-height: 1.45; }
  .stellar-product-guide__family > summary { grid-template-columns:minmax(0,1fr) auto 12px; gap:12px; min-height:56px; }
  .stellar-product-guide__product summary { padding-block: 12px; }
  .stellar-product-guide__nutrition { display:grid; grid-template-columns:repeat(var(--metrics,4),minmax(0,1fr)); gap:8px; max-width:460px; margin-top:10px; }
  .stellar-product-guide__nutrition > span { display:flex; flex-direction:column; gap:2px; color:#222; font-size:11px; }
  .stellar-product-guide__nutrition strong { font-size:17px; font-weight:700; }
  .stellar-product-guide__serving { display:block; margin-top:7px; font-size:12px; color:#444; line-height:1.5; }
  .stellar-product-guide__claims-label { display:block;margin-top:12px;font-size:12px;font-weight:700;color:#111; }
  .stellar-product-guide__product-claims { display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:7px; }
  .stellar-product-guide__product-claim { display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:1.45;color:#111; }
  .stellar-product-guide__product-claim .review-quality-icon { width:22px;height:22px;flex-basis:22px; }
  .stellar-product-guide__product-body {
    max-width: 780px; padding: 0 26px 20px 0;
  }
  .stellar-product-guide__description {
    margin: 0 0 11px; color: #2d4345; font-size: 14px; line-height: 1.7;
  }
  .stellar-product-guide__facts {
    margin: 0 0 10px; color: var(--guide-muted); font-size: 12px; line-height: 1.65;
  }
  .stellar-product-guide__benefits {
    display: flex; flex-wrap: wrap; gap: 7px 14px; margin: 0; padding: 0; list-style: none;
  }
  .stellar-product-guide__benefits li {
    color: #385155; font-size: 12px; line-height: 1.5;
  }
  .stellar-product-guide__benefits li::before { content: "·  "; color: var(--guide-accent); font-weight: 700; }
  .stellar-product-guide__disclaimer {
    max-width: 850px; margin: 25px 0 0; color: #69777a; font-size: 11px; line-height: 1.7;
  }
  .stellar-product-guide summary:focus-visible {
    outline: 2px solid var(--guide-accent); outline-offset: 3px;
  }
  @media (max-width: 650px) {
    .stellar-product-guide { padding: 38px 21px 50px; }
    .stellar-product-guide__family summary { min-height: 68px; }
    .stellar-product-guide__family-title { font-size: 17px; }
    .stellar-product-guide__product summary { min-height: 58px; }
    .stellar-product-guide__product-body { padding-right: 0; }
  }
`;

export function StellarProductInformation() {
  return (
    <>
      <style>{guideCss}</style>
      <section
        className="stellar-product-guide"
        aria-labelledby="stellar-product-guide-title"
      >
        <div className="stellar-product-guide__inner">
          <p className="stellar-product-guide__eyebrow">Stellar Labs · Product information</p>
          <h2 id="stellar-product-guide-title">Product details, made clear.</h2>
          <p className="stellar-product-guide__intro">
            Browse product information below. Nutrition summaries match the category pages.
            Open a product for details, suggested use and label information.
          </p>
          <p className="stellar-product-guide__note"><a href={reviewAsset("/__mockup/documents/stellar-product-information-guide.pdf")} target="_blank" rel="noreferrer">Download product guide PDF</a></p>
          {categories.map((category) => {
            const family = /supplement/i.test(category.title) ? "supplements"
              : /isolate/i.test(category.title) ? "isolate"
              : /blend/i.test(category.title) ? "blend"
              : /vegan/i.test(category.title) ? "vegan" : "electrolyte";
            const source = productGuideCatalog[family];
            const updated: Category = {
              ...category,
              title: family === "isolate" ? "Whey Protein Isolate" : family === "blend" ? "Whey Protein Blend" : family === "vegan" ? "Vegan Protein" : category.title,
              count: `${source.length} products`,
              claims: source[0]?.quality.filter(claim => source.every(product => product.quality.includes(claim))) ?? [],
              note: family === "isolate" || family === "blend" ? `${milkDisclaimer} ${powderNutritionDisclaimer}`
                : family === "vegan" ? "Vegan protein formulas contain added sugars."
                : family === "supplements" ? "Individual tolerance varies. Check with your medical provider before taking supplements with medications."
                : collectionClaimNote,
              products: source,
            };
            return (
            <details className="stellar-product-guide__family" key={updated.title} open>
              <summary>
                <span className="stellar-product-guide__family-title">{updated.title}</span>
                <span className="stellar-product-guide__count">{updated.count}</span>
              </summary>
              <div className="stellar-product-guide__family-content">
                {updated.products.map((product) => (
                  <details className="stellar-product-guide__product" key={product.name}>
                    <summary>
                      <span>
                        <span className="stellar-product-guide__product-name">{product.name}</span>
                        {!!product.metrics?.length && <span className="stellar-product-guide__nutrition" style={{ "--metrics": product.metrics.length } as React.CSSProperties}>
                          {product.metrics.map(metric => <span key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></span>)}
                        </span>}
                        {product.serving && <span className="stellar-product-guide__serving">{product.serving}</span>}
                        <span className="stellar-product-guide__claims-label">Product claims</span>
                        <span className="stellar-product-guide__product-claims" role="list" aria-label={`${product.name} product claims`}>
                          {qualityCallouts(product.quality ?? []).map(claim => <span className="stellar-product-guide__product-claim" role="listitem" aria-describedby={/fodmap/i.test(claim.label) ? "guide-fodmap-note" : /rbgh|rbst/i.test(claim.label) ? "guide-rbgh-note" : undefined} key={claim.label}><QualityIcon item={claim} /><span>{claim.label}{/rbgh|rbst/i.test(claim.label) && !claim.label.includes("‡") && <sup>‡</sup>}</span></span>)}
                        </span>
                        {product.note && <span className="stellar-product-guide__serving">{product.note}</span>}
                      </span>
                    </summary>
                    <div className="stellar-product-guide__product-body">
                      <p className="stellar-product-guide__description">{product.description}</p>
                      {product.href && <p><a href={reviewUrl(product.href)} target="_top">View Product →</a></p>}
                      {product.facts && <p className="stellar-product-guide__facts">{product.facts}</p>}
                      {!!product.benefits.length && (
                        <ul className="stellar-product-guide__benefits">
                          {product.benefits.map((benefit) => <li key={benefit} aria-describedby={benefit.includes("*") ? "guide-fda-note" : undefined}>{benefit}</li>)}
                        </ul>
                      )}
                      <h3>Featured support</h3>
                      {product.support?.map(item => <p className="stellar-product-guide__description" key={item.title}><strong>{item.title}</strong> — {item.description}</p>)}
                      <h3>Suggested use</h3>
                      <p className="stellar-product-guide__description">{product.suggestedUse}</p>
                      {!!guideSpecificWarnings(product.warnings ?? []).length && <>
                        <h3>Warnings and disclaimers</h3>
                        {guideSpecificWarnings(product.warnings ?? []).map(warning => <p className="stellar-product-guide__note" key={warning}>{warning}</p>)}
                      </>}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          );})}
          {collectionClaimNote && <p className="stellar-product-guide__disclaimer">{collectionClaimNote}</p>}
          <p id="guide-fda-note" className="stellar-product-guide__disclaimer">*{powderDisclaimer}</p>
          <p id="guide-rbgh-note" className="stellar-product-guide__disclaimer">{milkDisclaimer}</p>
          <details className="stellar-product-guide__disclaimer">
            <summary>Additional nutrition information</summary>
            <p>{powderNutritionDisclaimer}</p>
          </details>
        </div>
      </section>
    </>
  );
}
