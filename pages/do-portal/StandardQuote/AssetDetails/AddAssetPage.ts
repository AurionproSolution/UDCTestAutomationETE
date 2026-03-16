import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../..";

export class DOAddAssetPage extends BasePage {
  // Locators
  readonly addAssetButton: Locator;

  // DO Portal specific locators for Add Asset page can be added here
  constructor(page: Page) {
    super(page);
    this.addAssetButton = page.getByRole("button", { name: "Add Asset" });
  }
}
