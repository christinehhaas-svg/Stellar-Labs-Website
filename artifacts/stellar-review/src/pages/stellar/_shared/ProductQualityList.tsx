import { FlaskConical } from "lucide-react";
import { heavyMetalsTestingClaim } from "./quality-claims";

/** Keep the existing product details list; identify testing with its own icon. */
export function ProductQualityList({ claims }: { claims: string[] }) {
  return <ul className="sl-protein-quality">{claims.map(claim => (
    <li key={claim}>{claim === heavyMetalsTestingClaim
      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <FlaskConical data-claim-icon="testing" size={18}
          style={{ color: "#087e89", flexShrink: 0 }} aria-hidden="true" focusable="false" />
        <span>{claim}</span>
      </span>
      : claim}</li>
  ))}</ul>;
}
