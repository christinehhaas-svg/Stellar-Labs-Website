import { expect, test } from "@playwright/test";
import { expectedCardNutrition } from "./powder-fixtures";

for (const { width, surface } of [390, 1280].flatMap(width =>
  (["review", "Canvas"] as const).map(surface => ({ width, surface })))) {
  test(`${surface}: product cards show calories first with flavor-specific nutrition at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let count = 0;
    for (const category of ["100-isolate-whey-protein", "vegan-plant-protein", "electrolyte"]) {
      const start = surface === "review" ? "/" : "/__mockup/preview/stellar-labs/Homepage";
      await page.goto(`${start}?category=${category}`, { waitUntil: "domcontentloaded" });
      const frame = page.frameLocator(".stellar-supplements-frame");
      const cards = frame.locator(".sl-product");
      await expect(cards.first()).toBeVisible();
      await expect(frame.locator('[data-testid^="card-product-ProteinClassic"]')).toHaveCount(0);
      for (const card of await cards.all()) {
        await expect(frame.locator("#header-group")).toHaveCSS("position", "relative");
        const detailsOffset = await card.evaluate(el => {
          const link = el.querySelector(".sl-details-button")!.getBoundingClientRect();
          const copy = el.querySelector(".sl-product-copy")!.getBoundingClientRect();
          return Math.abs((link.left + link.width / 2) - (copy.left + copy.width / 2));
        });
        expect(detailsOffset).toBeLessThan(1);
        const id = (await card.getAttribute("data-testid"))!.replace("card-product-", "");
        await expect(card.locator(".sl-card-nutrition dt").first()).toHaveText("Calories");
        await expect(card.locator(":scope > .sl-product-copy > *")).toHaveCount(5);
        await expect(card.locator("h2 .sl-card-name")).not.toBeEmpty();
        await expect(card.locator("h2 .sl-card-name strong")).not.toBeEmpty();
        if (id.startsWith("Vegan")) await expect(card.locator("h2 .sl-card-variant")).toHaveText("2 lb");
        else await expect(card.locator("h2 .sl-card-variant")).toHaveCount(0);
        await expect(card.locator(".sl-card-nutrition dd")).toHaveText(
          expectedCardNutrition[id],
        );
        await expect(card.locator(".sl-card-nutrition dt")).not.toContainText(["Fat"]);
        const metrics = await card.locator(".sl-card-nutrition-row > div").evaluateAll(items => items.map(item => {
          const value = item.querySelector("dd")!;
          const label = item.querySelector("dt")!;
          return {
            valueTop: value.getBoundingClientRect().top, labelTop: label.getBoundingClientRect().top,
            size: getComputedStyle(value).fontSize, weight: getComputedStyle(value).fontWeight,
            labelSize: getComputedStyle(label).fontSize,
          };
        }));
        expect(new Set(metrics.map(metric => metric.size)).size).toBe(1);
        expect(new Set(metrics.map(metric => metric.weight)).size).toBe(1);
        expect(metrics.every(metric => metric.valueTop < metric.labelTop &&
          parseFloat(metric.size) > parseFloat(metric.labelSize))).toBe(true);
        if (!id.startsWith("Electrolyte")) {
          const labelGaps = await card.locator(".sl-card-nutrition dt").evaluateAll(labels => labels.slice(1).map((label, index) =>
            label.getBoundingClientRect().left - labels[index].getBoundingClientRect().right));
          expect(labelGaps.every(gap => gap >= 5)).toBe(true);
        }
        // Merchant requested the smaller, secondary nutrition labels shown in
        // the supplied mobile example; retain a concrete lower bound.
        expect(metrics.every(metric => parseFloat(metric.labelSize) >= (width < 750 ? 9 : 10))).toBe(true);
        const spacing = await card.locator(".sl-card-nutrition-row").evaluate(row => {
          const bounds = row.getBoundingClientRect();
          const parent = row.parentElement!.getBoundingClientRect();
          return { ratio: bounds.width / parent.width, left: bounds.left - parent.left, right: parent.right - bounds.right };
        });
        expect(spacing.ratio).toBeLessThanOrEqual(1);
        expect(spacing.left).toBeGreaterThanOrEqual(0);
        expect(Math.abs(spacing.left - spacing.right)).toBeLessThan(1);
        const centerOffset = await card.evaluate(el => {
          const supply = el.querySelector(".sl-product-price")!.getBoundingClientRect();
          const row = el.querySelector(".sl-card-nutrition-row")!.getBoundingClientRect();
          return Math.abs((supply.left + supply.width / 2) - (row.left + row.width / 2));
        });
        expect(centerOffset).toBeLessThan(1);
        await expect(card.locator(".sl-product-price")).toHaveText(/^\$\d+\.\d{2}$/);
        await expect(card.locator(".sl-product-subtitle, .sl-product-caption")).toHaveCount(0);
        await expect(card.locator(".sl-product-quality-caption, .sl-card-dietary-claims")).toHaveCount(0);
        await expect(card.locator(".sl-details-button")).toHaveAttribute("href", /^\/products\//);
        await expect(card.locator(".sl-product-supply")).toHaveCount(0);
        await expect(card.locator(".sl-card-serving-note, .sl-card-container-count, .sl-image-hint")).toHaveCount(0);
        await expect(card.locator(".sl-card-per-serving")).toHaveText("Per serving");
        const order = await card.locator(".sl-product-copy").evaluate(copy => {
          const top = (selector: string) => copy.querySelector(selector)!.getBoundingClientRect().top;
          return [top("h2"), top(".sl-product-price"), top(".sl-card-nutrition"), top(".sl-details-button")];
        });
        expect(order).toEqual([...order].sort((a, b) => a - b));
        if (id.endsWith("1lb")) {
          await expect(card.locator(".sl-card-reference-note")).toHaveCount(0);
        }
        count++;
      }
      const rowLayouts = await cards.evaluateAll(items => items.map(card => {
        const selectors = [".sl-product-image", ".sl-product-price", ".sl-card-nutrition-row", ".sl-details-button"];
        return selectors.map(selector => card.querySelector(selector)!.getBoundingClientRect().top);
      }));
      const groups = new Map<number, number[][]>();
      for (const positions of rowLayouts) {
        const key = Math.round(positions[0]);
        groups.set(key, [...(groups.get(key) ?? []), positions]);
      }
      for (const group of groups.values()) {
        for (let index = 0; index < group[0].length; index++) {
          const values = group.map(positions => positions[index]);
          expect(Math.max(...values) - Math.min(...values)).toBeLessThan(1);
        }
      }
      expect(await frame.locator("body").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    expect(count).toBe(11);
  });
}
