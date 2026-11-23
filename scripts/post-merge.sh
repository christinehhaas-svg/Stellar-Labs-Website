#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
# Handoff files are generated, not committed. Rebuild them from the merged
# review copy so Canvas previews and PDF downloads cannot retain earlier facts.
BASE_PATH=/ node artifacts/stellar-review/scripts/prepare-assets.mjs
# Check source and preview parity before the expensive PDF generation.
node artifacts/stellar-review/scripts/check-product-outline.mjs
node artifacts/stellar-review/scripts/export-handoff.mjs --pdf --zip
node artifacts/stellar-review/scripts/check-product-outline.mjs --handoff
# Separate claims flyer: run only after the unrelated Shopify handoffs finish,
# so a flyer rendering/verification failure cannot leave those packs stale.
# It owns its temporary renderer and retains its last verified downloads.
pnpm export:claims-flyer
