import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { initializeReviewLinks, reviewAsset } from "../review-links";
import { useProductSnapshot } from "./useProductSnapshot";
import styles from "../_shipping-policies.css?inline";
import "../_group.css";

function initializeSnapshot(doc: Document, view: Window) {
  const header = doc.querySelector("#header-component");
  const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  initializeReviewLinks(doc);
  const style = doc.createElement("style");
  style.id = "stellar-information-page-style";
  style.textContent = styles;
  doc.getElementById(style.id)?.remove();
  doc.head.append(style);
  return () => view.removeEventListener("resize", updateHeader);
}

/** Text-only pages retain the existing storefront header, footer, and recovery. */
export function InformationPage({ title, pageKey, children }: {
  title: string;
  pageKey: string;
  children: ReactNode;
}) {
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initializeSnapshot);
  const headingId = `${pageKey}-title`;
  return (
    <main className="stellar-supplements-shell" aria-label={title} style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        key={attempt}
        ref={iframeRef}
        title={title}
        src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=${encodeURIComponent(pageKey)}`}
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        className="stellar-supplements-frame"
        aria-hidden={status !== "ready" ? true : undefined}
        tabIndex={status !== "ready" ? -1 : undefined}
        style={{ display: "block", visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", border: 0 }}
      />
      {status !== "ready" && <section role={status === "error" ? "alert" : "status"} aria-live="polite" style={{ position: "absolute", inset: 0, padding: "42px 24px", background: "#fff", color: "#23201f" }}>
        <h1>{title}</h1>
        <p>{status === "error" ? `${title} could not load.` : `Loading ${title}…`}</p>
        {status === "error" && <button type="button" onClick={retry}>Try again</button>}
      </section>}
      {mount ? createPortal(
        <article className={`sl-shipping-page sl-${pageKey}-page`} aria-labelledby={headingId}>
          <header className="sl-shipping-title"><h1 id={headingId}>{title}</h1></header>
          <div className="sl-shipping-body">{children}</div>
        </article>, mount,
      ) : null}
    </main>
  );
}
