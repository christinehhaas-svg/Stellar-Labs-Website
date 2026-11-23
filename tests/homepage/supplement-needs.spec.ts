import { expect, test } from "@playwright/test";

test("Magnesium appears in both support filters without duplicating the full catalog", async ({ page }) => {
  await page.goto("/supplements");
  const frame = page.frameLocator(".stellar-supplements-frame");
  const products = frame.locator(".sl-product-grid");
  const magnesium = products.getByRole("heading", { name: /^Magnesium Complex\b/ });
  await expect(magnesium).toHaveCount(1);
  const allCount = await products.locator(".sl-product").count();
  await expect(frame.getByRole("navigation", { name: "Filter supplements" }).getByRole("button")).toHaveText(["Daily Wellness", "Digestive Support", "Muscle and Joint"]);
  await frame.getByRole("button", { name: "Digestive Support", exact: true }).click();
  await expect(magnesium).toBeVisible();
  await expect(products.getByRole("heading", { name: /^Digestive Enzyme\b/ })).toBeVisible();
  await frame.getByRole("button", { name: "Muscle and Joint", exact: true }).click();
  await expect(magnesium).toBeVisible();
  await frame.getByRole("button", { name: "Daily Wellness", exact: true }).click();
  await expect(magnesium).toHaveCount(0);
  await expect(products.getByRole("heading", { name: "Night Time Fat Burn", exact: true })).toHaveCount(0);
  await frame.getByTestId("filter-all").click();
  await expect(magnesium).toHaveCount(1);
  await expect(products.locator(".sl-product")).toHaveCount(allCount);
});
