import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const approvedPolicy = readFileSync("scripts/content/stellar-shipping-returns-policy.md", "utf8");
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const expectedCopy = normalize(approvedPolicy.replace(/^#{1,2} /gm, "").replace(/\*\*/g, ""));

for (const width of [1440, 390]) {
  test(`Shipping & Returns matches the approved copy without legacy terms at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    let frame = page.frameLocator("iframe").first();
    const link = frame.locator("footer").getByRole("link", { name: "Shipping & Policies", exact: true });
    await expect(link).toHaveAttribute("href", "/pages/shipping-information");
    await link.click();
    await expect(page).toHaveURL(/\/pages\/shipping-information$/);
    frame = page.frameLocator("iframe").first();
    const policy = frame.locator(".sl-shipping-page");
    await expect(policy.getByRole("heading", { name: "Shipping & Returns Policy", exact: true })).toBeVisible();
    expect(normalize((await policy.locator("h1, h2, p").allTextContents()).join(" "))).toBe(expectedCopy);
    await expect(policy).toContainText("within 30 days of delivery");
    await expect(policy).toContainText("original safety seals intact");
    await expect(policy).toContainText("Books, scales, and other non-consumable products");
    await expect(policy).toContainText("cover return shipping costs for confirmed damaged, defective, or incorrect products");
    await expect(policy.getByRole("heading", { name: "Gifts", exact: true })).toHaveCount(0);
    await expect(policy.getByRole("heading", { name: "Shipping", exact: true })).toHaveCount(1);
    await expect(policy.locator("img")).toHaveCount(1);
    await expect(policy.locator("img")).toHaveAttribute("src", /caramel-whey-lifestyle\.jpg$/);
    await expect(policy.locator("video, iframe")).toHaveCount(0);
    expect(await policy.innerText()).not.toMatch(/\b(?:CDs?|DVDs?|VHS|software|video games?|cassette|vinyl|flowers|newspapers|magazines|flammable|hazardous)\b/i);
    expect(await policy.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await policy.innerText()).not.toMatch(/PO Box|Lakeview Center Plaza|partial refunds|sale items|since your purchase|christine@/i);
    await expect(policy.locator('a[href^="mailto:"]')).toHaveAttribute("href", "mailto:allison@washncgroup.com");
  });
}
