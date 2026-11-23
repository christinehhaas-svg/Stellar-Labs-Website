// Baseline label artwork, in the existing preview order (Caramel is Right, Left).
// New artwork requires explicit flavor/package verification before updating this list.
// Hashes also detect replacement artwork served at an unchanged CDN URL.
const cdn = "https://cdn.shopify.com/s/files/1/1409/0320/files/";
const panels = (prefix, entries) => entries.map(([side, sha256]) => ({
  original: `${cdn}${prefix}-${side}.png`,
  sha256,
}));

export const proteinPanels = {
  ProteinMixedBerry: {
    title: "100% Isolate Whey Protein Shake Mixed Berry 1lb",
    panels: panels("SL_WheyIsolateShake_1LB_MixedBerry", [
      ["Left", "6caa06c57b0175a68ee2d2302abbde0ab457ce929a1b2f6fa4f4aee39aaffa47"],
      ["Right", "9f4373560acaf774c89ebbb1cef58849f46931434321d8a5136bd7cfaa606118"],
    ]),
  },
  ProteinUnflavored: {
    title: "100% Isolate Whey Protein Shake Unflavored 1lb",
    panels: panels("SL_WheyIsolateShake_1LB_Unflavored", [
      ["Left", "20219eca52604478d8a3c0330f4ac7ce532709a1edd893a4bb8dffa63fbb17eb"],
      ["Right", "6c28f5beae24124de77ce3c185e45f35166bf82b8c73ba37a81fb18f4bcf9da5"],
    ]),
  },
  ProteinVanillaIsolate: {
    title: "100% Isolate Whey Protein Shake Vanilla 2lb",
    panels: panels("SL_WheyIsolateShake_2LB_Vanilla", [
      ["Left", "ec0773d6ee74342817746fb08a3d71debee16065b1112a083278df56d0cf2046"],
      ["Right", "4420e41b93dce0b1319b6f28df032c080aebffc0f139ba2d197381079894a116"],
    ]),
  },
  ProteinChocolateIsolate: {
    title: "100% Isolate Whey Protein Shake Chocolate 2lb",
    panels: panels("SL_WheyIsolateShake_2LB_Chocolate", [
      ["Left", "364b17cab56546d8b07dd1019542267ec8d861c1ad3f1d0668146597705f8353"],
      ["Right", "668d6621c2e4cf356d9d0f872cf0ba54e57de3b39a5a5b649804282095cdd9ea"],
    ]),
  },
  ProteinCappuccino: {
    title: "100% Isolate Whey Protein Shake Cappuccino 1lb",
    panels: panels("SL_WheyIsolateShake_1LB_Cappuccino", [
      ["Left", "20dfb0016e81d2764c56904ad3ff2b6fa29df0221eefe9789e90bf063f92c42c"],
      ["Right", "426a2e7ccbf029dd78170f0b9678c68286c689514210b103c807a844e9eafff9"],
    ]),
  },
  ProteinCaramelBlend: {
    title: "Whey Protein Shake Salted Caramel 2lb",
    panels: panels("SL_WheyShake_2LB_SaltedCaramel", [
      ["Right", "37b982850297200aec7d41cbfd3d7d1e3fb9b9ac6d858d454f932dbedd665c21"],
      ["Left", "2011d7d3bff7190aef1d89e81bc99af493dec4a80753953ad760a5162acfb9e6"],
    ]),
  },
  ProteinVanillaBlend: {
    title: "Whey Protein Shake Vanilla 2lb",
    panels: panels("SL_WheyShake_2LB_Vanilla", [
      ["Left", "93ba128dbad98dc3941d1ebec1a23c73c9b92961bfb467c2c79193d3a2626da0"],
      ["Right", "464cb6eae3fb4fe5e183ebc651d48cea7732ace7a44f5b9bbbb7a64dc6c080fe"],
    ]),
  },
  ProteinChocolateBlend: {
    title: "Whey Protein Shake Chocolate 2lb",
    panels: panels("SL_WheyShake_2LB_Chocolate", [
      ["Left", "2c6f879da810d9d7ce222f6de141157abc078c51970d96a57d1e05d146220532"],
      ["Right", "d3420e330db4d05db36243a7ea1ef0971f6fbfbdf0df0a6d45093d83a38575d4"],
    ]),
  },
};

// Shopify cache-busting queries may change without changing panel identity.
export function panelIdentity(url) {
  const parsed = new URL(url.startsWith("//") ? `https:${url}` : url);
  return `${parsed.origin}${parsed.pathname}`;
}
