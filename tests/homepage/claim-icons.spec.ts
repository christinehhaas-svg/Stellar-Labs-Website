import { expect, test } from "@playwright/test";

// Independent approval fixture: do not import expected copy or icon identities
// from the production initializer being checked.
const labels = [
  "Non-GMO",
  "Certified Gluten-Free",
  "Easy-to-Digest Ingredients",
  "rBGH-Free Whey",
];
const stomachPaths = [
  "M13 4v7c0 3 2 5 5 5 2 0 3-2 3-4 0-3 2-4 4-2 3 3 4 9 1 13-3 5-10 6-14 3l-3-3c-2-2-4-1-4 2v3",
  "M17 4v6c0 1 1 2 2 2M13 26c-3-3-5-4-8-2",
];

for (const surface of [
  {
    name: "review",
    path: "/",
    module: "/src/pages/stellar/Homepage.tsx",
    corn: "/review-assets/stellar-current/assets/b1f703f6d4d0d5a8.svg",
    gluten: "/review-assets/stellar-current/assets/702fdffe87ab02f0.svg",
    sandbox: "allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation",
  },
  {
    name: "Canvas",
    path: "/__mockup/preview/stellar-labs/Homepage",
    module: "/__mockup/src/components/mockups/stellar-labs/Homepage.tsx",
    corn: "/__mockup/stellar-current/assets/b1f703f6d4d0d5a8.svg",
    gluten: "/__mockup/stellar-current/assets/702fdffe87ab02f0.svg",
    sandbox: "allow-same-origin allow-popups allow-popups-to-escape-sandbox",
  },
]) {
  test(`${surface.name} keeps claim artwork paired through complete repeated initialization`, async ({ page }) => {
    await page.goto(surface.path);
    await expect(page.locator(".stellar-current-snapshot iframe")).toHaveAttribute("sandbox", surface.sandbox);
    // Wait in the host: captured scripts must remain disabled in the frame.
    await expect.poll(() => page.evaluate(() =>
      document.querySelector<HTMLIFrameElement>(".stellar-current-snapshot iframe")
        ?.contentDocument?.querySelector(".stellar-callout-row")
        ?.getAttribute("data-stellar-claim-icons-mapped"),
    )).toBe("true");

    const result = await page.evaluate(async ({ modulePath }) => {
      // Exercise the real initializer without invoking a hook-based component
      // outside React. The snapshot remains script-disabled.
      const { initializeSnapshot } = await import(/* @vite-ignore */ modulePath);
      const iframe = document.querySelector<HTMLIFrameElement>(".stellar-current-snapshot iframe")!;
      const response = await fetch(iframe.src);
      if (!response.ok) throw new Error(`Snapshot unavailable: ${response.status}`);
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const original = [...doc.querySelectorAll(".stellar-callout")];
      const stomachPaths = [...original[0].querySelectorAll("svg path")].map(node => node.getAttribute("d"));
      const person = original[4].querySelector("svg")!.outerHTML;
      const frame = { contentDocument: doc, contentWindow: window };
      const inspect = (doc: Document) => ({
        labels: [...doc.querySelectorAll(".stellar-callout:not([hidden])")].map(node => node.querySelector("span,p")?.textContent),
        icons: [...doc.querySelectorAll(".stellar-callout:not([hidden])")].map(node => {
          const icon = node.querySelector("svg, img")!;
          return {
            count: node.querySelectorAll("svg, img").length,
            tag: icon.tagName.toLowerCase(),
            meaning: icon.getAttribute("data-stellar-icon"),
            src: icon.getAttribute("src"),
            paths: [...icon.querySelectorAll("path")].map(path => path.getAttribute("d")),
            html: icon.outerHTML,
          };
        }),
        noteCount: doc.querySelectorAll("#stellar-outline-claims-note").length,
        noteChildren: doc.querySelector("#stellar-outline-claims-note")!.children.length,
        medicalNote: doc.querySelector("[data-stellar-glp1-note]")?.textContent,
        disclaimer: doc.querySelector("#stellar-outline-claims-note small")?.textContent ?? "",
        noteTag: doc.querySelector("#stellar-outline-claims-note small")?.tagName.toLowerCase() ?? "",
        links: [...doc.querySelectorAll("#stellar-outline-claims-note a")].map(link => ({
          text: link.textContent, href: link.getAttribute("href"), target: link.getAttribute("target"),
        })),
        styleCount: doc.querySelectorAll("#stellar-single-line-claims").length,
        marker: doc.querySelector(".stellar-callout-row")!.getAttribute("data-stellar-claim-icons-mapped"),
        // The merchant removed this claim after the original icon approval.
        // Keep its empty slot so restoration cannot shift the other artwork.
        retiredSlot: {
          hidden: doc.querySelectorAll<HTMLElement>(".stellar-callout")[1].hidden,
          display: doc.querySelectorAll<HTMLElement>(".stellar-callout")[1].style.getPropertyValue("display"),
          children: doc.querySelectorAll(".stellar-callout")[1].childNodes.length,
        },
        buildingCount: doc.querySelectorAll('[data-stellar-icon="building"]').length,
        hasFacilityClaim: [...doc.querySelectorAll(".stellar-callout")].some(node => /NSF|GMP/i.test(node.textContent ?? "")),
      });
      const passes = [];
      for (let pass = 0; pass < 3; pass++) {
        initializeSnapshot(modulePath.startsWith("/__mockup/") ? { currentTarget: frame } : frame);
        passes.push(inspect(doc));
      }
      return {
        stomachPaths, person, passes,
        mounted: inspect(iframe.contentDocument!),
        sandbox: iframe.getAttribute("sandbox"),
      };
    }, { modulePath: surface.module });

    expect(result.sandbox).toBe(surface.sandbox);
    expect(result.stomachPaths).toEqual(stomachPaths);
    const first = result.passes[0];
    const states = [
      ...result.passes.map((state, index) => ({ name: `initialization ${index + 1}`, state })),
      { name: "mounted preview", state: result.mounted },
    ];
    for (const { name, state } of states) {
      expect(state.labels, `${name}: all approved claims`).toEqual(labels);
      expect(state.icons.map(icon => icon.count)).toEqual([1, 1, 1, 1]);
      expect(state.icons.map(icon => icon.tag)).toEqual(["img", "img", "svg", "img"]);
      expect(state.icons.map(icon => icon.meaning)).toEqual(["corn", "gluten-free", "stomach", "rbgh-whey"]);
      expect(state.icons[0].src).toBe(surface.corn);
      expect(state.icons[1].src).toBe(surface.gluten);
      expect(state.icons[2].paths).toEqual(stomachPaths);
      expect(state.icons[3].meaning).toBe("rbgh-whey");
      expect(state.icons[3].tag).toBe("img");
      expect(state.retiredSlot).toEqual({ hidden: true, display: "none", children: 0 });
      expect(state.buildingCount).toBe(0);
      expect(state.hasFacilityClaim).toBe(false);
      expect(state.noteCount).toBe(1);
      expect(state.noteChildren).toBe(1);
      // Generic medical advice is retained with product warnings, not repeated
      // beside the homepage's single ingredient-specific footnote.
      expect(state.medicalNote).toBeUndefined();
      expect(state.disclaimer).toBe("");
      expect(state.noteTag).toBe("");
      expect(state.links).toEqual([{
        text: "Complete PDF product information",
        href: "/product-information",
        target: "_parent",
      }]);
      expect(state.styleCount).toBe(1);
      expect(state.marker).toBe("true");
      expect(state, `${name} must match the first initialization`).toEqual(first);
    }
  });
}
