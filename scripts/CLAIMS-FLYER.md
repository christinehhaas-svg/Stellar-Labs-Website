# Claims-and-nutrition flyer release

Run `pnpm export:claims-flyer` from the workspace root. No Canvas, review website,
API server, or development workflow needs to be running. Post-merge setup runs
the same command separately from the existing Shopify handoff generation.

The command fingerprints the flyer, its recursively imported canonical facts,
claims, serving decisions, styles, exporter and dependency lockfile. If those
inputs and all saved output hashes still match, it does nothing. Use
`pnpm export:claims-flyer --force` to regenerate unchanged sources.
`--output=generated-artifacts/another-flyer` supports isolated verification.

The stable download directory is `generated-artifacts/claims-flyer/`:

- `stellar-labs-claims-and-nutrition-facts.pdf`
- `stellar-labs-claims-and-nutrition-facts.html` (self-contained, script-free)
- `page-N.jpg` and the existing `page-N.png` for every page
- `verification.json` and `release.json` (source and output checksums)

The renderer starts a temporary, loopback-only Vite server for this component,
checks every product's facts and claims and page clipping, verifies the PDF
page count, and closes its browser and server. It requires installed workspace
dependencies, Chromium (the existing `/repl/tools/bin/chromium`, Playwright's
browser, or `CHROMIUM_EXECUTABLE_PATH`), and `pdfinfo`.

Exports are staged, verified, and published by atomically switching the stable
directory symlink. Source changes during rendering abort the release. Failed
generation or verification exits nonzero without replacing the last release.
Concurrent invocations share a lock. A previous ordinary output directory is
preserved as `generated-artifacts/claims-flyer-releases/legacy`; an interrupted
initial migration is recovered on the next invocation. Earlier releases are
retained under `claims-flyer-releases` for recovery, not committed or deployed.
Copy the stable directory with symlink dereferencing when sharing outside the
workspace. This step does not publish files, alter storefront content, or
modify the product/category Shopify handoff packs.

Run `pnpm test:claims-flyer-release` for release/failure-path regression tests.
