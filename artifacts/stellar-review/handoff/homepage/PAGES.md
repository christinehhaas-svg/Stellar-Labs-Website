# Approved About and Shipping & Returns page content

These are additions to the existing homepage handoff, not replacements for its assets or instructions. No Shopify connection, upload, save, publishing, or live-store change is performed by generating or opening this package.

## Files and existing destinations

| Existing Shopify page | Keep this URL / handle | Ready-to-paste content |
| --- | --- | --- |
| About Stellar Labs | `/pages/about-us` / `about-us` | `pages/about-us.html` |
| Shipping & Returns Policy | `/pages/shipping-information` / `shipping-information` | `pages/shipping-information.html` |

`source-reference/stellar-brand-story.json` and `source-reference/stellar-shipping-returns-policy.md` are verbatim copies of the merchant-approved sources. The About heading, paragraphs, and literal leading asterisk on the medical-provider disclaimer are preserved. The policy includes every approved section and the return-contact email. No founder portrait, old biography, or legacy policy terms are included in the page HTML.

## Manual Shopify instructions — do not publish

1. Back up the current content and settings of both existing pages before editing. Find them in Shopify Admin under Online Store > Pages (or Content > Pages, depending on your admin navigation), using the URL handles above. Do not create duplicate pages, rename handles, add redirects, or change menus.
2. Review the supplied HTML offline first: both files open directly in a browser. They contain only editable page-body HTML, not a full theme or document. They need no Replit review server, JavaScript, images, fonts, stylesheet, or external network resources. The email link opens the visitor's mail app only when clicked. Typography comes from the existing Shopify theme after pasting.
3. **Do not save changes to an existing visible page yet.** Saving its content can change the live store immediately, even when an unpublished theme is selected. An unpublished theme does not isolate shared page content. For a private review, use a development store or a separate hidden staging page without changing the existing pages.
4. Only after the merchant explicitly authorizes the content update, open the existing page's content editor, switch to HTML / Show HTML (`<>`), and replace the **entire old page body** with the contents of the matching HTML file. Do not append it to the old biography or policy. Keep the existing title, URL handle, template, visibility, and navigation settings unchanged. The fragments start at heading level 2 because Shopify's page template supplies the page title.
5. For About, keep “Why Stellar Labs?” and all three approved paragraphs, including the full tolerance and medical-provider disclaimer. Do not restore the founder portrait or legacy founder biography. For Shipping & Returns, use only the supplied approved policy, without adding old refund conditions, addresses, or other legacy terms.
6. If a page template contains a separate founder image, biography, or old policy block outside the page body, flag it for the merchant before any save; replacing the body will not remove template-owned content. Do not alter shared theme templates automatically.
7. Preview and compare all text, punctuation, disclaimers, section order, and the contact email against the included sources. Check desktop and mobile readability with the merchant's existing theme. Do not publish a theme or change page visibility. Keep the merchant's final save/publish approval separate from this handoff.

The existing homepage package and its limited header/hero scope remain unchanged. These page-body replacements are a separate, explicitly approved content handoff, not permission to redesign the store or update Shopify's separate Settings > Policies fields.
