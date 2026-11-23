# Approved homepage brand story

Edit `stellar-brand-story.json` only when new story wording is approved. Keep
the heading and paragraphs as plain text; HTML is escaped on output.
Do not manually synchronize the story in the two saved homepage documents.

Run `node scripts/prepare-brand-story.mjs` from the workspace root to refresh
both saved documents. Review asset preparation and Canvas dev/build run this
automatically. The review's public copy is then relocated by its existing asset
preparation script.

The generator updates only the captured story blocks. Missing or duplicate
blocks fail preparation explicitly, so a recapture cannot silently leave old
wording behind. Artwork, first-paint protection, routing adapters, and iframe
permissions are outside its scope.

`pnpm test:handoff` and `pnpm test:homepage:parity` check the saved output.
`pnpm test:homepage` also compares the served story before initialization with
the initialized story in both previews.
