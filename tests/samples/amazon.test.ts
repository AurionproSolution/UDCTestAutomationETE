/**
 * Amazon Gaming Laptop Search Tests
 * Sample E2E test demonstrating Playwright capabilities
 */

import { expect, test } from "@playwright/test";

test.describe("Amazon Gaming Laptop Search @sample", () => {
  test("should navigate to high-end gaming laptops and open product", async ({
    page,
  }) => {
    // 1. Open Amazon India
    await page.goto("https://www.amazon.in/");

    // 2. Navigate through Categories
    await page.getByRole("link", { name: "Mobiles" }).click();
    await page.getByRole("link", { name: "Laptops & Accessories" }).click();
    await page.getByRole("link", { name: "Laptops", exact: true }).click();
    await page
      .getByRole("link", { name: "Gaming Laptops", exact: true })
      .click();

    // 3. Handle Scrolling for the Price Filter
    const priceFilter = page.getByRole("link", { name: "Over ₹" });
    await priceFilter.scrollIntoViewIfNeeded();
    await priceFilter.click();

    // 4. Handle the Product Popup
    const page1Promise = page.waitForEvent("popup");
    await page.locator(".a-link-normal").first().click();
    const page1 = await page1Promise;

    // 5. Assertions on the new page
    await page1.waitForLoadState();
    await expect(page1).toHaveURL(/.*amazon.in.*/);

    // Check if the 'Add to Cart' button is visible on the new page
    const addToCart = page1.getByRole("button", { name: "Add to Cart" });
    await expect(addToCart).toBeVisible();

    console.log("✅ Successfully navigated to the product page in a new tab.");
  });
});




