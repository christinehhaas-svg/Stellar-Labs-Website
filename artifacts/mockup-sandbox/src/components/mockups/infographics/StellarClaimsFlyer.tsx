import { FlyerClaimIcon } from "./_FlyerClaimIcon";
import { fodmapDisclaimer } from "../../../../../stellar-review/src/pages/stellar/_shared/fodmap-disclaimer";
import { getOutlineProduct } from "../../../../../stellar-review/src/pages/stellar/_shared/outline-copy";
import { powderRows, supplementRows, flyerPageCount, collectionClaimGroups } from "./stellar-claims-flyer-data";
import { ClaimsFlyerNutritionPages } from "./ClaimsFlyerNutritionPages";
import { ClaimsFlyerProductPages } from "./ClaimsFlyerProductPages";
import "./_stellar-claims-flyer.css";

const totalPages = flyerPageCount;
const groups = collectionClaimGroups;

function Header({ appendix = false }: { appendix?: boolean }) {
  return <header className="handoff-header">
    <div className="handoff-top"><strong>STELLAR<span>LABS®</span></strong><span>CURRENT WEBSITE CLAIMS & NUTRITION FACTS</span></div>
    <p className="handoff-eyebrow">{appendix ? "Exact product-specific copy" : "Claims reference"}</p>
    <h1>{appendix ? "Product claims" : "Current claims.\nProduct-specific wording."}</h1>
    <p>{appendix ? "These lists use the same approved claim data as the product pages. Nutrition and serving details follow on pages 3 onward." : "Collection callouts below; exact product-specific wording on page 2. Nutrition facts begin on page 3. Original package artwork remains unchanged."}</p>
  </header>;
}

export function StellarClaimsFlyer() {
  const onlyPage = new URLSearchParams(window.location.search).get("page");
  return <div className="stellar-handoff stellar-current-claims">
    <style>{`
      .stellar-current-claims .handoff-category{margin-bottom:10px}
      .stellar-current-claims .handoff-category-heading{height:32px;margin-bottom:6px}
      .stellar-current-claims .handoff-category-heading h2{font-size:17px;margin-bottom:2px}
      .stellar-current-claims .handoff-claims{padding:8px 14px;gap:6px 18px}
      .stellar-current-claims .handoff-claim{min-height:22px}
      .stellar-current-claims .handoff-appendix td{font-size:9px;padding:3px 7px}
      .stellar-current-claims .handoff-appendix .handoff-header{margin-bottom:10px}
      .stellar-current-claims .handoff-appendix .handoff-header h1{font-size:25px}
    `}</style>
    {(onlyPage === null || onlyPage === "1") && <article className="handoff-page" data-flyer-page="1">
      <Header />
      {groups.map((group, index) => <section className="handoff-category" key={group.name}>
        <div className="handoff-category-heading"><div><span className="handoff-number">0{index + 1}</span><h2>{group.name}</h2><p>{group.subtitle}</p></div></div>
        <div className="handoff-claims">{group.claims.map(claim =>
          <div className="handoff-claim" key={claim}><FlyerClaimIcon claim={claim} /><span>{claim}</span></div>
        )}</div>
      </section>)}
      <footer className="handoff-footer"><p>{fodmapDisclaimer}</p><div><span>WEBSITE COPY REFERENCE · NOT CERTIFICATION DOCUMENTATION</span><span>1 / {totalPages}</span></div></footer>
    </article>}
    {(onlyPage === null || onlyPage === "2") && <article className="handoff-page handoff-appendix" data-flyer-page="2">
      <Header appendix />
      <section className="handoff-copy-section">
        <table><thead><tr><th>Product</th><th>Applicable claims</th></tr></thead><tbody>
          {[...powderRows, ...supplementRows].map(row => <tr key={row.name}><td>{row.name}</td><td>{row.claims.join(" · ")}</td></tr>)}
        </tbody></table>
      </section>
      <aside className="handoff-rules">
        <p>{fodmapDisclaimer}</p>
        <p>{getOutlineProduct("omega-3").warnings.find(warning => /Food and Drug/i.test(warning)) ?? "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure or prevent any disease."}</p>
      </aside>
      <footer className="handoff-footer"><div><span>REFERENCE: CURRENT APPROVED WEBSITE CLAIMS</span><span>2 / {totalPages}</span></div></footer>
    </article>}
    <ClaimsFlyerNutritionPages onlyPage={onlyPage} />
    <ClaimsFlyerProductPages onlyPage={onlyPage} />
  </div>;
}
