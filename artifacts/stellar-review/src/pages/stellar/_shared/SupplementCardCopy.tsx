import { type Supplement } from "./supplements-data";
import { supplementServingInfo } from "./product-servings";

export function SupplementCardCopy({ product }: { product: Supplement }) {
  const info = supplementServingInfo[product.id];
  if (!info) throw new Error(`Missing supplement card servings: ${product.id}`);
  return <>
    <h2><span className="sl-card-name">{product.name}</span><span className="sl-card-variant">{product.count}</span></h2>
    <p className={`sl-product-price${info.priceCents === undefined ? " sl-price-unconfirmed" : ""}`}>{info.priceCents !== undefined ? `$${(info.priceCents / 100).toFixed(2)}` : "Price to be confirmed"}</p>
  </>;
}
