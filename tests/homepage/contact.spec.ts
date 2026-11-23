import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`Contact Us opens locally and preserves real contact methods at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    let frame = page.frameLocator("iframe").first();
    const link = frame.locator("footer").getByRole("link", { name: "Contact Us", exact: true });
    await expect(link).toHaveAttribute("href", "/pages/contact");
    await link.click();
    await expect(page).toHaveURL(/\/pages\/contact$/);
    frame = page.frameLocator("iframe").first();
    const contact = frame.locator(".sl-contact-page");
    await expect(contact.getByRole("heading", { name: "Contact Us", exact: true })).toBeVisible();
    await expect(contact.getByRole("link", { name: "(703) 552-2722", exact: true })).toHaveAttribute("href", "tel:+17035522722");
    await expect(contact.getByRole("link", { name: "Stellarlabs@washncgroup.com", exact: true })).toHaveAttribute("href", "mailto:Stellarlabs@washncgroup.com");
    await expect(contact).toContainText("8am to 4pm");
    await expect(contact).toContainText("MONDAY - FRIDAY:");
    await expect(contact).toContainText("44031 Pipeline Plaza STE 210");
    await expect(contact).toContainText("Ashburn, VA 20147");
    await expect(contact.locator("form, input, textarea")).toHaveCount(0);
    await expect(frame.locator('a[href*="washingtonnutritiongroup"]')).toHaveCount(0);
    expect(await frame.locator("body").innerText()).not.toMatch(/Washington Nutrition Group|telehealth|nutrition session|major insurances/i);
    expect(await contact.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.frameLocator("iframe").first().locator(".sl-contact-page")).toBeVisible();
  });
}
