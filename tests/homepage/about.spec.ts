import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const aboutStory = JSON.parse(readFileSync("scripts/content/stellar-about-story.json", "utf8"));

for (const width of [1440, 390]) {
  test(`About opens locally with the approved About copy and selected portrait at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/pages/shipping-information", { waitUntil: "domcontentloaded" });
    let frame = page.frameLocator("iframe").first();
    const link = frame.locator("footer").getByRole("link", { name: "About", exact: true });
    await expect(link).toHaveAttribute("href", "/pages/about-us");
    await link.click();
    await expect(page).toHaveURL(/\/pages\/about-us$/);
    frame = page.frameLocator("iframe").first();
    const about = frame.locator(".sl-about-page");
    await expect(about.getByRole("heading", { name: "About Stellar Labs", exact: true })).toBeVisible();
    await expect(about.getByRole("heading", { name: aboutStory.founderName, exact: true })).toBeVisible();
    await expect(about.locator(".sl-about-founder p")).toHaveText(aboutStory.founderTitle);
    await expect(about).not.toContainText(/fodmap/i);
    await expect(about.locator("#about-fodmap-note")).toHaveCount(0);
    expect(await about.locator(".sl-about-story > p").allTextContents()).toEqual(aboutStory.paragraphs);
    await expect(about.locator("img")).toHaveCount(1);
    const portrait = about.getByRole("img", { name: "Stellar Labs founder with the nutrition product range" });
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveAttribute("src", /about-founder-products\.jpg$/);
    await expect.poll(() => portrait.evaluate((img: HTMLImageElement) =>
      img.complete && img.naturalWidth === 1000)).toBe(true);
    await expect(about.locator("picture, video, iframe")).toHaveCount(0);
    await expect(frame.locator('a[href*="washingtonnutritiongroup"]')).toHaveCount(0);
    expect(await about.innerText()).not.toMatch(/telehealth|nutrition session|major insurances|1\.6 grams/i);
    expect(await about.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.frameLocator("iframe").first().locator(".sl-about-page")).toBeVisible();
    expect(await page.frameLocator("iframe").first().locator(".sl-about-story > p").allTextContents()).toEqual(aboutStory.paragraphs);
  });
}
