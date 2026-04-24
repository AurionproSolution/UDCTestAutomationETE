import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/** Manual physical-address step: core fields plus optional detail rows (skipped if absent for a product). */
export type DOPhysicalAddressManualData = {
  streetNumber: string;
  streetName: string;
  city: string;
  country: string;
  residenceType: string;
  timeAtYears: string;
  timeAtMonths: string;
  buildingName?: string;
  unitType?: string;
  unitLotNumber?: string;
  streetType?: string;
  streetDirection?: string;
  ruralDelivery?: string;
  suburb?: string;
  postcode?: string;
};

export type DOPreviousPhysicalRequiredData = {
  years: string;
  months: string;
  streetNumber: string;
  streetName: string;
  city: string;
  country: string;
};

/** Separate postal card when “reuse for postal” is off (only filled if that section exists). */
export type DOPostalAddressManualData = {
  streetNumber: string;
  streetName: string;
  city: string;
  country: string;
};

export class DOAddressDetailsPage extends BasePage {
  /** Current-address card (contains physical search); avoids strict mode on duplicate Street/Country rows */
  readonly physicalAddressBlock: Locator;
  readonly residentialTypeDropdown: Locator;
  readonly streetNumberInput: Locator;
  readonly streetNameInput: Locator;
  readonly cityInput: Locator;
  readonly countryDropdown: Locator;

  readonly physicalSearchInput: Locator;
  readonly reusePostalAddressToggle: Locator;
  /** Previous-address card (contains previous search); scopes Years/Months and street rows */
  readonly previousAddressBlock: Locator;
  readonly previousSearchInput: Locator;
  readonly postalSearchInput: Locator;
  readonly nextButton: Locator;

  readonly previousStreetNumberInput: Locator;
  readonly previousStreetNameInput: Locator;
  readonly previousCityInput: Locator;
  readonly previousCountryDropdown: Locator;

  readonly postalStreetNumberInput: Locator;
  readonly postalStreetNameInput: Locator;
  readonly postalCityInput: Locator;
  readonly postalCountryDropdown: Locator;

  /** Angular host for SelectorHub / QAT paths (narrower than div+physicalSearch). */
  readonly physicalAddressRoot: Locator;
  readonly previousAddressRoot: Locator;

  constructor(page: Page) {
    super(page);
    this.physicalAddressBlock = page
      .locator("div")
      .filter({ has: page.locator('input[name="physicalSearchValue"]') })
      .first();
    this.physicalAddressRoot = page.locator("app-physical-address").first();
    this.previousAddressRoot = page.locator("app-previous-address").first();
    // Residence Type only — never `.first()` on all triggers in a wide div (that hits Dealer / other chrome).
    this.residentialTypeDropdown = this.physicalAddressRoot
      .locator("label")
      .filter({
        hasText: /Residence\s*Type|Type\s+of\s+Residence|Residential\s*(type|status)?/i,
      })
      .first()
      .locator(
        "xpath=following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      )
      .or(
        this.physicalAddressRoot
          .locator("label")
          .filter({
            hasText: /Residence\s*Type|Type\s+of\s+Residence|Residential\s*(type|status)?/i,
          })
          .first()
          .locator(
            "xpath=preceding::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
          ),
      )
      .or(
        this.physicalAddressRoot
          .locator("xpath=.//span[contains(@class,'p-float-label')][.//label[contains(.,'Residence')]]//*[contains(@class,'p-dropdown-trigger')][1]"),
      );
    this.streetNumberInput = this.physicalAddressBlock
      .locator("text")
      .filter({ hasText: "Street Number" })
      .locator("#text")
      .first();
    this.streetNameInput = this.physicalAddressBlock
      .locator("text")
      .filter({ hasText: "Street Name" })
      .locator("#text")
      .first();
    this.cityInput = page.locator('input[name="physicalCity"]');
    // Country is a PrimeNG dropdown (chevron), not the #text input; last trigger in this card is Country.
    this.countryDropdown = this.physicalAddressBlock
      .getByRole("button", { name: "dropdown trigger" })
      .last();

    this.physicalSearchInput = page.locator('input[name="physicalSearchValue"]');
    this.reusePostalAddressToggle = page
      .locator("div")
      .filter({ hasText: /Reuse for Postal Address/ })
      .locator(".p-inputswitch-slider")
      .first();
    this.previousAddressBlock = page
      .locator("div")
      .filter({ has: page.locator('input[name="previousSearchValue"]') })
      .first();
    this.previousSearchInput = page.locator('input[name="previousSearchValue"]');
    this.postalSearchInput = page.locator('input[name="postalSearchValue"]');
    this.nextButton = page.getByRole("button", { name: "Next" }).last();

    // Scope to `app-previous-address` only — broad `previousAddressBlock` can resolve the wrong "Street Number" row.
    this.previousStreetNumberInput = this.previousAddressRoot
      .locator("text")
      .filter({ hasText: /^Street Number/i })
      .locator("#text")
      .first()
      .or(this.previousAddressRoot.locator('input[name="previousStreetNumber"]'));
    this.previousStreetNameInput = this.previousAddressRoot
      .locator("text")
      .filter({ hasText: /^Street Name/i })
      .locator("#text")
      .first()
      .or(this.previousAddressRoot.locator('input[name="previousStreetName"]'));
    this.previousCityInput = this.previousAddressRoot
      .locator('input[name="previousCity"]')
      .or(
        this.previousAddressRoot
          .locator("text")
          .filter({ hasText: /^City\s*\*?$/i })
          .locator("#text")
          .first(),
      );
    this.previousCountryDropdown = this.previousAddressRoot
      .getByRole("button", { name: "dropdown trigger" })
      .last();

    this.postalStreetNumberInput = page
      .locator("text")
      .filter({ hasText: "Street Number" })
      .locator("#text")
      .nth(2);
    this.postalStreetNameInput = page
      .locator("text")
      .filter({ hasText: "Street Name" })
      .locator("#text")
      .nth(2);
    this.postalCityInput = page
      .locator("text")
      .filter({ hasText: "City" })
      .locator("#text")
      .nth(2);
    this.postalCountryDropdown = page
      .locator("text")
      .filter({ hasText: "Country" })
      .locator("#text")
      .nth(2);
  }

  async selectResidenceType(residenceType: string) {
    const rx = new RegExp(residenceType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(200);

    const clickOptionInOpenDropdown = async (): Promise<boolean> => {
      const itemMatch = this.page
        .locator("li[role='option'], .p-dropdown-item, li.p-dropdown-item")
        .filter({ hasText: rx });
      const panel = this.page
        .locator(".p-dropdown-panel")
        .filter({ has: itemMatch })
        .first();
      const byRole = panel.getByRole("option", { name: rx });
      const byList = panel
        .locator("li[role='option'], .p-dropdown-item, li.p-dropdown-item")
        .filter({ hasText: rx });
      const byText = panel.getByText(rx, { exact: false }).first();
      const opt = byRole.or(byList).or(byText).first();
      try {
        await opt.waitFor({ state: "visible", timeout: 8000 });
        await opt.click();
        await panel.waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
        return true;
      } catch {
        return false;
      }
    };

    const tryTrigger = async (trigger: Locator): Promise<boolean> => {
      if (!(await trigger.isVisible({ timeout: 2000 }).catch(() => false)))
        return false;
      if (!(await trigger.isEnabled().catch(() => true))) {
        for (let w = 0; w < 30; w++) {
          if (await trigger.isEnabled().catch(() => false)) break;
          await this.page.waitForTimeout(400);
        }
        if (!(await trigger.isEnabled().catch(() => true))) return false;
      }
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click({ timeout: 5000 });
      await this.page.waitForTimeout(350);
      if (await clickOptionInOpenDropdown()) return true;
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(150);
      return false;
    };

    /** Open each dropdown in scope until the overlay lists the residence value (handles unlabelled DOM). */
    const tryEachDropdownUntilResidenceOption = async (
      scope: Locator,
    ): Promise<boolean> => {
      const triggers = scope.locator(
        'button[aria-label="dropdown trigger"], .p-dropdown-trigger',
      );
      const n = await triggers.count();
      for (let i = 0; i < n; i++) {
        const t = triggers.nth(i);
        if (!(await t.isVisible().catch(() => false))) continue;
        if (!(await t.isEnabled().catch(() => true))) continue;
        await t.scrollIntoViewIfNeeded();
        await t.click({ timeout: 5000 }).catch(() => {});
        await this.page.waitForTimeout(280);
        if (await clickOptionInOpenDropdown()) return true;
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(120);
      }
      return false;
    };

    const residenceLabelRx =
      /Residence\s*Type|Type\s+of\s+Residence|Residential\s*(type|status)?/i;

    const root = this.physicalAddressRoot;
    await root.waitFor({ state: "visible", timeout: 60000 });

    const residenceLabels = root.locator("label").filter({ hasText: residenceLabelRx });

    // 1) PrimeNG: dropdown whose subtree contains the Residence label (`has` is scoped per row).
    const pDropdownByLabel = root
      .locator("p-dropdown, .p-element.p-dropdown, .p-dropdown")
      .filter({
        has: this.page.locator("label").filter({ hasText: residenceLabelRx }),
      })
      .first();
    const pDropdownTrigger = pDropdownByLabel
      .locator(".p-dropdown-trigger")
      .or(
        pDropdownByLabel.getByRole("button", {
          name: "dropdown trigger",
        }),
      )
      .first();
    if (await tryTrigger(pDropdownTrigger)) return;

    // 2) Closed dropdown often still exposes "Residence Type" as visible text on the control.
    const pDropdownByHasText = root
      .locator("p-dropdown, .p-element.p-dropdown, .p-dropdown")
      .filter({ hasText: residenceLabelRx })
      .first()
      .locator(".p-dropdown-trigger, button[aria-label='dropdown trigger']")
      .first();
    if (await tryTrigger(pDropdownByHasText)) return;

    // 3) Visible Residence label → trigger in the same field row.
    if ((await residenceLabels.count()) > 0) {
      const residenceLabel = residenceLabels.first();
      if (await residenceLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        const rowTrigger = residenceLabel.locator(
          "xpath=ancestor::div[contains(@class,'field') or contains(@class,'p-field') or contains(@class,'grid') or contains(@class,'row') or contains(@class,'col')][1]//*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
        );
        if (await tryTrigger(rowTrigger)) return;

        const labelTriggers = [
          residenceLabel.locator(
            "xpath=following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
          ),
          residenceLabel.locator(
            "xpath=preceding::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
          ),
          residenceLabel.locator(
            "xpath=ancestor::span[contains(@class,'p-float-label')][1]//*[contains(@class,'p-dropdown-trigger')][1]",
          ),
        ];
        for (const t of labelTriggers) {
          if (await tryTrigger(t)) return;
        }
      }
    }

    // 4) Combobox — use `.first()` so multiple matches do not throw strict-mode errors.
    const combobox = root
      .getByRole("combobox", {
        name: /Residence\s*Type|Type\s+of\s+Residence|Residential\s*type/i,
      })
      .first();
    if (await combobox.isVisible({ timeout: 2500 }).catch(() => false)) {
      if (await tryTrigger(combobox)) return;
    }

    await this.residentialTypeDropdown
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {});
    if (await tryTrigger(this.residentialTypeDropdown)) return;

    const panelWithOption = this.page
      .locator(".p-dropdown-panel")
      .filter({
        has: this.page
          .locator("li, .p-dropdown-item")
          .filter({ hasText: rx }),
      })
      .first();
    if (await panelWithOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await panelWithOption
        .locator("li, .p-dropdown-item")
        .filter({ hasText: rx })
        .first()
        .click();
      return;
    }

    // 5) Residence control not tied to labels in some builds: scan dropdowns inside the physical host, then the card.
    if (await tryEachDropdownUntilResidenceOption(root)) return;
    if (await tryEachDropdownUntilResidenceOption(this.physicalAddressBlock))
      return;

    throw new Error(
      `selectResidenceType: could not open Residence Type or pick "${residenceType}" (check app-physical-address DOM).`,
    );
  }

  /**
   * Physical address search: optionContains is a substring or regex-safe fragment
   * (full label text often differs by environment).
   */
  async fillPhysicalSearchAndSelectAddressOption(
    query: string,
    optionContains: string,
  ) {
    await this.physicalSearchInput.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await this.physicalSearchInput.click();
    await this.physicalSearchInput.fill(query);
    await this.physicalSearchInput.press("Enter");
    const rx = new RegExp(
      optionContains.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const byRole = this.page.getByRole("option", { name: rx }).first();
    const byPanel = this.page
      .locator(".p-autocomplete-panel")
      .locator(".p-autocomplete-item, li")
      .filter({ hasText: rx })
      .first();
    try {
      await byRole.waitFor({ state: "visible", timeout: 15000 });
      await byRole.click();
    } catch {
      await byPanel.waitFor({ state: "visible", timeout: 15000 });
      await byPanel.click();
    }
    await this.page
      .locator(".p-autocomplete-panel")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(400);
  }

  /**
   * Fills "Time at Address" year/month only within the given card — avoids generic `#text`
   * indices that hit Building Name or other underlined fields.
   */
  private async fillYearsMonthsInBlock(
    block: Locator,
    year: string,
    month: string,
  ): Promise<void> {
    // PrimeNG time fields are often spinners or `p-inputnumber` inputs — same for physical and previous cards.
    // Previous search input need not live inside the same locator (some builds mount search outside the host).
    const isPreviousHost = await block
      .evaluate((el: HTMLElement) => {
        const t = el.tagName?.toUpperCase?.() ?? "";
        return (
          t === "APP-PREVIOUS-ADDRESS" ||
          !!el.closest?.("app-previous-address")
        );
      })
      .catch(() => false);
    const isPhysicalHost = await block
      .evaluate((el: HTMLElement) => {
        const t = el.tagName?.toUpperCase?.() ?? "";
        return (
          t === "APP-PHYSICAL-ADDRESS" ||
          !!el.closest?.("app-physical-address")
        );
      })
      .catch(() => false);
    const hasPrevSearchInput =
      (await block.locator('input[name="previousSearchValue"]').count()) > 0;
    const isPreviousCard = isPreviousHost || hasPrevSearchInput;

    const fillPair = async (y: Locator, m: Locator): Promise<boolean> => {
      if (
        !(await y.isVisible({ timeout: 2000 }).catch(() => false)) ||
        !(await m.isVisible({ timeout: 2000 }).catch(() => false))
      )
        return false;
      if (!(await y.isEnabled().catch(() => true))) return false;
      if (!(await m.isEnabled().catch(() => true))) return false;
      await y.click();
      await y.fill("");
      await y.fill(year);
      await m.click();
      await m.fill("");
      await m.fill(month);
      await m.press("Tab").catch(() => {});
      return true;
    };

    // PrimeNG time row: was previous-address-only, but physical `app-physical-address` uses the same widgets.
    if (isPreviousCard || isPhysicalHost) {
      const timeRow = block
        .locator("div, section, form")
        .filter({ has: block.getByText(/Time at Address/i) })
        .first();

      const spinInRow = timeRow.getByRole("spinbutton");
      if ((await spinInRow.count()) >= 2) {
        if (await fillPair(spinInRow.nth(0), spinInRow.nth(1))) return;
      }

      const spinScoped = block.getByRole("spinbutton");
      const prevSpinCount = await spinScoped.count();
      if (prevSpinCount >= 2) {
        if (await fillPair(spinScoped.nth(0), spinScoped.nth(1))) return;
      }

      // PrimeNG InputNumber: inner text input, not always `role="spinbutton"`.
      const pInRow = timeRow.locator(
        "p-inputnumber input.p-inputtext, p-inputnumber input, .p-inputnumber input",
      );
      if ((await pInRow.count()) >= 2) {
        if (await fillPair(pInRow.nth(0), pInRow.nth(1))) return;
      }
      const pAll = block.locator(
        "p-inputnumber input.p-inputtext, p-inputnumber input, .p-inputnumber input",
      );
      if ((await pAll.count()) >= 2) {
        if (await fillPair(pAll.nth(0), pAll.nth(1))) return;
      }

      // Row that shows both "Years" and "Months" labels — two visible inputs in that strip.
      const timeStrip = block
        .locator("div")
        .filter({ has: block.getByText(/^Years/i) })
        .filter({ has: block.getByText(/^Months/i) })
        .first();
      const pairInputs = timeStrip.locator("input:not([type='hidden'])");
      const pairCount = await pairInputs.count();
      if (pairCount >= 2) {
        if (await fillPair(pairInputs.nth(0), pairInputs.nth(1))) return;
      }
    }

    // UDC Angular: two columns `.yearmonthClass` (SelectorHub).
    const yearMonthCols = block.locator(
      "div.col.yearmonthClass, div.yearmonthClass",
    );
    if ((await yearMonthCols.count()) >= 2) {
      const yCol = yearMonthCols.nth(0).locator("input").first();
      const mCol = yearMonthCols.nth(1).locator("input").first();
      if (
        (await yCol.isVisible().catch(() => false)) &&
        (await mCol.isVisible().catch(() => false))
      ) {
        await yCol.fill(year);
        await mCol.fill(month);
        return;
      }
    }

    const timeAtRowLabel = block
      .locator("label")
      .filter({ hasText: /Time at Address/i })
      .first();
    if (await timeAtRowLabel.isVisible().catch(() => false)) {
      const scopedCols = timeAtRowLabel
        .locator(
          "xpath=ancestor::*[.//div[contains(@class,'yearmonthClass')]][1]",
        )
        .locator("div.yearmonthClass input");
      if ((await scopedCols.count()) >= 2) {
        await scopedCols.nth(0).fill(year);
        await scopedCols.nth(1).fill(month);
        return;
      }
    }

    const yearsFieldLabel = block.locator("label").filter({ hasText: /^Years/i }).first();
    const monthsFieldLabel = block
      .locator("label")
      .filter({ hasText: /^Months/i })
      .first();
    if (
      (await yearsFieldLabel.isVisible().catch(() => false)) &&
      (await monthsFieldLabel.isVisible().catch(() => false))
    ) {
      const yFromYearsLbl = yearsFieldLabel.locator("xpath=preceding::input[1]").first();
      const mFromMonthsLbl = monthsFieldLabel
        .locator("xpath=preceding::input[1]")
        .first();
      if (
        (await yFromYearsLbl.isVisible().catch(() => false)) &&
        (await mFromMonthsLbl.isVisible().catch(() => false))
      ) {
        await yFromYearsLbl.fill(year);
        await mFromMonthsLbl.fill(month);
        return;
      }
    }

    // QAT layout: small inputs with "Years" / "Months" immediately to the RIGHT (sibling), not p-float-label.
    const yearsAfterInput = block
      .locator(
        "xpath=.//input[following::*[contains(normalize-space(.),'Years')][not(contains(normalize-space(.),'Month'))][not(contains(normalize-space(.),'Address'))][string-length(normalize-space(.)) <= 20]][1]",
      )
      .first();
    const monthsAfterInput = block
      .locator(
        "xpath=.//input[following::*[contains(normalize-space(.),'Months')][not(contains(normalize-space(.),'Address'))][string-length(normalize-space(.)) <= 20]][1]",
      )
      .first();
    if (
      (await yearsAfterInput.isVisible().catch(() => false)) &&
      (await monthsAfterInput.isVisible().catch(() => false))
    ) {
      await yearsAfterInput.fill(year);
      await monthsAfterInput.fill(month);
      return;
    }

    // Label to the left of the input (common flex row).
    const yearsLabel = block.getByText(/^Years\s*\*?$/i).first();
    const monthsLabel = block.getByText(/^Months\s*\*?$/i).first();
    if (
      (await yearsLabel.isVisible().catch(() => false)) &&
      (await monthsLabel.isVisible().catch(() => false))
    ) {
      const yFromLabel = yearsLabel
        .locator("xpath=ancestor::*[.//input][1]//input")
        .first();
      const mFromLabel = monthsLabel
        .locator("xpath=ancestor::*[.//input][1]//input")
        .first();
      if (
        (await yFromLabel.isVisible().catch(() => false)) &&
        (await mFromLabel.isVisible().catch(() => false))
      ) {
        await yFromLabel.fill(year);
        await mFromLabel.fill(month);
        return;
      }
    }

    // Wrapped controls: label "Years" / "Months" appears after its input in document order.
    const yearsText = block
      .locator(
        "xpath=(.//*[self::span or self::label][contains(normalize-space(.),'Years')][not(contains(normalize-space(.),'Month'))][not(contains(normalize-space(.),'Address'))][string-length(normalize-space(.)) <= 24])[1]",
      )
      .first();
    const monthsText = block
      .locator(
        "xpath=(.//*[self::span or self::label][contains(normalize-space(.),'Months')][not(contains(normalize-space(.),'Address'))][string-length(normalize-space(.)) <= 24])[1]",
      )
      .first();
    if (
      (await yearsText.isVisible().catch(() => false)) &&
      (await monthsText.isVisible().catch(() => false))
    ) {
      const yPre = yearsText.locator("xpath=preceding::input[1]").first();
      const mPre = monthsText.locator("xpath=preceding::input[1]").first();
      if (
        (await yPre.isVisible().catch(() => false)) &&
        (await mPre.isVisible().catch(() => false))
      ) {
        await yPre.fill(year);
        await mPre.fill(month);
        return;
      }
    }

    const floatYears = block
      .locator(".p-float-label")
      .filter({ hasText: /Years/i })
      .locator("input")
      .first();
    const floatMonths = block
      .locator(".p-float-label")
      .filter({ hasText: /Months/i })
      .locator("input")
      .first();
    if (
      (await floatYears.isVisible().catch(() => false)) &&
      (await floatMonths.isVisible().catch(() => false))
    ) {
      await floatYears.fill(year);
      await floatMonths.fill(month);
      return;
    }

    const timeCell = block
      .locator("div")
      .filter({ has: block.getByText(/^Years/i) })
      .filter({ has: block.getByText(/^Months/i) })
      .first();
    const pairInputs = timeCell.locator("input:visible");
    if ((await pairInputs.count()) >= 2) {
      await pairInputs.nth(0).fill(year);
      await pairInputs.nth(1).fill(month);
      return;
    }

    const byYears = block.getByRole("textbox", { name: /^Year(s)?$/i }).first();
    const byMonths = block.getByRole("textbox", { name: /^Month(s)?$/i }).first();
    if (
      (await byYears.isVisible().catch(() => false)) &&
      (await byMonths.isVisible().catch(() => false))
    ) {
      await byYears.fill(year);
      await byMonths.fill(month);
      return;
    }

    const byLabelY = block.getByLabel(/Years/i).first();
    const byLabelM = block.getByLabel(/Months/i).first();
    if (
      (await byLabelY.isVisible().catch(() => false)) &&
      (await byLabelM.isVisible().catch(() => false))
    ) {
      await byLabelY.fill(year);
      await byLabelM.fill(month);
      return;
    }

    const legacyY = block.getByRole("textbox", {
      name: "Time at Address (years)",
    });
    const legacyM = block.getByRole("textbox", {
      name: "Time at Address (months)",
    });
    if (
      (await legacyY.isVisible().catch(() => false)) &&
      (await legacyM.isVisible().catch(() => false))
    ) {
      await legacyY.fill(year);
      await legacyM.fill(month);
      return;
    }

    const num = block
      .locator("number")
      .filter({ has: block.getByText(/Time at Address/i) })
      .first();
    const spinners = num.getByRole("spinbutton");
    const spinCount = await spinners.count();
    if ((await num.isVisible().catch(() => false)) && spinCount >= 2) {
      await spinners.nth(0).fill(year);
      await spinners.nth(1).fill(month);
      return;
    }

    throw new Error(
      "Time at Address: could not find Years/Months fields in address block",
    );
  }

  /**
   * SelectorHub: years = `form > div > div:nth-child(4) > text > … > input`;
   * months = `form > div > div:nth-child(6) > text > … > input` (gen-card physical form).
   */
  async timeAtAddress(year: string, month: string) {
    const root = this.physicalAddressRoot;
    await root.scrollIntoViewIfNeeded().catch(() => {});

    // Primary: gen-card Time at Address rows (child(4)=years, child(6)=months — matches recorded SelectorHub path).
    const yearHubInput = this.physicalTimeAtHubInput(4);
    const monthHubInput = this.physicalTimeAtHubInput(6);
    const yearHubOk = await yearHubInput
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    const monthHubOk = await monthHubInput
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    if (yearHubOk && monthHubOk) {
      await yearHubInput.click();
      await yearHubInput.fill("");
      await yearHubInput.fill(year);
      await monthHubInput.click();
      await monthHubInput.fill("");
      await monthHubInput.fill(month);
      await monthHubInput.press("Tab").catch(() => {});
      return;
    }

    const labelled = root.getByLabel(/Time at Address/i);
    const n = await labelled.count();
    if (n >= 2) {
      await labelled.nth(0).fill(year);
      await labelled.nth(1).fill(month);
      return;
    }

    const yearHub = root
      .locator(
        "form > div > div:nth-child(4) > text > div > div:nth-child(2) > input",
      )
      .first();
    if ((await yearHub.isVisible().catch(() => false)) && n === 1) {
      await yearHub.fill(year);
      await labelled.first().fill(month);
      return;
    }
    if ((await yearHub.isVisible().catch(() => false)) && n === 0) {
      const monthHub = root
        .locator(
          "form > div > div:nth-child(6) > text > div > div:nth-child(2) > input",
        )
        .first();
      if (await monthHub.isVisible().catch(() => false)) {
        await yearHub.fill(year);
        await monthHub.fill(month);
        return;
      }
    }

    const block = (await root.isVisible().catch(() => false))
      ? root
      : this.physicalAddressBlock;
    await this.fillYearsMonthsInBlock(block, year, month);
  }

  /** Underlined gen-text field in the Physical Address card. */
  private physicalGenTextInput(labelRx: RegExp): Locator {
    return this.physicalAddressBlock
      .locator("text")
      .filter({ hasText: labelRx })
      .locator("#text")
      .first();
  }

  private physicalRootOrBlock(): Locator {
    return this.physicalAddressRoot;
  }

  /**
   * Time at Address only — `app-physical-address` gen-card / base-form row inputs (years + months).
   * Exact path mirrors SelectorHub: `form > div:nth-child(1) > div:nth-child(N) > text(1) > … > input(1)`.
   */
  private physicalTimeAtHubInput(rowDivChild: number): Locator {
    const root = this.physicalRootOrBlock();
    const exact = root.locator(
      `form > div:nth-child(1) > div:nth-child(${rowDivChild}) > text:nth-child(1) > div:nth-child(1) > div:nth-child(2) > input:nth-child(1)`,
    );
    const fallback = root.locator(
      `form > div > div:nth-child(${rowDivChild}) > text > div > div:nth-child(2) > input`,
    );
    return exact.or(fallback).first();
  }

  /**
   * Time at Address on `app-previous-address` — same gen-card row layout as physical (child 4 = years, 6 = months).
   */
  private previousTimeAtHubInput(rowDivChild: number): Locator {
    const root = this.previousAddressRoot;
    const exact = root.locator(
      `form > div:nth-child(1) > div:nth-child(${rowDivChild}) > text:nth-child(1) > div:nth-child(1) > div:nth-child(2) > input:nth-child(1)`,
    );
    const fallback = root.locator(
      `form > div > div:nth-child(${rowDivChild}) > text > div > div:nth-child(2) > input`,
    );
    return exact.or(fallback).first();
  }

  /** SelectorHub row: optional physical rows (e.g. Rural Delivery 22, Suburb 24, Postcode 26). */
  private physicalHubRowInput(rowDivChild: number): Locator {
    return this.physicalRootOrBlock()
      .locator(
        `form > div > div:nth-child(${rowDivChild}) > text > div > div:nth-child(2) > input`,
      )
      .first();
  }

  private async pickPrimeNgDropdownOption(optionName: string): Promise<void> {
    const rxOpt = new RegExp(
      optionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    await this.page.getByRole("option", { name: rxOpt }).first().click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  private async openPhysicalDropdownByLabelAndPick(
    labelRx: RegExp,
    optionName: string,
    root: Locator = this.physicalAddressBlock,
  ): Promise<void> {
    // PrimeNG often uses float labels (dropdown before label in DOM), so `following::`
    // from the label never hits the trigger. Try both axes, div + button triggers, and
    // both app host + card wrapper — same issue can affect Floor/Unit/Street fields.
    const roots = [root, this.physicalAddressRoot, this.physicalAddressBlock];

    const dropdownTriggersFromBase = (base: Locator): Locator[] => [
      base.locator(
        "xpath=ancestor::span[contains(@class,'p-float-label')][1]//*[contains(@class,'p-dropdown-trigger')][1]",
      ),
      base.locator(
        "xpath=ancestor::div[contains(@class,'p-float-label')][1]//*[contains(@class,'p-dropdown-trigger')][1]",
      ),
      base.locator(
        "xpath=following::div[contains(@class,'p-dropdown-trigger')][1]",
      ),
      base.locator(
        "xpath=following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      ),
      base.locator(
        "xpath=preceding::div[contains(@class,'p-dropdown-trigger')][1]",
      ),
      base.locator(
        "xpath=preceding::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      ),
      base.locator(
        "xpath=ancestor::div[contains(@class,'field') or contains(@class,'col')][1]//button[@aria-label='dropdown trigger'][1]",
      ),
      base.locator(
        "xpath=ancestor::div[contains(@class,'field') or contains(@class,'col')][1]//div[contains(@class,'p-dropdown-trigger')][1]",
      ),
    ];

    const tryClickTrigger = async (trigger: Locator): Promise<boolean> => {
      if (!(await trigger.isVisible({ timeout: 1500 }).catch(() => false)))
        return false;
      if (!(await trigger.isEnabled().catch(() => true))) return false;
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      await this.pickPrimeNgDropdownOption(optionName);
      return true;
    };

    for (const r of roots) {
      if (!(await r.isVisible({ timeout: 2000 }).catch(() => false))) continue;

      const combobox = r.getByRole("combobox", { name: labelRx });
      if (await combobox.isVisible({ timeout: 1500 }).catch(() => false)) {
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click();
        await this.pickPrimeNgDropdownOption(optionName);
        return;
      }

      const candidates = r.locator("text, label").filter({ hasText: labelRx });
      const n = await candidates.count();
      for (let i = 0; i < n; i++) {
        const base = candidates.nth(i);
        if (!(await base.isVisible().catch(() => false))) continue;
        for (const trigger of dropdownTriggersFromBase(base)) {
          if (await tryClickTrigger(trigger)) return;
        }
      }
    }
    throw new Error(
      `Physical dropdown: could not open field matching ${labelRx.source}`,
    );
  }

  async enterPhysicalBuildingName(value: string) {
    await this.physicalGenTextInput(/Building Name/i).fill(value);
  }

  async selectPhysicalFloorType(optionName: string) {
    const root = this.physicalRootOrBlock();
    // SelectorHub PrimeNG id (may change per build); fall back to label row.
    const idContainer = root.locator("#pn_id_103_1");
    const idChevron = idContainer.locator(".p-dropdown-trigger").first();
    const floorClick =
      (await idChevron.isVisible({ timeout: 1500 }).catch(() => false))
        ? idChevron
        : idContainer;
    if (await floorClick.isVisible({ timeout: 2500 }).catch(() => false)) {
      await floorClick.scrollIntoViewIfNeeded();
      await floorClick.click();
      await this.pickPrimeNgDropdownOption(optionName);
      return;
    }
    await this.openPhysicalDropdownByLabelAndPick(/Floor Type/i, optionName, root);
  }

  async enterPhysicalFloorNumber(value: string) {
    const root = this.physicalRootOrBlock();
    const byLabel = root
      .locator("text, label")
      .filter({ hasText: /^Floor Number/i })
      .first()
      .locator(
        "xpath=following::input[@type='text'][@maxlength='5' or not(@maxlength)][1]",
      )
      .first();
    if (await byLabel.isVisible({ timeout: 2500 }).catch(() => false)) {
      await byLabel.scrollIntoViewIfNeeded();
      await byLabel.fill(value);
      return;
    }
    const byMax = root.locator("input[type='text'][maxlength='5']").first();
    if (await byMax.isVisible({ timeout: 2500 }).catch(() => false)) {
      await byMax.scrollIntoViewIfNeeded();
      await byMax.fill(value);
      return;
    }
    await this.physicalGenTextInput(/^Floor Number/i).fill(value);
  }

  async selectPhysicalUnitType(optionName: string) {
    const root = this.physicalRootOrBlock();
    const unitTypeLabel = root
      .locator("text, label")
      .filter({ hasText: /Unit Type/i })
      .first();
    if (await unitTypeLabel.isVisible().catch(() => false)) {
      const trigger = unitTypeLabel
        .locator(
          "xpath=following::div[contains(@class,'p-dropdown-trigger')][1]",
        )
        .first();
      if (await trigger.isVisible().catch(() => false)) {
        await unitTypeLabel.scrollIntoViewIfNeeded();
        await trigger.click();
        await this.pickPrimeNgDropdownOption(optionName);
        return;
      }
    }
    await this.openPhysicalDropdownByLabelAndPick(/Unit Type/i, optionName, root);
  }

  async enterPhysicalUnitLotNumber(value: string) {
    const root = this.physicalRootOrBlock();
    // SelectorHub: p-inputtext under Unit/Lot row — resolve via label, not global class list.
    const afterLabel = root
      .locator("text, label")
      .filter({ hasText: /Unit\/Lot Number|Unit.*Lot/i })
      .first()
      .locator(
        "xpath=following::input[contains(@class,'p-inputtext')][1]",
      )
      .first();
    if (await afterLabel.isVisible({ timeout: 2500 }).catch(() => false)) {
      await afterLabel.fill(value);
      return;
    }
    await this.physicalGenTextInput(/Unit\/Lot Number|Unit.*Lot/i).fill(value);
  }

  async selectPhysicalStreetType(optionName: string) {
    const root = this.physicalRootOrBlock();
    await this.openPhysicalDropdownByLabelAndPick(
      /Street Type|Street suffix|Suffix/i,
      optionName,
      root,
    );
  }

  async enterPhysicalStreetDirection(value: string) {
    const root = this.physicalRootOrBlock();
    const gen = root
      .locator("text")
      .filter({ hasText: /Street Direction/i })
      .locator("#text")
      .first();
    if (await gen.isVisible({ timeout: 2500 }).catch(() => false)) {
      await gen.fill(value);
      return;
    }
    const selectorHub = this.page.locator(
      "xpath=//app-physical-address//div[21]//text[1]//div[1]//div[1]//input[1]",
    );
    if (await selectorHub.isVisible({ timeout: 2500 }).catch(() => false)) {
      await selectorHub.fill(value);
      return;
    }
    await this.physicalGenTextInput(/Street Direction/i).fill(value);
  }

  async enterPhysicalRuralDelivery(value: string) {
    const root = this.physicalRootOrBlock();
    const hub = this.physicalHubRowInput(22);
    if (await hub.isVisible({ timeout: 2500 }).catch(() => false)) {
      await hub.fill(value);
      return;
    }
    await this.physicalGenTextInput(/Rural Delivery/i).fill(value);
  }

  async enterPhysicalSuburb(value: string) {
    const root = this.physicalRootOrBlock();
    const hub = this.physicalHubRowInput(24);
    if (await hub.isVisible({ timeout: 2500 }).catch(() => false)) {
      await hub.fill(value);
      return;
    }
    await this.physicalGenTextInput(/^Suburb/i).fill(value);
  }

  async enterPhysicalPostcode(value: string) {
    const root = this.physicalRootOrBlock();
    const hub = this.physicalHubRowInput(26);
    if (await hub.isVisible({ timeout: 2500 }).catch(() => false)) {
      await hub.fill(value);
      return;
    }
    await this.physicalGenTextInput(/Postcode|Post code/i).fill(value);
  }

  async enterStreetNumber(streetNumber: string) {
    await this.streetNumberInput.fill(streetNumber);
  }

  async enterStreetName(streetName: string) {
    await this.streetNameInput.fill(streetName);
  }

  async enterCity(city: string) {
    const rx = new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    await this.cityInput.click();
    await this.cityInput.fill("");
    await this.cityInput.type(city, { delay: 30 });
    const fromPanel = this.page
      .locator(".p-autocomplete-panel")
      .getByRole("option", { name: rx })
      .first();
    try {
      await fromPanel.waitFor({ state: "visible", timeout: 8000 });
      await fromPanel.click();
    } catch {
      await this.page.getByRole("option", { name: rx }).first().click({ timeout: 8000 });
    }
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  async chooseCountry(country: string) {
    await this.countryDropdown.scrollIntoViewIfNeeded();
    await this.countryDropdown.click({ timeout: 30000 });
    await this.page.getByRole("option", { name: country, exact: true }).click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
  }

  async fillPhysicalSearch(query: string) {
    await this.physicalSearchInput.click();
    await this.physicalSearchInput.fill(query);
  }

  async clickReuseForPostalAddressToggle() {
    await this.reusePostalAddressToggle.click();
  }

  /** Clicks reuse toggle only when shown (some products omit postal reuse). */
  async clickReuseForPostalAddressToggleIfPresent(): Promise<void> {
    if (
      await this.reusePostalAddressToggle.isVisible({ timeout: 2500 }).catch(() => false)
    ) {
      await this.reusePostalAddressToggle.scrollIntoViewIfNeeded();
      await this.reusePostalAddressToggle.click();
    }
  }

  /** `app-previous-address` host is rendered only for some contracts. */
  async isPreviousPhysicalAddressVisible(timeout = 4000): Promise<boolean> {
    return this.previousAddressRoot.isVisible({ timeout }).catch(() => false);
  }

  /** Separate postal block (e.g. when reuse is off) — not present on all flows. */
  async isPostalAddressSectionVisible(timeout = 4000): Promise<boolean> {
    if (await this.postalSearchInput.isVisible({ timeout }).catch(() => false))
      return true;
    return this.page
      .getByText(/^Postal Address$/i)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
  }

  /**
   * Postal Address block: `app-postal-address` or wrapper containing postal search + heading.
   */
  private postalAddressCard(): Locator {
    const byHost = this.page.locator("app-postal-address").filter({
      has: this.postalSearchInput,
    });
    const byWrapper = this.page
      .locator("div, section, form")
      .filter({ has: this.postalSearchInput })
      .filter({ has: this.page.getByText(/Postal Address/i) });
    return byHost.or(byWrapper).first();
  }

  /** Angular host for Postal mode (Address textarea / gen-text + `p-dropdown` Country). */
  private postalFormHost(): Locator {
    return this.page.locator("app-postal-address").first();
  }

  /**
   * True when separate postal entry is possible (search field visible — manual postal block).
   */
  private async isManualPostalBlockReady(): Promise<boolean> {
    return (
      (await this.postalSearchInput.isVisible({ timeout: 2500 }).catch(() => false)) &&
      (await this.page.getByText(/Postal Address/i).first().isVisible({ timeout: 1500 }).catch(() => false))
    );
  }

  /**
   * Toggles "Reuse for Postal Address" until the separate Postal Address card is visible.
   */
  async ensureManualPostalAddressVisible(): Promise<void> {
    if (await this.isManualPostalBlockReady()) return;

    for (let i = 0; i < 6; i++) {
      if (
        !(await this.reusePostalAddressToggle.isVisible({ timeout: 2000 }).catch(() => false))
      )
        break;
      await this.reusePostalAddressToggle.scrollIntoViewIfNeeded();
      await this.reusePostalAddressToggle.click();
      await this.page.waitForTimeout(500);
      if (await this.isManualPostalBlockReady()) return;
    }

    await this.postalSearchInput.waitFor({ state: "visible", timeout: 25000 });
  }

  /**
   * Select **Postal** (not Street). Must not match the "Postal Address" heading — only the Postal|Street pair.
   */
  private async clickPostalAddressTypePostal(card: Locator): Promise<void> {
    const tryClick = async (loc: Locator): Promise<boolean> => {
      try {
        await loc.waitFor({ state: "visible", timeout: 8000 });
        await loc.scrollIntoViewIfNeeded();
        await loc.click({ timeout: 8000 });
        return true;
      } catch {
        return false;
      }
    };

    // Row that contains both toggles (excludes title "Postal Address").
    const streetPostalRow = card
      .locator("div, p-radiobuttongroup, fieldset, span")
      .filter({ has: card.getByText(/^Street$/i) })
      .filter({ has: card.getByText(/^Postal$/i) })
      .first();

    if ((await streetPostalRow.count()) > 0 && (await streetPostalRow.isVisible().catch(() => false))) {
      const postalOnly = streetPostalRow
        .locator("label, span.p-radiobutton-label, .p-radiobutton-label, .p-button-label")
        .filter({ hasText: /^Postal$/i })
        .filter({ hasNotText: /Address/i })
        .first();
      if (await tryClick(postalOnly)) return;
      if (await tryClick(streetPostalRow.getByText(/^Postal$/i).first())) return;
      const inputs = streetPostalRow.locator('input[type="radio"]');
      if ((await inputs.count()) >= 2) {
        await inputs.nth(0).click({ force: true, timeout: 8000 });
        return;
      }
      if ((await inputs.count()) === 1) {
        await inputs.first().click({ force: true, timeout: 8000 });
        return;
      }
    }

    // Exact text node "Postal" (not "Postal Address").
    if (await tryClick(card.locator(':text-is("Postal")'))) return;

    if (await tryClick(card.getByRole("radio", { name: /^Postal$/i }))) return;

    const labelPostal = card
      .locator("label")
      .filter({ hasText: /^Postal$/i })
      .filter({ hasNotText: /Address/i })
      .first();
    if (await tryClick(labelPostal)) return;

    const pRadioPostal = card.locator("p-radiobutton").nth(0);
    if (await tryClick(pRadioPostal)) return;

    await card.locator('p-radiobutton input[type="radio"]').first().click({
      timeout: 8000,
      force: true,
    });
  }

  /** Pick an option in the visible PrimeNG dropdown (filter box + scrollable list). */
  private async clickPrimeNgDropdownOptionForCountry(countrySubstr: string): Promise<boolean> {
    const rx = new RegExp(countrySubstr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const panel = this.page.locator(".p-dropdown-panel").last();
    try {
      await panel.waitFor({ state: "visible", timeout: 12000 });
    } catch {
      return false;
    }

    const filterInput = panel.locator(
      "input.p-dropdown-filter, .p-dropdown-filter input, input[role='searchbox']",
    );
    if (await filterInput.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await filterInput.first().fill(countrySubstr.slice(0, 12));
      await this.page.waitForTimeout(400);
    }

    const itemMatch = this.page
      .locator("li[role='option'], .p-dropdown-item, li.p-dropdown-item")
      .filter({ hasText: rx });
    const panelWith = this.page.locator(".p-dropdown-panel").filter({ has: itemMatch }).last();
    const activePanel = (await panelWith.isVisible({ timeout: 2000 }).catch(() => false))
      ? panelWith
      : panel;

    const opt = activePanel
      .getByRole("option", { name: rx })
      .or(activePanel.locator("li").filter({ hasText: rx }).first())
      .or(activePanel.getByText(rx, { exact: false }).first());

    try {
      await opt.first().waitFor({ state: "visible", timeout: 12000 });
      await opt.first().scrollIntoViewIfNeeded();
      await opt.first().click();
      await this.page
        .locator(".p-dropdown-panel")
        .waitFor({ state: "hidden", timeout: 8000 })
        .catch(() => {});
      await this.page.keyboard.press("Escape").catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Postal Address card: **Postal** radio, Address (textarea or gen-text), Country (`p-dropdown` like physical).
   */
  async fillPostalAddressPostalTypeTextareaAndCountry(data: {
    addressLine: string;
    country: string;
  }): Promise<void> {
    await this.ensureManualPostalAddressVisible();
    const card = this.postalAddressCard();
    await card.waitFor({ state: "visible", timeout: 20000 });
    await card.scrollIntoViewIfNeeded();

    await this.clickPostalAddressTypePostal(card);
    await this.page.waitForTimeout(450);

    const host = this.postalFormHost();
    const scope =
      (await host.isVisible({ timeout: 2000 }).catch(() => false)) ? host : card;
    await scope.scrollIntoViewIfNeeded();

    // Address: PrimeNG textarea, plain textarea, or gen-text `#text` (same pattern as Street/City rows).
    const addressBox = scope
      .locator("textarea.p-inputtextarea")
      .first()
      .or(scope.locator("textarea").first())
      .or(
        scope
          .locator("text")
          .filter({ hasText: /^Address\s*\*?$/i })
          .locator("#text")
          .first(),
      )
      .or(
        scope
          .locator("text")
          .filter({ hasText: /^Address$/i })
          .locator("#text")
          .first(),
      )
      .or(scope.getByRole("textbox", { name: /Address/i }).first())
      .or(scope.getByLabel(/Address/i).first())
      .first();

    await addressBox.waitFor({ state: "visible", timeout: 20000 });
    await addressBox.click();
    await addressBox.fill("");
    await addressBox.fill(data.addressLine);
    let addrVal = "";
    try {
      addrVal = await addressBox.inputValue({ timeout: 1500 });
    } catch {
      addrVal =
        (await addressBox
          .evaluate((el: HTMLInputElement | HTMLTextAreaElement) => el.value)
          .catch(() => "")) ?? "";
    }
    if (addrVal !== data.addressLine) {
      await addressBox.click();
      await addressBox.pressSequentially(data.addressLine, { delay: 25 });
    }

    // Country: PrimeNG dropdown trigger inside postal host (same idea as `countryDropdown` / `previousCountryDropdown`).
    const triggers = scope.locator(
      'button[aria-label="dropdown trigger"], .p-dropdown-trigger, .p-element.p-dropdown .p-dropdown-trigger',
    );
    let countryTrigger = scope
      .locator("p-dropdown")
      .filter({ has: scope.getByText(/^Country\s*\*?$/i) })
      .locator(".p-dropdown-trigger, button[aria-label='dropdown trigger']")
      .first();

    if (!(await countryTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      countryTrigger = scope
        .locator(".p-float-label")
        .filter({ hasText: /^Country/i })
        .locator(".p-dropdown-trigger")
        .or(
          scope
            .locator(".p-float-label")
            .filter({ hasText: /^Country/i })
            .getByRole("button", { name: "dropdown trigger" }),
        )
        .first();
    }

    if (!(await countryTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      const n = await triggers.count();
      countryTrigger = n > 0 ? triggers.nth(n - 1) : scope.getByRole("button", { name: "dropdown trigger" }).last();
    }

    await countryTrigger.scrollIntoViewIfNeeded();
    await countryTrigger.click({ timeout: 15000 });
    await this.page.waitForTimeout(350);

    const rxOpt = new RegExp(
      data.country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    let worked = await this.clickPrimeNgDropdownOptionForCountry(data.country);
    if (!worked) {
      try {
        await this.page.getByRole("option", { name: rxOpt }).first().click({ timeout: 10000 });
        worked = true;
      } catch {
        await this.choosePostalCountry(data.country);
      }
    }

    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /**
   * One call: street → city/country → residence → time → optional lines.
   * Optional properties are best-effort (ignored if that row is missing for the product).
   */
  async fillPhysicalAddressManual(data: DOPhysicalAddressManualData): Promise<void> {
    await this.physicalAddressRoot.scrollIntoViewIfNeeded().catch(() => {});
    await this.enterStreetNumber(data.streetNumber);
    await this.enterStreetName(data.streetName);
    await this.enterCity(data.city);
    await this.chooseCountry(data.country);
    await this.selectResidenceType(data.residenceType);
    await this.timeAtAddress(data.timeAtYears, data.timeAtMonths);

    const tryOpt = async (
      value: string | undefined,
      act: (v: string) => Promise<void>,
    ): Promise<void> => {
      if (value === undefined || value === "") return;
      await act(value).catch(() => {});
    };

    await tryOpt(data.buildingName, (v) => this.enterPhysicalBuildingName(v));
    await tryOpt(data.unitType, (v) => this.selectPhysicalUnitType(v));
    await tryOpt(data.unitLotNumber, (v) => this.enterPhysicalUnitLotNumber(v));
    await tryOpt(data.streetType, (v) => this.selectPhysicalStreetType(v));
    await tryOpt(data.streetDirection, (v) =>
      this.enterPhysicalStreetDirection(v),
    );
    await tryOpt(data.ruralDelivery, (v) => this.enterPhysicalRuralDelivery(v));
    await tryOpt(data.suburb, (v) => this.enterPhysicalSuburb(v));
    await tryOpt(data.postcode, (v) => this.enterPhysicalPostcode(v));
  }

  /**
   * Fills previous physical mandatory fields only when that section exists.
   * Pass `null` / omit in test data for products without previous address.
   */
  async fillPreviousPhysicalRequiredIfPresent(
    fields: DOPreviousPhysicalRequiredData | null | undefined,
  ): Promise<void> {
    if (fields == null) return;
    if (!(await this.isPreviousPhysicalAddressVisible(5000))) return;
    await this.fillPreviousPhysicalRequired(fields);
  }

  /**
   * Fills separate postal fields when the postal card exists (e.g. reuse postal = No).
   * Pass `null` when reuse stays Yes or product has no postal section.
   */
  async fillPostalAddressManualIfPresent(
    data: DOPostalAddressManualData | null | undefined,
  ): Promise<void> {
    if (data == null) return;
    if (!(await this.isPostalAddressSectionVisible(5000))) return;
    await this.enterPostalStreetNumber(data.streetNumber).catch(() => {});
    await this.enterPostalStreetName(data.streetName).catch(() => {});
    await this.enterPostalCity(data.city).catch(() => {});
    await this.choosePostalCountry(data.country).catch(() => {});
  }

  async fillPreviousSearch(query: string) {
    await this.previousSearchInput.click();
    await this.previousSearchInput.fill(query);
  }

  async previousTimeAtAddress(year: string, month: string) {
    const root = this.previousAddressRoot;
    await root.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await root.scrollIntoViewIfNeeded();

    // Primary: same gen-card hub rows as physical (years=4, months=6).
    const yearHubInput = this.previousTimeAtHubInput(4);
    const monthHubInput = this.previousTimeAtHubInput(6);
    const yearHubOk = await yearHubInput
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    const monthHubOk = await monthHubInput
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    if (yearHubOk && monthHubOk) {
      await yearHubInput.click();
      await yearHubInput.fill("");
      await yearHubInput.fill(year);
      await monthHubInput.click();
      await monthHubInput.fill("");
      await monthHubInput.fill(month);
      await monthHubInput.press("Tab").catch(() => {});
      return;
    }

    const labelled = root.getByLabel(/Time at Address/i);
    const n = await labelled.count();
    if (n >= 2) {
      await labelled.nth(0).fill(year);
      await labelled.nth(1).fill(month);
      return;
    }

    const yearHub = root
      .locator(
        "form > div > div:nth-child(4) > text > div > div:nth-child(2) > input",
      )
      .first();
    if ((await yearHub.isVisible().catch(() => false)) && n === 1) {
      await yearHub.fill(year);
      await labelled.first().fill(month);
      return;
    }
    if ((await yearHub.isVisible().catch(() => false)) && n === 0) {
      const monthHub = root
        .locator(
          "form > div > div:nth-child(6) > text > div > div:nth-child(2) > input",
        )
        .first();
      if (await monthHub.isVisible().catch(() => false)) {
        await yearHub.fill(year);
        await monthHub.fill(month);
        return;
      }
    }

    try {
      await this.fillYearsMonthsInBlock(root, year, month);
    } catch {
      await this.fillYearsMonthsInBlock(this.previousAddressBlock, year, month);
    }
  }

  async enterPreviousStreetNumber(streetNumber: string) {
    await this.previousStreetNumberInput.waitFor({
      state: "visible",
      timeout: 30000,
    });
    await this.previousStreetNumberInput.scrollIntoViewIfNeeded();
    await this.previousStreetNumberInput.click();
    await this.previousStreetNumberInput.fill("");
    await this.previousStreetNumberInput.fill(streetNumber);
  }

  async enterPreviousStreetName(streetName: string) {
    await this.previousStreetNameInput.waitFor({
      state: "visible",
      timeout: 30000,
    });
    await this.previousStreetNameInput.scrollIntoViewIfNeeded();
    await this.previousStreetNameInput.click();
    await this.previousStreetNameInput.fill("");
    await this.previousStreetNameInput.fill(streetName);
  }

  async enterPreviousCity(city: string) {
    await this.previousAddressRoot.scrollIntoViewIfNeeded();
    const byName = this.previousAddressRoot.locator('input[name="previousCity"]');
    if (await byName.isVisible({ timeout: 8000 }).catch(() => false)) {
      await byName.click();
      await byName.fill("");
      await byName.type(city, { delay: 30 });
      const fromPanel = this.page
        .locator(".p-autocomplete-panel")
        .getByRole("option", { name: new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
        .first();
      try {
        await fromPanel.waitFor({ state: "visible", timeout: 8000 });
        await fromPanel.click();
      } catch {
        await this.page
          .getByRole("option", { name: new RegExp(city, "i") })
          .first()
          .click({ timeout: 8000 });
      }
      await this.page.keyboard.press("Escape").catch(() => {});
      return;
    }
    await this.previousCityInput.waitFor({ state: "visible", timeout: 30000 });
    await this.previousCityInput.scrollIntoViewIfNeeded();
    await this.previousCityInput.click();
    await this.previousCityInput.fill(city);
  }

  async choosePreviousCountry(country: string) {
    await this.previousCountryDropdown.waitFor({
      state: "visible",
      timeout: 30000,
    });
    await this.previousCountryDropdown.scrollIntoViewIfNeeded();
    await this.previousCountryDropdown.click({ timeout: 30000 });
    await this.page.getByRole("option", { name: country, exact: true }).click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
  }

  /** Previous physical address: mandatory fields only (no search, no optional building/unit rows). */
  async fillPreviousPhysicalRequired(
    fields: DOPreviousPhysicalRequiredData,
  ): Promise<void> {
    await this.previousAddressRoot.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await this.previousAddressRoot.scrollIntoViewIfNeeded();
    await this.previousSearchInput.fill("").catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.previousTimeAtAddress(fields.years, fields.months);
    await this.enterPreviousStreetNumber(fields.streetNumber);
    await this.enterPreviousStreetName(fields.streetName);
    await this.enterPreviousCity(fields.city);
    await this.choosePreviousCountry(fields.country);
  }

  async clickPostalStreetType() {
    await this.page.getByRole("radio", { name: "Street" }).click();
  }

  async fillPostalSearch(query: string) {
    await this.postalSearchInput.click();
    await this.postalSearchInput.fill(query);
  }

  async enterPostalStreetNumber(streetNumber: string) {
    await this.postalStreetNumberInput.fill(streetNumber);
  }

  async enterPostalStreetName(streetName: string) {
    await this.postalStreetNameInput.fill(streetName);
  }

  async enterPostalCity(city: string) {
    await this.postalCityInput.fill(city);
  }

  async choosePostalCountry(country: string) {
    const host = this.postalFormHost();
    const dd = host
      .getByRole("button", { name: "dropdown trigger" })
      .last()
      .or(
        host
          .locator(".p-dropdown")
          .filter({ has: host.getByText(/^Country/i) })
          .locator(".p-dropdown-trigger")
          .first(),
      );
    if (await dd.isVisible({ timeout: 4000 }).catch(() => false)) {
      await dd.scrollIntoViewIfNeeded();
      await dd.click({ timeout: 15000 });
    } else {
      await this.postalCountryDropdown.click();
    }
    const rx = new RegExp(country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    await this.page.getByRole("option", { name: rx }).first().click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
  }

  async clickNextButton() {
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    for (let i = 0; i < 120; i++) {
      if (await this.nextButton.isEnabled().catch(() => false)) break;
      await this.page.waitForTimeout(500);
    }
    await this.nextButton.click();
  }

  async waitForPhysicalAddressStep() {
    await this.physicalSearchInput.waitFor({
      state: "visible",
      timeout: 120000,
    });
  }
}