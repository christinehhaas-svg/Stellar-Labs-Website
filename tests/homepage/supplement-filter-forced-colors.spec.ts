import { expect, test, type Locator, type Page } from "@playwright/test";

const previewSandbox = "allow-scripts allow-same-origin allow-forms allow-popups";
const snapshotSandbox = "allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";
const filters = [
  { key: "daily", label: "Daily Wellness", products: ["womens-multi", "mens-multivitamin", "omega-3"] },
  { key: "digestion", label: "Digestive Support", products: ["probiotic-40", "digestive-enzyme", "magnesium-complex"] },
  { key: "muscle-joint", label: "Muscle and Joint", products: ["magnesium-complex", "turmeric-w-bioperine"] },
  { key: "all", label: "All supplements", products: [
    "womens-multi", "mens-multivitamin", "probiotic-40", "digestive-enzyme",
    "omega-3", "magnesium-complex", "turmeric-w-bioperine",
  ] },
] as const;

function contrastRatio(first: string, second: string) {
  const channels = (color: string) => {
    expect(color, "Contrast checks require resolved RGB colors").toMatch(/^rgba?\(/);
    return color.match(/[\d.]+/g)!.map(Number);
  };
  const backdrop = channels(second);
  expect(backdrop[3] ?? 1, "Contrast backdrop must be opaque").toBe(1);
  const foreground = channels(first);
  // Chromium's forced-color focus ring can be translucent. Measure the
  // composited stroke instead of discarding its alpha channel.
  const alpha = foreground[3] ?? 1;
  const luminance = (values: number[]) => {
    const [r, g, b] = values.slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };
  const a = luminance(foreground.slice(0, 3).map((value, index) => value * alpha + backdrop[index] * (1 - alpha)));
  const b = luminance(backdrop);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function inspectFilters(embed: Locator) {
  // Run only in the script-enabled ancestor, never in the captured document.
  return embed.evaluate((iframe: HTMLIFrameElement) => {
    const host = iframe.contentDocument!;
    const capture = host.querySelector<HTMLIFrameElement>(".stellar-supplements-frame")!;
    const doc = capture.contentDocument!;
    const win = doc.defaultView!;
    const background = (element: Element | null): string => {
      for (; element; element = element.parentElement) {
        const color = win.getComputedStyle(element).backgroundColor;
        if (color === "transparent" || /^rgba\([^)]*, 0\)$/.test(color)) continue;
        const values = color.match(/[\d.]+/g)!.map(Number);
        if ((values[3] ?? 1) === 1) return color;
        const behind = background(element.parentElement).match(/[\d.]+/g)!.map(Number);
        return `rgb(${values.slice(0, 3).map((value, index) =>
          Math.round(value * values[3] + behind[index] * (1 - values[3]))).join(", ")})`;
      }
      // Resolve the browser's canvas color rather than treating transparent as black.
      const probe = doc.createElement("span");
      probe.style.backgroundColor = "Canvas";
      doc.body.append(probe);
      const color = win.getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    return {
      forcedColors: win.matchMedia("(forced-colors: active)").matches,
      location: host.location.pathname + host.location.search,
      captureUrl: capture.contentWindow!.location.href,
      products: [...doc.querySelectorAll<HTMLElement>(".sl-product")]
        .map(card => card.dataset.testid!.replace("card-product-", "")),
      controls: [...doc.querySelectorAll<HTMLButtonElement>(
        '.sl-supplement-category-buttons button, .sl-supplement-filter-reset',
      )].map(control => {
        const style = win.getComputedStyle(control);
        const rect = control.getBoundingClientRect();
        const focused = iframe.ownerDocument.activeElement === iframe &&
          host.activeElement === capture && doc.activeElement === control;
        const clipping: string[] = [];
        if (focused) {
          const extent = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset));
          const ring = { left: rect.left - extent, right: rect.right + extent,
            top: rect.top - extent, bottom: rect.bottom + extent };
          if (ring.left < 0 || ring.right > win.innerWidth || ring.top < 0 || ring.bottom > win.innerHeight) {
            clipping.push("focus ring outside viewport");
          }
          for (let ancestor = control.parentElement; ancestor; ancestor = ancestor.parentElement) {
            const bounds = ancestor.getBoundingClientRect();
            const ancestorStyle = win.getComputedStyle(ancestor);
            if (/(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowX) &&
              (ring.left < bounds.left - 1 || ring.right > bounds.right + 1)) clipping.push("focus ring horizontally clipped");
            if (/(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowY) &&
              (ring.top < bounds.top - 1 || ring.bottom > bounds.bottom + 1)) clipping.push("focus ring vertically clipped");
          }
        }
        let lines = 0;
        // Check text ranges, not only the button box, to catch cropped labels.
        const walker = doc.createTreeWalker(control, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = doc.createRange();
          range.selectNodeContents(walker.currentNode);
          for (const line of range.getClientRects()) {
            if (!line.width || !line.height) continue;
            lines++;
            if (line.left < rect.left - 1 || line.right > rect.right + 1 ||
              line.top < rect.top - 1 || line.bottom > rect.bottom + 1) clipping.push("outside button");
            if (focused) {
              if (line.left < 0 || line.right > win.innerWidth ||
                line.top < 0 || line.bottom > win.innerHeight) clipping.push("outside viewport");
              for (const fraction of [0.1, 0.5, 0.9]) {
                const hit = doc.elementFromPoint(line.left + line.width * fraction, line.top + line.height / 2);
                if (!hit || !control.contains(hit)) clipping.push("covered label");
              }
            }
          }
        }
        return {
          key: control.dataset.testid!.replace("filter-", ""),
          label: control.textContent!.trim(), pressed: control.getAttribute("aria-pressed"),
          focused, focusVisible: control.matches(":focus-visible"),
          outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth),
          outline: style.outlineColor, surround: background(control.parentElement),
          background: background(control), color: style.color, weight: Number(style.fontWeight),
          borderWidth: parseFloat(style.borderTopWidth), borderStyle: style.borderTopStyle,
          borderColor: style.borderTopColor, lines, clipping,
        };
      }),
    };
  });
}

async function tabToFilter(page: Page, embed: Locator, key: string) {
  // Earn focus through native Tab traversal across both iframe boundaries.
  for (let tabs = 0; tabs < 60; tabs++) {
    await page.keyboard.press("Tab");
    if ((await inspectFilters(embed)).controls.some(control => control.key === key && control.focused)) return;
  }
  throw new Error(`Keyboard did not reach supplement filter ${key}`);
}

async function assertAppearance(embed: Locator, selected: string, focused: string) {
  // Native keyboard scrolling in the captured theme can be smooth.
  await expect.poll(async () => (await inspectFilters(embed)).controls
    .find(control => control.key === focused)?.clipping).toEqual([]);
  const state = await inspectFilters(embed);
  expect(state.forcedColors, "Forced colors must reach the nested collection").toBe(true);
  expect(state.controls.map(control => control.label)).toEqual(filters.map(filter => filter.label));
  expect(state.controls.filter(control => control.pressed === "true").map(control => control.key)).toEqual([selected]);
  const active = state.controls.find(control => control.key === selected)!;
  for (const control of state.controls) {
    expect(control.pressed).toBe(control.key === selected ? "true" : "false");
    expect(control.lines, `${control.label} must paint text`).toBeGreaterThan(0);
    expect(control.clipping, `${control.label} must not crop its text`).toEqual([]);
    expect(contrastRatio(control.color, control.background), `${control.label} text contrast`).toBeGreaterThanOrEqual(4.5);
    if (control.key !== "all") {
      expect(control.borderWidth).toBeGreaterThan(0);
      expect(control.borderStyle).not.toMatch(/^(none|hidden)$/);
      expect(contrastRatio(control.borderColor, control.surround), `${control.label} visible box`).toBeGreaterThanOrEqual(3);
    }
    if (control.key === focused) {
      expect(control.focused).toBe(true);
      expect(control.focusVisible).toBe(true);
      expect(control.outlineStyle).not.toMatch(/^(none|hidden)$/);
      expect(control.outlineWidth).toBeGreaterThanOrEqual(2);
      expect(contrastRatio(control.outline, control.surround), `${control.label} focus contrast`).toBeGreaterThanOrEqual(3);
    }
  }
  if (selected === "all") {
    expect(active.weight, "The lightweight reset must visibly indicate selection").toBeGreaterThanOrEqual(700);
  } else {
    for (const inactive of state.controls.filter(control => control.key !== selected && control.key !== "all")) {
      expect(contrastRatio(active.background, inactive.background),
        "Selected fill must remain distinct from inactive and keyboard-focused filters").toBeGreaterThanOrEqual(3);
    }
    expect(state.controls.find(control => control.key === "all")!.weight).toBeLessThan(700);
  }
}

for (const width of [390, 1440]) {
  for (const surface of ["review", "Canvas"] as const) {
    test(`${surface} ${width}px: forced-colors collection filters retain focus, selection and local destinations`, async ({ page, context, browserName }) => {
      test.skip(browserName !== "chromium", "Forced-colors collection coverage is Chromium-only");
      await page.emulateMedia({ forcedColors: "active" });
      await page.setViewportSize({ width, height: 1000 });
      const start = surface === "review" ? "/supplements" : "/__mockup/preview/stellar-labs/Supplements";
      await page.route("**/__test-supplement-filter-contrast", route => route.fulfill({
        contentType: "text/html",
        body: `<style>html,body{margin:0;height:100%}iframe{display:block;width:100%;height:100%;border:0}</style>
          <iframe title="Embedded website" sandbox="${previewSandbox}" src="${start}"></iframe>`,
      }));
      const escapedRequests: string[] = [];
      await context.route("**/*", async route => {
        const request = route.request();
        if ((request.isNavigationRequest() &&
          new URL(request.url()).origin !== new URL(test.info().project.use.baseURL!).origin) ||
          !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
          escapedRequests.push(`${request.method()} ${request.url()}`);
          await route.abort();
        } else await route.continue();
      });
      await page.goto("/__test-supplement-filter-contrast", { waitUntil: "domcontentloaded" });
      const outerUrl = page.url();
      const embed = page.locator('iframe[title="Embedded website"]');
      const host = page.frameLocator('iframe[title="Embedded website"]');
      const capture = host.locator(".stellar-supplements-frame");
      const snapshot = host.frameLocator(".stellar-supplements-frame");
      await expect(snapshot.locator(".sl-collection-heading h1")).toHaveText("SUPPLEMENTS");
      await expect(snapshot.locator(".sl-product")).toHaveCount(7);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
      const initial = await inspectFilters(embed);
      let selected = "all";
      for (const filter of filters) {
        const control = snapshot.getByTestId(`filter-${filter.key}`);
        await tabToFilter(page, embed, filter.key);
        // Check the previous selection while focus is on a different control.
        await assertAppearance(embed, selected, filter.key);
        await page.keyboard.press("Enter");
        selected = filter.key;
        await expect(control).toHaveAttribute("aria-pressed", "true");
        await assertAppearance(embed, selected, filter.key);
        await expect.poll(async () => (await inspectFilters(embed)).products).toEqual([...filter.products]);
        const state = await inspectFilters(embed);
        expect(state.location, "Filters update products without navigating the host").toBe(start);
        expect(state.captureUrl, "Filtering must not navigate the script-disabled snapshot").toBe(initial.captureUrl);
        await expect(page).toHaveURL(outerUrl);
      }
      // The same product-details destination remains keyboard-usable after reset.
      const details = snapshot.getByTestId("button-details-womens-multi");
      await expect(details).toHaveAttribute("href", "/supplement-details?product=womens-multi");
      await expect(details).toHaveAttribute("target", "_parent");
      await page.keyboard.press("Tab"); // First product image button.
      await page.keyboard.press("Tab"); // Its native Product details link.
      expect(await embed.evaluate((iframe: HTMLIFrameElement) => iframe.contentDocument!
        .querySelector<HTMLIFrameElement>(".stellar-supplements-frame")!.contentDocument!
        .activeElement?.getAttribute("data-testid"))).toBe("button-details-womens-multi");
      await page.keyboard.press("Enter");
      await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) => {
        const url = new URL(iframe.contentWindow!.location.href);
        return url.pathname + url.search;
      })).toBe("/supplement-details?product=womens-multi");
      await expect(host.frameLocator('iframe[title="Stellar Labs supplement product"]')
        .locator("#supplements-app-mount h1")).toHaveText("Women's Daily Multivitamin");
      await expect(page).toHaveURL(outerUrl);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      expect(context.pages(), "Navigation stays inside the host, not a popup or the Canvas board").toHaveLength(1);
      expect(escapedRequests, "No external navigation or commerce mutations").toEqual([]);
    });
  }
}
