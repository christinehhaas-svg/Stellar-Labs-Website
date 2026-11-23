import type { Supplement } from "./supplements-data";
import { supplementQuality } from "./quality-claims";

/** Merchant approved all seven drafts, including the Men's label correction.
 * Keep the reviewed wording intact; website and export share this copy.
 */
export const supplementCopyDrafts: Record<string, NonNullable<Supplement["detailCopy"]>> = {
  "mens-multivitamin": {
    description: "Stellar Labs® Men’s Daily Multivitamin brings together vitamins, minerals, and male support, immune support, and antioxidant blends in a gentle capsule formula. Designed for daily use, it supports energy and metabolism, prostate and heart health, muscle function, and antioxidant support.* Each bottle contains 60 capsules, a 30-day supply when taken as directed.",
    caption: "Daily support for energy and metabolism, prostate and heart health, muscle function, and antioxidant support.*",
    qualityCaption: "Certified Gluten-Free · Non-GMO · Manufactured in the USA",
    quality: [...supplementQuality],
    support: [
      { title: "Energy & Metabolism", description: "Daily vitamins and minerals in a formula that supports energy and metabolism.*" },
      { title: "Prostate & Heart Health", description: "A daily multivitamin formula with a male support blend, offering support for prostate and heart health.*" },
      { title: "Muscle Function", description: "Supports muscle function as part of your daily nutritional routine.*" },
      { title: "Antioxidant Support", description: "Includes an antioxidant fruit and energy blend as part of a formula that provides antioxidant support.*" },
    ],
  },
  "probiotic-40": {
    description: "Stellar Labs® Probiotic provides 40 billion CFU per two-capsule serving from four probiotic bacteria: Lactobacillus acidophilus (La-14), Bifidobacterium lactis (Bl-04), Lactobacillus plantarum (Lp-115), and Lactobacillus paracasei (Lpc-37). This gentle capsule formula supports gut balance, digestive health, immune support, and digestive comfort.* Each bottle contains 60 capsules for a 30-day daily routine when taken as directed.",
    caption: "40 billion CFU per serving for gut balance, digestive health, immune support, and digestive comfort.*",
    qualityCaption: "Certified Gluten-Free · Non-GMO · Manufactured in the USA",
    quality: [...supplementQuality],
    support: [
      { title: "Gut Balance", description: "A four-strain probiotic formula that supports gut balance.*" },
      { title: "Digestive Health", description: "Supports digestive health as part of a daily supplement routine.*" },
      { title: "Immune Support", description: "Provides immune support alongside the formula’s digestive benefits.*" },
      { title: "Digestive Comfort", description: "Supports digestive comfort in a gentle capsule formula.*" },
    ],
  },
  "digestive-enzyme": {
    description: "Stellar Labs® Digestive Enzyme combines the Makzyme-Pro™ enzyme blend with a bloat and digestion formula to support digestion and nutrient breakdown, help reduce bloating and discomfort, enhance nutrient absorption, and support gut health.* The blend includes protease, lipase, lactase, alpha galactosidase, bromelain, and papain. Each bottle contains 60 capsules, providing a 30-day supply when taken as directed.",
    caption: "Support for digestion, nutrient breakdown and absorption, gut health, and reduced bloating and discomfort.*",
    qualityCaption: "Certified Gluten-Free · Non-GMO · Manufactured in the USA",
    quality: [...supplementQuality],
    support: [
      { title: "Digestion & Nutrient Breakdown", description: "The Makzyme-Pro™ enzyme blend is part of a formula that supports digestion and nutrient breakdown.*" },
      { title: "Bloating & Discomfort", description: "Helps reduce bloating and discomfort as part of your digestive routine.*" },
      { title: "Nutrient Absorption", description: "Enhances nutrient absorption alongside support for digestion.*" },
      { title: "Gut Health", description: "Supports gut health in a capsule formula taken twice daily as directed.*" },
    ],
  },
  "omega-3": {
    description: "Stellar Labs® Omega 3 Fish Oil provides 1,200 mg of fish oil per softgel, including 720 mg of omega-3s: 432 mg of EPA and 288 mg of DHA. This premium EPA and DHA formula supports heart health, brain health, joint health, and the body’s inflammatory response.* The gentle softgel formula comes in a 60-softgel bottle, providing a 60-day supply when taken as directed. Contains fish (anchovy); the label also states that it may contain porcine.",
    caption: "EPA and DHA support for heart, brain and joint health, and the body’s inflammatory response.*",
    qualityCaption: "Certified Gluten-Free · Non-GMO · Manufactured in the USA",
    quality: [...supplementQuality],
    support: [
      { title: "Heart Health", description: "A fish oil formula with EPA and DHA that supports heart health.*" },
      { title: "Brain Health", description: "Supports brain health as part of your daily supplement routine.*" },
      { title: "Joint Health", description: "Provides support for joint health in a once-daily softgel formula.*" },
      { title: "Inflammatory Response", description: "Supports the body’s inflammatory response.*" },
    ],
  },
  "magnesium-complex": {
    description: "Stellar Labs® Magnesium Complex provides 500 mg of magnesium per two-capsule serving from magnesium hydroxide (Aquamin Mg™), magnesium malate, magnesium oxide, magnesium citrate, and magnesium glycinate. This gentle capsule formula supports muscle relaxation, cardiovascular and bone health, the nervous system, and digestive health.* Each bottle contains 60 capsules, a 30-day supply when taken as directed.",
    caption: "Magnesium support for muscle relaxation, cardiovascular and bone health, the nervous system, and digestive health.*",
    qualityCaption: "Certified Gluten-Free · Non-GMO · Manufactured in the USA",
    quality: [...supplementQuality],
    support: [
      { title: "Muscle Relaxation", description: "A five-form magnesium formula that supports muscle relaxation.*" },
      { title: "Cardiovascular & Bone Health", description: "Provides magnesium in a formula that supports cardiovascular and bone health.*" },
      { title: "Nervous System Support", description: "Supports the nervous system as part of your daily nutritional routine.*" },
      { title: "Digestive Health", description: "Offers digestive health support in a gentle capsule formula.*" },
    ],
  },
  "turmeric-w-bioperine": {
    description: "Stellar Labs® Turmeric Curcumin combines organic turmeric root, turmeric standardized to 95% curcuminoids, and BioPerine® black pepper extract in a gentle capsule formula. Each two-capsule serving provides 1,200 mg of organic turmeric root, 100 mg of turmeric 95% curcuminoids, and 6.67 mg of BioPerine®. The formula provides antioxidant support and supports healthy aging, joint health and mobility, and cellular health.* Each 60-capsule bottle provides a 30-day supply when taken as directed.",
    caption: "Turmeric with BioPerine® for antioxidant support, healthy aging, joint health and mobility, and cellular health.*",
    qualityCaption: "Certified Gluten-Free · Non-GMO · Manufactured in the USA",
    quality: [...supplementQuality],
    support: [
      { title: "Antioxidant Support", description: "A turmeric curcumin formula that provides antioxidant support.*" },
      { title: "Healthy Aging", description: "Supports healthy aging as part of your daily supplement routine.*" },
      { title: "Joint & Mobility Support", description: "Provides support for joint health and mobility.*" },
      { title: "Cellular Health", description: "Supports cellular health in a formula combining turmeric and BioPerine® black pepper extract.*" },
    ],
  },
  "night-time-fat-burn": {
    description: "Stellar Labs® Night Time Fat Burn combines a Night Burn Blend and a Mood and Sleep Blend with melatonin in a bedtime capsule formula. Each two-capsule serving contains 500 mg of the Night Burn Blend, 340 mg of the Mood and Sleep Blend, and 4 mg of melatonin. The formula supports overnight metabolism, encourages fat utilization, promotes restful sleep, and supports stress and hormonal balance.* Each bottle contains 60 capsules, a 30-day supply when taken as directed. The capsule contains gelatin.",
    caption: "Bedtime support for overnight metabolism, fat utilization, restful sleep, and stress and hormonal balance.*",
    qualityCaption: "Certified Gluten-Free · Non-GMO · Manufactured in the USA",
    quality: [...supplementQuality],
    support: [
      { title: "Overnight Metabolism", description: "A bedtime formula with a Night Burn Blend that supports overnight metabolism.*" },
      { title: "Fat Utilization", description: "Encourages fat utilization as part of the nighttime formula.*" },
      { title: "Restful Sleep", description: "Includes melatonin and a Mood and Sleep Blend in a formula that promotes restful sleep.*" },
      { title: "Stress & Hormonal Balance", description: "Provides support for stress and hormonal balance.*" },
    ],
  },
};

/** Approved correction: the supplied Men's label says Heart Health, not Bone Health. */
export const supplementDraftBenefits: Record<string, string[]> = {
  "mens-multivitamin": ["Energy & Metabolism", "Prostate & Heart Health", "Muscle Function", "Antioxidant Support"],
};
