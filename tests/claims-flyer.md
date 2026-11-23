# Printed claims-flyer regression checks

Run the self-contained flyer checks (no running preview workflow is needed):

```sh
pnpm test:claims-flyer
```

This check needs Chromium (or `CHROMIUM_EXECUTABLE_PATH`) and Poppler's
`pdfinfo` and `pdftotext` on PATH. Missing tools fail explicitly; no PDF checks
are skipped. To explicitly test an existing preview instead, set `CLAIMS_FLYER_TEST_URL` to the
full `.../__mockup/preview/infographics/StellarClaimsFlyer` URL.

Each integration test gets its own temporary directory inside ignored
`generated-artifacts/`, removes it afterwards, and never touches public
downloads or existing handoff packs. Tests read a freshly printed PDF and
check its Letter pages and numbering, every active product's facts-card
region, serving weight/count, all summary metrics and supplemental facts,
claims, minimum text height, and the complete FODMAP disclaimer.

Negative controls cover lost/extra pages, wrong numbering, missing products,
servings and nutrients, truncated disclaimers, and shrunken text. A real
print-only hidden-disclaimer export must fail PDF verification even though
the screen checks pass. `fixtures/claims-flyer-long-copy.mjs` adds 60 long
facts and 60 long claims; export must reject its print overflow with a bounded
diagnostic and leave neither a final PDF nor a success report.

Browser launch, navigation, individual operations, PDF printing and external
PDF readers have explicit timeouts. Export also has a 90-second browser
deadline; each integration test has a 120-second deadline.

For retained local output (including page images and a PDF verification
summary), use a separate directory:

```sh
pnpm export:claims-flyer --output=generated-artifacts/claims-flyer-local
```

The CLI keeps the fingerprinted, locked release process: PDF validation must
finish in staging before the current release is replaced. Failed generation
leaves the previous usable download intact. PNG and JPG page images are both
retained for the release manifest.
