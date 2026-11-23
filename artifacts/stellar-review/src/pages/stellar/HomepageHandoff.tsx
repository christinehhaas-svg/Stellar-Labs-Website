import { reviewUrl } from "./review-links";

/** Full readable document, not a download-only handoff. */
export function HomepageHandoff() {
  const url = reviewUrl("/homepage-handoff/preview.html");
  return (
    <section aria-label="Approved homepage handoff">
      <p style={{ padding: "12px 20px" }}>
        <a href={url} target="_blank" rel="noopener noreferrer">Open the full readable handoff</a>
        {" · "}
        <a href={reviewUrl("/homepage-handoff/stellar-homepage-handoff.zip")} download>Download editable Shopify files</a>
      </p>
      <iframe
        title="Approved homepage header and hero — complete readable handoff"
        src={url}
        style={{ display: "block", width: "100%", height: "85vh", minHeight: 700, border: 0 }}
        sandbox="allow-same-origin allow-downloads"
      />
    </section>
  );
}
