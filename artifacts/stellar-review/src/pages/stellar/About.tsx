import { createPortal } from "react-dom";
import aboutStory from "../../../../../scripts/content/stellar-about-story.json";
import { initializeReviewLinks, reviewAsset } from "./review-links";
import { useProductSnapshot } from "./_shared/useProductSnapshot";
import styles from "./_shipping-policies.css?inline";
import aboutStyles from "./_about.css?inline";
import "./_group.css";

function initializeSnapshot(doc: Document, view: Window) {
  const header = doc.querySelector("#header-component");
  const updateHeader = () => header?.setAttribute("data-menu-style", view.innerWidth >= 1000 ? "menu" : "drawer");
  updateHeader();
  view.addEventListener("resize", updateHeader);
  initializeReviewLinks(doc);
  const style = doc.createElement("style");
  style.id = "stellar-about-style";
  style.textContent = styles + aboutStyles;
  doc.getElementById(style.id)?.remove();
  doc.head.append(style);
  return () => view.removeEventListener("resize", updateHeader);
}

export function AboutPage() {
  const { iframeRef, mount, status, attempt, retry } = useProductSnapshot(initializeSnapshot);
  return (
    <main className="stellar-supplements-shell" aria-label="About Stellar Labs" style={{ width: "100%", height: "100%", minHeight: 0 }}>
      <iframe
        key={attempt}
        ref={iframeRef}
        title="About Stellar Labs"
        src={`${reviewAsset("/__mockup/stellar-current/supplements-shell.html")}?review=about`}
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
          <h1>About Stellar Labs</h1>
          <p>{status === "error" ? "The About page could not load." : "Loading About Stellar Labs…"}</p>
          {status === "error" && <button type="button" onClick={retry}>Try again</button>}
        </section>
      )}
      {mount ? createPortal(
        <article className="sl-shipping-page sl-about-page" aria-labelledby="about-title">
          <header className="sl-shipping-title">
            <h1 id="about-title">About Stellar Labs</h1>
          </header>
          <div className="sl-shipping-body sl-about-layout">
            <figure className="sl-about-photo">
              <img
                src={reviewAsset("/__mockup/images/stellar/about-founder-products.jpg")}
                alt="Stellar Labs founder with the nutrition product range"
                width={1000}
                height={1250}
              />
            </figure>
            <div className="sl-about-story">
            <header className="sl-about-founder">
              <h2>{aboutStory.founderName}</h2>
              <p>{aboutStory.founderTitle}</p>
            </header>
            {aboutStory.paragraphs.map((text, index) => (
              <p key={index} id={text.startsWith("*") ? "about-fodmap-note" : undefined} aria-describedby={text.includes("ingredients*") ? "about-fodmap-note" : undefined}>{text.startsWith("*")
                ? <small style={{ display: "block", fontSize: 13, lineHeight: 1.5 }}>{text}</small>
                : text}</p>
            ))}
            </div>
          </div>
        </article>, mount,
      ) : null}
    </main>
  );
}
