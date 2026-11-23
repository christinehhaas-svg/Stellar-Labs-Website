# Refreshing store captures

Run `node scripts/capture-stellar-proteins.mjs` for proteins, or append
`electrolytes` for electrolytes. Run `pnpm test:captures` for offline regression
checks; tests write only to temporary directories and make no network requests.

Chocolate and Vanilla 1 lb isolates are merchant-requested local preview listings,
not live Shopify products. Protein recapture preserves their complete existing
records (including price and blank source/capture date) at the front of both
catalogs and never requests their synthetic handles. Their empty galleries keep
the existing pending-photo/full-label messaging active; the live 2 lb products
remain separate and continue through all artwork integrity checks.

Both catalogs must contain exactly one matching copy of each local listing.
Missing, duplicated, differing, or invalid local identities stop capture before
network requests or catalog/asset writes. Restore the intended local entries in
both previews before retrying. A future verified Shopify listing or matching
1 lb artwork needs an explicit capture-policy update, not a source URL or 2 lb
image pasted onto these pending records.

## Interrupted captures and disk errors

Captures hold one exclusive lock across both catalogs and previews. They stage
all images, JSON mirrors, and byte-for-byte backups in
`generated-artifacts/catalog-capture/` before replacing any live files. Each
replacement is a rename, not an in-place write. A write error rolls back both
destinations, including removing newly introduced files; unrelated files remain
untouched. The generated transaction directory is ignored by Git and deployment.

After a hard interruption, run `node scripts/capture-stellar-proteins.mjs --recover`
to restore the previous generation without downloading anything. A normal capture
also performs this recovery **before** fetching or reading approved artwork.
Recovery can itself be interrupted and retried: backups are not consumed while
restoring. If rollback fails (for example, the disk remains full), fix that issue
and rerun recovery. Do not delete the pending transaction or its backups.

A durable completion marker keeps a fully installed capture if the process dies
during cleanup. The two previews have separate filesystem paths, so replacement
is not an instantaneous switch for concurrent readers: do not build or restart
previews during a capture, and recover an interrupted capture before doing so.
This protects against write errors and process termination, not hardware failure
or loss of the entire filesystem.

A live capture is never displaced. An owner killed mid-capture is detected and
its lock reclaimed. If the process dies during lock creation/reclamation, an
incomplete-lock error deliberately stops rather than guessing: confirm no capture
is running, remove only `generated-artifacts/catalog-capture/lock`, then rerun
`--recover`. Recovery also holds the exclusive lock while retiring `pending`
and cleaning it up. If recovery is killed before the retirement rename, rerun
`--recover` to repeat the rollback or retain the committed generation. If killed
after the rename or during recursive cleanup, leftover `pending-discard-*`
directories are harmless remnants of already completed or rolled-back
transactions, even if only some backups remain. Recovery ignores them; they
are not a journal to replay. They may be removed only after confirming no capture
or recovery is running. Their presence never permits bypassing the lock or
starting concurrent writers.

The capture updates both catalogs and their vendored image directories:
Canvas's `public/images` and the review site's `source-assets/images`. The review
workflow's existing asset preparation copies its vendored assets into public
output on its next start/build.

`stellar-image-corrections.mjs` records visually approved exceptions to live
galleries. Cappuccino's first live image is Chocolate 2 lb, so its first slot
retains the verified Cappuccino 1 lb photo. Protein side panels are pinned in
`stellar-protein-panels.mjs` to their existing flavor/package, gallery slot,
CDN path, and SHA-256. Cache-busting query changes are allowed only when the
image bytes still match. Reordered, missing, additional, cross-flavor, or
changed artwork stops capture before either catalog or any asset is written,
with the product and offending slot identified where applicable.

For a gallery warning, inspect the actual nutrition/ingredient artwork against
the intended flavor, formula, and package before deliberately updating the
panel manifest. Do not approve a panel from its filename alone or automatically
regenerate the manifest from the live gallery. Preserve the existing panel order
(including Caramel's Right/Left order). These checks do not change descriptions,
serving facts, or electrolyte capture behavior.

Corrections are scoped to exact product and package identity. The approved
Canvas file's SHA-256 must match before it is copied to either destination.
A missing/corrupt original or changed package stops capture before writes;
there is no fallback to the incorrect live front. Restore the verified original
to resolve a missing/corrupt file, or visually verify new artwork before
deliberately updating an exception's identity, filename, source URL and hash.
Do not remove an exception just because the live URL changes. Confirm that the
actual front photo matches the intended flavor and package first.
