import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../..";

export class DOPersonalDetailsPage extends BasePage {
  readonly personalDetailsRoot: Locator;
  /** Outlined **Save** on Personal Details (SelectorHub class chain + label). */
  readonly savePersonalDetailsButton: Locator;
  readonly titleDropdown: Locator;
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly genderDropdown: Locator;
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
    this.personalDetailsRoot = page.locator("app-personal-details").first();
    this.titleDropdown = page.locator(
      `//label[text()=' Title ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.firstNameInput = page
      .locator("text")
      .filter({ hasText: /^First Name/ })
      .locator("#text");
    this.middleNameInput = page
      .locator("text")
      .filter({ hasText: /^Middle Name/ })
      .locator("#text");
    this.lastNameInput = page
      .locator("text")
      .filter({ hasText: /^Last Name/ })
      .locator("#text");
    this.genderDropdown = page.locator(
      `//label[text()=' Gender ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
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
    this.savePersonalDetailsButton = page
      .locator(
        "button.p-ripple.p-element.p-button.p-component.p-button-outlined",
      )
      .filter({ hasText: /^Save$/i });
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Personal details";
  }

  /**
   * Open a PrimeNG dropdown trigger, then dismiss the panel **without** choosing an option.
   * Required so Angular marks the control touched and **Save** surfaces `… is required` messages.
   */
  private async touchRequiredDropdownWithoutSelection(
    trigger: Locator,
  ): Promise<void> {
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 15_000 });
    const listbox = this.page.getByRole("listbox");
    await listbox.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
    await this.page.keyboard.press("Escape");
    await this.page.keyboard.press("Escape").catch(() => {});
    await listbox.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  async selectTitle(): Promise<void> {
    this.logStep("Opened title dropdown");
    await this.titleDropdown.click();
  }
  async selectTitleOption(title: string): Promise<void> {
    this.logStep(`Selected title: ${this.stepValueDisplay(title)}`);
    await this.page.getByRole("option", { name: title, exact: true }).click();
  }
  async chooseTitle(title: string): Promise<void> {
    this.logStep(`Chose title: ${this.stepValueDisplay(title)}`);
    const t = title.trim();
    if (!t) {
      await this.touchRequiredDropdownWithoutSelection(this.titleDropdown);
      return;
    }
    await this.selectTitle();
    await this.selectTitleOption(t);
  }
  async enterFirstName(firstName: string): Promise<void> {
    this.logStep(`Entered first name as ${this.stepValueDisplay(firstName)}`);
    await this.fillElement(this.firstNameInput, firstName);
  }
  async enterMiddleName(middleName: string): Promise<void> {
    this.logStep(`Entered middle name as ${this.stepValueDisplay(middleName)}`);
    if (!middleName.trim()) {
      return;
    }
    await this.fillElement(this.middleNameInput, middleName);
  }
  async enterLastName(lastName: string): Promise<void> {
    this.logStep(`Entered last name as ${this.stepValueDisplay(lastName)}`);
    await this.fillElement(this.lastNameInput, lastName);
  }
  async selectGender(gender: string): Promise<void> {
    this.logStep(`Opened gender dropdown (for: ${this.stepValueDisplay(gender)})`);
    await this.genderDropdown.click();
  }
  async selectGenderOption(gender: string): Promise<void> {
    this.logStep(`Selected gender: ${this.stepValueDisplay(gender)}`);
    await this.page.getByRole("option", { name: gender, exact: true }).click();
  }
  async chooseGender(gender: string): Promise<void> {
    this.logStep(`Chose gender: ${this.stepValueDisplay(gender)}`);
    const g = gender.trim();
    if (!g) {
      await this.touchRequiredDropdownWithoutSelection(this.genderDropdown);
      return;
    }
    await this.selectGender(g);
    await this.selectGenderOption(g);
  }

  /**
   * **Date of Birth** (`p-calendar`). Scoped to `app-personal-details` only — avoid full-page
   * `nth-child` chains from SelectorHub (they break when step layout or wrapper depth changes).
   */
  private async resolveDateOfBirthInput(): Promise<Locator> {
    const root = this.personalDetailsRoot;
    await root.waitFor({ state: "visible", timeout: 60_000 });

    const byRole = root.getByRole("textbox", { name: /Date of Birth/i });
    if (await byRole.isVisible({ timeout: 6_000 }).catch(() => false)) {
      return byRole;
    }

    const byName = root.locator('input[name="dateOfBirth"]');
    if (await byName.first().isVisible({ timeout: 6_000 }).catch(() => false)) {
      return byName.first();
    }

    const labelCal = root
      .locator("label")
      .filter({ hasText: /Date of Birth/i })
      .first()
      .locator(
        "xpath=following::p-calendar[1]//input[contains(@class,'p-inputtext')][1]",
      );
    if (await labelCal.isVisible({ timeout: 6_000 }).catch(() => false)) {
      return labelCal;
    }

    const floatCal = root
      .locator(".p-float-label")
      .filter({ hasText: /Date of Birth/i })
      .first()
      .locator("input.p-inputtext");
    if (await floatCal.isVisible({ timeout: 6_000 }).catch(() => false)) {
      return floatCal;
    }

    const firstCal = root
      .locator("p-calendar")
      .first()
      .locator("input.p-inputtext");
    if (await firstCal.isVisible({ timeout: 6_000 }).catch(() => false)) {
      return firstCal;
    }

    throw new Error(
      "Date of Birth input not found under app-personal-details " +
        "(tried accessible name, input[name=dateOfBirth], label→p-calendar, float-label, first p-calendar).",
    );
  }

  async enterDateOfBirth(dob: string): Promise<void> {
    this.logStep(`Entered date of birth as ${this.stepValueDisplay(dob)}`);
    const dateOfBirthInput = await this.resolveDateOfBirthInput();
    if (!dob.trim()) {
      await dateOfBirthInput.waitFor({ state: "visible", timeout: 20_000 });
      await dateOfBirthInput.click();
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page.keyboard.press("Tab").catch(() => {});
      return;
    }
    await dateOfBirthInput.waitFor({ state: "visible", timeout: 20_000 });
    try {
      await this.clickAndFillElement(dateOfBirthInput, dob);
    } catch {
      await dateOfBirthInput.fill(dob, { force: true });
    }
    await this.page.keyboard.press("Tab");
    await this.page.keyboard.press("Escape").catch(() => {});
  }
  async selectMarritalStatus(maritalStatus: string): Promise<void> {
    this.logStep(`Opened marital status dropdown (for: ${this.stepValueDisplay(maritalStatus)})`);
    await this.maritalStatusDropdown.click();
  }
  async selectMarritalStatusOption(maritalStatus: string): Promise<void> {
    this.logStep(`Selected marital status: ${this.stepValueDisplay(maritalStatus)}`);
    await this.page
      .getByRole("option", { name: maritalStatus, exact: true })
      .click();
  }
  async chooseMarritalStatus(maritalStatus: string): Promise<void> {
    this.logStep(`Chose marital status: ${this.stepValueDisplay(maritalStatus)}`);
    const m = maritalStatus.trim();
    if (!m) {
      await this.touchRequiredDropdownWithoutSelection(
        this.maritalStatusDropdown,
      );
      return;
    }
    await this.selectMarritalStatus(m);
    await this.selectMarritalStatusOption(m);
  }
  async selectNoOfDependents(noOfDependents: string): Promise<void> {
    this.logStep(`Opened no. of dependants dropdown (for: ${this.stepValueDisplay(noOfDependents)})`);
    await this.noOfDependentsDropdown.click();
  }
  async selectNoOfDependentsOption(noOfDependents: string): Promise<void> {
    this.logStep(`Selected no. of dependants: ${this.stepValueDisplay(noOfDependents)}`);
    await this.page
      .getByRole("option", { name: noOfDependents, exact: true })
      .click();
  }
  async chooseNoOfDependents(noOfDependents: string): Promise<void> {
    this.logStep(`Chose no. of dependants: ${this.stepValueDisplay(noOfDependents)}`);
    const n = noOfDependents.trim();
    if (!n) {
      await this.touchRequiredDropdownWithoutSelection(
        this.noOfDependentsDropdown,
      );
      return;
    }
    await this.selectNoOfDependents(n);
    await this.selectNoOfDependentsOption(n);
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /**
   * After **No. of Dependants** is set, Angular renders age fields (often delayed). Locators tried in order:
   * `p-inputnumber` inner input, `p-inputnumber-input` class, full PrimeNG class string, then inputs in the
   * same grid as the dependants dropdown. Values use **keystrokes** + Tab so `p-inputnumber` binds correctly.
   */
  async fillDependantsAgesInYears(ages: string[]): Promise<void> {
    this.logStep(
      `Filled dependants ages (years): ${this.stepValueDisplay(ages.join(", "), 200)}`,
    );
    if (ages.length === 0) {
      return;
    }
    const need = ages.length;
    const root = this.personalDetailsRoot;
    const fromDependantsGrid = this.noOfDependentsDropdown.locator(
      "xpath=ancestor::div[contains(@class,'grid')][1]",
    );
    const fromDepSmallestWithInputNumber = this.noOfDependentsDropdown.locator(
      "xpath=ancestor::div[.//p-inputnumber][1]",
    );

    const candidateChains: Locator[] = [
      fromDepSmallestWithInputNumber.locator(
        "p-inputnumber input.p-inputtext, p-inputnumber input",
      ),
      fromDependantsGrid.locator("p-inputnumber input.p-inputtext, p-inputnumber input"),
      root.locator("p-inputnumber input.p-inputtext, p-inputnumber input"),
      root.locator("xpath=.//input[contains(@class,'p-inputnumber-input')]"),
      root.locator(
        "input.p-inputtext.p-component.p-element.p-inputnumber-input",
      ),
      root.getByRole("spinbutton"),
    ];

    let inputs: Locator | null = null;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      for (const chain of candidateChains) {
        const c = await chain.count();
        if (c >= need) {
          inputs = chain;
          break;
        }
      }
      if (inputs) {
        break;
      }
      await this.page.waitForTimeout(400);
    }

    if (!inputs) {
      throw new Error(
        `Dependants age: after waiting, could not find ${need} field(s). ` +
          `Tried p-inputnumber inputs, p-inputnumber-input class, and spinbuttons under app-personal-details.`,
      );
    }

    const count = await inputs.count();
    const start = count > need ? count - need : 0;
    for (let i = 0; i < need; i++) {
      const field = inputs.nth(start + i);
      await field.waitFor({ state: "visible", timeout: 10000 });
      await field.scrollIntoViewIfNeeded();
      await field.click();
      await field.press("Control+A");
      await field.pressSequentially(ages[i], { delay: 35 });
      await field.press("Tab");
      await this.page.waitForTimeout(150);
    }
  }

  async enterMobileNumber(mobileNumber: string): Promise<void> {
    this.logStep(`Entered mobile number as ${this.stepValueDisplay(mobileNumber)}`);
    await this.fillElement(this.mobileNumberInput, mobileNumber);
  }
  async enterEmail(email: string): Promise<void> {
    this.logStep(`Entered email as ${this.stepValueDisplay(email)}`);
    await this.fillElement(this.emailInput, email);
  }
  async selectLicenceTypeDropdown(): Promise<void> {
    this.logStep("Opened licence type dropdown");
    await this.licenceTypeDropdown.click();
  }
  async selectLicenceTypeOption(licenceType: string): Promise<void> {
    this.logStep(`Selected licence type: ${this.stepValueDisplay(licenceType)}`);
    await this.page
      .getByRole("option", { name: licenceType, exact: true })
      .click();
  }
  async chooseLicenceType(licenceType: string): Promise<void> {
    this.logStep(`Chose licence type: ${this.stepValueDisplay(licenceType)}`);
    const l = licenceType.trim();
    if (!l) {
      await this.touchRequiredDropdownWithoutSelection(
        this.licenceTypeDropdown,
      );
      return;
    }
    await this.selectLicenceTypeDropdown();
    await this.selectLicenceTypeOption(l);
  }
  async selectCountryOfIssue(): Promise<void> {
    this.logStep("Opened country of issue dropdown");
    await this.CountryOfIssueDropDown.click();
  }
  async selectCountryOfIssueOption(countryOfIssue: string): Promise<void> {
    this.logStep(`Selected country of issue: ${this.stepValueDisplay(countryOfIssue)}`);
    await this.page
      .getByRole("option", { name: countryOfIssue, exact: true })
      .click();
  }
  async chooseCountryOfIssue(countryOfIssue: string): Promise<void> {
    this.logStep(`Chose country of issue: ${this.stepValueDisplay(countryOfIssue)}`);
    const c = countryOfIssue.trim();
    if (!c) {
      await this.touchRequiredDropdownWithoutSelection(
        this.CountryOfIssueDropDown,
      );
      return;
    }
    await this.selectCountryOfIssue();
    await this.selectCountryOfIssueOption(c);
  }
  async enterLicenceNumber(licenceNumber: string): Promise<void> {
    this.logStep(`Entered licence number as ${this.stepValueDisplay(licenceNumber)}`);
    await this.fillElement(this.licenceNumber, licenceNumber);
  }
  async enterVersionNumber(versionNumber: string): Promise<void> {
    this.logStep(`Entered version number as ${this.stepValueDisplay(versionNumber)}`);
    await this.fillElement(this.versionNumber, versionNumber);
  }

  async selectNewZealandResident(): Promise<void> {
    this.logStep("Opened New Zealand resident dropdown");
    await this.newZealandResidentDropdown.click();
  }
  async selectNewZealandResidentOption(residentStatus: string): Promise<void> {
    this.logStep(`Selected New Zealand resident: ${this.stepValueDisplay(residentStatus)}`);
    await this.page
      .getByRole("option", { name: residentStatus, exact: true })
      .click();
  }
  async chooseNewZealandResident(residentStatus: string): Promise<void> {
    this.logStep(`Chose New Zealand resident: ${this.stepValueDisplay(residentStatus)}`);
    const r = residentStatus.trim();
    if (!r) {
      await this.touchRequiredDropdownWithoutSelection(
        this.newZealandResidentDropdown,
      );
      return;
    }
    await this.selectNewZealandResident();
    await this.selectNewZealandResidentOption(r);
  }
  async selectCountryOfBirth(): Promise<void> {
    this.logStep("Opened country of birth dropdown");
    await this.countryOfBirthDropdown.click();
  }
  async selectCountryOfBirthOption(countryOfBirth: string): Promise<void> {
    this.logStep(`Selected country of birth: ${this.stepValueDisplay(countryOfBirth)}`);
    await this.page
      .getByRole("option", { name: countryOfBirth, exact: true })
      .click();
  }
  async chooseCountryOfBirth(countryOfBirth: string): Promise<void> {
    this.logStep(`Chose country of birth: ${this.stepValueDisplay(countryOfBirth)}`);
    const c = countryOfBirth.trim();
    if (!c) {
      await this.touchRequiredDropdownWithoutSelection(
        this.countryOfBirthDropdown,
      );
      return;
    }
    await this.selectCountryOfBirth();
    await this.selectCountryOfBirthOption(c);
  }
  async selectCountryOfCitizenship(): Promise<void> {
    this.logStep("Opened country of citizenship dropdown");
    await this.countryOfCitizenshipDropdown.click();
  }
  async selectCountryOfCitizenshipOption(
    countryOfCitizenship: string,
  ): Promise<void> {
    this.logStep(`Selected country of citizenship: ${this.stepValueDisplay(countryOfCitizenship)}`);
    await this.page
      .getByRole("option", { name: countryOfCitizenship, exact: true })
      .click();
  }
  async chooseCountryOfCitizenship(
    countryOfCitizenship: string,
  ): Promise<void> {
    this.logStep(`Chose country of citizenship: ${this.stepValueDisplay(countryOfCitizenship)}`);
    const c = countryOfCitizenship.trim();
    if (!c) {
      await this.touchRequiredDropdownWithoutSelection(
        this.countryOfCitizenshipDropdown,
      );
      return;
    }
    await this.selectCountryOfCitizenship();
    await this.selectCountryOfCitizenshipOption(c);
  }

  /** Clicks outlined **Save**; Angular then shows `p-error` / inline messages for empty required fields. */
  async clickSavePersonalDetails(): Promise<void> {
    this.logStep("Click Save Personal Details");
    await this.savePersonalDetailsButton.waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await this.savePersonalDetailsButton.scrollIntoViewIfNeeded();
    await this.savePersonalDetailsButton.click({ timeout: 15_000 });
  }

  /**
   * After **Save** with required Personal Details left unset/empty, expect the standard validation copy
   * (matches on-screen `* is required` messages).
   */
  async expectPersonalDetailsRequiredValidationMessages(): Promise<void> {
    this.logStep("Expect Personal Details Required Validation Messages");
    const root = this.personalDetailsRoot;
    const messages = [
      "Title is required",
      "First Name is required",
      "Last Name is required",
      "Gender is required",
      "Date of Birth is required",
      "Marital Status is required",
      "Number of Dependants is required",
      "Mobile Number is required",
      "Email is required",
      "Licence Type is required",
      "New Zealand Resident is required",
      "Country of Birth is required",
      "Country of Citizenship is required",
    ] as const;
    for (const msg of messages) {
      await expect(root.getByText(msg, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
    }
  }

  /**
   * After **Save** with invalid First/Last name, phone, email, licence / version values, expect only
   * the format / pattern messages for those fields (other sections should be valid from prior steps).
   */
  async expectPersonalDetailsInvalidFormatValidationMessages(): Promise<void> {
    this.logStep("Expect Personal Details Invalid Format Validation Messages");
    const root = this.personalDetailsRoot;
    const messages = [
      "First Name is in an incorrect format",
      "Last Name is in an incorrect format",
      "Phone Number is in an incorrect format",
      "Email is in an incorrect format",
      "Licence Number should start with 2 letters followed by 6 digits",
      "Version Number is in an incorrect format",
    ] as const;
    for (const msg of messages) {
      await expect(root.getByText(msg, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
    }
  }

  async clickNextButton(): Promise<void> {
    this.logStep("Click Next Button");
    const startTime = Date.now();
    try {
      await this.nextButton.waitFor({ state: "visible", timeout: 120000 });
      this.log(`clickNextButton: button visible after ${Date.now() - startTime}ms`);

      for (let i = 0; i < 120; i++) {
        if (await this.nextButton.isEnabled().catch(() => false)) break;
        await this.page.waitForTimeout(500);
      }
      this.log(`clickNextButton: button enabled after ${Date.now() - startTime}ms`);

      await this.nextButton.scrollIntoViewIfNeeded();
      await this.clickElement(this.nextButton);
      this.log(`clickNextButton: click done after ${Date.now() - startTime}ms`);

      // Guard against page closure and reduce blocking waits
      if (!this.page.isClosed()) {
        await this.page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
        this.log(`clickNextButton: domcontentloaded done after ${Date.now() - startTime}ms`);
      }
      if (!this.page.isClosed()) {
        await this.page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
        this.log(`clickNextButton: networkidle done after ${Date.now() - startTime}ms`);
      }
    } catch (err) {
      this.log(
        `clickNextButton failed after ${Date.now() - startTime}ms: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
 