import { FaqsPage } from "../../../../../stellar-review/src/pages/stellar/Faqs";
import { initializeReviewLinks, reviewAsset, reviewUrl } from "./review-links";

export default function Faqs() {
  return <FaqsPage assetUrl={reviewAsset} localUrl={reviewUrl} initializeLinks={initializeReviewLinks} />;
}
