import { InformationPage } from "./_shared/InformationPage";
import { reviewAsset } from "./review-links";

const locations = [
  { city: "Alexandria, VA", street: "3335 Duke Street", locality: "Alexandria, VA 22314" },
  { city: "Ashburn, VA", street: "20130 Lakeview Center Plaza, Suite 400", locality: "Ashburn, VA 20147" },
];

export function StoreLocator() {
  return (
    <InformationPage title="Store Locator" pageKey="store-locator">
      <div className="sl-information-photo-layout">
      <div>
      <p>Find our products at:</p>
      {locations.map((location, index) => (
        <section className="sl-store-location" key={location.city} aria-labelledby={`store-location-${index}`}>
          <h2 id={`store-location-${index}`}>{location.city}</h2>
          <address style={{ fontStyle: "normal" }}>
            <strong>Washington Nutrition and Counseling Group</strong><br />
            {location.street}<br />
            {location.locality}
          </address>
        </section>
      ))}
      </div>
      <figure className="sl-information-photo">
        <img
          src={reviewAsset("/__mockup/images/stellar/vegan-vanilla-lifestyle.jpg")}
          alt="Stellar Labs vanilla vegan protein with a green smoothie"
          width={1200}
          height={800}
        />
      </figure>
      </div>
    </InformationPage>
  );
}
