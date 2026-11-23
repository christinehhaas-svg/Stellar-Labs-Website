import { createPortal } from "react-dom";
import { initializeReviewLinks, reviewAsset } from "./review-links";
import { useProductSnapshot } from "./_shared/useProductSnapshot";
import styles from "./_shipping-policies.css?inline";
import approvedPolicy from "../../../../../scripts/content/stellar-shipping-returns-policy.md?raw";
import "./_group.css";

const snapshotRevision = import.meta.env.DEV ? Date.now().toString(36) : "approved-returns";

function initializeSnapshot(doc: Document, view: Window) {
  const header = doc.querySelector("#header-component");
  const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  initializeReviewLinks(doc);
  let style = doc.getElementById("stellar-shipping-policies-style");
  if (!style) {
    style = doc.createElement("style");
    style.id = "stellar-shipping-policies-style";
    doc.head.append(style);
  }
  style.textContent = styles;
  return () => view.removeEventListener("resize", updateHeader);
}

function PolicyParagraph({ text }: { text: string }) {
  return <p>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (!part.startsWith("**")) return part;
    const emphasized = part.slice(2, -2);
    return <strong key={index}>{/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emphasized)
      ? <a href={`mailto:${emphasized}`}>{emphasized}</a>
      : emphasized}</strong>;
  })}</p>;
}

/** Render the merchant-approved copy without carrying over legacy policy terms. */
function ShippingPolicyContent() {
  const [introduction, ...sections] = approvedPolicy.trim().split(/\n## /);
  const [heading, ...introParagraphs] = introduction.split(/\n\s*\n/);
  return (
    <article className="sl-shipping-page" aria-labelledby="shipping-policies-title">
      <header className="sl-shipping-title">
        <h1 id="shipping-policies-title">{heading.replace(/^# /, "")}</h1>
      </header>
      <div className="sl-shipping-body">
        <div className="sl-information-photo-layout sl-shipping-photo-intro">
          <div>
            {introParagraphs.map((text, index) => <PolicyParagraph key={index} text={text} />)}
          </div>
          <figure className="sl-information-photo">
            <img
              src={reviewAsset("/__mockup/images/stellar/caramel-whey-lifestyle.jpg")}
              alt="Stellar Labs salted caramel whey protein with a shake and raspberries"
              width={1200}
              height={675}
            />
          </figure>
        </div>
        {sections.map((section, index) => {
          const [title, ...paragraphs] = section.trim().split(/\n\s*\n/);
          const id = `shipping-section-${index}`;
          return <section key={id} aria-labelledby={id}>
            <h2 id={id}>{title}</h2>
            {paragraphs.map((text, paragraph) => <PolicyParagraph key={paragraph} text={text} />)}
          </section>;
        })}
      </div>
    </article>
  );
}

export function ShippingPolicies() {
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initializeSnapshot, snapshotRevision);
  return (
    <main className="stellar-supplements-shell" aria-label="Stellar Labs shipping and policies" style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        key={`${snapshotRevision}-${attempt}`}
        ref={iframeRef}
        title="Stellar Labs shipping and policies"
        src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=shipping-policies&revision=${snapshotRevision}`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        className="stellar-supplements-frame"
        aria-hidden={status !== "ready" ? true : undefined}
        tabIndex={status !== "ready" ? -1 : undefined}
        style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
      />
      {status !== "ready" && <section role={status === "error" ? "alert" : "status"} aria-live="polite" style={{ position: "absolute", inset: 0, padding: "42px 24px", background: "#fff", color: "#23201f" }}>
        <h1>Shipping &amp; Returns Policy</h1>
        <p>{status === "error" ? "The shipping policies could not load." : "Loading shipping policies…"}</p>
        {status === "error" && <button type="button" onClick={retry}>Try again</button>}
      </section>}
      {mount ? createPortal(<ShippingPolicyContent />, mount) : null}
    </main>
  );
}
