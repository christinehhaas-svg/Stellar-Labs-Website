import { createPortal } from "react-dom";
import { initializeReviewLinks, reviewAsset } from "./review-links";
import { useProductSnapshot } from "./_shared/useProductSnapshot";
import styles from "./_shipping-policies.css?inline";
import "./_group.css";

function initializeSnapshot(doc: Document, view: Window) {
  const header = doc.querySelector("#header-component");
  const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  initializeReviewLinks(doc);
  const style = doc.createElement("style");
  style.id = "stellar-contact-style";
  style.textContent = styles;
  doc.getElementById(style.id)?.remove();
  doc.head.append(style);
  return () => view.removeEventListener("resize", updateHeader);
}

// Contact details preserved from the merchant's /pages/contact page.
// Use real phone/email handlers instead of reproducing an unconnected Shopify form.
export function ContactPage() {
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initializeSnapshot);
  return (
    <main className="stellar-supplements-shell" aria-label="Contact Us" style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        key={attempt}
        ref={iframeRef}
        title="Contact Us"
        src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=contact`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        className="stellar-supplements-frame"
        aria-hidden={status !== "ready" ? true : undefined}
        tabIndex={status !== "ready" ? -1 : undefined}
        style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
      />
      {status !== "ready" && (
        <section role={status === "error" ? "alert" : "status"} aria-live="polite" style={{ position: "absolute", inset: 0, padding: "42px 24px", background: "#fff", color: "#23201f" }}>
          <h1>Contact Us</h1>
          <p>{status === "error" ? "The Contact page could not load." : "Loading Contact Us…"}</p>
          {status === "error" && <button type="button" onClick={retry}>Try again</button>}
        </section>
      )}
      {mount ? createPortal(
        <article className="sl-shipping-page sl-contact-page" aria-labelledby="contact-title">
          <header className="sl-shipping-title">
            <h1 id="contact-title">Contact Us</h1>
          </header>
          <div className="sl-shipping-body">
            <p>We'd LOVE to hear from you!</p>
            <section aria-labelledby="contact-details-title">
              <h2 id="contact-details-title">Contact</h2>
              <p>P: <a href="tel:+17035522722" target="_top">(703) 552-2722</a><br />
                E: <a href="mailto:Stellarlabs@washncgroup.com" target="_top">Stellarlabs@washncgroup.com</a></p>
            </section>
            <section aria-labelledby="contact-hours-title">
              <h2 id="contact-hours-title">Office Hours</h2>
              <p><strong>MONDAY - FRIDAY:</strong><br />8am to 4pm</p>
            </section>
            <section aria-labelledby="contact-address-title">
              <h2 id="contact-address-title">Address</h2>
              <p><strong>STELLAR LABS</strong><br />44031 Pipeline Plaza STE 210<br />Ashburn, VA 20147</p>
            </section>
          </div>
        </article>, mount,
      ) : null}
    </main>
  );
}
