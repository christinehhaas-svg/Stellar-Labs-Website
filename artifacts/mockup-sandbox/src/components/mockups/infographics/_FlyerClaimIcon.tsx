import { QualityIcon } from "../../../../../stellar-review/src/pages/stellar/_shared/QualityCallouts";
import { claimIcon, stomachArtwork } from "../../../../../stellar-review/src/pages/stellar/_shared/claim-icons";
import corn from "../../../../../stellar-review/source-assets/stellar-current/assets/b1f703f6d4d0d5a8.svg?url";
import glutenFree from "../../../../../stellar-review/source-assets/stellar-current/assets/702fdffe87ab02f0.svg?url";
import cow from "../../../../../stellar-review/source-assets/stellar-current/assets/stellar-rbgh-cow-outline.png?url";

// Use the website's artwork and renderer, not generic replacement checkmarks.
// Asset imports work in both Canvas and the isolated offline-PDF export.
export function FlyerClaimIcon({ claim }: { claim: string }) {
  // Retained handout/label wording can differ from current live marketing.
  // Keep its approved pictogram without restoring a withdrawn website claim.
  const symbol = /^Low[- ]FODMAP Ingredients[*†]*$/i.test(claim.trim())
    ? "stomach" : claimIcon(claim);
  const image = symbol === "corn" ? corn : symbol === "gluten-free" ? glutenFree
    : symbol === "milk" ? cow : symbol === "stomach"
      ? `data:image/svg+xml,${encodeURIComponent(stomachArtwork)}` : undefined;
  return <QualityIcon item={{ label: claim, symbol, image }} />;
}
