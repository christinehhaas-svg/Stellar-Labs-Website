import { heavyMetalsBadgeMarkup } from "./heavy-metals-testing";

export function HeavyMetalsBadge() {
  return <div
    data-heavy-metals-badge="product"
    style={{ display: "flex", alignItems: "center", gap: 9, margin: "12px 0", fontSize: 13, fontWeight: 500, color: "#23201f" }}
    dangerouslySetInnerHTML={{ __html: heavyMetalsBadgeMarkup(true) }}
  />;
}
