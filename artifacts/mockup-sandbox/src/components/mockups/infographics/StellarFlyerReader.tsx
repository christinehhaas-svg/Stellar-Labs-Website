import { useRef, useState } from "react";

const packs = [
  { id: "product-info-matched-bottles", label: "Updated product PDF", firstProduct: "" },
  { id: "electrolytes", label: "Electrolytes", firstProduct: "supplements-lemon-lime-electrolyte-powder" },
  { id: "whey-isolate", label: "Whey isolate", firstProduct: "100-isolate-whey-protein-shake-mixed-berry" },
  { id: "whey-blend", label: "Whey blend", firstProduct: "whey-protein-salted-caramel-shake" },
  { id: "vegan", label: "Vegan protein", firstProduct: "chocolate-vegan-shake" },
  { id: "supplements", label: "Supplements", firstProduct: "womens-multi" },
];

export function StellarFlyerReader() {
  const requested = new URLSearchParams(window.location.search).get("pack");
  const [selected, setSelected] = useState(packs.find((pack) => pack.id === requested) ?? packs[0]);
  const [zoom, setZoom] = useState(100);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  function applyZoom(value: number) {
    setZoom(value);
    const document = frame.current?.contentDocument;
    if (document?.body) document.body.style.zoom = String(value / 100);
  }

  return (
    <main style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#e8e5e1", fontFamily: "Arial, sans-serif" }}>
      <header style={{ flexShrink: 0, padding: "14px 18px", background: "#fff", borderBottom: "1px solid #ddd8d3" }}>
        <strong style={{ fontSize: 18, color: "#23201f" }}>Stellar Labs — flyer packs</strong>
        <p style={{ fontSize: 13, color: "#615b57", margin: "6px 0 12px" }}>
          Choose a pack below. Scroll inside the document for the full website copy and original labels.
        </p>
        <nav aria-label="Choose flyer pack" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {packs.map((pack) => (
            <button
              key={pack.id}
              type="button"
              aria-pressed={selected.id === pack.id}
              onClick={() => {
                if (selected.id === pack.id) return;
                setSelected(pack);
                setReady(false);
                const url = new URL(window.location.href);
                url.searchParams.set("pack", pack.id);
                window.history.replaceState(null, "", url);
              }}
              style={{ border: "1px solid #087e91", padding: "9px 12px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 700, background: selected.id === pack.id ? "#087e91" : "#fff", color: selected.id === pack.id ? "#fff" : "#087e91" }}
            >
              {pack.label}
            </button>
          ))}
          <label style={{ marginLeft: "auto", fontSize: 12, color: "#615b57" }}>
            Text size{" "}
            <select value={zoom} onChange={(event) => applyZoom(Number(event.target.value))} style={{ padding: 7, background: "#fff", color: "#23201f", border: "1px solid #ccc" }}>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
            </select>
          </label>
        </nav>
        <a
          href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/handoff/stellar-${selected.id}-website-handoff.pdf`}
          download={`stellar-${selected.id}-website-handoff.pdf`}
          style={{ display: "inline-block", marginTop: 12, color: "#087e91", fontSize: 13, fontWeight: 700, textUnderlineOffset: 3 }}
        >
          Download {selected.label} PDF for your marketing team
        </a>
      </header>
      {!ready && <p role="status" style={{ margin: 0, padding: 10, background: "#eef7f7", color: "#087e91", fontSize: 13 }}>Loading {selected.label}…</p>}
      <iframe
        key={selected.id}
        ref={frame}
        title={`${selected.label} complete flyer and website copy`}
        src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/handoff/readable-stellar-${selected.id}-website-handoff.html?copy=merchant-serving-corrections${selected.firstProduct ? `#product-${selected.firstProduct}` : ""}`}
        onLoad={() => {
          applyZoom(zoom);
          if (selected.firstProduct) frame.current?.contentDocument?.getElementById(`product-${selected.firstProduct}`)?.scrollIntoView();
          setReady(true);
        }}
        style={{ width: "100%", flex: 1, minHeight: 0, border: 0, background: "#fff" }}
      />
    </main>
  );
}
