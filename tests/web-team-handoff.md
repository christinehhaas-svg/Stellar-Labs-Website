# Complete web-team handoff

Run `node scripts/export-web-team-handoff.mjs` with the existing local review
website workflow running. `WEB_TEAM_PREVIEW_URL` can point at its preview host.
This is a read-only local capture, not a live Shopify scrape or checkout.

The command captures each registered active website page (deduplicating recipe
aliases), the five powder collection views and seven supplement selections.
It includes the homepage's Why Stellar Labs section separately and shared
navigation/footer text. Expandable content is opened for capture. Reference-only
product-information and homepage-handoff download readers are excluded because
the claims/labels and actual homepage are already included.

Output is under ignored `generated-artifacts/web-team-handoff/`:

- `stellar-labs-web-team-complete-handoff.pdf`: cover, contents, freshly verified
  claims/nutrition/labels, then complete page copy with PDF bookmarks.
- `stellar-labs-web-team-page-copy.txt`: editable wording.
- `stellar-labs-web-team-page-copy.html`: self-contained printable copy appendix.
- `website-copy.json`: capture metadata and page/chunk map.
- `verification.json` and preview PNGs: actual-PDF checks and visual samples.
- `homepage-rebuild.pdf` / `.html` / `.json`: homepage section order, complete
  wording, measured desktop/phone styling, image previews and CTA destinations.
- `homepage-assets/`: original local homepage image and icon files.
- `stellar-labs-website-rebuild-bundle.zip`: complete PDF, editable page copy,
  self-contained homepage guide, structured homepage map, screenshots and assets.

Requires the existing Node dependencies, Chromium, Poppler, Python and PyMuPDF.
The exporter refuses missing pages, missing Why Stellar Labs content, body
copy overlapping footers, lost printed wording and altered pagination. Product
facts and original labels also pass the existing claims-flyer PDF checks.
It leaves the previously published flyer release and Shopify handoff packs
untouched. Always regenerate after website edits before sharing a new handoff.
The capture checks supplement prices and the Probiotic description against
the source files, not just Vite's current module cache. It also refuses a source
change during capture/export; restart the existing review workflow if it
reports stale preview content.
The combined PDF puts the homepage rebuild guide before the claims and website
copy. Its verifier checks each homepage copy line, destination and asset file;
the guide captures the preview rather than inventing live checkout behavior.
