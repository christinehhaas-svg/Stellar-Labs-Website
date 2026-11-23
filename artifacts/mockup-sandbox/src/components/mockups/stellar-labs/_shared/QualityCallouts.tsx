import { PersonStanding, CheckCircle2, FlaskConical, Leaf, CandyOff } from "lucide-react";
import { reviewAsset } from "../review-links";
import styles from "../_quality-callouts.css?inline";
import { claimIcon, stomachArtwork, type ClaimIcon } from "./claim-icons";
import { heavyMetalsTestingClaim } from "./quality-claims";

export type QualityCallout = {
  label: string;
  image?: string;
  symbol?: ClaimIcon;
};

/** Preserve product-specific wording, including GMP certified vs. compliant. */
export function qualityCallouts(statements: string[]): QualityCallout[] {
  const claims = statements.flatMap(statement => statement.split(/\s*·(?!\s*except\b)\s*/i))
    .filter(claim => !/^Tested for Heavy Metals\b/i.test(claim));
  claims.push(heavyMetalsTestingClaim);
  return claims.map((statement) => {
    const label = statement.replace(/^Tested for Heavy Metals:.*$/, "Tested for Heavy Metals")
      .replace(/^Certified Gluten-Free[*†‡]+$/, "Certified Gluten-Free")
      .replace(/^rBGH-Free(?! Whey)/i, "rBGH-Free Whey");
    const symbol = claimIcon(statement);
    if (symbol === "milk") {
      return { label, symbol, image: reviewAsset("/__mockup/stellar-current/assets/stellar-rbgh-cow-outline.png") };
    }
    if (symbol === "gluten-free") {
      return { label, symbol, image: reviewAsset("/__mockup/stellar-current/assets/702fdffe87ab02f0.svg") };
    }
    if (symbol === "corn") {
      return { label, symbol, image: reviewAsset("/__mockup/stellar-current/assets/b1f703f6d4d0d5a8.svg") };
    }
    if (symbol === "stomach") {
      return { label, symbol, image: `data:image/svg+xml,${encodeURIComponent(stomachArtwork)}` };
    }
    return { label, symbol };
  });
}

export function QualityIcon({ item }: { item: QualityCallout }) {
  const Icon = /^GLP-1 Friendly/i.test(item.label) ? PersonStanding : item.symbol === "leaf" ? Leaf : item.symbol === "testing" ? FlaskConical
    : item.symbol === "sugar" ? CandyOff : CheckCircle2;
  return item.image
    ? <img className="review-quality-icon" data-claim-icon={item.symbol} src={item.image} alt="" aria-hidden="true" />
    : <Icon className="review-quality-icon" data-claim-icon={item.symbol} aria-hidden="true" focusable="false" />;
}

export function QualityCallouts({ items, note, label = "Product callouts", singleLine = false, includeMedicalNote = false, listing = false }: {
  items: QualityCallout[];
  note: string;
  label?: string;
  singleLine?: boolean;
  includeMedicalNote?: boolean;
  listing?: boolean;
}) {
  return (
    <section className={`review-quality-strip${singleLine ? " review-quality-single-line" : ""}${listing ? " review-quality-listing" : ""}`} aria-label={label}>
      <style>{styles}</style>
      <ul className="review-quality-row" tabIndex={singleLine ? 0 : undefined} aria-label={singleLine ? "Product claims; scroll horizontally to see all claims" : undefined}>
        {items.filter(item => !/^GLP-?1 Friendly|fodmap/i.test(item.label)).map((item) => {
          const claimLabel = /^Certified Gluten-Free/i.test(item.label) ? item.label.replace(/[*†]+/g, "") : item.label;
          return (
            <li className="review-quality-claim" key={item.label}>
              <QualityIcon item={item} />
              <span>{claimLabel}</span>
            </li>
          );
        })}
      </ul>
      {((note && !/fodmap/i.test(note)) || includeMedicalNote) && <p>
        {/fodmap/i.test(note) ? "" : note}{includeMedicalNote
          ? `${listing ? " " : " *"}Consult with your medical provider before taking supplements while on GLP-1 medications.`
          : ""}
      </p>}
    </section>
  );
}
