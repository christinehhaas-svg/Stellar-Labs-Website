# Supplement purchase selector

Run `pnpm test:supplements:browser` against the same preview host used below.
These Chromium regressions are also included in `pnpm test:homepage`.
They exercise all seven selections on the real review and Canvas detail routes,
at 390px and 1440px, using fixed expectations independent of production helpers.
Coverage includes complete benefits/support, claims, warnings, suggested use,
facts, decoded current bottle/label images and label links, nutrition, prices,
counts and Magnesium's variable servings. Each switch must reset quantity,
purchase option and added status. Both one-time and subscription Add to Cart
are guarded against ordering requests, mutations, popups and navigation.
The selectors and assertions run inside the product snapshot iframe. Both section
links must scroll that frame without navigating the host. The medication note
must remain once at the bottom of the product content. Probiotic keeps its
approved 40 billion CFU potency, 60-capsule / 30-serving count, two-capsule dose
and short description, with its four strains listed once in Supplement Facts
(not repeated as a second nutrition summary). The sequence revisits both the
first product and Probiotic after leaving purchase controls dirty.

## Supplement collection filters in high contrast

Run the focused Chromium checks with both existing preview workflows running:

```sh
pnpm exec playwright test --config tests/homepage/playwright.config.ts supplement-filter-forced-colors.spec.ts --project chromium
```

These also run in `test:supplements:browser` and `test:homepage`. At 390px and
1440px, review and Canvas are embedded inside a second sandboxed iframe.
Native Tab/Enter traversal checks Daily Wellness, Digestive Support, Muscle and
Joint, and All supplements: readable full labels, composited text/border/focus
contrast, unclipped focus rings, and selected styling distinct from focus.
Each activation checks the exact product membership (including Magnesium in both
support groups), the reset, and unchanged host/snapshot URLs. Keyboard activation
of Product details must navigate only the embedded host to its existing local
destination, never the outer page, a popup, or the live storefront.
Inspection runs from the script-enabled ancestor; the captured snapshot retains
its script-disabled sandbox. No header-menu or text-spacing coverage is added.

# Homepage layout regression

Powder category navigation and flavor/formula claim checks are included in this
suite. Run `pnpm test:powders` for just those cases; see
[POWDER-COLLECTIONS.md](POWDER-COLLECTIONS.md) for the matrix and expected behavior.

### Chocolate and Vanilla 1 lb isolates

`pnpm test:isolates` runs server-free checks against both catalogs and actual copy
modules. It locks the $49.95 price, distinct `-1lb` handles, retained $79.95 2 lb
entries, outline-sourced nutrition, and pending artwork without inventing photos
or treating another package's facts as a verified 1 lb label. It is also part of
`pnpm test:handoff`.

`pnpm test:isolates:browser --project=chromium` runs focused checks at 390px and
1440px against the existing review and Canvas workflows. It covers All Whey and
isolate-filtered collections, Shop All's catalog initialization, direct detail
reloads, and actual flavor/size link activation. Canvas has no standalone Shop
All route or new 1 lb wrapper: its catalog initializer runs on a detached copy of
the original snapshot (before the homepage's featured filter), and its existing
2 lb detail wrapper exercises the Canvas selector. Product links intentionally
open the local review routes. Shared detail/data parity is checked separately.
The checks are included in `test:powders` and `test:homepage`; Firefox and WebKit
are configured too and require supported browser runtimes as described in
POWDER-COLLECTIONS.md. No captured scripts or live checkout are enabled.

`pnpm test:homepage` first runs a source parity check, then the browser suite.
The check compares the entire review and Canvas `homepage-typography.ts`
initializers byte for byte, including their injected CSS, so a one-sided
presentation change fails even if both previews still satisfy the layout tests.
Apply presentation fixes to both copies:

- `artifacts/stellar-review/src/pages/stellar/_shared/homepage-typography.ts`
- `artifacts/mockup-sandbox/src/components/mockups/stellar-labs/_shared/homepage-typography.ts`

Route and asset differences belong in the existing `reviewUrl` and `reviewAsset`
adapters passed by each Homepage entry point. Keep those entry points and their
sandbox permissions independent. Run `pnpm test:homepage:parity` for the fast
source-only check; it needs no running server, browser, or preview environment.

Run `pnpm test:homepage` with the existing review and Canvas workflows running.
In Replit it uses the local HTTP preview router, preserving both artifact paths
without relying on external preview TLS. It waits for both existing Vite services
before starting checks; it does not launch replacements. Outside Replit, set
`HOMEPAGE_TEST_BASE_URL` to the host that serves both `/` and `/__mockup`.
The suite does not start duplicate servers or prepare shared public assets.

## Claim icon initialization

The homepage and returns frames include a development-only revision in their
document URLs and React keys so an already-open preview replaces its nested
document after Fast Refresh. The review readiness check reruns for that revision.
`test:homepage:parity` guards this refresh contract without enabling scripts in
the saved Shopify snapshots.

Run `pnpm exec playwright test --config tests/homepage/playwright.config.ts claim-icons.spec.ts`
with both existing preview workflows running. This is also included in
`pnpm test:homepage`. The checks import each real Vite-transformed Homepage module
and use its exported presentation initializer. They invoke the
initializer three times on a fresh, detached copy of its actual captured snapshot,
using the effect's frame argument for review and the load event for Canvas.
The same assertions check each mounted preview after its real initialization.
They never call a hook-using React component as an ordinary function or add a
test-only production export. This exercises the SVG-to-image restoration
and the real outline initializer together, rather than just testing their
source or calling the outline helper in isolation.

Independent expectations check corn/Non-GMO and the
captured stomach/low-FODMAP artwork, plus the unchanged gluten-free and person
icons (including the explicit `gluten-free` semantic marker), all four current
labels, one small disclaimer/link, and one claims stylesheet after
every pass. They also preserve each component's existing sandbox permissions.
The merchant subsequently removed the NSF facilities claim: its captured slot
must remain empty and hidden, with no building icon or facilities wording.
No captured scripts are enabled and no checkout actions are performed.

## Approved wording parity

Run just the wording checks with `pnpm test:homepage copy-parity.spec.ts`.
These compare the Liquid header/hero defaults and bindings, the exporter's copy
object, both generated `approved-copy.json` files (export and review download),
and the rendered review/Canvas header and hero with a test-only approval fixture.
The shorter approved subtitle is **Protein powders, electrolytes & supplements.**
No expected copy is imported from production code.

Generate a handoff first if generated files are missing:
`node artifacts/stellar-review/scripts/export-homepage-handoff.mjs`.
Tests intentionally do not run the exporter themselves: missing or stale output
must fail, not be silently repaired before checking it. Update
`tests/homepage/approved-copy.ts` only after merchant approval of new wording.
The copy suite does not check product facts, links, or design synchronization.

Chromium uses `/repl/tools/bin/chromium` when available. Else install the
Playwright browser with `pnpm exec playwright install chromium`, or set
`HOMEPAGE_TEST_CHROMIUM` to an installed Chromium executable.

Both existing Homepage components are checked at 390, 768, 1024 and 1440px.
Assertions cover the complete nested hero sizing chain, loaded photo and
headline/CTA bounds, left-aligned supporting copy, unchanged logo bytes and
aspect ratio, horizontal overflow, visible header/category links, and an actual
Supplements click staying in the local review.

Each surface also starts once on mobile and once on desktop, then resizes the
already-loaded page through 390, 767, 768, 1024 and 1440px and back. Every step
rechecks the same layout, sandbox, overflow and routing assertions. Host and
snapshot document identity checks ensure neither document reloads during the
sequence. Intermediate Supplements clicks must issue a local main-frame
navigation request, which the test aborts to preserve the loaded homepage;
the final click navigates normally. Geometry attachments include the step and
width so repeated visits to the same width remain distinguishable.

Inspection runs in the **host document**, through `iframe.contentDocument`.
The snapshot keeps its existing sandbox without `allow-scripts`. Do not enable
Shopify scripts or use `frame.evaluate()` to work around sandbox restrictions.

Failures retain screenshots, traces, and measured geometry under
`generated-artifacts/homepage-tests` (excluded from Git and deployments).
The existing desktop sizing override is essential: a positive outer hero
height is not enough if the captured theme collapses any inner wrapper.
