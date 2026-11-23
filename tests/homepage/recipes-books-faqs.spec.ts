import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`FAQs and Recipes & Books are connected and readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const home = page.frameLocator("iframe").first();
    const faqLink = home.locator("footer").getByRole("link", { name: "FAQs", exact: true });
    await expect(faqLink).toHaveAttribute("href", "/faqs");
    await expect(home.getByRole("link", { name: "Read More", exact: true })).toHaveCount(0);
    await faqLink.click();
    await expect(page).toHaveURL(/\/faqs$/);
    const faqs = page.frameLocator("iframe").first();
    await expect(faqs.getByRole("heading", { name: "FAQs", exact: true })).toBeVisible();
    await expect(faqs.locator(".sl-faq-questions > li")).toHaveCount(11);
    await expect(faqs.locator(".sl-faq-questions > li:not(#heavy-metals)")).toHaveText(Array(10).fill(/\?$/));
    await expect(faqs.locator("#heavy-metals > p")).toHaveText(
      "Yes. An independent laboratory tested all Stellar Labs Nutrition products for lead, cadmium, arsenic, and mercury. All products met the testing limits for each metal.",
    );
    await expect(faqs.locator("body")).not.toContainText(/low.fodmap/i);
    const menu = faqs.locator(".stellar-shop-navigation__menu");
    if (await menu.locator("summary").isVisible()) await menu.locator("summary").click();
    await faqs.locator(".stellar-shop-navigation").getByRole("link", { name: "Recipes & Books", exact: true }).click();
    await expect(page).toHaveURL(/\/recipes$/);
    const recipes = page.frameLocator("iframe").first();
    await expect(recipes.getByRole("heading", { name: "Recipes & Books", exact: true })).toBeVisible();
    await expect(recipes.locator('[data-testid^="card-recipe-"]')).not.toHaveCount(0);
    await recipes.getByRole("link", { name: "Books", exact: true }).click();
    const books = recipes.locator(".sl-book-card");
    await expect(books).toHaveCount(5);
    for (const card of await books.all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      await expect(card.locator("a")).toHaveAttribute("href", /^https:\/\/www\.stellarlabsnutrition\.com\/products\//);
      await expect(card.locator("a")).toHaveAttribute("target", "_blank");
      await expect.poll(() => card.locator("img").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(card.locator(".sl-book-price")).toHaveText(/^\$(19\.95|4\.99)$/);
      expect((await card.locator(".sl-book-summary").innerText()).split("\n")).toHaveLength(2);
    }
    expect(await recipes.locator("body").evaluate(body => body.scrollWidth <= body.clientWidth + 1)).toBe(true);
    await expect(page.locator("iframe").first()).toHaveAttribute("sandbox", "allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
  });
}
