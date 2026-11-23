import { Homepage } from "./pages/stellar/Homepage";
import { AboutPage } from "./pages/stellar/About";
import { ContactPage } from "./pages/stellar/Contact";
import { StoreLocator } from "./pages/stellar/StoreLocator";
import { ShippingPolicies } from "./pages/stellar/ShippingPolicies";
import { FaqsPage } from "./pages/stellar/Faqs";
import { RecipesPage as Recipes } from "./pages/stellar/Recipes";
import { HomepageHandoff } from "./pages/stellar/HomepageHandoff";
import { Supplements } from "./pages/stellar/Supplements";
import { SupplementDetails } from "./pages/stellar/SupplementDetails";
import { ProteinProductPage } from "./pages/stellar/_shared/ProteinProductPage";
import { ClassicWheyProductPage } from "./pages/stellar/_shared/ClassicWheyProductPage";
import { classicWheyProducts } from "./pages/stellar/_shared/classic-whey-products";
import { StellarProductInformation } from "./pages/stellar/StellarProductInformation";
import { PowderCollectionPage, type PowderCollection } from "./pages/stellar/PowderCollectionPage";

export default function ReviewContent({ id }: { id: string }) {
  if (id === "store-locator") return <StoreLocator />;
  if (id === "about") return <AboutPage />;
  if (id === "contact") return <ContactPage />;
  if (id === "shipping-policies") return <ShippingPolicies />;
  if (id === "faqs") return <FaqsPage />;
  if (id === "recipes") return <Recipes />;
  if (id.startsWith("recipe:")) return <Recipes slug={id.slice("recipe:".length)} />;
  if (id === "compare") return <Homepage comparisonPage />;
  if (id === "shop") return <Homepage fullCatalog />;
  if (id === "home") {
    const category = new URLSearchParams(window.location.search).get("category");
    const powderCategory: Record<string, PowderCollection> = {
      "100-isolate-whey-protein": "whey",
      "vegan-plant-protein": "vegan",
      electrolyte: "electrolyte",
    };
    return category && powderCategory[category]
      ? <PowderCollectionPage category={powderCategory[category]} />
      : <Homepage />;
  }
  if (id === "homepage-handoff") return <HomepageHandoff />;
  if (id === "product-information") return <StellarProductInformation />;
  if (id === "supplements") return <Supplements />;
  if (id === "supplement-details") return <SupplementDetails />;
  if (classicWheyProducts.some(product => product.id === id)) return <ClassicWheyProductPage productId={id} />;
  return <ProteinProductPage component={id} />;
}
