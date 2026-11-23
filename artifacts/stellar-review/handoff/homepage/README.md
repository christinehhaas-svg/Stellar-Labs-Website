# Stellar Labs — approved homepage header and hero

## Scope and approval

Implementation handoff only. No live store changes, publishing, Shopify access, checkout, tracking, or theme upload were performed. Match the merchant reference `image_1791742060234.png` and the implemented review in `Homepage.tsx` and `_shared/homepage-typography.ts`.

This package stops after the three-category strip shown in the reference. Do not replace, reorder, rewrite, or hide the existing content below that strip. Do not change supplement bottle mockups, label artwork, descriptions, other product templates, or other pages' headers.

## Approved copy — verbatim

- Announcement: **Subscribe & save 10%**
- Navigation: **Whey Protein · Vegan Protein · Electrolytes · Supplements · Recipes**
- Heading: **LEAN NUTRITION**
- Tagline: **Make Every Calorie Count**
- The nutritionist-founder introduction belongs in **Why Stellar Labs**, not below the hero button.
- Beside the product image: **New Look, Same Formula**
- Supporting text: **High-protein shakes, electrolyte-rich hydration, and supplements.**
- Button: **SHOP ALL PRODUCTS**
- Category strip: **PROTEIN · ELECTROLYTES · SUPPLEMENTS**

Keep the original Stellar logo unchanged. Text remains live HTML, not part of a flattened image. The announcement is presentation copy, not implementation of a subscription offer; retain the merchant's existing subscription setup. Do not add nutrition claims or new promotional wording.

## Existing destination mapping

Use same-store links, not the local review URLs or captured `shopifypreview.com` host. The collection handles below come from the existing captured Shopify homepage and its review mapping; they were not invented. Verify availability in the merchant's unpublished theme before publishing.

| Label / placement | Local review behavior | Existing Shopify path |
| --- | --- | --- |
| Logo | `/` | `/` |
| Whey Protein / PROTEIN | `/?category=100-isolate-whey-protein` | `/collections/whey-protein` |
| Vegan Protein | `/?category=vegan-plant-protein` | `/collections/vegan-bars` |
| Electrolytes / ELECTROLYTES | `/?category=electrolyte` | `/collections/electrolytes` |
| Supplements / SUPPLEMENTS | `/supplements` | `/collections/supplements` |
| Recipes | captured source blog link, not a local review page | `/blogs/recipes` |
| SHOP ALL PRODUCTS | `#shop-products` (local review anchor) | `/collections/products` |
| Search / Cart | static artwork only in the review | existing Shopify controls, or `routes.search_url` / `routes.cart_url` |

**Important:** Vegan Protein deliberately uses the existing `vegan-bars` handle. Do not rename it to `vegan-protein`. Shop All uses `products`, not `all`. Liquid prepends `routes.root_url` for locale-aware collection/blog links.

The local review's hero button scrolls to `#shop-products`. For this Shopify handoff, it uses the existing “Shop All” menu destination `/collections/products`; that path is sourced from the captured navigation, not from the sanitized hero anchor.

## Files and asset provenance

- `assets/stellar-homepage-approved-photo.webp`: the merchant's selected original homepage photograph, preserved byte-for-byte with its existing composition and packaging. No additional cropping, retouching, or generated bottle artwork has been applied.
- `assets/stellar-reference-hero-texture.jpg`: exact supplied review background JPG, copied without recompression.
- `assets/d0e3e00a06012d0d.png`: unchanged original Stellar logo from the captured storefront, not redrawn.
- `assets/stellar-homepage.css`: scoped responsive CSS, no global theme resets.
- `snippets/stellar-homepage-header.liquid`: homepage-only header markup and functional search/cart link alternatives.
- `sections/stellar-homepage-hero.liquid`: editable Online Store 2.0 section and category strip.
- `approved-copy.json` and `link-map.json`: editable content and destination checklist.
- `preview.html`: self-contained, script-free header/hero preview with complete handoff notes. Can be opened without installing anything.
- `source-reference/`: unchanged merchant reference plus the implemented React/TypeScript reference for context only. These files are not Shopify theme code.
- `asset-checksums.json`: hashes and image dimensions for confirming original artwork.

The browser preview embeds the existing review's TT Hoves fonts for display. Reuse the merchant theme's existing licensed TT Hoves declarations in Shopify; do not upload or replace theme fonts. Reference artwork is for this merchant's handoff, not new product photography.

## Implementation — website team

1. Duplicate the current theme to an **unpublished** development theme. Record the original index template and header configuration. Nothing in this package should be installed automatically or published without merchant authorization.
2. Upload the two JPGs, unchanged logo PNG, and CSS from `assets/` into the duplicate theme's Assets. Reuse an identical existing logo asset if already present.
3. Add the snippet and section in the corresponding Shopify folders. Load CSS once on the homepage only, after the existing theme CSS:

   ```liquid
   {% if request.page_type == 'index' %}
     {{ 'stellar-homepage.css' | asset_url | stylesheet_tag }}
   {% endif %}
   ```

4. Adapt the **existing** announcement/header on the homepage to the snippet's structure. Preferred: preserve the theme's original search/cart elements, cart count, drawers, accessibility, and event wiring within `.stellar-home-actions`. The snippet's ordinary search/cart links are functional alternatives, not replicas of drawer behavior. Do not copy disabled review controls or sanitized snapshot scripts. Maintain the original header on non-homepage templates.
5. If using the whole header snippet instead, render it in place of the existing announcement and header **only when `request.page_type == 'index'`**. Keep the original header group in the `else` branch. Do not leave duplicate announcement/header markup. How the header group is rendered varies by theme: inspect the actual theme layout first rather than pasting over it.
6. In the duplicate theme's homepage editor, replace only the old hero with “Stellar approved hero.” Keep every below-hero section in its existing order and with its current settings. Do not add a second category strip. The section's four text fields are editable, with approved defaults.
7. Preserve the review's layout behavior: desktop header on one row; below 768px, logo/actions on the first row and a three-column navigation grid below; at 360px and below, two navigation columns. Desktop hero height is `clamp(360px,34vw,540px)`; mobile hero height follows its stacked content. Keep copy above the complete, uncropped product photo on mobile.
8. The complete photograph sits at the right on desktop and below the copy on mobile using `object-fit: contain`; do not crop or retouch the container, glass, or label. A darkened slate backdrop and restrained left-side text gradient blend the existing image without shading over the products. The original logo is about 276px wide on desktop and up to 215px on mobile. Keep headline and supporting text live in TT Hoves.
9. Confirm scoped CSS does not change existing theme components or below-hero sections. If theme styles override these classes, adjust only scoped selectors; do not apply broad `h1`, `nav`, `img`, or `section` rules.

## Acceptance checks before any live release

- Compare at 1440px, 1024px, 768px, 767px, 390px, 360px, and 320px; verify hero visibility, unchanged logo proportions, readable subtitle, no clipped heading, and no horizontal page scroll.
- Check keyboard focus and visible navigation at each breakpoint; confirm every destination above, including the unusual `vegan-bars` and `products` handles.
- Confirm search works and the existing cart opens/updates its count as expected if preserving the theme's controls. Check that there is only one announcement/header and one category strip.
- Compare below-hero content, supplement bottles, labels, and product pages against the original theme. They must be untouched.
- Obtain the merchant's approval of the unpublished theme. Publishing is a separate authorized action, not part of this handoff. Rollback is restoration of the saved index/header configuration in that duplicate theme.
