import type { FlyerProduct } from "./stellar-claims-flyer-data";

export function ClaimsFlyerIngredients({ product }: { product: FlyerProduct }) {
  return <div className="claims-facts-ingredients">
    <p className="claims-facts-upc"><strong>{product.upcNote ? "Printed UPC (unconfirmed)" : "UPC"}:</strong> {product.upc}</p>
    {product.upcNote && <p className="claims-facts-upc-note">{product.upcNote}</p>}
    {product.ingredients.map((item, index) => <p key={`${item.heading}-${index}`}>
      <strong>{item.heading}:</strong> {item.text}
    </p>)}
  </div>;
}
