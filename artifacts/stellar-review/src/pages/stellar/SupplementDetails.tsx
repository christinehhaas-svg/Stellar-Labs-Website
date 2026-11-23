import { supplements } from "./_shared/supplements-data";
import { SupplementPurchasePage } from "./_shared/SupplementPurchasePage";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";
import "./_group.css";

export function SupplementDetails() {
  return <SupplementPurchasePage supplements={supplements} assetUrl={reviewAsset} localUrl={reviewUrl} initializeLinks={initializeReviewLinks} />;
}
