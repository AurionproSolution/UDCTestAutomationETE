// import { Locator, Page } from "@playwright/test";
// import { BasePage } from "../common";
// export class pinterestPage extends BasePage {
//   readonly searchBox: Locator;
//   readonly url: string = "https://in.pinterest.com/";
//   constructor(page: Page) {
//     super(page);
//     this.searchBox = page.locator('[data-test-id="search-box-input"]');
//   }
//   async navigate() {
//     await this.navigateTo(this.url);
//   }
// }

import { Locator, Page, expect } from "@playwright/test";

export class PinterestPage {
  readonly page: Page;
  readonly exploreLink: Locator;
  readonly searchInput: Locator;
  readonly firstPin: Locator;
  readonly reactButton: Locator;
  readonly moreActionsButton: Locator;
  readonly saveOption: Locator;

  constructor(page: Page) {
    this.page = page;
    this.exploreLink = page
      .locator('[data-test-id="ideas-tab"]')
      .getByRole("link", { name: "Explore" });
    this.searchInput = page.locator('[data-test-id="search-box-input"]');
    this.firstPin = page.locator('[data-test-id="pin"]').first();
    this.reactButton = page.locator('[data-test-id="react-button"]');
    this.moreActionsButton = page
      .locator('[data-test-id="more-actions-button"]')
      .first();
    this.saveOption = page.locator('[data-test-id="pin-action-dropdown-save"]');
  }

  async navigate() {
    await this.page.goto("https://www.pinterest.com/");
  }

  async goToExplore() {
    await expect(this.exploreLink).toBeVisible();
    await this.exploreLink.click();
  }

  async searchFor(term: string) {
    await this.searchInput.fill(term);
    await this.searchInput.press("Enter");
  }

  async interactWithFirstPin() {
    await this.firstPin.waitFor({ state: "attached" });
    await this.firstPin.scrollIntoViewIfNeeded();
    await this.firstPin.click();
  }

  async reactIfVisible() {
    if (await this.reactButton.isVisible()) {
      await this.reactButton.click();
    }
  }

  async savePin() {
    await this.moreActionsButton.click();
    await expect(this.saveOption).toBeVisible();
    await this.saveOption.click();
  }
}
