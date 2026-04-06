import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

export class DOAddressDetailsPage extends BasePage {
  readonly residentialTypeDropdown: Locator;
  readonly timeAtAddressyear: Locator;
  readonly timeAtAddressMonth: Locator;
  readonly streetNumberInput: Locator;
  readonly streetNameInput: Locator;
  readonly cityInput: Locator;
  readonly countryDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.residentialTypeDropdown = page
      .locator("#pn_id_803")
      .getByRole("button", { name: "dropdown trigger" });
    this.timeAtAddressyear = page.getByRole("textbox", {
      name: "Time at Address (years)",
    });
    this.timeAtAddressMonth = page.locator("#text").nth(1);
    this.streetNumberInput = page
      .locator("text")
      .filter({ hasText: "Street Number" })
      .locator("#text");
    this.streetNameInput = page
      .locator("text")
      .filter({ hasText: "Street Name" })
      .locator("#text");
    this.cityInput = page.locator('input[name="physicalCity"]');
    this.countryDropdown = page
      .locator("text")
      .filter({ hasText: "Country" })
      .locator("#text");
  }
  async timeAtAddress(year: string, month: string) {
    await this.timeAtAddressyear.fill(year);
    await this.timeAtAddressMonth.fill(month);
  }
  async enterStreetNumber(streetNumber: string) {
    await this.streetNumberInput.fill(streetNumber);
  }
  async enterStreetName(streetName: string) {
    await this.streetNameInput.fill(streetName);
  }
  async enterCity(city: string) {
    await this.cityInput.click();
    await this.cityInput.type(city);
    await this.page.getByText("Wellington").click();
  }
  async chooseCountry(country: string) {
    await this.countryDropdown.click();
    await this.page.getByRole("option", { name: country }).click();
  }
}
