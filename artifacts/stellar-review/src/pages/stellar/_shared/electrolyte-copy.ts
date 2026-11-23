/** Merchant-supplied marketing copy; allergen wording from each current storefront label. */
import { electrolyteQuality } from "./quality-claims";

const benefits = [
  "Supports Hydration",
  "Replenishes Electrolytes Lost Through Sweat",
  "Supports Muscle & Nerve Function",
  "Supports Recovery & Digestive Comfort",
];
const baseQuality = [
  ...electrolyteQuality,
  "5 Major Electrolytes",
  "Sugar-Free",
  "No Added Sugar",
  "No Artificial Flavors",
  "No Artificial Colors",
  "Sweetened with Stevia",
];
const hydration = { title: "Hydration Support", description: "Helps replenish important electrolytes lost through sweat, exercise, and everyday activity." };
const muscle = { title: "Muscle & Nerve Function", description: "Electrolytes help support normal muscle contraction and healthy nerve function." };

export const electrolyteCopy: Record<string, {
  description: string;
  benefits: string[];
  quality: string[];
  support: { title: string; description: string }[];
  suggestedUse: string;
  allergens: string[];
}> = {
  ElectrolyteLemonLime: {
    description: "Stellar Labs® Lemon Lime Electrolyte Powder provides 5 major electrolytes—sodium, potassium, magnesium, calcium, and chloride—to support everyday hydration. Each 4.5g scoop contains 280mg potassium, 51mg magnesium, and 47mg calcium. The easy-to-mix formula helps replenish electrolytes lost through sweat and activity without added sugar or artificial flavors or colors.",
    benefits,
    quality: [...baseQuality],
    support: [
      hydration,
      { title: "Electrolyte Replenishment", description: "Provides key minerals to help support fluid and electrolyte balance." },
      muscle,
      { title: "Recovery & Digestive Comfort", description: "An easy-to-mix, sugar-free hydration formula designed to support recovery without unnecessary digestive discomfort." },
    ],
    suggestedUse: "Mix one scoop of Stellar Labs® Lemon Lime Electrolyte Powder into 12–16 oz of water.",
    allergens: [
      "Allergens: None",
      "Allergen Information: This Product is manufactured in a facility that produces containing Milk, Eggs, Soybeans, Wheat, Fish Oil, and Tree Nuts.",
    ],
  },
  ElectrolyteStrawberry: {
    description: "Stellar Labs® Strawberry Electrolyte Powder provides 5 major electrolytes—sodium, potassium, magnesium, calcium, and chloride—to support everyday hydration. Each 6.5g scoop contains 340mg potassium, 40mg magnesium, and 50mg calcium. The sugar-free formula includes real strawberry powder and helps replenish electrolytes lost through sweat and activity.",
    benefits,
    quality: [...baseQuality, "Pink Himalayan Salt", "Real Strawberry Powder", "Sodium, Potassium, Magnesium & Calcium"],
    support: [
      hydration,
      { title: "Electrolyte Replenishment", description: "Provides sodium, potassium, magnesium, and calcium to help support fluid and electrolyte balance." },
      muscle,
      { title: "Recovery & Digestive Comfort", description: "A sugar-free hydration formula designed to support recovery without unnecessary gas, bloating, or digestive discomfort." },
    ],
    suggestedUse: "Mix one scoop of Stellar Labs® Strawberry Electrolyte Powder into 12–16 oz of water.",
    allergens: ["ALLERGENS: NONE."],
  },
};
