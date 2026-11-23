import { FaqsPage } from "../../../../../stellar-review/src/pages/stellar/Faqs";
import { initializeReviewLinks, reviewAsset } from "./review-links";

export default function Faqs() {
  return <FaqsPage assetUrl={reviewAsset} initializeLinks={initializeReviewLinks} />;
}
