/** Merchant corrections for review copy, separate from unchanged printed labels.
 * Later explicit corrections supersede the initial package-label approval.
 */
export type PowderPackageIdentity = {
  component: string;
  formula: string;
  flavor: string;
  size: string;
};

type PackageIdentity = Omit<PowderPackageIdentity, "component">;

export function assertPowderPackageIdentity(product: PowderPackageIdentity, expected: PackageIdentity): void {
  for (const field of ["size", "formula", "flavor"] as const) {
    if (product[field] !== expected[field]) {
      throw new Error(`Package identity mismatch for ${product.component}: ${field} must be "${expected[field]}", received "${product[field]}". Verify this package's serving facts separately.`);
    }
  }
}

export const servingDecisions: Record<string, {
  packageIdentity?: PackageIdentity;
  package: string;
  packageFacts: string[];
  approvedFacts: string[];
  servings?: number;
  supply?: string;
  outlinePage: number;
  outlineReference: string;
  packageDirections?: string;
}> = {
  ProteinChocolateIsolate: {
    packageIdentity: { size: "2lb", formula: "isolate", flavor: "Chocolate" },
    package: "Chocolate Whey Isolate, 2 lb",
    packageFacts: ["Serving size: 1 rounded scoop (31g)", "29 servings per container"],
    approvedFacts: ["Serving size: 1 rounded scoop (31g)", "29 servings per container"],
    servings: 29,
    outlinePage: 13,
    outlineReference: "1 rounded scoop (29 g); 16 servings per container",
  },
  ProteinVanillaIsolate: {
    packageIdentity: { size: "2lb", formula: "isolate", flavor: "Vanilla" },
    package: "Vanilla Whey Isolate, 2 lb",
    packageFacts: ["Serving size: 1 rounded scoop (31g)", "29 servings per container"],
    approvedFacts: ["Serving size: 1 rounded scoop (31g)", "29 servings per container"],
    servings: 29,
    outlinePage: 15,
    outlineReference: "1 rounded scoop (29 g); 16 servings per container",
  },
  ProteinCappuccino: {
    packageIdentity: { size: "1lb", formula: "isolate", flavor: "Cappuccino" },
    package: "Cappuccino Whey Isolate, 1 lb",
    packageFacts: ["Serving size: 1 rounded scoop (30g)", "16 servings per container"],
    approvedFacts: ["Serving size: 1 rounded scoop (30g)", "16 servings per container"],
    servings: 16,
    outlinePage: 14,
    outlineReference: "1 rounded scoop (29 g); 16 servings per container",
  },
  ProteinCaramelBlend: {
    packageIdentity: { size: "2lb", formula: "blend", flavor: "Caramel" },
    package: "Caramel Whey Protein Blend, 2 lb",
    packageFacts: ["Serving size: 1 rounded scoop (32g)", "28 servings per container"],
    approvedFacts: ["Serving size: 1 rounded scoop (32g)", "28 servings per container"],
    servings: 28,
    outlinePage: 21,
    outlineReference: "1 rounded scoop (weight not specified); 28 servings per container",
  },
  "magnesium-complex": {
    package: "Magnesium Complex, 60 capsules",
    packageFacts: ["Serving size: 2 capsules", "30 servings per container"],
    approvedFacts: ["Serving size: 1–2 capsules", "30–60 servings per bottle, depending on use"],
    supply: "30–60-day supply, depending on use",
    outlinePage: 9,
    outlineReference: "30–60 servings per bottle, depending on recommended use",
    packageDirections: "Take one capsule daily before a meal, or two capsules if recommended by your healthcare professional.",
  },
};

/** Never apply a powder correction by component alone, even for a new size. */
export function getPowderServingDecision(product: PowderPackageIdentity) {
  const decision = Object.hasOwn(servingDecisions, product.component) ? servingDecisions[product.component] : undefined;
  if (!decision) return undefined;
  if (!decision.packageIdentity) throw new Error(`Missing powder package identity for serving decision ${product.component}`);
  assertPowderPackageIdentity(product, decision.packageIdentity);
  return decision;
}

export function servingDecisionNote(id: string): string | undefined {
  const decision = servingDecisions[id];
  if (!decision) return undefined;
  return `Merchant-confirmed review copy for ${decision.package}: ${decision.approvedFacts.join("; ")}.${decision.packageDirections ? ` Approved directions: ${decision.packageDirections}` : ""} Unchanged printed label: ${decision.packageFacts.join("; ")}. Outline reference (page ${decision.outlinePage}): ${decision.outlineReference}. The merchant's correction governs review copy; the supplied artwork has not been relabeled.`;
}
