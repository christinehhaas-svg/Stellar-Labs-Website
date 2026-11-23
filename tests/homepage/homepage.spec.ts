import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { inspectHomepage } from "./inspect-homepage";
import { approvedCopy, approvedReviewNavigation } from "./approved-copy";

const logoHash =
  "88c1504d444f479a7e28ac2e8bb4b66c010bffc2feac480cb3da3d6a83aaaebb";
const surfaces = [
  { name: "review", path: "/" },
  { name: "canvas", path: "/__mockup/preview/stellar-labs/Homepage" },
];
const scenarios = [
  ...[320, 360, 390, 768, 1024, 1440].map((width) => ({
    name: `approved header/hero at ${width}px`,
    widths: [width],
  })),
  {
    name: "loaded mobile homepage resizes to desktop and back",
    widths: [390, 767, 768, 1024, 1440, 768, 767, 390],
  },
  {
    name: "loaded desktop homepage resizes to mobile and back",
    widths: [1440, 1024, 768, 767, 390, 767, 768, 1440],
  },
];

for (const surface of surfaces) {
  for (const scenario of scenarios) {
    test(`${surface.name}: ${scenario.name}`, async ({ page, baseURL }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: scenario.widths[0], height: 1000 });
      await page.goto(surface.path);
      await expect
        .poll(
          async () => {
            try {
              const state = await inspectHomepage(page);
              return state.ready && state.photo.loaded && state.logo.loaded;
            } catch {
              return false;
            }
          },
          {
            message:
              "Host initializer and local image assets must finish loading",
          },
        )
        .toBe(true);
      // Font loading changes headline/navigation geometry. Wait from the host,
      // not through a frame execution context in the script-disabled snapshot.
      await page.evaluate(async () => {
        await document.querySelector<HTMLIFrameElement>(
          ".stellar-current-snapshot iframe",
        )!.contentDocument!.fonts.ready;
      });
      // Keep references in the host execution context. A reload (including an
      // iframe-only reload) must not silently turn a transition into a fresh load.
      const documents = await page.evaluateHandle(() => ({
        host: document,
        snapshot: document.querySelector<HTMLIFrameElement>(
          ".stellar-current-snapshot iframe",
        )!.contentDocument,
      }));
      for (const [index, width] of scenario.widths.entries()) {
        await test.step(`viewport ${index + 1}: ${width}px`, async () => {
          await page.setViewportSize({ width, height: 1000 });
          await expect
            .poll(async () => (await inspectHomepage(page)).viewport.width, {
              message: "Snapshot viewport must follow the resized host",
            })
            .toBe(width);
          // Allow responsive layout to paint, using only the host document.
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
          expect(
            await page.evaluate(
              (saved) =>
                saved.host === document &&
                saved.snapshot ===
                  document.querySelector<HTMLIFrameElement>(
                    ".stellar-current-snapshot iframe",
                  )!.contentDocument,
              documents,
            ),
            "Resizing must preserve the already-loaded host and snapshot documents",
          ).toBe(true);
          const state = await inspectHomepage(page);
          await test
            .info()
            .attach(`rendered-homepage-${index + 1}-${width}px`, {
              body: JSON.stringify(state, null, 2),
              contentType: "application/json",
            });

          expect(state.sandbox).toEqual([
            "allow-popups",
            "allow-popups-to-escape-sandbox",
            "allow-same-origin",
            ...(surface.name === "review"
              ? ["allow-top-navigation-by-user-activation"]
              : []),
          ]);
          // Replit's preview proxy injects its own devtools tag, still blocked by
          // the sandbox. No inline or captured Shopify runtime may be restored.
          expect(
            state.scripts.filter(
              (script) =>
                script.src !== "/__replco/static/devtools/injected.js" ||
                script.text,
            ),
            "Captured Shopify scripts must remain removed",
          ).toEqual([]);
          expect(state.host.frameVisible).toBe(true);
          expect(
            state.host.scrollWidth,
            "Host must not overflow horizontally",
          ).toBeLessThanOrEqual(width + 1);
          expect(state.viewport.width).toBe(width);
          expect(
            state.scrollWidth,
            "Snapshot must not overflow horizontally",
          ).toBeLessThanOrEqual(width + 1);

          // Nonzero outer dimensions alone missed the original bug: every nested
          // captured-theme wrapper must also retain the full hero height.
          for (const box of [state.header, state.hero, ...state.layers]) {
            expect(
              box.visible,
              `Invisible header/hero layer: ${JSON.stringify(box)}`,
            ).toBe(true);
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
          }
          expect(
            state.hero.height,
            "Approved hero must not collapse",
          ).toBeGreaterThanOrEqual(320);
          for (const layer of state.layers)
            expect(layer.height).toBeGreaterThanOrEqual(state.hero.height - 1);

          for (const box of [
            state.headline,
            state.subtitle,
            state.cta,
            state.photo,
          ]) {
            expect(box.visible).toBe(true);
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
            expect(box.x).toBeGreaterThanOrEqual(state.hero.x - 1);
            expect(
              box.right,
              "Hero content must not be clipped horizontally",
            ).toBeLessThanOrEqual(state.hero.right + 1);
            expect(box.y).toBeGreaterThanOrEqual(state.hero.y - 1);
            expect(
              box.bottom,
              "Hero content must not be clipped vertically",
            ).toBeLessThanOrEqual(state.heroBottom + 1);
          }
          expect(state.headline.text).toBe("LEAN NUTRITION");
          // Merchant confirmed the updated subtitle; keep this literal independent
          // of source copy so an unapproved copy change still fails the check.
          expect(state.subtitle.text).toBe(approvedCopy.subtitle.join(" "));
          expect(state.subtitle.align).toBe("left");
          expect(
            Math.abs(state.subtitle.x - state.subtitle.headlineLeft),
          ).toBeLessThanOrEqual(1);
          expect(state.cta.text).toBe("SHOP ALL PRODUCTS");
          expect(state.photo.src).toContain(
            "/stellar-current/assets/stellar-homepage-approved-photo.webp",
          );
          expect(state.photo.objectFit).toBe("contain");
          if (width < 768) {
            expect(
              state.photo.y,
              "The complete product image stays below the mobile hero copy",
            ).toBeGreaterThanOrEqual(state.subtitle.bottom);
          }
          expect(state.logo.visible).toBe(true);
          expect(state.logo.src).toContain(
            "/stellar-current/assets/d0e3e00a06012d0d.png",
          );
          expect(state.logo.filter).toBe("none");
          expect(state.logo.transform).toBe("none");
          expect(state.logo.width / state.logo.height).toBeCloseTo(
            state.logo.naturalWidth / state.logo.naturalHeight,
            1,
          );
          const logoResponse = await page.request.get(state.logo.src);
          expect(logoResponse.ok()).toBe(true);
          expect(
            createHash("sha256")
              .update(await logoResponse.body())
              .digest("hex"),
            "Served logo bytes must match the unchanged approved artwork",
          ).toBe(logoHash);

          const visibleHeader = state.headerLinks.filter(
            (link) => link.visible,
          );
          expect(visibleHeader.map((link) => link.text)).toEqual(width < 768 ? [] : approvedReviewNavigation);
          expect(state.categoryLinks.map((link) => link.text)).toEqual([
            "Whey Proteins",
            "Vegan Protein",
            "Electrolytes",
            "Supplements",
          ]);
          for (const link of [...visibleHeader, ...state.categoryLinks]) {
            expect(
              link.visible,
              `${link.text} must be rendered, not just present in HTML`,
            ).toBe(true);
            expect(link.x).toBeGreaterThanOrEqual(0);
            expect(link.right).toBeLessThanOrEqual(width + 1);
            expect(link.bottom).toBeLessThanOrEqual(state.viewport.height);
          }
          expect(state.supplements.length).toBeGreaterThanOrEqual(2);
          for (const link of state.supplements) {
            expect(new URL(link.href).origin).toBe(new URL(baseURL!).origin);
            expect(new URL(link.href).pathname).toBe("/supplements");
            expect(link.target).toBe("_parent");
          }
          // A real click verifies the parent-owned handler, rather than relying on
          // href inspection or enabling scripts/top-navigation inside the capture.
          const destination = new URL("/supplements", baseURL!).href;
          const keepHomepageLoaded = index < scenario.widths.length - 1;
          // Abort only the destination navigation on intermediate steps, after
          // observing its real main-frame request. Going back or reloading here
          // would discard the responsive state that this test is meant to cover.
          const intercept = async (route: import("@playwright/test").Route) => {
            if (
              route.request().isNavigationRequest() &&
              route.request().frame() === page.mainFrame()
            ) {
              await route.abort("aborted");
            } else {
              await route.continue();
            }
          };
          if (keepHomepageLoaded) await page.route(destination, intercept);
          const navigation = page.waitForRequest(
            (request) =>
              request.isNavigationRequest() &&
              request.frame() === page.mainFrame(),
          );
          if (width < 768) {
            await page.locator(".stellar-current-snapshot iframe").contentFrame()
              .locator(".stellar-shop-navigation__menu > summary").click();
          }
          await page
            .locator(".stellar-current-snapshot iframe")
            .contentFrame()
            .locator("#header-component .stellar-shop-navigation__links a")
            .filter({ hasText: /^Supplements$/ })
            .click({ noWaitAfter: true });
          const request = await navigation;
          expect(
            request.url(),
            "Supplements must navigate to the local review after resizing",
          ).toBe(destination);
          if (keepHomepageLoaded) {
            await request.response(); // Wait until the intercepted navigation is aborted.
            await page.unroute(destination, intercept);
            await expect(page).toHaveURL(new URL(surface.path, baseURL!).href);
            if (width < 768) {
              await page.locator(".stellar-current-snapshot iframe").contentFrame()
                .locator(".stellar-shop-navigation__menu > summary").click();
            }
            expect(
              await page.evaluate(
                (saved) =>
                  saved.host === document &&
                  saved.snapshot ===
                    document.querySelector<HTMLIFrameElement>(
                      ".stellar-current-snapshot iframe",
                    )!.contentDocument,
                documents,
              ),
              "Routing probe must leave the loaded homepage intact",
            ).toBe(true);
          } else {
            await expect(page).toHaveURL(destination);
          }
        });
      }
      await documents.dispose();
    });
  }
}
