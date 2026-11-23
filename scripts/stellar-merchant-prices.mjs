// Website-only merchant approvals, in USD cents. This is not a Shopify update.
// Match explicit product identities: Natural approval never extends to Classic.
const approvals = [
  ["ProteinChocolateIsolate1lb", "100-isolate-whey-protein-shake-chocolate-1lb", "isolate", "1lb", 5295],
  ["ProteinVanillaIsolate1lb", "100-isolate-whey-protein-shake-vanilla-1lb", "isolate", "1lb", 5295],
  ["ProteinMixedBerry", "100-isolate-whey-protein-shake-mixed-berry", "isolate", "1lb", 5295],
  ["ProteinUnflavored", "whey-protein-shake-unflavored", "isolate", "1lb", 5295],
  ["ProteinCappuccino", "100-isolate-whey-protein-shake-cappuccino", "isolate", "1lb", 5295],
  ["ProteinVanillaIsolate", "100-isolate-whey-protein-shake-vanilla", "isolate", "2lb", 8995],
  ["ProteinChocolateIsolate", "100-isolate-whey-protein-shake-chocolate", "isolate", "2lb", 8995],
  ["ProteinCaramelBlend", "whey-protein-salted-caramel-shake", "blend", "2lb", 7895],
  ["ProteinVanillaBlend", "vanilla-whey-protein-shake", "blend", "2lb", 7895],
  ["ProteinChocolateBlend", "grass-fed-whey-chocolate-protein-shake", "blend", "2lb", 7895],
];

export function merchantWebsitePrice({ component, handle, formula, size }) {
  const approval = approvals.find(entry => entry[0] === component);
  if (!approval) return undefined;
  if (approval[1] !== handle || approval[2] !== formula || approval[3] !== size) {
    throw new Error(`Merchant price identity mismatch for ${component}; verify formula and package before recapturing`);
  }
  return approval[4];
}

export function capturedPrice(identity, sourcePrice) {
  const price = merchantWebsitePrice(identity);
  // Unapproved products (including electrolytes) retain their existing behavior.
  if (price === undefined) return { price: sourcePrice };
  if (!Number.isSafeInteger(sourcePrice) || sourcePrice < 0) {
    throw new Error(`Invalid captured source price for ${identity.component}`);
  }
  return { price, sourcePrice, priceAuthority: "merchant-approved-website" };
}
