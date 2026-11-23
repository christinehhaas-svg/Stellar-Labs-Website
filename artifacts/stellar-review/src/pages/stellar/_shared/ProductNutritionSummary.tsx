import { powderNutritionMetrics } from "./ProductCardNutrition";
import type { Supplement } from "./supplements-data";

type Metric = { label: string; value: string };

function NutritionSummary({ metrics, basis, servingWeight }: { metrics: Metric[]; basis?: string; servingWeight?: string }) {
  return <section className="sl-detail-nutrition" data-metric-count={metrics.length} aria-label="Per serving nutrition summary">
    <style>{`
      .sl-detail-nutrition{margin:10px 0 20px;text-align:left}
      .sl-detail-nutrition>p{margin:9px 0 0!important;font-size:11px!important;line-height:1.4!important;color:#655f5b}
      .sl-detail-nutrition dl{display:grid;gap:10px 8px;margin:0;padding:0}
      .sl-detail-nutrition dl>div{min-width:0;display:flex;flex-direction:column}
      .sl-detail-nutrition dt{font-size:11px;line-height:1.4;font-weight:400;color:#514c49}
      .sl-detail-nutrition dd{order:-1;margin:0 0 3px;font-size:clamp(14px,4vw,16px);font-weight:600;line-height:1.3;color:#23201f;overflow-wrap:anywhere}
      @media(max-width:360px){.sl-detail-nutrition[data-metric-count="5"] dl{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
    `}</style>
    <dl style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}>
      {metrics.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <p>{servingWeight ? `Per ${servingWeight} serving` : "Per serving"}{basis ? ` · ${basis}` : ""}</p>
  </section>;
}

export function PowderNutritionSummary({ component, servingWeight }: { component: string; servingWeight?: string }) {
  return <NutritionSummary metrics={powderNutritionMetrics(component).metrics} servingWeight={servingWeight} />;
}

export function supplementNutritionMetrics(product: Pick<Supplement, "id" | "facts">): Metric[] {
  const facts = product.facts.join("; ");
  const measurements: Record<string, [string, RegExp][]> = {
    "omega-3": [
      ["Fish oil", /Fish oil:\s*([\d,.]+\s*mg)/i],
      ["Omega-3", /Omega-3:\s*([\d,.]+\s*mg)/i],
      ["EPA", /EPA:\s*([\d,.]+\s*mg)/i],
      ["DHA", /DHA:\s*([\d,.]+\s*mg)/i],
    ],
    "magnesium-complex": [["Magnesium", /Magnesium:\s*([\d,.]+\s*mg)/i]],
    "turmeric-w-bioperine": [
      ["Turmeric root", /turmeric root:\s*([\d,.]+\s*mg)/i],
      ["Curcuminoids", /95% curcuminoids:\s*([\d,.]+\s*mg)/i],
      ["BioPerine®", /black pepper extract:\s*([\d,.]+\s*mg)/i],
    ],
    "probiotic-40": [["Live cultures", /([\d,.]+\s*billion CFU)/i]],
    "digestive-enzyme": [["Enzyme blend", /\/\s*([\d,.]+\s*mg)/i]],
  };
  if (measurements[product.id]) return measurements[product.id].map(([label, pattern]) => {
    const value = facts.match(pattern)?.[1];
    if (!value) throw new Error(`Missing labeled amount for ${product.id}: ${label}`);
    return { label, value };
  });
  const dose = product.facts.find(fact => /^Serving size:/i.test(fact))?.replace(/^Serving size:\s*/i, "");
  if (!dose || !/Vitamins, minerals/i.test(facts)) throw new Error(`Missing supplement summary for ${product.id}`);
  return [{ label: "Serving size", value: dose }, { label: "Nutrients", value: "Vitamins & minerals" }];
}

export function SupplementNutritionSummary({ product }: { product: Supplement }) {
  const basis = product.facts.find(fact => /^Serving size:/i.test(fact))?.replace(/^Serving size:\s*/i, "");
  return <NutritionSummary metrics={supplementNutritionMetrics(product)} basis={basis} />;
}
