# Powder category claim regression

Run the focused suite with both existing preview workflows running:

```sh
pnpm test:powders
pnpm typecheck:homepage
```

The collection matrix and focused 1 lb isolate checks run in Chromium, WebKit
(Safari's engine), and Firefox, also discovered by `pnpm test:homepage`.
The additional browser projects run only the powder suites; unrelated homepage
suites remain Chromium-only. See README.md for the focused 1 lb commands.
Phone cases use a 390×844 responsive viewport in each desktop engine, not a
physical iPhone/Android browser or device emulation.

Install the matching browser builds once on a supported Playwright host:

```sh
pnpm exec playwright install firefox webkit
# Run one engine while investigating a failure:
pnpm test:powders --project=webkit
pnpm test:powders --project=firefox

# Run just the keyboard regression (all three engines):
pnpm test:powders --grep="keyboard filters"
```

On Linux the browsers also require their system libraries (on supported Debian/
Ubuntu hosts, `pnpm exec playwright install --with-deps firefox webkit`).
Missing engines/libraries must fail the run, not silently skip browser coverage.
Use `HOMEPAGE_TEST_BASE_URL` to override the default `REPLIT_DEV_DOMAIN` host;
the host must serve review at `/` and Canvas at `/__mockup`.
Inside a workspace, `HOMEPAGE_TEST_BASE_URL=http://127.0.0.1:80` uses the same
path-routing preview proxy without requiring browser-specific preview TLS setup.
This does not bypass or test production TLS. Nix hosts still need compatible
browser native libraries/loaders; downloading Ubuntu archives alone is not enough.
`HOMEPAGE_TEST_CHROMIUM` can override the browser executable. The suite reuses
`tests/homepage/playwright.config.ts`; it does not start servers, regenerate
assets, connect to Shopify, or activate any Add to Cart control.

## Coverage

Each family (whey, vegan protein and electrolytes) runs independently on review and Canvas,
at 1440px desktop and 390px phone widths:

- Keyboard-only whey and electrolyte cases use real Tab presses to reach every filter and both image
  and details links on every card, then Enter to activate them. Each activation
  must issue a native top-level document request to the expected review URL,
  including when starting in Canvas. Browser Back restores the original surface,
  selected filter, claims and cards; subsequent Tab/Enter navigation verifies
  focus remains usable without requiring engine-specific exact focus restoration.
  The last Back is followed by another Tab-to-visible-link check. No pointer
  clicks, programmatic focus or synthetic activation is used in these cases.
  Extra tabs fail the test, and cart/checkout requests are blocked and fail the
  test if attempted. Product ordering controls are never activated.
- Direct entry and reload for every filter, including the category tabs
  (the merchant removed the SHOP BY TYPE label on whey only; the regression
  requires it to be absent there and retained, uppercase, on other categories),
  selected tab, URL, exact card membership/order, absence of formula/result
  counts, artwork identity and product links. Large isolates precede small
  isolates, then blends. Compact cards show formula name, flavor/package size,
  price and product-specific per-serving nutrition, without repeated claims
  or serving/container counts. The two new 1 lb bottles use disclosed mockups;
  verified original artwork remains unchanged for other products.
- One combined noncanonical/malformed-query test per whey/electrolyte family, surface and
  viewport exercises independent URL fixtures: unknown, empty and bare
  parameters; duplicate values in both orders (including invalid/empty first
  values); percent-encoded values, keys and duplicate keys; double/malformed
  encodings and encoded spaces/plus; wrong-family keys/values; and mixed
  formula/flavor parameters. For whey, the first formula value wins, decoding
  happens once, and flavor keys are ignored. Electrolytes have only the
  All electrolytes tab and Lemon Lime product: all flavor parameters are ignored,
  including legacy Lemon Lime and retired Strawberry URLs. Each URL is checked
  on direct entry, reload and Back from a canonical tab, then Forward checks that
  tab again. Raw URLs, exact selected tab, products and full claim labels are asserted
  at every stop, including Canvas-to-review navigation and the unchanged snapshot
  sandbox.
- Two rounds of native filter clicks, browser Back and Forward, checking claims
  and cards after every transition. Canvas links intentionally navigate to the
  review site; Back must restore the originating Canvas filter. Each Canvas
  transition is started in Canvas rather than only testing the first click there.
  Every filter and product click checks `target="_parent"` and observes an actual
  same-origin main-frame document request; iframe-only or popup navigation fails.
- Isolate's nutrition band shows 25g+ protein, ≤120 calories, ≤1g sugar and
  ≤2g carbs only on the isolate filter; blends show 24g protein and all-whey
  has no aggregate nutrition band.
- Electrolytes show only Lemon Lime, including after legacy flavor queries,
  with 280mg potassium, 51mg magnesium, 47mg calcium, 80mg sodium and 5 calories.
  Retired Strawberry products, tabs and exception wording must not return.
- Collection labels use Certified Gluten-Free without an asterisk and
  Low-FODMAP Ingredients* with its own link to the unique
  collection-fodmap-note and matching accessible description. Each family
  retains its exact tolerance note; collection-nutrition checks activate the
  footnote and verify that it scrolls into view.
- Every whey and electrolyte product is actually opened from each surface.
  Image and text link clicks alternate; both hrefs are checked for every card.
  Formula heading, selected flavor and package metadata, conditional size tabs,
  front artwork, supplied facts/full
  label/PDF identities and the functional Nutrition Facts anchor (scroll and focus)
  are checked before Back
  restores the collection. Mixed Berry is never renamed Strawberry, and the
  verified Cappuccino front and black two-pound isolate artwork remain distinct.
  If the engine retains a native Nutrition Facts fragment in the snapshot's joint
  history (WebKit), the test checks Back/Forward through that child entry first,
  including the unchanged top-level product URL and restored facts scroll.
  These child-only traversals use the host's native History API: Playwright's
  page-level navigation wait cannot finish when only an iframe fragment changes.
- Vegan's single “All vegan protein” view is entered directly and reloaded,
  checking exactly Chocolate then Vanilla, their two-pound fronts, compact
  nutrition cards, links and active tab. Both image and text links for **each** flavor
  open the matching product and Back restores the originating review or Canvas
  collection. Formula headings, selected flavor and size, exact facts/full-label
  image order and original PDF, 32 g/28 servings/20 g protein summary and
  Nutrition Facts anchor are checked. Formula details retain product claims
  separately from collection callouts.
- Vegan collection callouts must be exactly Non-GMO, Certified Gluten-Free,
  and Low-FODMAP Ingredients*, with the tolerance disclaimer.
  Product claims additionally preserve Sweetened with Stevia. Collection and
  product copy must never inherit rBGH, isolate nutrition ranges, or either
  electrolyte calorie claim. Original label artwork and unrelated footer links
  are not treated as marketing claims. Captured frames remain script-disabled,
  removed merchant-facing detail notes remain absent, cart buttons remain
  non-submitting local-state controls, and no cart control is used. Single-size
  products identify their package in metadata without a redundant size selector.

`powder-fixtures.ts` contains test-only approved identities and claim expectations.
It deliberately does not import production catalog JSON or copy generators.
Change expectations only after approval; do not derive expected facts from the
same helpers being tested.

DOM interactions use Playwright locators. When inspecting focus, evaluate only in
the host through `iframe.contentDocument`; keep the captured frame's sandbox
script-disabled. Both collection and product frames must retain their exact
existing sandbox permissions, including user-activated top navigation.
Screenshots and traces on failure are retained in
`generated-artifacts/homepage-tests` (ignored by Git and deployments).

## Consolidated execution matrix

The former “noncanonical queries” and “malformed filter URLs” tests iterated
the same `queryCases` arrays, constructed identical paths (the all-filter query
is empty), and performed identical assertions. Only that duplicate pass was
removed. No fixture, assertion helper, timeout, browser project, viewport,
keyboard action, product-detail check or canonical transition was removed or
weakened. The query tests retain their 300-second timeout, one worker and zero
retries; increasing limits or parallelism is not the optimization.

| Coverage per engine | Review 1440×1000 | Review 390×844 | Canvas 1440×1000 | Canvas 390×844 |
| --- | --- | --- | --- | --- |
| Whey literal query fixtures | All 20 | All 20 | All 20 | All 20 |
| Electrolyte literal query fixtures | All 22 | All 22 | All 22 | All 22 |
| Keyboard filters + every card's two links | Whey + electrolyte | Whey + electrolyte | Whey + electrolyte | Whey + electrolyte |
| Canonical entry/reload, two filter-history rounds + every product detail | Whey + electrolyte | Whey + electrolyte | Whey + electrolyte | Whey + electrolyte |
| Vegan reload + both links for each flavor + Back | Both flavors | Both flavors | Both flavors | Both flavors |

Every query fixture still has **five fully asserted stops**:

1. Direct entry: exact raw path/query, selected filter, ordered products,
   nutrition, claims, links and sandbox.
2. Reload: the same assertions, including duplicate parameters and encoded bytes.
3. Native canonical filter activation: actual main-frame request and complete
   destination collection assertions.
4. Back: exact original raw path/query and complete original collection assertions.
5. Forward: exact canonical path/query and complete destination assertions.

All rows run in **Chromium, WebKit and Firefox**, not a sample distributed
between engines. The collection spec now discovers **84 tests** (28 per engine)
instead of 108. Of those, 24 are exhaustive query tests and 60 are unchanged
keyboard, canonical/product and vegan tests. There are still **504 distinct
fixture/surface/viewport/engine combinations**: `(20 + 22) × 2 × 2 × 3`.
Their five-stop coverage requires **2,520 full collection assertions** instead
of 5,040 duplicated assertions. Focused 1 lb isolate tests and all other homepage
specs are unchanged.

### Reproducing runtime measurements

Run against already-started previews on the same host, with no concurrent browser
suite. JSON reports retain the actual wall time, per-test durations and failures.
Keep generated reports out of Git:

```sh
mkdir -p generated-artifacts/powder-runtime
HOMEPAGE_TEST_BASE_URL=http://127.0.0.1:80 \
  pnpm exec playwright test --config tests/homepage/playwright.config.ts \
  powder-collections.spec.ts --reporter=json \
  > generated-artifacts/powder-runtime/collections.json
node -e 'const r = require("./generated-artifacts/powder-runtime/collections.json"); console.log(r.stats)'
```

Use `--project=chromium` (or another engine) for an explicitly engine-limited
measurement. Do not present that as a passing three-engine run. For the whole
completion-check budget, measure `pnpm test:homepage` as well: it includes source
parity and unrelated Chromium specs in addition to the powder collections.
The old suite's full runtime was not measured in this change; the exact
50% reduction above describes duplicated query work, not an assumed 50%
reduction in overall wall time.

### Workspace measurement before the whey expectation correction (2026-10-27)

Using the command above with `--project=chromium`, the complete 28-test
collection spec finished in **700.567 seconds (11m 40.567s)**, with **16 passed,
12 failed, zero skipped and zero flaky**. The four complete electrolyte query
tests (22 fixtures each, all five stops) took:

| Context | Query test duration |
| --- | --- |
| Review 1440×1000 | 91.60s |
| Review 390×844 | 91.30s |
| Canvas 1440×1000 | 78.57s |
| Canvas 390×844 | 80.72s |

All 12 failures are whey cases at the **unchanged** `assertCollection`
expectation for `.sl-category-lead` containing “Shop by type”. Both preview
components currently omit that element for whey (`category !== "whey"`).
The consolidation neither caused nor bypassed that mismatch; no assertions or
merchant-facing pages were changed to make the run green. Consequently this
is a **completed but failing run**, not evidence of a passing full-suite budget.
Whey query tests fail on initial entry, so these measurements cannot establish
their successful exhaustive runtime.

All **84 collection tests**, **120 focused powder tests** (including 1 lb
isolates) and **161 full homepage tests** remain discoverable. Firefox and WebKit
builds were downloaded, but explicit launch checks failed because the Nix host
lacks the required native libraries. Neither engine was skipped or replaced in
the configuration. A successful three-engine/full-homepage runtime under the
completion checker's limit still needs measurement on a supported host after
resolving the existing whey mismatch. Do not extrapolate a successful budget
from the failing Chromium run.

`pnpm typecheck:homepage`, the five source-parity checks and all 40
`pnpm test:handoff` checks passed. A direct comparison also confirmed that all
84 surface/family/fixture path constructions in the deleted and retained loops
are identical; the URL fixtures, reusable assertions, keyboard cases and
canonical/product scenarios are unchanged. Raw measurement output is local at
`generated-artifacts/powder-runtime/after-chromium.json`; the command above
reproduces it without committing generated reports.

### Successful focused whey measurement (2026-10-27)

The merchant-approved presentation omits “SHOP BY TYPE” beneath whey claims
while retaining all three filter tabs. Both preview components already match
that decision. The independent collection assertion now requires zero
`.sl-category-lead` elements for whey; vegan and electrolytes must still show
“Shop by type” with uppercase styling. No merchant-facing implementation or
wording was changed.

Against the already-running previews, with one worker and no retries:

```sh
HOMEPAGE_TEST_BASE_URL=http://127.0.0.1:80 \
  pnpm exec playwright test --config tests/homepage/playwright.config.ts \
  powder-collections.spec.ts --project=chromium \
  --grep='whey (noncanonical|keyboard filters)' --reporter=json \
  > generated-artifacts/powder-runtime/whey-approved-chromium.json
```

All **8 tests passed**, with **zero failures, skips or flaky tests**, in
**649.871 seconds (10m 49.871s)**:

| Context | All 20 whey query fixtures | Whey keyboard filters + both card links |
| --- | --- | --- |
| Review 1440×1000 | 81.541s | 67.308s |
| Review 390×844 | 87.368s | 96.013s |
| Canvas 1440×1000 | 85.320s | 73.171s |
| Canvas 390×844 | 87.238s | 69.252s |

This covers all 80 fixture/surface/viewport combinations and their 400 fully
asserted stops, preserving raw URLs, exact cards/claims/nutrition, native
navigation, reload, Back/Forward and exact snapshot permissions. Keyboard cases
retain real Tab/Enter activation, every card's image and details links, Back,
continued focus reachability, and no ordering requests or extra tabs.

`pnpm typecheck:homepage` and all five `pnpm test:homepage:parity` checks also
passed. A separate browser spot check confirmed the retained uppercase label
for vegan and electrolytes on both previews at both widths (eight checks).
The whey desktop screenshot also confirmed the approved label-free tabs.

This is a successful **focused Chromium** measurement, not a full collection,
full homepage or three-engine runtime. Explicit Firefox and WebKit launch checks
in this workspace failed because their matching browser executables are absent.
No engines were substituted, disabled or skipped in the committed configuration.
The prior native-library limitation remains relevant when preparing those
engines on this Nix host.

The subsequent configured completion checks passed `pnpm test:handoff` and
the completion review, but `pnpm test:homepage` exceeded the completion
checker's polling allowance. Its log shows collection tests 45–70 passing
(including all four whey query, keyboard and canonical/product contexts), then
termination during test 71, an electrolyte query case. Earlier unrelated
homepage, claim-icon and nutrition cases failed; no final failure summary was
produced before termination. There were no failures in the completed collection
cases.
That interrupted run is not a successful full-homepage measurement; the
independently completed eight-test whey report above is the runtime evidence
for this correction.

## Keyboard regression verification

All eight keyboard cases passed in Chromium in the workspace, along with
`pnpm typecheck:homepage`. The 24 keyboard cases are discovered across the three
configured engines. WebKit and Firefox execution is not verified here: their
downloaded builds failed native-library checks on this Nix host, and local
library preparation encountered incompatible runtime versions. Run the keyboard
command above on a supported Playwright host before claiming those engines pass.
No browser is skipped or substituted in the committed configuration.
