# Product handoff consistency

Run from the workspace root:

```sh
pnpm test:handoff
```

Requires installed workspace dependencies, prepared review artwork in
`artifacts/stellar-review/public/review-assets`, and `chromium`, `pdftotext`,
`pdfinfo`, `mutool`, `zip`, and `unzip` on PATH. Missing tools or artwork fail
the check explicitly; no PDF/archive checks are silently skipped.
If artwork has not been prepared, run
`node artifacts/stellar-review/scripts/prepare-assets.mjs` first.

The check covers the actual product data consumed by both review and Canvas,
then runs `export-handoff.mjs --pack=stellar-whey-isolate-website-handoff --pdf --zip`
against temporary source copies and real label artwork. It checks:

- Confirmed Mixed Berry 1lb identity and merchant listing link.
- 29g scoop, 16 servings, 25g protein, 110 calories, and 0g sugars in its own
  product section, not another flavor's section or the cover.
- Embedded HTML, editable HTML, readable Canvas handoff previews, actual PDF
  text and link annotation, and freshly extracted ZIP contents.
- Correct Mixed Berry label paths and byte-identical embedded/archived artwork.
- Byte-identical preservation of the supplied outline PDF, where Strawberry
  remains a separate historical reference.
- A second export with deliberately changed Strawberry outline facts and stale
  output files, proving regeneration replaces HTML, PDF, text and archive content
  without using Strawberry's values.
- Negative controls showing that wrong sugar, scoop, protein, serving summary,
  identity, source link or label path fails.

Scratch files live under ignored `generated-artifacts/` and are removed even
on failure. The test does not modify source data, existing downloads, or active
Canvas previews. It intentionally checks exported content, not product layout.

## About and Shipping & Returns page handoff

`pnpm test:handoff` also runs `tests/page-handoff.test.mjs`. To check just the
homepage package and the two approved page bodies:

```sh
node --test tests/page-handoff.test.mjs
```

Unlike the product checks above, this check regenerates the real homepage ZIP,
its public download copies, and readable previews via
`artifacts/stellar-review/scripts/export-homepage-handoff.mjs`. Do not run it
concurrently with review/Canvas asset preparation.

It compares every About and returns heading and paragraph with the approved
JSON/Markdown sources, including the literal disclaimer and email; verifies
the sources are archived verbatim; compares every ZIP entry byte-for-byte with
the generated files; and checks existing homepage assets and Liquid files
remain unchanged. It also checks both download locations and the offline
readable preview. Page-body HTML permits only basic content tags and a mailto
link, so it cannot depend on the Replit review server or include a portrait,
captured theme scripts, or legacy text. Unknown policy Markdown fails explicitly.

## Electrolyte handoffs

The same command also freshly exports the electrolyte pack and the complete
bottle-matched product-information pack. Both original Supplement Facts panels
were visually checked: Lemon Lime has a 4.5g scoop, 30 servings, 280mg potassium,
51mg magnesium and 47mg calcium; Strawberry has a 6.5g scoop, 40 servings,
340mg potassium, 40mg magnesium and 50mg calcium.

Checks compare both review and Canvas copy, each product's own HTML section,
embedded/linked label artwork, actual PDF text, readable previews, and the HTML
and original image bytes inside the editable ZIP. They require “5 Major
Electrolytes” on the electrolyte cover and both flavor pages, retain Strawberry's
Low-FODMAP exception, and deliberately swap each mineral, scoop and label path
to confirm rejection. Existing stale files must be replaced during generation.
Original labels and the supplied outline are references, not artwork to relabel.

To verify the current generated downloads without regenerating them:

```sh
node artifacts/stellar-review/scripts/verify-electrolyte-handoff.mjs
```

This verification also runs in `check-product-outline.mjs --handoff`, including
the existing post-merge handoff preparation.

To refresh the complete downloadable handoff and editable archive:

```sh
node artifacts/stellar-review/scripts/export-handoff.mjs --pdf --zip
```

Do not use the focused `--pack` flag to prepare a full delivery archive; it is
intended for isolated checks and targeted exports.
