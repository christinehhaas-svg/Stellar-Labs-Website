import { useCallback } from "react";
import { createPortal } from "react-dom";
import { initializeReviewLinks, reviewAsset } from "./review-links";
import { useProductSnapshot } from "./_shared/useProductSnapshot";
import { FaqContent } from "./_shared/FaqContent";
import styles from "./_recipes.css?inline";
import "./_group.css";

const snapshotRevision = import.meta.env.DEV ? Date.now().toString(36) : "faqs-draft";

type FaqsPageProps = {
  assetUrl?: (capturedPath: string) => string;
  initializeLinks?: (doc: Document) => void;
};

export function FaqsPage({ assetUrl = reviewAsset, initializeLinks = initializeReviewLinks }: FaqsPageProps = {}) {
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
      {mount ? createPortal(<FaqContent />, mount) : null}
    </main>
  );
}
