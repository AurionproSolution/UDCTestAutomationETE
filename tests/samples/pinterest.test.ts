// import { expect, test } from "@playwright/test";
// import { pinterestPage } from "../../pages/Samples/pinterestPage";

// test("Pinterest Search and Interaction Test", async ({ page }) => {
//   // 1. Increase timeout for image-heavy pages
//   test.setTimeout(60000);

//   // const pinterest = new pinterestPage(page);
//   // await pinterest.navigate();

//   const pinterest = new pinterestPage(page);
//   await pinterest.navigate();
//   // 2. Navigate to Explore
//   await page
//     .locator('[data-test-id="ideas-tab"]')
//     .getByRole("link", { name: "Explore" })
//     .click();

//   // 3. Search for "nature"
//   const searchInput = page.locator('[data-test-id="search-box-input"]');
//   await searchInput.fill("nature");
//   await searchInput.press("Enter");

//   // 4. Wait for results to load and click the first "Pin"
//   // Instead of specific text, we target the first 'Pin' container
//   const firstPin = page.locator('[data-test-id="pin"]').first();
//   await firstPin.waitFor({ state: "visible" });
//   await firstPin.click();

//   // 5. Interaction (React/Like)
//   // Pinterest elements often change; using data-test-id is good practice
//   const reactButton = page.locator('[data-test-id="react-button"]');
//   if (await reactButton.isVisible()) {
//     await reactButton.click();
//   }

//   // 6. Handle the Save dropdown
//   // Chaining locators helps find specific buttons inside containers
//   const moreActions = page
//     .locator('[data-test-id="more-actions-button"]')
//     .first();
//   await moreActions.click();

//   const saveOption = page.locator('[data-test-id="pin-action-dropdown-save"]');
//   await expect(saveOption).toBeVisible();
//   await saveOption.click();
// });

import { test } from "@playwright/test";
import { PinterestPage } from "../../pages/Samples/pinterestPage";

test("Pinterest Search and Interaction Test", async ({ page }) => {
  // 1. Setup
  test.setTimeout(60000);
  const pinterest = new PinterestPage(page);

  // 2. Execution
  await pinterest.navigate();
  await pinterest.goToExplore();
  await pinterest.searchFor("nature");

  await pinterest.interactWithFirstPin();
  await pinterest.reactIfVisible();
  await pinterest.savePin();
});
