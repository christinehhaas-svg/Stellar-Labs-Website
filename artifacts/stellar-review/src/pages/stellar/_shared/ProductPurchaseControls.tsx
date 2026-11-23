import { useState } from "react";

/** Local review selection only; does not contact a live checkout. */
export function ProductPurchaseControls() {
  const [quantity, setQuantity] = useState(1);
  const [purchaseOption, setPurchaseOption] = useState("one-time");
  const [added, setAdded] = useState(false);
  return <>
    <fieldset className="sl-protein-purchase-options">
      <legend>Purchase option</legend>
      <label><input type="radio" name="purchase-option" value="one-time" checked={purchaseOption === "one-time"} onChange={() => { setPurchaseOption("one-time"); setAdded(false); }} />One-time purchase</label>
      <label><input type="radio" name="purchase-option" value="subscription" checked={purchaseOption === "subscription"} onChange={() => { setPurchaseOption("subscription"); setAdded(false); }} />Subscribe &amp; Save 10%</label>
    </fieldset>
    <div className="sl-protein-buy-row">
      <div className="sl-protein-quantity" aria-label="Quantity">
        <button type="button" aria-label="Decrease quantity" onClick={() => { setQuantity(value => Math.max(1, value - 1)); setAdded(false); }}>−</button>
        <output aria-live="polite">{quantity}</output>
        <button type="button" aria-label="Increase quantity" onClick={() => { setQuantity(value => value + 1); setAdded(false); }}>+</button>
      </div>
      <button type="button" className="sl-protein-cart" onClick={() => setAdded(true)}>Add to Cart</button>
    </div>
    {added && <p className="sl-protein-selection-status" role="status">Selection updated.</p>}
  </>;
}
