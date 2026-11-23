/** Navigate within the owning document, including captured pages and dialogs. */
export function ProductClaimsButton() {
  return <>
    <style>{`
      .sl-product-claims-button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 20px;margin:8px 0 16px;border:1px solid currentColor;border-radius:3px;background:white;color:#171717;font:600 14px/1.4 Arial,sans-serif;text-decoration:none}
      .sl-product-claims-button:hover{background:#f2f2f2}
      .sl-product-claims-button:focus-visible,.sl-product-claims-heading:focus{outline:2px solid #087e91;outline-offset:4px}
      .sl-product-claims-heading{scroll-margin-top:100px}
    `}</style>
    <a className="sl-product-claims-button" href="#product-claims" onClick={(event) => {
      const target = event.currentTarget.ownerDocument.getElementById("product-claims");
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ block: "start" });
      target.focus({ preventScroll: true });
    }}>Product Claims</a>
  </>;
}
