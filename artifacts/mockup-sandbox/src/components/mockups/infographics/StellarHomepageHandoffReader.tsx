/** A reader for the approved handoff, not a new homepage design variant. */
export function StellarHomepageHandoffReader() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const preview = `${base}/handoff/homepage/preview.html`;
  return (
    <main style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f5f6f7" }}>
      <div style={{ padding: "10px 16px", font: "14px/1.5 Arial, sans-serif", background: "#edf6fa", flexShrink: 0 }}>
        Scroll inside the document for the approved design, copy, and complete implementation notes.
        {" "}
        <a href={preview} target="_blank" rel="noopener noreferrer">Open full document</a>
      </div>
      <iframe
        title="Stellar Labs — approved homepage header and hero handoff"
        src={`${preview}?reader=approved-homepage`}
        style={{ width: "100%", flex: 1, minHeight: 0, border: 0 }}
        sandbox="allow-same-origin allow-downloads"
      />
    </main>
  );
}
