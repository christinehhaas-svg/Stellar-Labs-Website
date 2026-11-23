import { CheckCircle2, FlaskConical } from "lucide-react";
import "./_stellar-claims-flyer.css";
import "./_stellar-whey-flyer.css";

const sharedClaims = [
  "Certified Gluten-Free",
  "Non-GMO",
  "Manufactured in the USA",
  "cGMP Certified Facility",
  "Tested for Heavy Metals",
];

const formulas = [
  {
    number: "01",
    title: "100% Whey Protein Isolate",
    subtitle: "Five isolate product pages",
    image: "/__mockup/images/stellar-proteins/100-isolate-whey-protein-shake-mixed-berry-0.png",
    quality: [
      "100% Whey Protein Isolate",
      "Ultra-Filtered Whey Protein",
      "Digestive Enzymes: Papain + Protease",
    ],
    benefits: [
      "A clean, high-quality whey protein source",
      "Delivers essential amino acids to support everyday nutrition",
      "Low in sugar and free of fillers",
      "Easy to mix, with papain and protease digestive enzymes",
    ],
    flavors: "Mixed Berry · Unflavored · Vanilla · Chocolate · Cappuccino",
  },
  {
    number: "02",
    title: "Whey Protein Blend",
    subtitle: "Three whey blend product pages",
    image: "/__mockup/images/stellar-proteins/vanilla-whey-protein-shake-0.png",
    quality: [
      "Whey Protein Concentrate + Whey Protein Isolate",
      "Digestive Enzymes: Protease + Papain",
      "No Artificial Flavors",
      "No Artificial Colors",
      "Sweetened with Stevia",
    ],
    benefits: [
      "A blend of whey protein concentrate and whey protein isolate",
      "Protein to support muscle recovery and growth",
      "A smooth shake that mixes easily with your choice of liquid",
      "Made without artificial flavors or colors",
    ],
    flavors: "Salted Caramel · Vanilla · Chocolate",
  },
];

export function StellarWheyFlyer() {
  return <div className="stellar-handoff">
    <article className="handoff-page whey-handoff">
      <header className="handoff-header">
        <div className="handoff-top"><strong>STELLAR<span>LABS®</span></strong><span>WEB TEAM HANDOFF · OCT 05, 2026</span></div>
        <p className="handoff-eyebrow">Whey product-page mockup & copy</p>
        <h1>Whey isolate & whey blend</h1>
        <p>Use the same dark callout strip and teal icons for both formulas. Keep their benefits, Quality details, and flavor-specific labels separate.</p>
      </header>
      {formulas.map((formula) => <section className="whey-formula" key={formula.number}>
        <div className="handoff-category-heading">
          <div><span className="handoff-number">{formula.number}</span><h2>{formula.title}</h2><p>{formula.subtitle}</p></div>
          <img src={formula.image} alt={formula.title} />
        </div>
        <div className="handoff-claims">
          {sharedClaims.map((claim) => {
            const asset = claim === "Certified Gluten-Free" ? "702fdffe87ab02f0.svg" : claim === "Non-GMO" ? "b1f703f6d4d0d5a8.svg" : undefined;
            const Icon = claim === "Tested for Heavy Metals" ? FlaskConical : CheckCircle2;
            return <div className="handoff-claim" key={claim}>
              {asset ? <img src={`/__mockup/stellar-current/assets/${asset}`} alt="" /> : <Icon aria-hidden="true" />}
              <span>{claim}</span>
            </div>;
          })}
        </div>
        <div className="whey-formula-copy">
          <div><h3>Formula-specific Quality</h3><ul>{formula.quality.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><h3>Benefits used on the review pages</h3><ul>{formula.benefits.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
        <p className="whey-flavors"><b>Flavors:</b> {formula.flavors}</p>
      </section>)}
      <aside className="whey-details">
        <p><b>Full heavy-metal wording for both:</b> Tested for Heavy Metals: Lead, Arsenic, Cadmium & Mercury.</p>
        <p><b>Callout note:</b> “See the Quality section below for complete formula-specific details.”</p>
      </aside>
      <footer className="handoff-footer">
        <b>Implementation:</b> Place the callout strip above the product hero; wrap into two columns on mobile. Keep one Quality section. Do not add Vegan or Vegetarian callouts to whey products. Preserve each flavor’s Nutrition Facts, ingredients, allergen statements, and original label artwork.
        <div><span>CURRENT REVIEW COPY · NOT CERTIFICATION DOCUMENTATION</span><span>1 / 1</span></div>
      </footer>
    </article>
  </div>;
}
