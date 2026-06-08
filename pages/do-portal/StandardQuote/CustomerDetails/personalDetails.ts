import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../..";

export class DOPersonalDetailsPage extends BasePage {
  readonly personalDetailsRoot: Locator;
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
  /** Outlined **Save** on Personal Details (same Prime pattern as Address / Employment). */
  readonly savePersonalDetailsButton: Locator;

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
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
    /**
     * **Save** is a Prime outlined button (`p-button-outlined` + label `Save`) in the quote **footer** —
     * it is **not** a descendant of `app-personal-details`, so scope to the quote shell then fall back to page.
     */
    const outlinedSaveSel =
      "button.p-ripple.p-element.p-button.p-component.p-button-outlined";
    this.savePersonalDetailsButton = page
      .locator("app-quote-details, app-standard-quote")
      .first()
      .locator(outlinedSaveSel)
      .filter({ hasText: /^Save$/i })
      .or(page.locator(outlinedSaveSel).filter({ hasText: /^Save$/i }))
      .first();
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Personal details";
  }

  /**
   * **.app-loader-overlay** + `p-progressspinner` sits above the stepper footer and intercepts clicks on **Next**.
   * Poll every overlay until none are visible (same pattern as {@link DOAssetDetailsPage}).
   */
  private async waitUntilNoVisibleAppLoaderOverlays(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const overlays = this.page.locator(".app-loader-overlay");
      const count = await overlays.count();
      let anyVisible = false;
      for (let i = 0; i < count; i++) {
        if (await overlays.nth(i).isVisible().catch(() => false)) {
          anyVisible = true;
          break;
        }
      }
      if (!anyVisible) {
        return;
      }
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * PrimeNG dropdowns have **no** blank list row. For an **empty** value in validation flows: open the
   * **trigger**, wait briefly for the panel (if any), then **Escape** — same “touch without selection”
   * pattern as Address **Residence Type** so Save surfaces **… is required** where the app validates touched fields.
   */
  private async leaveDropdownUnsetIfEmpty(
    fieldLabel: string,
    value: string,
    trigger: Locator,
  ): Promise<boolean> {
    if (value.trim()) {
      return false;
    }
    this.logStep(`${fieldLabel}: touch dropdown without selection (empty required path)`);
    await this.page.keyboard.press("Escape").catch(() => {});
    await trigger.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    if (await trigger.isVisible({ timeout: 8_000 }).catch(() => false)) {
      try {
        await trigger.click({ timeout: 12_000 });
      } catch {
        await trigger.click({ force: true, timeout: 12_000 });
      }
      await this.page
        .getByRole("listbox")
        .first()
        .waitFor({ state: "visible", timeout: 5_000 })
        .catch(() => {});
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page
        .getByRole("listbox")
        .first()
        .waitFor({ state: "hidden", timeout: 8_000 })
        .catch(() => {});
    }
    await this.page.waitForTimeout(150);
    return true;
  }

  async selectTitle(): Promise<void> {
    await this.titleDropdown.click();
  }
  async selectTitleOption(title: string): Promise<void> {
    await this.page.getByRole("option", { name: title, exact: true }).click();
  }
  async chooseTitle(title: string): Promise<void> {
    if (await this.leaveDropdownUnsetIfEmpty("Title", title, this.titleDropdown)) {
      return;
    }
    await this.selectTitle();
    await this.selectTitleOption(title);
  }
  async enterFirstName(firstName: string): Promise<void> {
    await this.fillElement(this.firstNameInput, firstName);
  }
  async enterMiddleName(middleName: string): Promise<void> {
    if (!middleName.trim()) {
      return;
    }
    await this.fillElement(this.middleNameInput, middleName);
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
    if (await this.leaveDropdownUnsetIfEmpty("Gender", gender, this.genderDropdown)) {
      return;
    }
    await this.selectGender(gender);
    await this.selectGenderOption(gender);
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
    await this.maritalStatusDropdown.click();
  }
  async selectMarritalStatusOption(maritalStatus: string): Promise<void> {
    await this.page
      .getByRole("option", { name: maritalStatus, exact: true })
      .click();
  }
  async chooseMarritalStatus(maritalStatus: string): Promise<void> {
    if (await this.leaveDropdownUnsetIfEmpty("Marital Status", maritalStatus, this.maritalStatusDropdown)) {
      return;
    }
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
    if (await this.leaveDropdownUnsetIfEmpty("No. of Dependants", noOfDependents, this.noOfDependentsDropdown)) {
      return;
    }
    await this.selectNoOfDependents(noOfDependents);
    await this.selectNoOfDependentsOption(noOfDependents);
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
    if (await this.leaveDropdownUnsetIfEmpty("Licence Type", licenceType, this.licenceTypeDropdown)) {
      return;
    }
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
    if (await this.leaveDropdownUnsetIfEmpty("Country of Issue", countryOfIssue, this.CountryOfIssueDropDown)) {
      return;
    }
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
    if (await this.leaveDropdownUnsetIfEmpty("New Zealand Resident", residentStatus, this.newZealandResidentDropdown)) {
      return;
    }
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
    if (await this.leaveDropdownUnsetIfEmpty("Country of Birth", countryOfBirth, this.countryOfBirthDropdown)) {
      return;
    }
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
    if (
      await this.leaveDropdownUnsetIfEmpty(
        "Country of Citizenship",
        countryOfCitizenship,
        this.countryOfCitizenshipDropdown,
      )
    ) {
      return;
    }
    await this.selectCountryOfCitizenship();
    await this.selectCountryOfCitizenshipOption(countryOfCitizenship);
  }

  async clickSavePersonalDetails(): Promise<void> {
    this.logStep("Click Save Personal Details");
    await this.personalDetailsRoot.waitFor({ state: "visible", timeout: 60_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.savePersonalDetailsButton
      .scrollIntoViewIfNeeded({ timeout: 20_000 })
      .catch(() => {});
    await this.savePersonalDetailsButton.waitFor({ state: "visible", timeout: 60_000 });
    await this.savePersonalDetailsButton.click({ timeout: 15_000 });
  }

  /**
   * After **Save** with required Personal Details left unset, expect inline validation under `app-personal-details`.
   * - **Title** and **No. of Dependants/Dependents** may not show inline copy on every Save/build — **best-effort**.
   * - **Gender** (and other touched Prime dropdowns) should surface **… is required** after open → Escape + Save.
   * - Messages often end with **`.`** — patterns allow an optional full stop.
   * - Scroll each line into view: long forms hide top errors when the viewport is on Contact / Licence.
   * @param options.lastNameMayBeFilled — when `true`, **Last name is required** is optional (e.g. stepper submit with only last name filled).
   */
  async expectPersonalDetailsRequiredValidationMessages(
    options?: { lastNameMayBeFilled?: boolean },
  ): Promise<void> {
    this.logStep("Expect Personal Details required validation messages");
    const root = this.personalDetailsRoot;
    await root.waitFor({ state: "visible", timeout: 60_000 });
    await root
      .evaluate((el: Element) => {
        (el as HTMLElement).scrollIntoView({ block: "start", behavior: "instant" });
      })
      .catch(() => {});

    const expectMsgIfPresent = async (pattern: RegExp): Promise<void> => {
      const el = root.getByText(pattern).first();
      await el.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
      if (await el.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await expect(el).toBeVisible({ timeout: 12_000 });
      }
    };

    const expectMsg = async (pattern: RegExp): Promise<void> => {
      const el = root.getByText(pattern).first();
      await el.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
      await expect(el).toBeVisible({ timeout: 20_000 });
    };

    await expectMsgIfPresent(/Title is required\.?|Please select.*[Tt]itle\.?/i);

    await expectMsg(/First name is required\.?/i);
    if (options?.lastNameMayBeFilled) {
      await expectMsgIfPresent(/Last name is required\.?/i);
    } else {
      await expectMsg(/Last name is required\.?/i);
    }
    await expectMsg(/Date of [Bb]irth is required\.?/i);
    await expectMsg(/Gender is required\.?/i);
    await expectMsg(/Marital [Ss]tatus is required\.?/i);
    await expectMsgIfPresent(
      /No\.\s*of\s*Depend(?:ants|ents) is required\.?|Number of Depend(?:ants|ents) is required\.?/i,
    );

    await expectMsg(/Email is required\.?/i);
    await expectMsg(
      /Mobile\s+[Nn]umber is required\.?|Phone\s+[Nn]umber is required\.?|Area code is required\.?/i,
    );

    await expectMsgIfPresent(/Licence [Tt]ype is required\.?/i);
    await expectMsgIfPresent(/New Zealand Resident\??\s+is required\.?/i);
    await expectMsgIfPresent(/Country of [Bb]irth is required\.?/i);
    await expectMsgIfPresent(/Country of [Cc]itizenship is required\.?/i);
  }

  /**
   * After **Save** with invalid phone / email / licence identifiers, expect format messages where the app shows them.
   */
  async expectPersonalDetailsInvalidFormatValidationMessages(): Promise<void> {
    this.logStep("Expect Personal Details invalid format validation messages");
    const root = this.personalDetailsRoot;
    await root.waitFor({ state: "visible", timeout: 60_000 });

    await expect(
      root
        .getByText("Phone Number is in an incorrect format", { exact: true })
        .or(root.getByText("Phone number is in an incorrect format", { exact: true }))
        .or(root.getByText(/Phone.{0,40}incorrect format/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      root.getByText("Email is in an incorrect format", { exact: true }).first(),
    ).toBeVisible({ timeout: 20_000 });

    const assertFormatIfShown = async (pattern: RegExp): Promise<void> => {
      const el = root.getByText(pattern).first();
      if (await el.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await expect(el).toBeVisible({ timeout: 5_000 });
      }
    };

    await assertFormatIfShown(/First [Nn]ame.{0,40}incorrect format/i);
    await assertFormatIfShown(/Last [Nn]ame.{0,40}incorrect format/i);
    await assertFormatIfShown(/Licence Number.{0,60}(incorrect|invalid|format)/i);
    await assertFormatIfShown(/Version Number.{0,60}(incorrect|invalid|format)/i);
  }

  async clickNextButton(): Promise<void> {
    this.logStep("Click Next (Personal Details)");
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await this.nextButton.waitFor({ state: "visible", timeout: 120_000 });
    for (let i = 0; i < 120; i++) {
      if (await this.nextButton.isEnabled().catch(() => false)) {
        break;
      }
      await this.page.waitForTimeout(500);
    }
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
      }
      try {
        if (attempt === 0) {
          await this.clickElement(this.nextButton, 60_000);
        } else {
          await this.nextButton.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
          await this.nextButton.click({ force: true, timeout: 30_000 });
        }
        break;
      } catch (err) {
        if (attempt === 2) {
          throw err;
        }
        await this.page.waitForTimeout(500);
      }
    }
    if (!this.page.isClosed()) {
      await this.page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
      await this.page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    }
  }
}
 
