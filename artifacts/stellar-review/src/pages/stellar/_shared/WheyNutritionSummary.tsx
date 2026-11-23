import styles from "./whey-nutrition-summary.css?inline";
import { collectionNutritionSummary } from "./collection-nutrition-summary";

export type WheyNutritionType = "isolate" | "blend" | "vegan";

export function WheyNutritionSummary({ formula }: {
  formula: WheyNutritionType | "electrolyte";
  flavor?: string;
}) {
  const items = collectionNutritionSummary(formula);
  if (formula === "blend" || formula === "vegan") {
    return (
      <section className="sl-whey-nutrition sl-whey-nutrition-compact" aria-label={`${formula} nutrition per serving`}>
        <style>{styles}</style>
        <p><strong className="sl-whey-nutrition-value">{items[0].value}</strong> protein per serving</p>
      </section>
    );
  }
  return (
    <section className="sl-whey-nutrition" aria-label={`${formula} nutrition per serving`}>
      <style>{styles}</style>
      <dl className="sl-whey-nutrition-grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ value, label, caption, bound }) => (
          <div className="sl-whey-nutrition-item" key={label}>
            <dt>{label}</dt>
            <dd>
              <span className="sl-whey-nutrition-caption" aria-hidden={!caption || undefined}>{caption ?? "\u00a0"}</span>
              <span className="sl-whey-nutrition-value">{bound && <span className="sl-whey-nutrition-bound">{bound} </span>}{value}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="sl-whey-nutrition-footer">
        <p className="sl-whey-nutrition-kicker">{formula === "isolate" ? "Values are per serving and vary by flavor." : "PER SERVING"}</p>
      </div>
    </section>
  );
}
