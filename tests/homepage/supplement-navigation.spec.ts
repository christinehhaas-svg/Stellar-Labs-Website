import { expect, test, type FrameLocator, type Locator, type Page } from "@playwright/test";

// Current active identities and approved price, independent of the older
// purchase-content fixtures (which include historical artwork/pricing).
const supplements = [
  { id: "womens-multi", name: "Women's Daily Multivitamin" },
  { id: "mens-multivitamin", name: "Men's Daily Multivitamin" },
  { id: "probiotic-40", name: "Probiotic" },
  { id: "digestive-enzyme", name: "Digestive Enzyme" },
  { id: "omega-3", name: "Omega 3 Fish Oil" },
  { id: "magnesium-complex", name: "Magnesium Complex" },
  { id: "turmeric-w-bioperine", name: "Turmeric Curcumin" },
] as const;

const previewSandbox = "allow-scripts allow-same-origin allow-forms allow-popups";
const snapshotSandbox = "allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";
const categories = [
  ["Whey Protein", "/?category=100-isolate-whey-protein"],
  ["Vegan Protein", "/?category=vegan-plant-protein"],
  ["Electrolytes", "/?category=electrolyte"],
  ["Supplements", "/supplements"],
  ["Recipes", "/recipes"],
  ["Shop All", "/shop"],
] as const;

async function hostLocation(embed: Locator) {
  // Read from the stable outer document: evaluating inside a navigating child
  // can lose its execution context between resolving body and running evaluate.
  return embed.evaluate((iframe: HTMLIFrameElement) => {
    const url = new URL(iframe.contentWindow!.location.href);
    return url.pathname + url.search;
  });
}

async function headerFocus(embed: Locator, label: string) {
  // Inspect both same-origin frame boundaries from the script-enabled outer
  // document. Never evaluate in, or enable scripts in, the captured snapshot.
  return embed.evaluate((iframe: HTMLIFrameElement, label) => {
    const host = iframe.contentDocument;
    const capture = host?.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]');
    const doc = capture?.contentDocument;
    const active = doc?.activeElement;
    const inHeader = active?.closest("#header-component .stellar-shop-navigation");
    const name = active?.getAttribute("aria-label") || active?.textContent?.trim();
    if (iframe.ownerDocument.activeElement !== iframe || host?.activeElement !== capture ||
      !inHeader || name !== label || !active) return null;
    const style = doc!.defaultView!.getComputedStyle(active);
    return {
      focusVisible: active.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
    };
  }, label);
}

async function expectVisibleHeaderFocus(embed: Locator, label: string, control: Locator) {
  const focus = await headerFocus(embed, label);
  expect(focus, `Keyboard focus must reach ${label} through both frames`).not.toBeNull();
  expect(focus!.focusVisible, `${label} must match :focus-visible`).toBe(true);
  expect(focus!.outlineStyle, `${label} must have a visible focus outline`).not.toMatch(/^(none|hidden)$/);
  expect(focus!.outlineWidth).toBeGreaterThan(0);
  expect(focus!.outlineColor).not.toMatch(/^(transparent|rgba\([^)]*, 0\))$/);
  await expect(control).toBeVisible();
  await expect(control).toBeInViewport();
}

async function tabToHeaderControl(page: Page, embed: Locator, label: string, control: Locator) {
  // All focus is earned by real Tab presses; no focus(), clicks, dispatchEvent,
  // or programmatic disclosure changes are allowed in these keyboard cases.
  for (let tabs = 0; tabs < 40; tabs++) {
    await page.keyboard.press("Tab");
    if (await headerFocus(embed, label)) {
      await expectVisibleHeaderFocus(embed, label, control);
      return;
    }
  }
  throw new Error(`Tab did not reach supplement header control: ${label}`);
}

function contrastRatio(first: string, second: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function expectForcedColorsControl(embed: Locator, label: string, forcedColors = true) {
  // Observe the script-disabled capture only from its script-enabled ancestor.
  // Resolve the painted background through transparent ancestors: comparing
  // against a transparent anchor alone would miss an invisible focus ring.
  const appearance = await embed.evaluate((iframe: HTMLIFrameElement, label) => {
    const doc = iframe.contentDocument!
      .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!.contentDocument!;
    const win = doc.defaultView!;
    const control = doc.activeElement as HTMLElement;
    const style = win.getComputedStyle(control);
    let background = "";
    for (let element: HTMLElement | null = control; element; element = element.parentElement) {
      const color = win.getComputedStyle(element).backgroundColor;
      if (color !== "transparent" && !/^rgba\([^)]*, 0\)$/.test(color)) {
        background = color;
        break;
      }
    }
    const icon = win.getComputedStyle(control, "::before");
    return {
      active: win.matchMedia("(forced-colors: active)").matches,
      name: control.getAttribute("aria-label") || control.textContent?.trim(),
      background,
      color: style.color,
      outline: style.outlineColor,
      icon: label === "Shop menu" ? {
        content: icon.content,
        width: parseFloat(icon.width),
        height: parseFloat(icon.height),
        topWidth: parseFloat(icon.borderTopWidth),
        bottomWidth: parseFloat(icon.borderBottomWidth),
        topStyle: icon.borderTopStyle,
        bottomStyle: icon.borderBottomStyle,
        topColor: icon.borderTopColor,
        bottomColor: icon.borderBottomColor,
      } : null,
    };
  }, label);
  expect(appearance.active, "Color preference must reach the nested snapshot").toBe(forcedColors);
  expect(appearance.name).toBe(label);
  expect(appearance.background, "Resolve an opaque painted background").toMatch(/^rgb\(/);
  expect(contrastRatio(appearance.outline, appearance.background),
    `${label} focus outline must contrast with its background`).toBeGreaterThanOrEqual(3);
  if (appearance.icon) {
    // Gradients/box shadows can disappear in forced colors. The named summary
    // must retain its real border strokes, not merely a nonempty pseudo-element.
    expect(appearance.icon.content).not.toMatch(/^(none|normal)$/);
    expect(appearance.icon.width).toBeGreaterThan(0);
    expect(appearance.icon.height).toBeGreaterThan(0);
    expect(appearance.icon.topWidth).toBeGreaterThan(0);
    expect(appearance.icon.bottomWidth).toBeGreaterThan(0);
    expect(appearance.icon.topStyle).not.toMatch(/^(none|hidden)$/);
    expect(appearance.icon.bottomStyle).not.toMatch(/^(none|hidden)$/);
    for (const color of [appearance.icon.topColor, appearance.icon.bottomColor]) {
      expect(contrastRatio(color, appearance.background), "Menu icon strokes must remain distinguishable")
        .toBeGreaterThanOrEqual(3);
    }
  } else {
    expect(contrastRatio(appearance.color, appearance.background),
      `${label} text must remain distinguishable`).toBeGreaterThanOrEqual(4.5);
  }
}

for (const { surface, restoredColors, enlargedText, width, changeWhileAway, filteredCategory } of (["review", "Canvas"] as const).flatMap(surface => [
  ...(["active", "none"] as const).flatMap(restoredColors =>
    [false, true].map(changeWhileAway => ({ surface, restoredColors, enlargedText: false, width: 390, changeWhileAway, filteredCategory: false }))),
  ...[767, 768].map(width => ({ surface, restoredColors: "none" as const, enlargedText: true, width, changeWhileAway: false, filteredCategory: false })),
  { surface, restoredColors: "none" as const, enlargedText: true, width: 768, changeWhileAway: false, filteredCategory: true },
])) {
  const scenario = changeWhileAway
    ? `supplement menu uses contrast changed while away after native Back (${restoredColors})`
    : `supplement menu keeps focus during live forced-colors changes${enlargedText ? ` at 200% text size (${width}px)` : ` and native Back/Forward (${restoredColors})`}${filteredCategory ? " and activates Vegan Protein" : ""}`;
  test(`${surface}: ${scenario}`, async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Forced-colors regression is Chromium-only");
    await page.emulateMedia({ forcedColors: "none" });
    await page.setViewportSize({ width, height: 1000 });
    const start = surface === "review"
      ? "/supplement-details?product=womens-multi"
      : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
    await page.route("**/__test-supplement-live-colors", route => route.fulfill({
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
    await page.goto("/__test-supplement-live-colors", { waitUntil: "domcontentloaded" });
    const outerUrl = page.url();
    const embed = page.locator('iframe[title="Embedded website"]');
    const host = page.frameLocator('iframe[title="Embedded website"]');
    const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
    const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
    await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
      .toHaveText("Women's Daily Multivitamin");
    const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
    const menu = navigation.locator("details");
    const toggle = menu.locator("summary");
    const link = navigation.getByRole("link", { name: "Shop Lean Nutrition", exact: true });
    const anchors = navigation.locator("a");
    const readLinks = () => anchors.evaluateAll(links => links.map(link => ({
      href: link.getAttribute("href"), target: link.getAttribute("target"),
    })));
    const originalLinks = await readLinks();
    expect(originalLinks).toHaveLength(7);
    expect(originalLinks).toEqual([["Shop Lean Nutrition", "/shop"], ...categories]
      .map(([, href]) => ({ href, target: "_parent" })));
    if (enlargedText) {
      await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
        iframe.contentDocument!.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
          .contentWindow!.innerWidth)).toBe(width);
      const sizes = await doubleSnapshotText(embed);
      expect(sizes).toHaveLength(7);
      for (const { before, after } of sizes) {
        expect(before).toBeGreaterThan(0);
        expect(after).toBeCloseTo(before * 2, 1);
      }
    }
    if (width < 768) {
      await expect(toggle).toHaveAccessibleName("Shop menu");
      await expect(menu).not.toHaveAttribute("open");
      await tabToHeaderControl(page, embed, "Shop menu", toggle);
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open");
    } else {
      // Desktop navigation stays open without interacting with the disclosure.
      await expect(toggle).toBeHidden();
      await expect(menu).toHaveAttribute("open");
      for (const anchor of await anchors.all()) await expect(anchor).toBeVisible();
    }
    await tabToHeaderControl(page, embed, "Shop Lean Nutrition", link);

    const navigations: string[] = [];
    page.on("framenavigated", frame => navigations.push(frame.url()));
    const departureColors = changeWhileAway
      ? restoredColors === "active" ? "none" : "active"
      : restoredColors;
    const colorChanges = departureColors === "active"
      ? ["none", "active", "none", "active"] as const
      : ["none", "active", "none"] as const;
    for (const forcedColors of colorChanges) {
      // Both live changes happen with the SAME link keyboard-focused and the
      // menu open. No reload, click, focus(), or disclosure mutation.
      await page.emulateMedia({ forcedColors });
      await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
        iframe.contentDocument!.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
          .contentWindow!.matchMedia("(forced-colors: active)").matches)).toBe(forcedColors === "active");
      await expect(menu).toHaveAttribute("open");
      await expectVisibleHeaderFocus(embed, "Shop Lean Nutrition", link);
      await expectForcedColorsControl(embed, "Shop Lean Nutrition", forcedColors === "active");
      if (enlargedText) {
        await expectReadableHeaderControl(embed, "Shop Lean Nutrition", true);
        for (const [name] of categories) await expectReadableHeaderControl(embed, name);
      }
      if (width < 768) {
        await page.keyboard.press("Shift+Tab");
        await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
        await expectForcedColorsControl(embed, "Shop menu", forcedColors === "active");
        if (enlargedText) await expectReadableHeaderControl(embed, "Shop menu", true);
        await expect(toggle).toHaveAccessibleName("Shop menu");
        await page.keyboard.press("Tab");
      } else {
        await expect(toggle).toBeHidden();
        for (const [name] of categories) {
          await page.keyboard.press("Tab");
          await expectVisibleHeaderFocus(embed, name, navigation.getByRole("link", { name, exact: true }));
          await expectReadableHeaderControl(embed, name, true);
          await expectForcedColorsControl(embed, name, forcedColors === "active");
        }
        // Return by keyboard so the next live change must preserve the same
        // focused link; do not repair focus after changing the setting.
        for (const _ of categories) await page.keyboard.press("Shift+Tab");
      }
      await expectVisibleHeaderFocus(embed, "Shop Lean Nutrition", link);
      await expect(menu).toHaveAttribute("open");
      expect(await readLinks()).toEqual(originalLinks);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
      await expect.poll(() => hostLocation(embed)).toBe(start);
      await expect(page).toHaveURL(outerUrl);
      expect(navigations, "Changing high contrast must not reload any frame").toEqual([]);
    }
    for (const [name, destination] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
      await expect(navigation.getByRole("link", { name, exact: true })).toHaveAttribute("href", destination);
    }
    await expect(menu).toHaveAttribute("open");
    await expectVisibleHeaderFocus(embed, "Shop Lean Nutrition", link);
    await expectForcedColorsControl(embed, "Shop Lean Nutrition", departureColors === "active");
    const destination = filteredCategory ? "/?category=vegan-plant-protein" : "/shop";
    if (filteredCategory) {
      // Earn category focus only after the complete inactive → active → inactive
      // cycle; reading its href alone would not catch a broken activation.
      const categoryLink = navigation.getByRole("link", { name: "Vegan Protein", exact: true });
      await tabToHeaderControl(page, embed, "Vegan Protein", categoryLink);
      await expectReadableHeaderControl(embed, "Vegan Protein", true);
      await expectForcedColorsControl(embed, "Vegan Protein", false);
      await expect(categoryLink).toHaveAttribute("href", destination);
      await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
    }
    await page.keyboard.press("Enter");
    await expect.poll(() => hostLocation(embed)).toBe(destination);
    await expect(host.locator("main").first()).toBeVisible();
    if (filteredCategory) {
      const collection = host.locator(".stellar-supplements-frame");
      await expect(collection).toHaveAttribute("sandbox", snapshotSandbox);
      await expect(host.frameLocator(".stellar-supplements-frame")
        .getByRole("heading", { level: 1, name: "VEGAN PROTEIN", exact: true })).toBeVisible();
    }
    await expect(page).toHaveURL(outerUrl);
    await expect(embed).toHaveAttribute("sandbox", previewSandbox);
    expect(context.pages(), "Navigation must stay inside the embedded website").toHaveLength(1);
    expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
    // Keep the enlarged-text addition small; the normal-text variants below
    // separately cover both color settings across native Back/Forward navigation.
    if (enlargedText) return;

    if (changeWhileAway) {
      expect(departureColors, "The preference must change AFTER leaving the snapshot").not.toBe(restoredColors);
      await expect(capture).toHaveCount(0);
      navigations.length = 0;
      await page.emulateMedia({ forcedColors: restoredColors });
      await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
        iframe.contentWindow!.matchMedia("(forced-colors: active)").matches))
        .toBe(restoredColors === "active");
      await expect.poll(() => hostLocation(embed)).toBe("/shop");
      await expect(host.locator("main").first()).toBeVisible();
      await expect(page).toHaveURL(outerUrl);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      expect(context.pages(), "Changing contrast while away must not open another page").toHaveLength(1);
      expect(navigations, "Changing contrast on the destination must not reload any frame").toEqual([]);
    }

    // Traverse Chromium's joint session history, not a synthetic goto/reload.
    // Back must restore only the embedded host, in the CURRENT color setting.
    await page.evaluate(() => window.history.back());
    await expect.poll(() => hostLocation(embed)).toBe(start);
    await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
      .toHaveText("Women's Daily Multivitamin");
    await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
      iframe.contentDocument!.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
        .contentWindow!.matchMedia("(forced-colors: active)").matches),
    { message: "Back must use the current preference, not the snapshot's departure preference" })
      .toBe(restoredColors === "active");
    await expect(page).toHaveURL(outerUrl);
    await expect(embed).toHaveAttribute("sandbox", previewSandbox);
    await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
    expect(await readLinks()).toEqual(originalLinks);

    const expectRestoredKeyboardMenu = async () => {
      await expect.poll(() => hostLocation(embed)).toBe(start);
      await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
        .toHaveText("Women's Daily Multivitamin");
      // Native history may restore details open OR closed, and may restore link
      // focus. Observe that state; never reset the disclosure or force focus.
      const restoredOpen = await menu.getAttribute("open") !== null;
      if (await headerFocus(embed, "Shop Lean Nutrition")) {
        await page.keyboard.press("Shift+Tab");
      } else if (!await headerFocus(embed, "Shop menu")) {
        await tabToHeaderControl(page, embed, "Shop menu", toggle);
      }
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
      await expectForcedColorsControl(embed, "Shop menu", restoredColors === "active");
      await expect(toggle).toHaveAccessibleName("Shop menu");
      expect(await menu.getAttribute("open") !== null).toBe(restoredOpen);
      if (!restoredOpen) {
        await expect(link).toBeHidden();
        await page.keyboard.press("Enter");
      }
      await expect(menu).toHaveAttribute("open");
      await page.keyboard.press("Tab");
      await expectVisibleHeaderFocus(embed, "Shop Lean Nutrition", link);
      await expectForcedColorsControl(embed, "Shop Lean Nutrition", restoredColors === "active");
      await page.keyboard.press("Shift+Tab");
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
      await page.keyboard.press("Enter");
      await expect(menu).not.toHaveAttribute("open");
      await expect(link).toBeHidden();
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
      await expectForcedColorsControl(embed, "Shop menu", restoredColors === "active");
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open");
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
      await expectForcedColorsControl(embed, "Shop menu", restoredColors === "active");
      expect(await readLinks()).toEqual(originalLinks);
      await expect.poll(() => hostLocation(embed)).toBe(start);
      await expect(page).toHaveURL(outerUrl);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
      expect(context.pages(), "Restoring and operating the menu must not open another page").toHaveLength(1);
      expect(escapedRequests, "Restoring the menu must not escape to the store or mutate data").toEqual([]);
    };
    await expectRestoredKeyboardMenu();

    // Toggling the native disclosure must not replace/truncate the forward
    // entry. Traverse joint history from the outer page, not a child history
    // shim or page.goForward() waiting for a top-level navigation.
    await page.evaluate(() => window.history.forward());
    await expect.poll(() => hostLocation(embed)).toBe("/shop");
    await expect(host.locator("main").first()).toBeVisible();
    await expect(page).toHaveURL(outerUrl);
    await expect(embed).toHaveAttribute("sandbox", previewSandbox);
    expect(context.pages(), "Forward must restore Shop All inside the embedded website").toHaveLength(1);
    expect(escapedRequests, "Forward must not escape to the store or mutate data").toEqual([]);

    // A second Back must still restore the product and a keyboard-usable menu
    // with its original destinations, targets, permissions, and color setting.
    await page.evaluate(() => window.history.back());
    await expectRestoredKeyboardMenu();

    // Reopening restores the native order, readable labels, and visible focus
    // for every link. Activate a different local destination on this visit.
    for (const name of ["Shop Lean Nutrition", ...categories.map(([name]) => name)]) {
      await page.keyboard.press("Tab");
      await expectVisibleHeaderFocus(embed, name,
        navigation.getByRole("link", { name, exact: true }));
      await expectForcedColorsControl(embed, name, restoredColors === "active");
    }
    for (const name of ["Recipes", "Supplements"]) {
      await page.keyboard.press("Shift+Tab");
      await expectVisibleHeaderFocus(embed, name,
        navigation.getByRole("link", { name, exact: true }));
      await expectForcedColorsControl(embed, name, restoredColors === "active");
    }
    expect(await readLinks()).toEqual(originalLinks);
    await expect(navigation.getByRole("link", { name: "Supplements", exact: true }))
      .toHaveAttribute("href", "/supplements");
    await expect(embed).toHaveAttribute("sandbox", previewSandbox);
    await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
    await expect.poll(() => hostLocation(embed)).toBe(start);
    await page.keyboard.press("Enter");
    await expect.poll(() => hostLocation(embed)).toBe("/supplements");
    await expect(host.locator("main").first()).toBeVisible();
    await expect(page).toHaveURL(outerUrl);
    await expect(embed).toHaveAttribute("sandbox", previewSandbox);
    expect(context.pages(), "History and second activation must stay in the embedded website").toHaveLength(1);
    expect(escapedRequests, "History must not permit external navigation or mutations").toEqual([]);
  });
}

for (const surface of ["review", "Canvas"] as const) {
  test(`${surface}: closed supplement menu keeps summary focus during live forced-colors changes at 200% text size`, async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Forced-colors regression is Chromium-only");
    await page.emulateMedia({ forcedColors: "none" });
    await page.setViewportSize({ width: 767, height: 1000 });
    const start = surface === "review"
      ? "/supplement-details?product=womens-multi"
      : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
    await page.route("**/__test-supplement-closed-live-colors", route => route.fulfill({
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
    await page.goto("/__test-supplement-closed-live-colors", { waitUntil: "domcontentloaded" });
    const outerUrl = page.url();
    const embed = page.locator('iframe[title="Embedded website"]');
    const host = page.frameLocator('iframe[title="Embedded website"]');
    const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
    const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
    await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
      .toHaveText("Women's Daily Multivitamin");
    const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
    const menu = navigation.locator("details");
    const toggle = menu.locator("summary");
    const anchors = navigation.locator("a");
    const link = navigation.getByRole("link", { name: "Shop Lean Nutrition", exact: true });
    const readLinks = () => anchors.evaluateAll(links => links.map(link => ({
      href: link.getAttribute("href"), target: link.getAttribute("target"),
    })));
    const originalLinks = await readLinks();
    expect(originalLinks).toEqual([["Shop Lean Nutrition", "/shop"], ...categories]
      .map(([, href]) => ({ href, target: "_parent" })));
    await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
      iframe.contentDocument!.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
        .contentWindow!.innerWidth)).toBe(767);
    const sizes = await doubleSnapshotText(embed);
    expect(sizes).toHaveLength(7);
    for (const { before, after } of sizes) {
      expect(before).toBeGreaterThan(0);
      expect(after).toBeCloseTo(before * 2, 1);
    }
    await expect(menu).not.toHaveAttribute("open");
    await tabToHeaderControl(page, embed, "Shop menu", toggle);
    const navigations: string[] = [];
    page.on("framenavigated", frame => navigations.push(frame.url()));
    for (const forcedColors of ["none", "active", "none"] as const) {
      // Keep the SAME closed disclosure and keyboard-focused summary throughout
      // both preference changes. Do not reopen, retab, or reload between them.
      await page.emulateMedia({ forcedColors });
      await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
        iframe.contentDocument!.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
          .contentWindow!.matchMedia("(forced-colors: active)").matches)).toBe(forcedColors === "active");
      await expect(menu).not.toHaveAttribute("open");
      for (const anchor of await anchors.all()) await expect(anchor).toBeHidden();
      await expect(toggle).toHaveAccessibleName("Shop menu");
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
      await expectForcedColorsControl(embed, "Shop menu", forcedColors === "active");
      // Include every edge of the outline, not just viewport intersection.
      await expectReadableHeaderControl(embed, "Shop menu", true);
      expect(await readLinks()).toEqual(originalLinks);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
      await expect.poll(() => hostLocation(embed)).toBe(start);
      await expect(page).toHaveURL(outerUrl);
      expect(context.pages()).toHaveLength(1);
      expect(escapedRequests).toEqual([]);
      expect(navigations, "Changing high contrast must not reload any frame").toEqual([]);
    }
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("open");
    await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
    await expectForcedColorsControl(embed, "Shop menu", false);
    await expectReadableHeaderControl(embed, "Shop menu", true);
    await page.keyboard.press("Tab");
    await expectVisibleHeaderFocus(embed, "Shop Lean Nutrition", link);
    await expectForcedColorsControl(embed, "Shop Lean Nutrition", false);
    await expectReadableHeaderControl(embed, "Shop Lean Nutrition", true);
    expect(await readLinks()).toEqual(originalLinks);
    await page.keyboard.press("Enter");
    await expect.poll(() => hostLocation(embed)).toBe("/shop");
    await expect(host.locator("main").first()).toBeVisible();
    await expect(page).toHaveURL(outerUrl);
    await expect(embed).toHaveAttribute("sandbox", previewSandbox);
    expect(context.pages(), "Keyboard activation must stay inside the embedded website").toHaveLength(1);
    expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
  });
}

for (const width of [390, 1440]) {
  for (const surface of ["review", "Canvas"] as const) {
    for (const [label, destination] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
      test(`${surface} ${width}px: forced-colors supplement keyboard focus and ${label} navigation`, async ({ page, context, browserName }) => {
        test.skip(browserName !== "chromium", "Forced-colors regression is Chromium-only");
        await page.emulateMedia({ forcedColors: "active" });
        await page.setViewportSize({ width, height: 1000 });
        const start = surface === "review"
          ? "/supplement-details?product=womens-multi"
          : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
        await page.route("**/__test-supplement-forced-colors", route => route.fulfill({
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
        await page.goto("/__test-supplement-forced-colors", { waitUntil: "domcontentloaded" });
        const outerUrl = page.url();
        const embed = page.locator('iframe[title="Embedded website"]');
        const host = page.frameLocator('iframe[title="Embedded website"]');
        const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
        const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
        await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
          .toHaveText("Women's Daily Multivitamin");
        const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
        const menu = navigation.locator("details");
        const toggle = menu.locator("summary");
        const anchors = navigation.locator("a");
        const originalLinks = await anchors.evaluateAll(links => links.map(link => ({
          href: link.getAttribute("href"), target: link.getAttribute("target"),
        })));
        expect(originalLinks).toHaveLength(7);
        await expect(toggle).toHaveAttribute("aria-label", "Shop menu");
        if (width < 768) {
          await expect(menu).not.toHaveAttribute("open");
          await expect(anchors.first()).toBeHidden();
          await tabToHeaderControl(page, embed, "Shop menu", toggle);
          await expectForcedColorsControl(embed, "Shop menu");
          await page.keyboard.press("Enter");
          await expect(menu).toHaveAttribute("open");
          await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
          await expectForcedColorsControl(embed, "Shop menu");
          await page.keyboard.press("Enter");
          await expect(menu).not.toHaveAttribute("open");
          await expect(anchors.first()).toBeHidden();
          await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
          await expectForcedColorsControl(embed, "Shop menu");
          await page.keyboard.press("Enter");
          await expect(menu).toHaveAttribute("open");
        } else {
          await expect(toggle).toBeHidden();
          await expect(menu).toHaveAttribute("open");
        }
        // Every link gets keyboard focus and contrast checks before the chosen
        // destination is activated. Never focus() or mutate the disclosure.
        for (const name of ["Shop Lean Nutrition", ...categories.map(([name]) => name)]) {
          const control = navigation.getByRole("link", { name, exact: true });
          await tabToHeaderControl(page, embed, name, control);
          await expectForcedColorsControl(embed, name);
        }
        const link = navigation.getByRole("link", { name: label, exact: true });
        // Shop All is already focused at the end of the ordered traversal.
        if (!await headerFocus(embed, label)) await tabToHeaderControl(page, embed, label, link);
        expect(await anchors.evaluateAll(links => links.map(link => ({
          href: link.getAttribute("href"), target: link.getAttribute("target"),
        })))).toEqual(originalLinks);
        for (const [name, href] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
          await expect(navigation.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
        }
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
        await expect.poll(() => hostLocation(embed)).toBe(start);
        await page.keyboard.press("Enter");
        await expect.poll(() => hostLocation(embed)).toBe(destination);
        await expect(host.locator("main").first()).toBeVisible();
        await expect(page).toHaveURL(outerUrl);
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        expect(context.pages(), "High-contrast navigation must stay inside the embedded website").toHaveLength(1);
        expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
      });
    }
  }
}

async function doubleSnapshotText(embed: Locator) {
  // Text-only enlargement: freeze computed sizes before writing any of them,
  // so inherited sizes do not compound. Do not zoom the iframe, change layout
  // dimensions/line heights, or run code in the script-disabled snapshot.
  return embed.evaluate((iframe: HTMLIFrameElement) => {
    const capture = iframe.contentDocument!
      .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!;
    const doc = capture.contentDocument!;
    const win = doc.defaultView!;
    const sizes = [...doc.querySelectorAll<HTMLElement>("*")]
      .map(element => ({ element, size: parseFloat(win.getComputedStyle(element).fontSize) }));
    for (const { element, size } of sizes) element.style.setProperty("font-size", `${size * 2}px`, "important");
    return [...doc.querySelectorAll<HTMLAnchorElement>("#header-component .stellar-shop-navigation a")]
      .map(element => {
        const before = sizes.find(item => item.element === element)!.size;
        return { before, after: parseFloat(win.getComputedStyle(element).fontSize) };
      });
  });
}

async function expectReadableHeaderControl(embed: Locator, label: string, checkFocusOutline = false) {
  const measure = () => embed.evaluate((iframe: HTMLIFrameElement, label) => {
    const capture = iframe.contentDocument!
      .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!;
    const doc = capture.contentDocument!;
    const win = doc.defaultView!;
    const control = [...doc.querySelectorAll<HTMLElement>("#header-component .stellar-shop-navigation summary, #header-component .stellar-shop-navigation a")]
      .find(element => (element.getAttribute("aria-label") || element.textContent?.trim()) === label)!;
    const rects: DOMRect[] = [control.getBoundingClientRect()];
    // Inspect every rendered line, not just the anchor box: wrapping is fine,
    // but cropped text and text covered by another control must fail.
    const walker = doc.createTreeWalker(control, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = doc.createRange();
      range.selectNodeContents(walker.currentNode);
      rects.push(...[...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0));
    }
    const problems: string[] = [];
    for (const rect of rects) {
      if (rect.left < -1 || rect.right > win.innerWidth + 1 || rect.top < -1 || rect.bottom > win.innerHeight + 1) {
        problems.push("outside snapshot viewport");
      }
      for (let ancestor: HTMLElement | null = control; ancestor; ancestor = ancestor.parentElement) {
        const style = win.getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (/(hidden|clip|auto|scroll)/.test(style.overflowX) &&
          (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) problems.push(`horizontally clipped by ${ancestor.className}`);
        if (/(hidden|clip|auto|scroll)/.test(style.overflowY) &&
          (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) problems.push("vertically clipped");
      }
      for (const fraction of [0.1, 0.5, 0.9]) {
        const hit = doc.elementFromPoint(rect.left + rect.width * fraction, rect.top + rect.height / 2);
        if (!hit || !control.contains(hit)) problems.push(`covered by ${hit?.tagName}.${hit?.className}`);
      }
    }
    const icon = win.getComputedStyle(control, "::before");
    const style = win.getComputedStyle(control);
    const bounds = control.getBoundingClientRect();
    const outset = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    const ring = {
      left: bounds.left - outset, right: bounds.right + outset,
      top: bounds.top - outset, bottom: bounds.bottom + outset,
    };
    const outlineProblems: string[] = [];
    if (ring.left < -1 || ring.right > win.innerWidth + 1 || ring.top < -1 || ring.bottom > win.innerHeight + 1) {
      outlineProblems.push("focus outline outside snapshot viewport");
    }
    for (let ancestor = control.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const clipping = win.getComputedStyle(ancestor);
      const bounds = ancestor.getBoundingClientRect();
      if (/(hidden|clip|auto|scroll)/.test(clipping.overflowX) &&
        (ring.left < bounds.left - 1 || ring.right > bounds.right + 1)) outlineProblems.push("horizontally clipped focus outline");
      if (/(hidden|clip|auto|scroll)/.test(clipping.overflowY) &&
        (ring.top < bounds.top - 1 || ring.bottom > bounds.bottom + 1)) outlineProblems.push("vertically clipped focus outline");
    }
    return {
      problems,
      outlineProblems,
      textLines: rects.length - 1,
      // The mobile summary intentionally uses an icon and a zero-size text
      // label. Preserve that presentation and require its named icon instead.
      iconVisible: icon.content !== "none" && parseFloat(icon.width) > 0 && parseFloat(icon.height) > 0,
    };
  }, label);
  // Native keyboard scrolling may be smooth in the captured theme.
  await expect.poll(async () => {
    const result = await measure();
    return [...result.problems, ...(checkFocusOutline ? result.outlineProblems : [])];
  },
    { message: `${label} must remain readable at 200% text size` }).toEqual([]);
  const result = await measure();
  if (label === "Shop menu") expect(result.iconVisible, "Named menu icon must remain visible").toBe(true);
  else expect(result.textLines, `${label} must render text`).toBeGreaterThan(0);
}

async function embeddedHeaderExposure(embed: Locator) {
  return embed.evaluate((iframe: HTMLIFrameElement) => {
    const capture = iframe.contentDocument!
      .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!;
    const doc = capture.contentDocument!;
    const active = doc.activeElement!;
    const bounds = active.getBoundingClientRect();
    const style = doc.defaultView!.getComputedStyle(active);
    const width = parseFloat(style.outlineWidth);
    const outset = width + parseFloat(style.outlineOffset);
    const ring = { left: bounds.left - outset, right: bounds.right + outset,
      top: bounds.top - outset, bottom: bounds.bottom + outset };
    const regions = [{ kind: "outline", ...ring }];
    const walker = doc.createTreeWalker(active, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = doc.createRange();
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) {
        if (rect.width > 0 && rect.height > 0) regions.push({
          kind: "label", left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        });
      }
    }
    const errors: string[] = [];
    // Sample text interiors and the actual outline stroke, not the empty space
    // enclosed by the ring. Include corners, edge midpoints and the center.
    const axis = (start: number, end: number) => {
      const count = Math.max(2, Math.ceil((end - start) / 8));
      return Array.from({ length: count + 1 }, (_, i) => start + (end - start) * i / count);
    };
    for (const frame of [capture, iframe]) {
      const rect = frame.getBoundingClientRect();
      const owner = frame.ownerDocument;
      const win = owner.defaultView!;
      for (const region of regions) {
        region.left += rect.left;
        region.right += rect.left;
        region.top += rect.top;
        region.bottom += rect.top;
        if (region.left < -1 || region.right > win.innerWidth + 1 ||
          region.top < -1 || region.bottom > win.innerHeight + 1) {
          errors.push(`${frame.title}: ${region.kind} outside viewport`);
        }
        const inset = region.kind === "outline" ? width / 2 : 0.5;
        const xs = axis(region.left + inset, region.right - inset);
        const ys = axis(region.top + inset, region.bottom - inset);
        const points = region.kind === "outline"
          ? [...xs.flatMap(x => [[x, ys[0]], [x, ys.at(-1)!]]),
            ...ys.flatMap(y => [[xs[0], y], [xs.at(-1)!, y]])]
          : xs.flatMap(x => ys.map(y => [x, y]));
        // Hit-test in each ancestor document: viewport containment alone
        // misses a fixed preview strip or a sibling painted over the iframe.
        // elementsFromPoint stops at the iframe; never execute in the capture.
        if (points.some(([x, y]) => {
          if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) return false;
          const stack = owner.elementsFromPoint(x, y);
          const index = stack.indexOf(frame);
          return index < 0 || stack.slice(0, index).some(element => !element.contains(frame));
        })) errors.push(`${frame.title}: ${region.kind} occluded in ancestor document`);
      }
    }
    return { errors, regions };
  });
}

for (const { surface, width, viewportHeight } of (["review", "Canvas"] as const)
  .flatMap(surface => [
    { surface, width: 768, viewportHeight: 1000 },
    { surface, width: 768, viewportHeight: 600 },
    { surface, width: 390, viewportHeight: 600 },
  ])) {
  test(`${surface} ${width}px: scrolled supplement menu returns by reverse keyboard after live contrast changes at 200% text size${viewportHeight < 1000 ? ` in a short ${viewportHeight}px embedding viewport` : ""}`, async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Forced-colors regression is Chromium-only");
    await page.emulateMedia({ forcedColors: "none" });
    await page.setViewportSize({ width, height: viewportHeight });
    const start = surface === "review"
      ? "/supplement-details?product=womens-multi"
      : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
    await page.route("**/__test-supplement-scrolled-colors", route => route.fulfill({
      contentType: "text/html",
      // A taller embed and a host scroll area let normal wheel input move even
      // the sticky snapshot header offscreen. Only this test host differs;
      // product presentation and both sandbox permissions remain intact.
      body: `<style>html,body{margin:0;height:100%}iframe{display:block;width:100%;height:1500px;border:0}
        aside{position:fixed;bottom:0;left:0;height:32px;width:100%;background:white;color:black}</style>
        <iframe title="Embedded website" sandbox="${previewSandbox}" src="${start}"></iframe>
        <aside aria-label="Preview scroll area">Preview container</aside>`,
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
    await page.goto("/__test-supplement-scrolled-colors", { waitUntil: "domcontentloaded" });
    const outerUrl = page.url();
    const embed = page.locator('iframe[title="Embedded website"]');
    const host = page.frameLocator('iframe[title="Embedded website"]');
    const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
    const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
    await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
      .toHaveText("Women's Daily Multivitamin");
    const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
    const menu = navigation.locator("details");
    const toggle = menu.locator("summary");
    if (width < 768) {
      await expect(toggle).toBeVisible();
      await expect(menu).not.toHaveAttribute("open");
      await expect(menu.locator("a").first()).toBeHidden();
    } else {
      await expect(toggle).toBeHidden();
      await expect(menu).toHaveAttribute("open");
    }
    await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
      iframe.contentDocument!.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
        .contentWindow!.innerWidth)).toBe(width);
    const sizes = await doubleSnapshotText(embed);
    expect(sizes).toHaveLength(7);
    for (const { before, after } of sizes) {
      expect(before).toBeGreaterThan(0);
      expect(after).toBeCloseTo(before * 2, 1);
    }
    if (width < 768) {
      await tabToHeaderControl(page, embed, "Shop menu", toggle);
      await expectReadableHeaderControl(embed, "Shop menu", true);
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open");
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
    }
    const readLinks = () => embed.evaluate((iframe: HTMLIFrameElement) =>
      [...iframe.contentDocument!
        .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
        .contentDocument!.querySelectorAll<HTMLAnchorElement>("#header-component .stellar-shop-navigation a")]
        .map(link => ({ name: link.textContent?.trim(), href: link.getAttribute("href"), target: link.getAttribute("target") })));
    const originalLinks = [["Shop Lean Nutrition", "/shop"], ...categories]
      .map(([name, href]) => ({ name, href, target: "_parent" }));
    expect(await readLinks()).toEqual(originalLinks);
    const readAwayState = () => embed.evaluate((iframe: HTMLIFrameElement) => {
      const host = iframe.contentDocument!;
      const capture = host.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!;
      const doc = capture.contentDocument!;
      return {
        focusInSnapshot: iframe.ownerDocument.activeElement === iframe && host.activeElement === capture,
        active: doc.activeElement?.outerHTML,
        inHeader: !!doc.activeElement?.closest("#header-component"),
        // The captured header is sticky. Measure content travel, not
        // an offscreen header or window.scrollY (an inner wrapper may scroll).
        contentTop: doc.querySelector("#MainContent")!.getBoundingClientRect().top,
        headerHeight: doc.querySelector("#header-component")!.getBoundingClientRect().height,
        headerBottomInPage: iframe.getBoundingClientRect().top + capture.getBoundingClientRect().top +
          doc.querySelector("#header-component")!.getBoundingClientRect().bottom,
        forcedColors: doc.defaultView!.matchMedia("(forced-colors: active)").matches,
      };
    });
    const navigations: string[] = [];
    page.on("framenavigated", frame => navigations.push(frame.url()));
    for (const forcedColors of ["active", "none"] as const) {
      // Cart is the next native stop after Shop All; Tab once more reaches
      // product content. Do not leave focus on the sticky header while away.
      await tabToHeaderControl(page, embed, "Shop All",
        navigation.getByRole("link", { name: "Shop All", exact: true }));
      await page.keyboard.press("Tab");
      await expect(snapshot.getByRole("button", { name: "Cart", exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(snapshot.getByRole("combobox", { name: "Choose supplement", exact: true })).toBeFocused();
      // Focus scrolling is smooth in the captured theme. Let that native
      // movement finish before sending an independent wheel gesture, or its
      // pending animation can undo part of the wheel travel after the poll.
      const focusScrollSamples: number[] = [];
      await expect.poll(async () => {
        focusScrollSamples.push((await readAwayState()).contentTop);
        const recent = focusScrollSamples.slice(-3);
        return recent.length === 3 && recent.every(top => Math.abs(top - recent[0]) < 0.5);
      }, { intervals: [100], message: "Native product-focus scrolling must settle before wheel input" }).toBe(true);
      const nextStop = await readAwayState();
      expect(nextStop.focusInSnapshot).toBe(true);
      expect(nextStop.inHeader).toBe(false);
      const bounds = await capture.boundingBox();
      expect(bounds).not.toBeNull();
      await page.mouse.move(bounds!.x + bounds!.width / 2, viewportHeight - 200);
      await page.mouse.wheel(0, 5000);
      await expect.poll(async () => (await readAwayState()).contentTop,
        { message: "Wheel input must scroll product content past the sticky header" })
        .toBeLessThan(-nextStop.headerHeight);
      // The intermediate app clips overflow, so wheel input inside the capture
      // need not chain to the outer document. Scroll the host from its own
      // visible area, as a user would, without evaluate() scroll mutations.
      const scrollArea = await page.getByRole("complementary", { name: "Preview scroll area" }).boundingBox();
      expect(scrollArea).not.toBeNull();
      await page.mouse.move(scrollArea!.x + scrollArea!.width / 2, scrollArea!.y + scrollArea!.height / 2);
      await page.mouse.wheel(0, 1000);
      await expect.poll(async () => (await readAwayState()).headerBottomInPage,
        { message: "The complete sticky header must be offscreen before contrast changes" }).toBeLessThanOrEqual(0);
      await page.emulateMedia({ forcedColors });
      await expect.poll(async () => (await readAwayState()).forcedColors).toBe(forcedColors === "active");
      const away = await readAwayState();
      expect(away.contentTop, "Changing contrast must not reset the product scroll").toBeLessThan(-nextStop.headerHeight);
      expect(away.headerBottomInPage, "Contrast must change while the header remains offscreen").toBeLessThanOrEqual(0);
      expect(away.active, "Wheel input and contrast changes must preserve the native next tab stop").toBe(nextStop.active);
      expect(away.focusInSnapshot).toBe(true);
      expect(away.inHeader).toBe(false);

      // No focus(), scrollIntoView(), click, or searching backwards for a
      // match: each Shift+Tab must reach the immediate preceding menu link,
      // and the browser alone must scroll its full label and outline onscreen.
      await page.keyboard.press("Shift+Tab");
      await expect(snapshot.getByRole("button", { name: "Cart", exact: true })).toBeFocused();
      const returnNames = [...originalLinks].reverse().map(({ name }) => name);
      if (width < 768) returnNames.push("Shop menu");
      for (const name of returnNames) {
        await page.keyboard.press("Shift+Tab");
        await expectVisibleHeaderFocus(embed, name,
          name === "Shop menu" ? toggle : navigation.getByRole("link", { name, exact: true }));
        await expectReadableHeaderControl(embed, name, true);
        await expectForcedColorsControl(embed, name, forcedColors === "active");
        await expect.poll(async () => (await embeddedHeaderExposure(embed)).errors,
          { message: `${name} label and outline must be exposed through both embedding viewports, without host overlays` }).toEqual([]);
        if (name === "Shop All" && forcedColors === "active") {
          await test.step("Negative controls detect host overlays without changing viewport containment", async () => {
            const baseline = await embeddedHeaderExposure(embed);
            const focus = await headerFocus(embed, name);
            // Test each ancestor independently and cover text and outline
            // separately, including a strip that misses the label entirely.
            for (const ancestor of ["outer", "intermediate"] as const) {
              for (const kind of ["label", "outline"]) {
                const region = baseline.regions.find(region => region.kind === kind)!;
                const box = kind === "label"
                  ? { left: (region.left + region.right) / 2 - 6,
                    top: (region.top + region.bottom) / 2 - 6, width: 12, height: 12 }
                  : { left: region.left, top: region.top, width: region.right - region.left, height: 2 };
                await embed.evaluate((iframe: HTMLIFrameElement, { ancestor, box }) => {
                  const owner = ancestor === "outer" ? iframe.ownerDocument : iframe.contentDocument!;
                  const offset = ancestor === "outer" ? { left: 0, top: 0 } : iframe.getBoundingClientRect();
                  const overlay = owner.createElement("div");
                  overlay.id = "test-focus-occluder";
                  overlay.style.cssText = `position:fixed;z-index:2147483647;pointer-events:auto;
                    forced-color-adjust:none;background:#000;left:${box.left - offset.left}px;
                    top:${box.top - offset.top}px;width:${box.width}px;height:${box.height}px`;
                  owner.body.append(overlay);
                }, { ancestor, box });
                try {
                  const covered = await embeddedHeaderExposure(embed);
                  const frameTitle = ancestor === "outer" ? "Embedded website" : "Stellar Labs supplement product";
                  expect(covered.errors).toContain(`${frameTitle}: ${kind} occluded in ancestor document`);
                  expect(covered.errors.filter(error => error.includes("outside viewport"))).toEqual([]);
                  expect(covered.regions, "Overlay must not change projected geometry").toEqual(baseline.regions);
                  expect(await headerFocus(embed, name), "Overlay must not move keyboard focus").toEqual(focus);
                  if (kind === "outline") {
                    expect(covered.errors.filter(error => error.includes("label"))).toEqual([]);
                  }
                } finally {
                  await embed.evaluate((iframe: HTMLIFrameElement) => {
                    for (const owner of [iframe.ownerDocument, iframe.contentDocument!]) {
                      owner.getElementById("test-focus-occluder")?.remove();
                    }
                  });
                }
                expect((await embeddedHeaderExposure(embed)).errors,
                  "Removing the test overlay must restore exposure without moving focus or scrolling").toEqual([]);
              }
            }
          });
        }
      }
      await expect(menu).toHaveAttribute("open");
      if (width < 768) await expect(toggle).toBeVisible();
      else await expect(toggle).toBeHidden();
      expect(await readLinks()).toEqual(originalLinks);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
      await expect.poll(() => hostLocation(embed)).toBe(start);
      await expect(page).toHaveURL(outerUrl);
      expect(navigations, "Scrolling and live contrast changes must not reload any frame").toEqual([]);
    }
    if (width < 768) {
      // The reverse traversal ends at the native disclosure on mobile.
      // Tab once to activate the same first link as the desktop case.
      await page.keyboard.press("Tab");
      await expectVisibleHeaderFocus(embed, "Shop Lean Nutrition",
        navigation.getByRole("link", { name: "Shop Lean Nutrition", exact: true }));
    }
    await page.keyboard.press("Enter");
    await expect.poll(() => hostLocation(embed)).toBe("/shop");
    await expect(host.locator("main").first()).toBeVisible();
    await expect(page).toHaveURL(outerUrl);
    await expect(embed).toHaveAttribute("sandbox", previewSandbox);
    expect(context.pages(), "Reverse-keyboard activation must stay inside the embedded website").toHaveLength(1);
    expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
  });
}

for (const { width, forcedColors, reverseKeyboard } of [false, true].flatMap(forcedColors =>
  [767, 768].flatMap(width => (forcedColors ? [false, true] : [false])
    .map(reverseKeyboard => ({ width, forcedColors, reverseKeyboard }))),
)) {
  for (const surface of ["review", "Canvas"] as const) {
    // Keep the combined regression small: all seven links are inspected in
    // every case, but existing single-setting tests cover every destination.
    const destinations = reverseKeyboard
      ? [["Shop Lean Nutrition", "/shop"]] as const
      : forcedColors
      ? [["Supplements", "/supplements"]] as const
      : [...categories, ["Shop Lean Nutrition", "/shop"]] as const;
    for (const [label, destination] of destinations) {
      test(`${surface} ${width}px: ${reverseKeyboard ? "reverse-keyboard " : ""}${forcedColors ? "forced-colors + " : ""}supplement menu at 200% text size activates ${label} inside preview`, async ({ page, context, browserName }) => {
        test.skip(forcedColors && browserName !== "chromium", "Forced-colors regression is Chromium-only");
        if (forcedColors) await page.emulateMedia({ forcedColors: "active" });
        await page.setViewportSize({ width, height: 1000 });
        const start = surface === "review"
          ? "/supplement-details?product=womens-multi"
          : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
        await page.route("**/__test-supplement-large-text", route => route.fulfill({
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
        await page.goto("/__test-supplement-large-text", { waitUntil: "domcontentloaded" });
        const outerUrl = page.url();
        const embed = page.locator('iframe[title="Embedded website"]');
        const host = page.frameLocator('iframe[title="Embedded website"]');
        const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
        const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
        await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
          .toHaveText("Women's Daily Multivitamin");
        const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
        const menu = navigation.locator("details");
        const toggle = menu.locator("summary");
        const anchors = navigation.locator("a");
        const originalLinks = await anchors.evaluateAll(links => links.map(link => ({
          href: link.getAttribute("href"), target: link.getAttribute("target"),
        })));
        expect(originalLinks).toHaveLength(7);
        for (const [name, href] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
          await expect(navigation.getByRole("link", { name, exact: true, includeHidden: true })).toHaveAttribute("href", href);
        }
        await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
          iframe.contentDocument!.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
            .contentWindow!.innerWidth)).toBe(width);
        const sizes = await doubleSnapshotText(embed);
        expect(sizes).toHaveLength(7);
        for (const { before, after } of sizes) {
          expect(before).toBeGreaterThan(0);
          expect(after).toBeCloseTo(before * 2, 1);
        }
        const expectReadable = async (name: string) => {
          await expectReadableHeaderControl(embed, name, forcedColors);
          if (forcedColors) await expectForcedColorsControl(embed, name);
        };
        await expect(toggle).toHaveAttribute("aria-label", "Shop menu");
        if (width < 768) {
          await expect(menu).not.toHaveAttribute("open");
          await expect(anchors.first()).toBeHidden();
          await tabToHeaderControl(page, embed, "Shop menu", toggle);
          await expectReadable("Shop menu");
          await page.keyboard.press("Enter");
          await expect(menu).toHaveAttribute("open");
          await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
          await expectReadable("Shop menu");
          await page.keyboard.press("Enter");
          await expect(menu).not.toHaveAttribute("open");
          await expect(anchors.first()).toBeHidden();
          await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
          await expectReadable("Shop menu");
          await page.keyboard.press("Enter");
          await expect(menu).toHaveAttribute("open");
        } else {
          await expect(toggle).toBeHidden();
          await expect(menu).toHaveAttribute("open");
        }
        const names = ["Shop Lean Nutrition", ...categories.map(([name]) => name)];
        if (reverseKeyboard) {
          // Seed at the next native tab stop after the header. Each reverse
          // step must land immediately on its predecessor, without focus(),
          // scrollIntoView(), clicks, or a search that could skip a control.
          await tabToHeaderControl(page, embed, "Shop All",
            navigation.getByRole("link", { name: "Shop All", exact: true }));
          await page.keyboard.press("Tab");
          expect(await headerFocus(embed, "Shop All")).toBeNull();
          for (const name of [...names].reverse()) {
            await page.keyboard.press("Shift+Tab");
            await expectVisibleHeaderFocus(embed, name,
              navigation.getByRole("link", { name, exact: true }));
            await expectReadable(name);
          }
          if (width < 768) {
            await page.keyboard.press("Shift+Tab");
            await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
            await expectReadable("Shop menu");
            await page.keyboard.press("Enter");
            await expect(menu).not.toHaveAttribute("open");
            await expect(anchors.first()).toBeHidden();
            await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
            await expectReadable("Shop menu");
            await page.keyboard.press("Enter");
            await expect(menu).toHaveAttribute("open");
            await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
            await expectReadable("Shop menu");
            // Reopening must restore the first link to native keyboard order.
            await page.keyboard.press("Tab");
            await expectVisibleHeaderFocus(embed, label,
              navigation.getByRole("link", { name: label, exact: true }));
          }
        } else {
          // Reach all seven controls by real Tab presses in DOM order.
          for (const name of names) {
            const control = navigation.getByRole("link", { name, exact: true });
            await tabToHeaderControl(page, embed, name, control);
            await expectReadable(name);
          }
        }
        const link = navigation.getByRole("link", { name: label, exact: true });
        if (!await headerFocus(embed, label)) await tabToHeaderControl(page, embed, label, link);
        await expectReadable(label);
        expect(await anchors.evaluateAll(links => links.map(link => ({
          href: link.getAttribute("href"), target: link.getAttribute("target"),
        })))).toEqual(originalLinks);
        await expect(link).toHaveAttribute("href", destination);
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
        await expect.poll(() => hostLocation(embed)).toBe(start);
        await page.keyboard.press("Enter");
        await expect.poll(() => hostLocation(embed)).toBe(destination);
        await expect(host.locator("main").first()).toBeVisible();
        await expect(page).toHaveURL(outerUrl);
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        expect(context.pages(), "Enlarged-text navigation must stay inside the embedded website").toHaveLength(1);
        expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
      });
    }
  }
}

async function assertHeader(snapshot: FrameLocator, width: number, restored = false) {
  const header = snapshot.locator("#header-component");
  await expect(header).toBeVisible();
  // The approved shared "black" header is the original near-black #23201f.
  await expect(header).toHaveCSS("background-color", "rgb(35, 32, 31)");
  const navigation = header.getByRole("navigation", { name: "Shop", exact: true });
  const menu = navigation.locator("details");
  const toggle = menu.locator("summary");
  await expect(toggle).toHaveAttribute("aria-label", "Shop menu");
  const lean = navigation.getByRole("link", { name: "Shop Lean Nutrition", exact: true });
  if (width < 768) {
    await expect(toggle).toBeVisible();
    // Back may restore the menu's native details state from the history entry.
    if (restored && await menu.getAttribute("open") !== null) await toggle.click();
    await expect(menu).not.toHaveAttribute("open");
    await expect(lean).toBeHidden();
    await toggle.click();
    await expect(menu).toHaveAttribute("open");
  } else {
    await expect(toggle).toBeHidden();
    await expect(menu).toHaveAttribute("open");
  }
  await expect(lean).toBeVisible();
  await expect(lean).toHaveAttribute("href", "/shop");
  await expect(lean).toHaveCSS("color", "rgb(50, 192, 203)");
  await lean.click({ trial: true });
  for (const [name, destination] of categories) {
    const link = navigation.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", destination);
    // Checks hit testing as well as visibility: clipped or covered links fail.
    await link.click({ trial: true });
  }
  if (width < 768) {
    await toggle.click();
    await expect(lean).toBeHidden();
    await toggle.click();
    await expect(lean).toBeVisible();
  } else {
    const leanBox = await lean.boundingBox();
    const wheyBox = await navigation.getByRole("link", { name: "Whey Protein", exact: true }).boundingBox();
    expect(leanBox).not.toBeNull();
    expect(wheyBox).not.toBeNull();
    expect(leanBox!.y + leanBox!.height).toBeLessThanOrEqual(wheyBox!.y + 1);
  }
  return navigation;
}

async function expectHeaderClearance(embed: Locator) {
  // Measure inside the script-disabled snapshot from its script-enabled parent.
  // Visibility alone misses labels painted under static search/cart artwork.
  const problems = await embed.evaluate((iframe: HTMLIFrameElement) => {
    const doc = iframe.contentDocument!
      .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!.contentDocument!;
    const header = doc.querySelector<HTMLElement>("#header-component")!;
    const bounds = header.getBoundingClientRect();
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && doc.defaultView!.getComputedStyle(element).visibility !== "hidden";
    };
    const links = [...header.querySelectorAll<HTMLAnchorElement>(".stellar-shop-navigation a")].filter(visible);
    const controls = [...header.querySelectorAll(
      '[data-testid="header-top-right"], .header-logo, .search-action button',
    )].filter(visible);
    const overlaps = (a: { left: number; right: number; top: number; bottom: number }, b: DOMRect) =>
      Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.5 &&
      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.5;
    const errors: string[] = [];
    for (const link of links) {
      const name = link.textContent!.trim();
      const rect = link.getBoundingClientRect();
      // Reserve the complete 2px outline plus its 3px offset even when unfocused.
      const ring = { left: rect.left - 5, right: rect.right + 5, top: rect.top - 5, bottom: rect.bottom + 5 };
      if (ring.left < Math.max(0, bounds.left) - 0.5 || ring.right > Math.min(doc.documentElement.clientWidth, bounds.right) + 0.5 ||
        ring.top < bounds.top - 0.5 || ring.bottom > bounds.bottom + 0.5) errors.push(`${name}: clipped focus outline`);
      for (const other of [...controls, ...links.filter(item => item !== link)]) {
        if (overlaps(ring, other.getBoundingClientRect())) errors.push(`${name}: overlaps ${other.textContent?.trim() || other.tagName}`);
      }
      for (const x of [rect.left + 1, (rect.left + rect.right) / 2, rect.right - 1]) {
        const hit = doc.elementFromPoint(x, rect.top + rect.height / 2);
        if (!hit || !link.contains(hit)) errors.push(`${name}: covered label`);
      }
      if (link.scrollWidth > link.clientWidth + 1) errors.push(`${name}: truncated label`);
    }
    return errors;
  });
  expect(problems, "Every header label and its focus outline must clear the logo and right-hand controls").toEqual([]);
}

for (const surface of ["review", "Canvas"] as const) {
  test(`${surface}: supplement tablet header keeps labels clear of controls`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 768, height: 1000 });
    const start = surface === "review"
      ? "/supplement-details?product=womens-multi"
      : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
    await page.route("**/__test-supplement-tablet", route => route.fulfill({
      contentType: "text/html",
      body: `<style>html,body{margin:0;height:100%}iframe{display:block;width:100%;height:100%;border:0}</style>
        <iframe title="Embedded website" sandbox="${previewSandbox}" src="${start}"></iframe>`,
    }));
    await page.goto("/__test-supplement-tablet", { waitUntil: "domcontentloaded" });
    const embed = page.locator('iframe[title="Embedded website"]');
    const host = page.frameLocator('iframe[title="Embedded website"]');
    const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
    const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
    await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
      .toHaveText("Women's Daily Multivitamin");
    for (const width of [768, 800, 900, 999, 1000, 1024, 1100, 1101]) {
      await test.step(`${width}px labels and focus outlines`, async () => {
        await page.setViewportSize({ width, height: 1000 });
        const navigation = await assertHeader(snapshot, width);
        await expectHeaderClearance(embed);
        for (const [label] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
          await tabToHeaderControl(page, embed, label, navigation.getByRole("link", { name: label, exact: true }));
          await expectHeaderClearance(embed);
        }
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
        await expect.poll(() => hostLocation(embed)).toBe(start);
      });
    }
  });
}

for (const surface of ["review", "Canvas"] as const) {
  for (const [label, destination] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
    test(`${surface}: open supplement menu keeps ${label} focused through mobile rotation at 200% text with live forced colors`, async ({ page, context, browserName }) => {
      test.skip(browserName !== "chromium", "Forced-colors regression is Chromium-only");
      test.setTimeout(90_000);
      const portrait = { width: 390, height: 740 };
      const landscape = { width: 740, height: 390 };
      await page.emulateMedia({ forcedColors: "none" });
      await page.setViewportSize(portrait);
      const start = surface === "review"
        ? "/supplement-details?product=womens-multi"
        : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
      await page.route("**/__test-supplement-rotation", route => route.fulfill({
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
      await page.goto("/__test-supplement-rotation", { waitUntil: "domcontentloaded" });
      const outerUrl = page.url();
      const embed = page.locator('iframe[title="Embedded website"]');
      const host = page.frameLocator('iframe[title="Embedded website"]');
      const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
      const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
      await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
        .toHaveText("Women's Daily Multivitamin");
      const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
      const menu = navigation.locator("details");
      const toggle = menu.locator("summary");
      const anchors = navigation.locator("a");
      const link = navigation.getByRole("link", { name: label, exact: true });
      const initialLinks = await anchors.evaluateAll(links => links.map(link => ({
        href: link.getAttribute("href"), target: link.getAttribute("target"),
      })));
      expect(initialLinks).toHaveLength(7);
      for (const [name, href] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
        await expect(navigation.getByRole("link", { name, exact: true, includeHidden: true })).toHaveAttribute("href", href);
      }
      const sizes = await doubleSnapshotText(embed);
      expect(sizes).toHaveLength(7);
      for (const { before, after } of sizes) {
        expect(before).toBeGreaterThan(0);
        expect(after).toBeCloseTo(before * 2, 1);
      }
      await expect(menu).not.toHaveAttribute("open");
      await tabToHeaderControl(page, embed, "Shop menu", toggle);
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open");
      await tabToHeaderControl(page, embed, label, link);
      // Retain references without writing to any document. A reload, replaced
      // disclosure, or a different focused node must not masquerade as survival.
      const original = await embed.evaluateHandle((iframe: HTMLIFrameElement) => {
        const host = iframe.contentDocument!;
        const capture = host.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!;
        const doc = capture.contentDocument!;
        return { host, capture, doc, active: doc.activeElement,
          menu: doc.querySelector("#header-component .stellar-shop-navigation details") };
      });
      for (const viewport of [portrait, landscape, portrait]) {
        await test.step(`${viewport.width}x${viewport.height}: same open menu and focused link`, async () => {
          expect(viewport.width).toBeLessThan(768);
          await page.setViewportSize(viewport);
          // Check real nested dimensions: a tall fixed embed would never test
          // landscape clipping, even if the outer page had rotated.
          await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) => {
            const capture = iframe.contentDocument!
              .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!;
            return { width: capture.contentWindow!.innerWidth, height: capture.contentWindow!.innerHeight };
          })).toEqual(viewport);
          for (const forcedColors of ["none", "active", "none"] as const) {
            // After initial keyboard entry, only resize and media preferences
            // change. Never repair focus, scroll, or the native open state.
            await page.emulateMedia({ forcedColors });
            expect(await embed.evaluate((iframe: HTMLIFrameElement, original) => {
              const host = iframe.contentDocument!;
              const capture = host.querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!;
              const doc = capture.contentDocument!;
              return host === original.host && capture === original.capture && doc === original.doc &&
                doc.activeElement === original.active &&
                doc.querySelector("#header-component .stellar-shop-navigation details") === original.menu;
            }, original)).toBe(true);
            await expect(menu).toHaveAttribute("open");
            await expect(menu).toHaveJSProperty("open", true);
            await expect(toggle).toBeVisible();
            await expect(menu.locator(".stellar-shop-navigation__links")).toHaveCSS("display", "grid");
            await expectVisibleHeaderFocus(embed, label, link);
            await expectReadableHeaderControl(embed, label, true);
            await expectForcedColorsControl(embed, label, forcedColors === "active");
            await expect.poll(async () => (await embeddedHeaderExposure(embed)).errors,
              { message: `${label} label and full outline must clear both embedding viewports after rotation` }).toEqual([]);
            expect(await anchors.evaluateAll(links => links.map(link => ({
              href: link.getAttribute("href"), target: link.getAttribute("target"),
            })))).toEqual(initialLinks);
            await expect(embed).toHaveAttribute("sandbox", previewSandbox);
            await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
            await expect.poll(() => hostLocation(embed)).toBe(start);
            await expect(page).toHaveURL(outerUrl);
          }
        });
      }
      await original.dispose();
      // The surviving focused link must still activate locally with Enter.
      await page.keyboard.press("Enter");
      await expect.poll(() => hostLocation(embed)).toBe(destination);
      await expect(host.locator("main").first()).toBeVisible();
      await expect(page).toHaveURL(outerUrl);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      expect(context.pages(), "Rotation navigation must stay inside the embedded website").toHaveLength(1);
      expect(escapedRequests, "No external navigation or mutations").toEqual([]);
    });
  }
}

for (const [surface, mobileWidth, desktopWidth] of [
  ["review", 390, 1440],
  ["Canvas", 390, 1440],
  ["review", 767, 768],
  ["Canvas", 767, 768],
] as const) {
  for (const [label, destination] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
    test(`${surface}: supplement header keyboard survives ${mobileWidth}px-${desktopWidth}px-${mobileWidth}px resizing for ${label}`, async ({ page, context }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: mobileWidth, height: 1000 });
      const start = surface === "review"
        ? "/supplement-details?product=womens-multi"
        : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
      await page.route("**/__test-supplement-resize", route => route.fulfill({
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
        } else {
          await route.continue();
        }
      });
      await page.goto("/__test-supplement-resize", { waitUntil: "domcontentloaded" });
      const outerUrl = page.url();
      const embed = page.locator('iframe[title="Embedded website"]');
      const host = page.frameLocator('iframe[title="Embedded website"]');
      const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
      const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
      const root = snapshot.locator("#supplements-app-mount");
      await expect(root.getByRole("heading", { level: 1 })).toHaveText("Women's Daily Multivitamin");
      const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
      const menu = navigation.locator("details");
      const toggle = menu.locator("summary");
      const links = navigation.locator(".stellar-shop-navigation__links");
      const link = navigation.getByRole("link", { name: label, exact: true });
      // Compare existing destinations/targets across transitions, rather than
      // prescribing a new ancestor target to make the keyboard test pass.
      const anchors = navigation.locator("a");
      const initialLinks = await anchors.evaluateAll(links => links.map(link => ({
        href: link.getAttribute("href"),
        target: link.getAttribute("target"),
      })));
      expect(initialLinks).toHaveLength(categories.length + 1);

      async function expectState(desktop: boolean) {
        // Check the captured document's actual media-query width, not just the
        // outer viewport: nested iframe sizing must exercise 767/768 exactly.
        await expect.poll(() => embed.evaluate((iframe: HTMLIFrameElement) =>
          iframe.contentDocument!
            .querySelector<HTMLIFrameElement>('iframe[title="Stellar Labs supplement product"]')!
            .contentWindow!.innerWidth,
        )).toBe(desktop ? desktopWidth : mobileWidth);
        if (desktop) {
          await expect(menu).toHaveAttribute("open");
          await expect(menu).toHaveJSProperty("open", true);
          await expect(toggle).toBeHidden();
          await expect(toggle).toHaveCSS("display", "none");
          // Captured product styles can use either layout; require a rendered
          // panel without prescribing a new desktop presentation.
          await expect(links).toHaveCSS("display", /^(flex|grid)$/);
        } else {
          await expect(menu).not.toHaveAttribute("open");
          await expect(menu).toHaveJSProperty("open", false);
          await expect(toggle).toBeVisible();
          await expect(toggle).toHaveCSS("display", "flex");
          await expect(links).toHaveCSS("display", "none");
        }
        for (const [name, href] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
          const item = navigation.getByRole("link", { name, exact: true, includeHidden: true });
          await expect(item).toHaveAttribute("href", href);
          if (desktop) await expect(item).toBeVisible();
          else await expect(item).toBeHidden();
        }
        expect(await anchors.evaluateAll(links => links.map(link => ({
          href: link.getAttribute("href"),
          target: link.getAttribute("target"),
        })))).toEqual(initialLinks);
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
        await expect.poll(() => hostLocation(embed)).toBe(start);
        await expect(page).toHaveURL(outerUrl);
      }

      // A closed phone menu must expand on desktop, then collapse on return.
      // Keep the same loaded product throughout; a reload would mask a missing
      // responsive listener by reapplying only the initial disclosure state.
      await expectState(false);
      await page.setViewportSize({ width: desktopWidth, height: 1000 });
      await expectState(true);
      await tabToHeaderControl(page, embed, label, link);
      await page.setViewportSize({ width: mobileWidth, height: 1000 });
      await expectState(false);

      // Recover by keyboard from the now-hidden link, open the native details,
      // and cross both breakpoints again with focus inside the open menu.
      await tabToHeaderControl(page, embed, "Shop menu", toggle);
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open");
      await expect(menu).toHaveJSProperty("open", true);
      await expect(links).toHaveCSS("display", "grid");
      await tabToHeaderControl(page, embed, label, link);
      await page.setViewportSize({ width: desktopWidth, height: 1000 });
      await expectState(true);
      await expectVisibleHeaderFocus(embed, label, link);
      await page.setViewportSize({ width: mobileWidth, height: 1000 });
      await expectState(false);
      await tabToHeaderControl(page, embed, "Shop menu", toggle);
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open");
      await expect(menu).toHaveJSProperty("open", true);
      await expect(links).toHaveCSS("display", "grid");
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
      await page.keyboard.press("Enter");
      await expectState(false);
      await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("open");
      await expect(menu).toHaveJSProperty("open", true);
      await expect(links).toHaveCSS("display", "grid");
      await tabToHeaderControl(page, embed, label, link);
      await page.keyboard.press("Enter");
      await expect.poll(() => hostLocation(embed)).toBe(destination);
      await expect(host.locator("main").first()).toBeVisible();
      await expect(page).toHaveURL(outerUrl);
      await expect(embed).toHaveAttribute("sandbox", previewSandbox);
      expect(context.pages(), "Resized keyboard navigation must stay in the embedded website").toHaveLength(1);
      expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
    });
  }
}

for (const width of [390, 1440]) {
  for (const surface of ["review", "Canvas"] as const) {
    for (const [index, product] of supplements.entries()) {
      test(`${surface} ${width}px: ${product.id} header and nested collection round trip`, async ({ page, context }) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 1000 });
        const start = surface === "review"
          ? `/supplement-details?product=${product.id}`
          : `/__mockup/preview/stellar-labs/SupplementDetails?product=${product.id}`;
        // A fresh script-free outer document avoids retaining React effects from
        // a page replaced by setContent. Do not grant top-navigation here.
        await page.route("**/__test-supplement-preview", route => route.fulfill({
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
          } else {
            await route.continue();
          }
        });
        await page.goto("/__test-supplement-preview", { waitUntil: "domcontentloaded" });
        const outerUrl = page.url();
        const embed = page.locator('iframe[title="Embedded website"]');
        const host = page.frameLocator('iframe[title="Embedded website"]');
        const purchaseFrame = host.locator('iframe[title="Stellar Labs supplement product"]');
        const purchase = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
        const root = purchase.locator("#supplements-app-mount");
        await expect(root.getByRole("heading", { level: 1 })).toHaveText(product.name);
        await expect(root.locator(".sl-protein-price")).toHaveText("$24.95");
        await expect(purchaseFrame).toHaveAttribute("sandbox", snapshotSandbox);
        const navigation = await assertHeader(purchase, width);

        // Rotate through every category using real clicks from the supplement
        // header on both surfaces and viewport sizes, not just href inspection.
        const [category, destination] = categories[index % categories.length];
        await navigation.getByRole("link", { name: category, exact: true }).click();
        await expect.poll(() => hostLocation(embed)).toBe(destination);
        await expect(host.locator("main").first()).toBeVisible();
        await expect(page).toHaveURL(outerUrl);
        // Native joint history returns the embedded host, not the outer page.
        await page.evaluate(() => window.history.back());
        await expect.poll(() => hostLocation(embed)).toBe(start);
        await expect(root.getByRole("heading", { level: 1 })).toHaveText(product.name);
        const restoredNavigation = await assertHeader(purchase, width, true);
        await restoredNavigation.getByRole("link", { name: "Supplements", exact: true }).click();
        await expect.poll(() => hostLocation(embed)).toBe("/supplements");
        const collection = host.frameLocator(".stellar-supplements-frame");
        const card = collection.getByTestId(`card-product-${product.id}`);
        await card.getByRole("link", { name: "Product details", exact: true }).click();
        await expect.poll(() => hostLocation(embed)).toBe(`/supplement-details?product=${product.id}`);
        await expect(root.getByRole("heading", { level: 1 })).toHaveText(product.name);
        await expect(root.getByRole("combobox", { name: "Choose supplement" })).toHaveValue(product.id);
        await expect(root.locator(".sl-protein-price")).toHaveText("$24.95");
        await expect(purchaseFrame).toHaveAttribute("sandbox", snapshotSandbox);
        const finalNavigation = await assertHeader(purchase, width);
        await finalNavigation.getByRole("link", { name: "Shop Lean Nutrition", exact: true }).click();
        await expect.poll(() => hostLocation(embed)).toBe("/shop");
        await expect(host.frameLocator("iframe").first().locator("[data-stellar-full-catalog]")
          .locator(`[data-catalog-supplement="${product.id}"]`)).toBeVisible();
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        await expect(page).toHaveURL(outerUrl);
        expect(context.pages(), "Navigation must stay in the embedded website").toHaveLength(1);
        expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
      });
    }
  }
}

for (const width of [390, 1440]) {
  for (const surface of ["review", "Canvas"] as const) {
    for (const [label, destination] of [...categories, ["Shop Lean Nutrition", "/shop"]] as const) {
      test(`${surface} ${width}px: supplement header keyboard activates ${label} inside preview`, async ({ page, context }) => {
        await page.setViewportSize({ width, height: 1000 });
        const start = surface === "review"
          ? "/supplement-details?product=womens-multi"
          : "/__mockup/preview/stellar-labs/SupplementDetails?product=womens-multi";
        await page.route("**/__test-supplement-keyboard", route => route.fulfill({
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
          } else {
            await route.continue();
          }
        });
        await page.goto("/__test-supplement-keyboard", { waitUntil: "domcontentloaded" });
        const outerUrl = page.url();
        const embed = page.locator('iframe[title="Embedded website"]');
        const host = page.frameLocator('iframe[title="Embedded website"]');
        const capture = host.locator('iframe[title="Stellar Labs supplement product"]');
        const snapshot = host.frameLocator('iframe[title="Stellar Labs supplement product"]');
        await expect(snapshot.locator("#supplements-app-mount").getByRole("heading", { level: 1 }))
          .toHaveText("Women's Daily Multivitamin");
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        await expect(capture).toHaveAttribute("sandbox", snapshotSandbox);
        const navigation = snapshot.locator("#header-component").getByRole("navigation", { name: "Shop", exact: true });
        const menu = navigation.locator("details");
        const toggle = menu.locator("summary");
        const link = navigation.getByRole("link", { name: label, exact: true });
        if (width < 768) {
          await expect(menu).not.toHaveAttribute("open");
          await expect(link).toBeHidden();
          await tabToHeaderControl(page, embed, "Shop menu", toggle);
          await page.keyboard.press("Enter");
          await expect(menu).toHaveAttribute("open");
          await expect(link).toBeVisible();
          await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
          await page.keyboard.press("Enter");
          await expect(menu).not.toHaveAttribute("open");
          await expect(link).toBeHidden();
          await expectVisibleHeaderFocus(embed, "Shop menu", toggle);
          await page.keyboard.press("Enter");
          await expect(menu).toHaveAttribute("open");
        } else {
          await expect(toggle).toBeHidden();
          await expect(menu).toHaveAttribute("open");
        }
        await tabToHeaderControl(page, embed, label, link);
        await expect(link).toHaveAttribute("href", destination);
        await expect(page).toHaveURL(outerUrl);
        await expect.poll(() => hostLocation(embed)).toBe(start);
        // Enter must navigate the embedded React host, not just its snapshot,
        // a popup, the outer document, or the live storefront.
        await page.keyboard.press("Enter");
        await expect.poll(() => hostLocation(embed)).toBe(destination);
        await expect(host.locator("main").first()).toBeVisible();
        await expect(page).toHaveURL(outerUrl);
        await expect(embed).toHaveAttribute("sandbox", previewSandbox);
        expect(context.pages(), "Keyboard navigation must stay in the embedded website").toHaveLength(1);
        expect(escapedRequests, "No external store navigation or mutations").toEqual([]);
      });
    }
  }
}
