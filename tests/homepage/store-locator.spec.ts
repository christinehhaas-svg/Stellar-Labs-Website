import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`Store Locator opens locally with two locations and the selected product photo at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/pages/shipping-information", { waitUntil: "domcontentloaded" });
    let frame = page.frameLocator("iframe").first();
    const link = frame.locator("footer").getByRole("link", { name: "Store Locator", exact: true });
    await expect(link).toHaveAttribute("href", "/pages/store-locator");
    await link.click();
    await expect(page).toHaveURL(/\/pages\/store-locator$/);
    frame = page.frameLocator("iframe").first();
    const locator = frame.locator(".sl-store-locator-page");
    await expect(locator.getByRole("heading", { name: "Store Locator", exact: true })).toBeVisible();
    await expect(locator.locator(".sl-store-location")).toHaveCount(2);
    await expect(locator.locator("address").nth(0)).toHaveText(/Washington Nutrition and Counseling Group\s*3335 Duke Street\s*Alexandria, VA 22314/);
    await expect(locator.locator("address").nth(1)).toHaveText(/Washington Nutrition and Counseling Group\s*20130 Lakeview Center Plaza, Suite 400\s*Ashburn, VA 20147/);
    await expect(locator.locator("img")).toHaveCount(1);
    await expect(locator.locator("img")).toHaveAttribute("src", /vegan-vanilla-lifestyle\.jpg$/);
    await expect(locator.locator("picture, video, iframe")).toHaveCount(0);
    expect(await locator.innerText()).not.toMatch(/interested in carrying|distributing|email us|telehealth|insurances/i);
    expect(await locator.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.frameLocator("iframe").first().locator(".sl-store-location")).toHaveCount(2);
  });
}
