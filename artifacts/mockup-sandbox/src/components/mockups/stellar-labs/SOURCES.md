# Stellar Labs® — source snapshot

## Reference

Selected existing homepage: https://n6xvym9t5yk1hisl-14090320.shopifypreview.com/

The reference HTML was provided locally at `/tmp/stellar-current.html`; the public preview URL was also confirmed working. A local visual reference was captured October 1, 2026. The local snapshot is a read-only design-review baseline, not a Shopify integration, theme installation, or production migration.

## Fidelity and scope

- The rendered document is based on the source storefront's original homepage DOM, original linked theme stylesheets, embedded theme styles, and first-party images/fonts downloaded into `artifacts/mockup-sandbox/public/stellar-current/`. A small `header-state.css` shim preserves the captured #23201f background and white header controls/logo normally established by the removed theme module.
- The source document is rendered in an isolated iframe to preserve its theme CSS without affecting the sandbox host. Its theme's responsive rules remain in effect.
- The original header, announcement, hero, product listings and dated pricing, informational sections, customer content, and footer remain in source order. No new copy, callouts, or product selection was added to the snapshot.
- Source scripts (including Shopify runtime/theme code, preview-bar scripts, and trackers), form elements, and live commerce actions are omitted. The local snapshot has no script elements and a restrictive CSP blocks injected scripts and external requests. The preview bar is not part of the page baseline. Nothing is submitted or connected to a live store.
- Prices, promotions, inventory, and product availability are only what the captured theme document contained on October 1, 2026. They may be stale and must not be treated as current commerce data.
- Source links are neutralized to prevent navigation to live Shopify routes. The snapshot is for visual review only.

## Earlier concept retained

The prior editorial concept remains in `_shared/EditorialConcept.tsx`, with its existing `_group.css` styling. It is retained only as reference and does not replace or appear in the current homepage baseline.