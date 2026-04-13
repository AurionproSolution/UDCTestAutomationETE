import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../..";

export class DOPersonalDetailsPage extends BasePage {
  readonly titleDropdown: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly genderDropdown: Locator;
  readonly dateOfBirthInput: Locator;
  readonly chooseYearButton: Locator;
  readonly maritalStatusDropdown: Locator;
  readonly noOfDependentsDropdown: Locator;
  readonly mobileNumberInput: Locator;
  readonly emailInput: Locator;
  readonly licenceTypeDropdown: Locator;
  readonly CountryOfIssueDropDown: Locator;
  readonly licenceNumber: Locator;
  readonly versionNumber: Locator;
  readonly newZealandResidentDropdown: Locator;
  readonly countryOfBirthDropdown: Locator;
  readonly countryOfCitizenshipDropdown: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.titleDropdown = page.locator(
      `//label[text()=' Title ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.firstNameInput = page.getByRole("textbox", {
      name: "First Name* Middle Name(s)",
    });
    this.lastNameInput = page
      .locator("name")
      .filter({ hasText: "Last Name" })
      .locator("#name");
    this.genderDropdown = page.locator(
      `//label[text()=' Gender ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.dateOfBirthInput = page.locator('input[name="dateOfBirth"]');
    this.chooseYearButton = page.locator(
      "page.getByRole('button', { name: 'Choose Year' })",
    );
    this.maritalStatusDropdown = page.locator(
      `//label[text()=' Marital Status ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.noOfDependentsDropdown = page.locator(
      `//label[text()=' No. of Dependants ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.mobileNumberInput = page.getByRole("textbox", {
      name: "Phone number",
    });
    this.emailInput = page.locator(
      'app-personal-detail-email-contact input[type="text"]',
    );
    this.licenceTypeDropdown = page.locator(
      `//label[text()='Licence Type']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.CountryOfIssueDropDown = page.locator(
      `//label[text()='Country of Issue']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.licenceNumber = page
      .locator("text")
      .filter({ hasText: "Licence Number" })
      .locator("#text");
    this.versionNumber = page
      .locator("text")
      .filter({ hasText: "Version Number" })
      .locator("#text");
    this.newZealandResidentDropdown = page.locator(
      `//label[text()=' New Zealand Resident?']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.countryOfBirthDropdown = page.locator(
      `//label[text()='Country of Birth']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.countryOfCitizenshipDropdown = page.locator(
      `//label[text()='Country of Citizenship']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.nextButton = page.getByRole("button", { name: "Next" });
  }

  async selectTitle(): Promise<void> {
    await this.titleDropdown.click();
  }
  async selectTitleOption(title: string): Promise<void> {
    await this.page.getByRole("option", { name: title, exact: true }).click();
  }
  async chooseTitle(title: string): Promise<void> {
    await this.selectTitle();
    await this.selectTitleOption(title);
  }
  async enterFirstName(firstName: string): Promise<void> {
    await this.fillElement(this.firstNameInput, firstName);
  }
  async enterLastName(lastName: string): Promise<void> {
    await this.fillElement(this.lastNameInput, lastName);
  }
  async selectGender(gender: string): Promise<void> {
    await this.genderDropdown.click();
  }
  async selectGenderOption(gender: string): Promise<void> {
    await this.page.getByRole("option", { name: gender, exact: true }).click();
  }
  async chooseGender(gender: string): Promise<void> {
    await this.selectGender(gender);
    await this.selectGenderOption(gender);
  }
  async enterDateOfBirth(dob: string): Promise<void> {
    await this.dateOfBirthInput.click();
    await this.chooseYearButton.click();
    await this.page.getByText("2000", { exact: true }).click();
    await this.page.getByText("Jan").click();
    await this.page.getByText("1").nth(5).click();
  }
  async selectMarritalStatus(maritalStatus: string): Promise<void> {
    await this.maritalStatusDropdown.click();
  }
  async selectMarritalStatusOption(maritalStatus: string): Promise<void> {
    await this.page
      .getByRole("option", { name: maritalStatus, exact: true })
      .click();
  }
  async chooseMarritalStatus(maritalStatus: string): Promise<void> {
    await this.selectMarritalStatus(maritalStatus);
    await this.selectMarritalStatusOption(maritalStatus);
  }
  async selectNoOfDependents(noOfDependents: string): Promise<void> {
    await this.noOfDependentsDropdown.click();
  }
  async selectNoOfDependentsOption(noOfDependents: string): Promise<void> {
    await this.page
      .getByRole("option", { name: noOfDependents, exact: true })
      .click();
  }
  async chooseNoOfDependents(noOfDependents: string): Promise<void> {
    await this.selectNoOfDependents(noOfDependents);
    await this.selectNoOfDependentsOption(noOfDependents);
  }
  async enterMobileNumber(mobileNumber: string): Promise<void> {
    await this.fillElement(this.mobileNumberInput, mobileNumber);
  }
  async enterEmail(email: string): Promise<void> {
    await this.fillElement(this.emailInput, email);
  }
  async selectLicenceTypeDropdown(): Promise<void> {
    await this.licenceTypeDropdown.click();
  }
  async selectLicenceTypeOption(licenceType: string): Promise<void> {
    await this.page
      .getByRole("option", { name: licenceType, exact: true })
      .click();
  }
  async chooseLicenceType(licenceType: string): Promise<void> {
    await this.selectLicenceTypeDropdown();
    await this.selectLicenceTypeOption(licenceType);
  }
  async selectCountryOfIssue(): Promise<void> {
    await this.CountryOfIssueDropDown.click();
  }
  async selectCountryOfIssueOption(countryOfIssue: string): Promise<void> {
    await this.page
      .getByRole("option", { name: countryOfIssue, exact: true })
      .click();
  }
  async chooseCountryOfIssue(countryOfIssue: string): Promise<void> {
    await this.selectCountryOfIssue();
    await this.selectCountryOfIssueOption(countryOfIssue);
  }
  async enterLicenceNumber(licenceNumber: string): Promise<void> {
    await this.fillElement(this.licenceNumber, licenceNumber);
  }
  async enterVersionNumber(versionNumber: string): Promise<void> {
    await this.fillElement(this.versionNumber, versionNumber);
  }

  async selectNewZealandResident(): Promise<void> {
    await this.newZealandResidentDropdown.click();
  }
  async selectNewZealandResidentOption(residentStatus: string): Promise<void> {
    await this.page
      .getByRole("option", { name: residentStatus, exact: true })
      .click();
  }
  async chooseNewZealandResident(residentStatus: string): Promise<void> {
    await this.selectNewZealandResident();
    await this.selectNewZealandResidentOption(residentStatus);
  }
  async selectCountryOfBirth(): Promise<void> {
    await this.countryOfBirthDropdown.click();
  }
  async selectCountryOfBirthOption(countryOfBirth: string): Promise<void> {
    await this.page
      .getByRole("option", { name: countryOfBirth, exact: true })
      .click();
  }
  async chooseCountryOfBirth(countryOfBirth: string): Promise<void> {
    await this.selectCountryOfBirth();
    await this.selectCountryOfBirthOption(countryOfBirth);
  }
  async selectCountryOfCitizenship(): Promise<void> {
    await this.countryOfCitizenshipDropdown.click();
  }
  async selectCountryOfCitizenshipOption(
    countryOfCitizenship: string,
  ): Promise<void> {
    await this.page
      .getByRole("option", { name: countryOfCitizenship, exact: true })
      .click();
  }
  async chooseCountryOfCitizenship(
    countryOfCitizenship: string,
  ): Promise<void> {
    await this.selectCountryOfCitizenship();
    await this.selectCountryOfCitizenshipOption(countryOfCitizenship);
  }
  async clickNextButton(): Promise<void> {
    await this.clickElement(this.nextButton);
  }
}
