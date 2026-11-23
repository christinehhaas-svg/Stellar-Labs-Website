# Stellar Labs® homepage mockups

## Current storefront baseline

`Homepage.tsx` presents a locally captured, read-only copy of the selected Shopify homepage at the supplied preview URL. It uses the original theme's HTML and locally downloaded theme styles, fonts, and first-party image assets. The source document is isolated in an iframe so its theme-wide selectors do not affect the mockup sandbox.

The original storefront section order, theme, images, and all 27 product listings are retained. The merchant's requested tagline, supporting sentence, and six callouts replace the corresponding captured copy. Callouts are merchant-supplied, not independently verified; applicability must be confirmed for each product. Responsive behavior comes from the original theme CSS. Shopify preview chrome, source JavaScript, trackers, forms, cart mutations, and checkout are excluded. Local presentation controls filter the captured products, and product links open the originally supplied Shopify preview in a new tab; the mockup itself does not submit store data. A small local CSS rule restores the captured dark-header/white-logo first-frame state normally set by the removed theme module. The source HTML and local assets were captured on October 1, 2026, so prices and availability are a dated visual reference, not live data.

## Previous concept

`_shared/EditorialConcept.tsx` retains the earlier editorial concept for comparison/reference. It is not displayed as the current homepage baseline. Its component stylesheet import has been corrected for its new `_shared/` location.

## Supplements collection

`Supplements.tsx` adds a separate collection mockup in the same captured theme, with all eight supplied label artworks, purpose filters, readable label highlights, suggested use, warnings, and full-label details. `SUPPLEMENTS-HANDOFF.md` documents asset provenance and store-listing verification needed before implementation.

## Files

- `Homepage.tsx` — current read-only source snapshot frame.
- `_homepageProducts.ts` — local category filters and links to original Shopify-preview product pages.
- `artifacts/mockup-sandbox/public/stellar-current/homepage-snapshot.html` — sanitized captured homepage document.
- `artifacts/mockup-sandbox/public/stellar-current/header-state.css` — read-only initial header state.
- `artifacts/mockup-sandbox/public/stellar-current/assets/` — locally captured theme styles, fonts, and storefront assets.
- `SOURCES.md` — provenance, snapshot date, and interaction/scope notes.