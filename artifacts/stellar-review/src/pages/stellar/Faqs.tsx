import { useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";
import { useProductSnapshot } from "./_shared/useProductSnapshot";
import styles from "./_faqs.css?inline";
import "./_group.css";

const snapshotRevision = import.meta.env.DEV ? Date.now().toString(36) : "faqs-draft";

type FaqsPageProps = {
  assetUrl?: (capturedPath: string) => string;
  localUrl?: (route: string) => string;
  initializeLinks?: (doc: Document) => void;
};

type Faq = { id: string; question: string; answer: ReactNode };

function buildFaqs(L: (route: string) => string): Faq[] {
  const a = (route: string, text: string) => <a href={L(route)} target="_parent">{text}</a>;
  return [
    { id: "heavy-metals", question: "Are your products tested for heavy metals?", answer: <>
      <p>Yes. All Stellar Labs products have passed heavy-metal testing.</p>
    </> },
    { id: "products", question: "What products does Stellar Labs offer?", answer: <>
      <p>Stellar Labs offers:</p>
      <ul><li>Whey protein isolate</li><li>Whey protein blend</li><li>Vegan protein</li><li>Electrolytes</li><li>Supplements</li></ul>
      <p>You can browse the full range on the {a("/shop", "Shop All")} page.</p>
    </> },
    { id: "whey-vegan", question: "What is the difference between whey and vegan protein?", answer: <>
      <p>Whey protein is milk-derived. Vegan protein is plant-based.</p>
      <p>Ingredients and allergen information differ by product, so please check the label of each specific product before choosing.</p>
    </> },
    { id: "labels", question: "Where can I find nutrition facts, ingredients and directions?", answer: <>
      <p>Product-specific facts and the original, complete labels are on each individual product page. Start from {a("/shop", "Shop All")}, or see {a("/product-information", "Product Information")}.</p>
    </> },
    { id: "serving", question: "How much should I use, and how often?", answer: <>
      <p>Follow the directions on the specific package you have. Formulas, flavors and sizes can differ between products, so directions for one product may not apply to another.</p>
    </> },
    { id: "health", question: "Can I take these products with medication or a health condition?", answer: <>
      <p>If you take medication, are pregnant or breastfeeding, or are managing a health condition, consult your healthcare professional before using supplements.</p>
    </> },
    { id: "shipping", question: "What are your shipping and return policies?", answer: <>
      <p>Please refer to the current {a("/pages/shipping-information", "Shipping & Returns Policy")} for up-to-date details.</p>
    </> },
    { id: "contact", question: "How can I contact Stellar Labs?", answer: <>
      <p>For questions about a product or an order, please reach out through our {a("/pages/contact", "Contact page")}.</p>
    </> },
  ];
}

function FaqsContent({ localUrl }: { localUrl: (route: string) => string }) {
  const faqs = buildFaqs(localUrl);
  return (
    <article className="sl-faqs-page" aria-labelledby="faqs-title">
      <header className="sl-faqs-title">
        <h1 id="faqs-title">Frequently Asked Questions</h1>
        <p>Straight answers about our products, labels and policies. For anything product-specific, the label on your package is the final word.</p>
      </header>
      <div className="sl-faqs-body">
        <div className="sl-faqs-list">
          {faqs.map((faq, index) => (
            <details key={faq.id} className={faq.id === "heavy-metals" ? "sl-faq sl-faq--featured" : "sl-faq"} open={faq.id === "heavy-metals" || undefined} data-testid={`faq-${faq.id}`}>
              <summary>
                <span className="sl-faq-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="sl-faq-q">{faq.question}</span>
                <span className="sl-faq-icon" aria-hidden="true" />
              </summary>
              <div className="sl-faq-answer">{faq.answer}</div>
            </details>
          ))}
        </div>
        <aside className="sl-faqs-help" aria-labelledby="faqs-help-title">
          <h2 id="faqs-help-title">Still have a question?</h2>
          <p>Visit our <a href={localUrl("/pages/contact")} target="_parent">Contact page</a> and we will help with your product or order question.</p>
        </aside>
      </div>
    </article>
  );
}

export function FaqsPage({ assetUrl = reviewAsset, localUrl = reviewUrl, initializeLinks = initializeReviewLinks }: FaqsPageProps = {}) {
  const initializeSnapshot = useCallback((doc: Document, view: Window) => {
    const header = doc.querySelector("#header-component");
    const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
    updateHeader();
    view.addEventListener("resize", updateHeader);
    initializeLinks(doc);
    let style = doc.getElementById("stellar-faqs-style");
    if (!style) {
      style = doc.createElement("style");
      style.id = "stellar-faqs-style";
      doc.head.append(style);
    }
    style.textContent = styles;
    return () => view.removeEventListener("resize", updateHeader);
  }, [initializeLinks]);
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initializeSnapshot, snapshotRevision);
  return (
    <main className="stellar-supplements-shell" aria-label="Stellar Labs frequently asked questions" style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        key={`${snapshotRevision}-${attempt}`}
        ref={iframeRef}
        title="Stellar Labs frequently asked questions"
        src={`${assetUrl("/__mockup/stellar-current/supplements-shell.html")}?review=faqs&revision=${snapshotRevision}`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        className="stellar-supplements-frame"
        aria-hidden={status !== "ready" ? true : undefined}
        tabIndex={status !== "ready" ? -1 : undefined}
        style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
      />
      {status !== "ready" && <section role={status === "error" ? "alert" : "status"} aria-live="polite" style={{ position: "absolute", inset: 0, padding: "42px 24px", background: "#fff", color: "#23201f" }}>
        <h1>Frequently Asked Questions</h1>
        <p>{status === "error" ? "The FAQs could not load." : "Loading FAQs…"}</p>
        {status === "error" && <button type="button" onClick={retry}>Try again</button>}
      </section>}
      {mount ? createPortal(<FaqsContent localUrl={localUrl} />, mount) : null}
    </main>
  );
}
