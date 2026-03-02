import { test } from "@playwright/test";
import { AmazonPage } from "../../pages/Samples/amazonPage";

test("Amazon Mobile Search and Filter Test", async ({ page }) => {
  const amazonPage = new AmazonPage(page);
  await amazonPage.navigate();
  await amazonPage.goToMobiles();
  await amazonPage.applyFilters();
});
