/** Per-serving values transcribed from the supplied package facts panels.
 * The 1 lb Vanilla/Chocolate values follow their own supplied package photos,
 * independently of the 2 lb versions.
 */
import { orderNutrition } from "./nutrition-order";

export const shakeCardNutrition: Record<string, {
  protein: string; calories: string; carbs: string; sugar: string; fat: string;
}> = {
  ProteinVanillaIsolate: { protein: "26g", calories: "120", carbs: "1g", sugar: "1g", fat: "1g" },
  ProteinChocolateIsolate: { protein: "25g", calories: "110", carbs: "2g", sugar: "1g", fat: "1g" },
  ProteinVanillaIsolate1lb: { protein: "25g", calories: "110", carbs: "1g", sugar: "0g", fat: "0.5g" },
  ProteinChocolateIsolate1lb: { protein: "25g", calories: "110", carbs: "1g", sugar: "<1g", fat: "1g" },
  ProteinMixedBerry: { protein: "25g", calories: "110", carbs: "1g", sugar: "0g", fat: "0.5g" },
  ProteinCappuccino: { protein: "25g", calories: "110", carbs: "2g", sugar: "0g", fat: "0.5g" },
  ProteinUnflavored: { protein: "25g", calories: "110", carbs: "<1g", sugar: "0g", fat: "—" },
  ProteinVanillaBlend: { protein: "24g", calories: "130", carbs: "3g", sugar: "2g", fat: "2g" },
  ProteinChocolateBlend: { protein: "24g", calories: "130", carbs: "4g", sugar: "2g", fat: "2g" },
  ProteinCaramelBlend: { protein: "24g", calories: "130", carbs: "3g", sugar: "2g", fat: "2g" },
  VeganVanilla: { protein: "20g", calories: "130", carbs: "6g", sugar: "3g", fat: "3.5g" },
  VeganChocolate: { protein: "20g", calories: "130", carbs: "6g", sugar: "2g", fat: "3.5g" },
};

const electrolyteNutrition: Record<string, string[]> = {
  ElectrolyteLemonLime: ["280mg", "51mg", "47mg", "80mg", "5"],
  ElectrolyteStrawberry: ["340mg", "40mg", "50mg", "500mg", "10"],
};

export function powderNutritionMetrics(component: string) {
  const shake = shakeCardNutrition[component];
  const electrolyte = electrolyteNutrition[component];
  if (!shake && !electrolyte) throw new Error(`Missing product card nutrition: ${component}`);
  const labels = electrolyte
    ? ["Calories", "Potassium", "Magnesium", "Calcium", "Sodium"]
    : ["Calories", "Protein", "Carbs", /^Protein(?:Vanilla|Chocolate|Caramel)Blend$/.test(component) ? "Natural sugar" : "Sugar"];
  // Calories lead every multi-nutrient website summary. Keep each amount
  // paired with its label; the underlying package facts remain unchanged.
  const values = electrolyte
    ? [electrolyte[4], ...electrolyte.slice(0, 4)]
    : [shake.calories, shake.protein, shake.carbs, shake.sugar];
  return { electrolyte: Boolean(electrolyte), metrics: orderNutrition(labels.map((label, index) => ({ label, value: values[index] }))) };
}

export function ProductCardNutrition({ component, omitMetrics = [] }: { component: string; omitMetrics?: readonly string[] }) {
  const { electrolyte, metrics } = powderNutritionMetrics(component);
  return (
    <div className="sl-card-nutrition">
      <dl className={`sl-card-nutrition-row ${electrolyte ? "sl-card-electrolyte-metrics" : "sl-card-shake-metrics"}`} aria-label="Nutrition per serving" style={{ maxWidth: electrolyte ? 320 : 210 }}>
        {metrics.filter(({ label }) => !omitMetrics.includes(label)).map(({ label, value }) => <div key={label}>
          <dt>{label === "Natural sugar" ? "Sugar" : label}</dt>
          <dd>{value}</dd>
        </div>)}
      </dl>
      <p className="sl-card-per-serving">Per serving</p>
    </div>
  );
}
