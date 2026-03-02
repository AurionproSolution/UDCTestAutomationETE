import { Locator, Page, expect } from "@playwright/test";

export class AmazonPage {
  readonly page: Page;
  readonly url: string = "https://www.amazon.in/";
  readonly mobiles: Locator;
  readonly filter1: Locator;
  readonly filter2: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mobiles = page.getByRole("link", { name: "Mobiles" });
    this.filter1 = page.getByRole("link", {
      name: "Get It Today Get It Today",
    });
    this.filter2 = page.getByRole("link", {
      name: "Get It by Tomorrow",
    });
  }

  async navigate() {
    await this.page.goto(this.url);
  }

  async goToMobiles() {
    await expect(this.mobiles).toBeVisible();
    await this.mobiles.click();
  }

  async applyFilters() {
    await expect(this.filter1).toBeVisible();
    await this.filter1.click();
    await expect(this.filter2).toBeVisible();
    await this.filter2.click();
  }
}
