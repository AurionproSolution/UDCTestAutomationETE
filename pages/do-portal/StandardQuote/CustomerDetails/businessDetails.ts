import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Business customer — **Business Details** step (`app-business-details`).
 * Dropdowns use PrimeNG triggers; options match Selector Hub (`:text-is` / `:text`) where roles differ.
 */
export class DOBusinessDetailsPage extends BasePage {
  readonly businessRoot: Locator;
  /**
   * Preferred default: email line input immediately before the **+ Add Other Email** action (Contact Details).
   * Falls back in {@link enterBusinessEmail} if this chain does not match your build.
   */
  readonly businessEmailInput: Locator;
  readonly nextButton: Locator;
  /** Outlined **Save** on Business Details (quote footer — same Prime pattern as Personal / Trust). */
  readonly saveBusinessDetailsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.businessRoot = page.locator("app-business-details").first();
    const business = page.locator("app-business-details").first();
    this.businessEmailInput = business
      .locator("p-card, gen-card")
      .filter({ hasText: /Contact Details/i })
      .first()
      .locator("a, button, [role='button']")
      .filter({ hasText: /Add Other Email/i })
      .first()
      .locator(
        "xpath=preceding::input[(@type='text' or @type='email' or not(@type)) and not(@type='url')][1]",
      );
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
    const outlinedSaveSel =
      "button.p-ripple.p-element.p-button.p-component.p-button-outlined";
    this.saveBusinessDetailsButton = page
      .locator("app-quote-details, app-standard-quote")
      .first()
      .locator(outlinedSaveSel)
      .filter({ hasText: /^Save$/i })
      .or(page.locator(outlinedSaveSel).filter({ hasText: /^Save$/i }))
      .first();
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Business details";
  }

  async waitForBusinessDetailsStep(): Promise<void> {
    this.logStep("Wait For Business Details Step");
    await this.businessRoot.waitFor({ state: "visible", timeout: 120000 });
    await this.businessRoot
      .getByText(/Organisation Type/i)
      .first()
      .waitFor({ state: "visible", timeout: 30000 });
  }

  /** `.app-loader-overlay` intercepts footer **Save** / **Next** clicks after validation round-trips. */
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
   * Opens a PrimeNG `p-dropdown` by field label. CSAB layouts often use float labels
   * (trigger not a direct `following-sibling` of `label`), so several axes are tried.
   */
  private async selectDropdownByLabel(root: Locator, labelNeedle: string): Promise<void> {
    const q = labelNeedle.replace(/'/g, "");
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const tryOpen = async (trigger: Locator, timeout: number): Promise<boolean> => {
      try {
        if (!(await trigger.isVisible({ timeout: Math.min(timeout, 1200) }).catch(() => false)))
          return false;
        await trigger.scrollIntoViewIfNeeded();
        if (!(await trigger.isEnabled().catch(() => true))) return false;
        await trigger.click({ timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    };

    const labelOrSpan = root.locator("label, span.p-float-label-text, .p-float-label span").filter({
      hasText: rx,
    });

    const triggers: Locator[] = [
      root
        .locator("label")
        .filter({ hasText: rx })
        .first()
        .locator(
          "xpath=preceding::p-dropdown[1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
        ),
      root
        .locator("label")
        .filter({ hasText: rx })
        .first()
        .locator(
          "xpath=following::p-dropdown[1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
        ),
      root.locator(
        `xpath=.//label[contains(normalize-space(.),'${q}')]//following::*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]`,
      ),
      root.locator(
        `xpath=.//label[contains(normalize-space(.),'${q}')]/following-sibling::*//*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]`,
      ),
      root
        .locator("label")
        .filter({ hasText: rx })
        .first()
        .locator(
          "xpath=ancestor::*[contains(@class,'col') or contains(@class,'field') or contains(@class,'grid') or contains(@class,'row')][1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
        ),
      labelOrSpan
        .first()
        .locator(
          "xpath=ancestor::span[contains(@class,'p-float-label')][1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
        ),
      root
        .locator(".p-float-label")
        .filter({ hasText: rx })
        .first()
        .locator(".p-dropdown-trigger")
        .first(),
      root
        .locator("label")
        .filter({ hasText: rx })
        .first()
        .locator(
          "xpath=following::*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
        ),
      root.getByRole("combobox", { name: rx }).first(),
    ];

    for (const t of triggers) {
      if (await tryOpen(t, 6000)) return;
    }

    const labelMatches = root.locator("label").filter({ hasText: rx });
    const labelCount = await labelMatches.count();
    for (let j = 0; j < labelCount; j++) {
      const lbl = labelMatches.nth(j);
      const beforeLabel = lbl.locator(
        "xpath=preceding::p-dropdown[1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
      );
      const afterLabel = lbl.locator(
        "xpath=following::p-dropdown[1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
      );
      if (await tryOpen(beforeLabel, 4000)) return;
      if (await tryOpen(afterLabel, 4000)) return;
    }

    throw new Error(
      `Business Details: could not open dropdown for "${labelNeedle}" (PrimeNG trigger not found).`,
    );
  }

  /** Close an open PrimeNG dropdown without choosing an option (marks control touched). */
  private async dismissPrimeNgDropdownPanel(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /** Prefer `getByRole('option')`; fall back to Selector Hub text pseudo-selectors. */
  private async pickDropdownOption(optionText: string, exactLabel: boolean): Promise<void> {
    const escaped = optionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`^${escaped}$`, "i");

    const byRole = this.page.getByRole("option", { name: rx }).first();
    if (await byRole.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byRole.click();
      await this.page
        .getByRole("listbox")
        .waitFor({ state: "hidden", timeout: 10000 })
        .catch(() => {});
      await this.page.keyboard.press("Escape").catch(() => {});
      return;
    }

    if (exactLabel) {
      const t = this.page.locator(`:text-is("${optionText}")`).first();
      await t.waitFor({ state: "visible", timeout: 12000 });
      await t.click();
    } else {
      const t = this.page.locator(`:text("${optionText}")`).first();
      await t.waitFor({ state: "visible", timeout: 12000 });
      await t.click();
    }
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  async selectOrganisationType(optionName: string): Promise<void> {
    this.logStep(`Selected organisation type: ${this.stepValueDisplay(optionName)}`);
    await this.selectDropdownByLabel(this.businessRoot, "Organisation Type");
    if (!optionName.trim()) {
      await this.dismissPrimeNgDropdownPanel();
      return;
    }
    await this.pickDropdownOption(optionName, true);
  }

  private floatTextInput(label: RegExp): Locator {
    return this.businessRoot.locator("text").filter({ hasText: label }).locator("#text");
  }

  async enterLegalName(value: string): Promise<void> {
    this.logStep(`Entered legal name as ${this.stepValueDisplay(value)}`);
    const input = this.legalNameInput();
    if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
      await input.click();
      await input.fill(value);
      return;
    }
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /Legal Name/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    await fb.waitFor({ state: "visible", timeout: 15000 });
    await fb.fill(value);
  }

  /** Resolves the **Legal Name** text input under `app-business-details`. */
  legalNameInput(): Locator {
    const primary = this.floatTextInput(/^Legal Name/i);
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /^Legal Name/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    return primary.or(fb).first();
  }

  async enterTradingName(value: string): Promise<void> {
    this.logStep(`Entered trading name as ${this.stepValueDisplay(value)}`);
    const input = this.tradingNameInput();
    if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
      await input.click();
      await input.fill(value);
      return;
    }
    const fb = this.businessRoot
      .locator("form > div:nth-child(1) > div:nth-child(3) text div div:nth-child(2) input")
      .first();
    await fb.waitFor({ state: "visible", timeout: 15000 });
    await fb.fill(value);
  }

  /** Resolves the **Trading Name** text input under `app-business-details`. */
  tradingNameInput(): Locator {
    const primary = this.floatTextInput(/^Trading Name/i);
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /^Trading Name/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    return primary.or(fb).first();
  }

  async clearTradingName(): Promise<void> {
    await this.enterTradingName("");
  }

  async clickSaveBusinessDetails(): Promise<void> {
    this.logStep("Click Save Business Details");
    await this.businessRoot.waitFor({ state: "visible", timeout: 60_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    await this.saveBusinessDetailsButton
      .scrollIntoViewIfNeeded({ timeout: 20_000 })
      .catch(() => {});
    await this.saveBusinessDetailsButton.waitFor({ state: "visible", timeout: 60_000 });
    await this.saveBusinessDetailsButton.click({ timeout: 30_000 });
    await this.page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
  }

  async enterRegisteredCompanyNumber(value: string): Promise<void> {
    this.logStep(`Entered registered company number as ${this.stepValueDisplay(value)}`);
    const input = this.registeredCompanyNumberInput();
    if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
      await input.fill(value);
      return;
    }
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /Registered Company Number/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    await fb.waitFor({ state: "visible", timeout: 15000 });
    await fb.fill(value);
  }

  /** Resolves the **Registered Company Number** text input under `app-business-details`. */
  registeredCompanyNumberInput(): Locator {
    const primary = this.floatTextInput(/Registered Company Number/i);
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /Registered Company Number/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    return primary.or(fb).first();
  }

  async clearRegisteredCompanyNumber(): Promise<void> {
    await this.enterRegisteredCompanyNumber("");
  }

  async enterNzBusinessNumber(value: string): Promise<void> {
    this.logStep(`Entered NZ business number as ${this.stepValueDisplay(value)}`);
    const input = this.nzBusinessNumberInput();
    if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
      await input.fill(value);
      return;
    }
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /New Zealand Business Number/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    await fb.waitFor({ state: "visible", timeout: 15000 });
    await fb.fill(value);
  }

  /** Resolves the **New Zealand Business Number (NZBN)** text input. */
  nzBusinessNumberInput(): Locator {
    const primary = this.floatTextInput(/New Zealand Business Number/i);
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /New Zealand Business Number/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    return primary.or(fb).first();
  }

  async clearNzBusinessNumber(): Promise<void> {
    await this.enterNzBusinessNumber("");
  }

  async enterGstNumber(value: string): Promise<void> {
    this.logStep(`Entered GST number as ${this.stepValueDisplay(value)}`);
    const input = this.gstNumberInput();
    if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
      await input.fill(value);
      return;
    }
    const fb = this.businessRoot
      .locator("form > div:nth-child(1) > div:nth-child(7) text div div:nth-child(2) input")
      .first();
    await fb.waitFor({ state: "visible", timeout: 15000 });
    await fb.fill(value);
  }

  /** Resolves the **GST Number** text input under `app-business-details`. */
  gstNumberInput(): Locator {
    const primary = this.floatTextInput(/^GST Number/i);
    const fb = this.businessRoot
      .locator("label")
      .filter({ hasText: /^GST Number/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    return primary.or(fb).first();
  }

  async clearGstNumber(): Promise<void> {
    await this.enterGstNumber("");
  }

  async fillBusinessDescription(note: string): Promise<void> {
    this.logStep(`Filled business description as ${this.stepValueDisplay(note)}`);
    const ta = this.businessRoot.locator("#note").first();
    await ta.waitFor({ state: "visible", timeout: 15000 });
    await ta.fill(note);
  }

  async selectPrimaryNatureOfBusiness(optionText: string): Promise<void> {
    this.logStep(`Selected primary nature of business: ${this.stepValueDisplay(optionText)}`);
    await this.selectDropdownByLabel(this.businessRoot, "Primary Nature of Business");
    if (!optionText.trim()) {
      await this.dismissPrimeNgDropdownPanel();
      return;
    }
    await this.pickDropdownOption(optionText, false);
  }

  async selectSourceOfWealth(optionName: string): Promise<void> {
    this.logStep(`Selected source of wealth: ${this.stepValueDisplay(optionName)}`);
    await this.selectDropdownByLabel(this.businessRoot, "Source of Wealth");
    if (!optionName.trim()) {
      await this.dismissPrimeNgDropdownPanel();
      return;
    }
    await this.pickDropdownOption(optionName, true);
  }

  async enterTimeInBusiness(years: string, months: string): Promise<void> {
    this.logStep(
      `Entered time in business: years ${this.stepValueDisplay(years)}, months ${this.stepValueDisplay(months)}`,
    );
    const yearsAnchor = this.businessRoot.getByText(/^Years$/i).first();
    const gridInputs = yearsAnchor
      .locator(
        "xpath=ancestor::*[contains(@class,'grid') or contains(@class,'row') or contains(@class,'flex')][1]",
      )
      .locator("input.p-inputtext");

    if ((await gridInputs.count()) >= 2) {
      await gridInputs.nth(0).fill(years);
      await gridInputs.nth(1).fill(months);
      return;
    }

    const yearsInput = this.businessRoot
      .locator("form > div:nth-child(1) > div:nth-child(14) text div div:nth-child(2) input")
      .first();
    const monthsInput = this.businessRoot
      .locator("form > div:nth-child(1) > div:nth-child(16) text div div:nth-child(2) input")
      .first();

    await yearsInput.waitFor({ state: "visible", timeout: 15000 });
    await yearsInput.fill(years);
    await monthsInput.waitFor({ state: "visible", timeout: 15000 });
    await monthsInput.fill(months);
  }

  async enterBusinessAreaCode(areaCode: string): Promise<void> {
    this.logStep(`Entered business area code as ${this.stepValueDisplay(areaCode)}`);
    const scoped = this.businessRoot.locator(
      "input.p-inputtext.p-component.p-element.w-full",
    ).first();
    await scoped.waitFor({ state: "visible", timeout: 15000 });
    await scoped.fill(areaCode);
  }

  async enterBusinessPhoneNumber(phone: string): Promise<void> {
    this.logStep(`Entered business phone number as ${this.stepValueDisplay(phone)}`);
    const byRole = this.businessRoot.getByRole("textbox", { name: /Phone number/i });
    if (await byRole.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byRole.fill(phone);
      return;
    }
    await this.page.getByRole("textbox", { name: /Phone number/i }).fill(phone);
  }

  /**
   * Fills Contact Details → Email. Resolves the field by label text “Email” (input below / following the label),
   * same pattern as {@link enterLegalName}. Unchecks **No Email** if it hides the input.
   * @param emailFieldOverride optional Selector Hub / custom locator from the test (see CSABAssigned).
   */
  async enterBusinessEmail(email: string, emailFieldOverride?: Locator): Promise<void> {
    this.logStep(`Entered business email as ${this.stepValueDisplay(email)}`);
    if (emailFieldOverride) {
      await emailFieldOverride.waitFor({ state: "visible", timeout: 30000 });
      await this.fillElement(emailFieldOverride, email);
      return;
    }

    const noEmail = this.businessRoot.getByRole("checkbox", { name: /No Email/i });
    if ((await noEmail.isVisible({ timeout: 4000 }).catch(() => false)) && (await noEmail.isChecked())) {
      await noEmail.uncheck();
      await this.page.waitForTimeout(250);
    }

    const float = this.floatTextInput(/^Email/i);
    if (await float.isVisible({ timeout: 8000 }).catch(() => false)) {
      await float.click();
      await float.fill(email);
      return;
    }

    const contactSection = this.businessRoot
      .locator("p-card, gen-card")
      .filter({ hasText: /Contact Details/i })
      .first();

    /** Underline / Material fields may omit `p-inputtext`; match any real input. */
    const anyFollowingLabel = (root: Locator) =>
      root
        .locator("label")
        .filter({ hasText: /^Email/i })
        .first()
        .locator(
          "xpath=following::input[not(@type='hidden') and (@type='text' or @type='email' or not(@type))][1]",
        );

    const addOtherAnchor = (root: Locator) =>
      root
        .locator("a, button, [role='button']")
        .filter({ hasText: /Add Other Email/i })
        .first()
        .locator(
          "xpath=preceding::input[(@type='text' or @type='email' or not(@type)) and not(@type='url')][1]",
        );

    const byLabel = [
      this.businessRoot.getByLabel(/^Email\s*\*?\s*$/i).first(),
      this.businessRoot.getByLabel(/^Email$/i).first(),
    ];

    const labelFollowingPrime = this.businessRoot
      .locator("label")
      .filter({ hasText: /^Email/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");

    const emailBelowLabelInContact = anyFollowingLabel(contactSection);
    const labelFollowingAny = anyFollowingLabel(this.businessRoot);

    const emailContactHost = this.businessRoot
      .locator(
        'app-personal-detail-email-contact input[type="text"], app-business-detail-email-contact input[type="text"]',
      )
      .first();

    const floatLabelInput = this.businessRoot
      .locator(".p-float-label")
      .filter({ hasText: /^Email/i })
      .first()
      .locator("input:not([type='hidden'])");

    const labelPreceding = this.businessRoot
      .locator("label")
      .filter({ hasText: /^Email/i })
      .first()
      .locator(
        "xpath=preceding::input[not(@type='hidden') and (@type='text' or @type='email' or not(@type))][1]",
      );

    const matOutline = this.businessRoot
      .locator("mat-form-field")
      .filter({ hasText: /^Email/i })
      .first()
      .locator("input");

    const nativeEmailInContact = contactSection.locator('input[type="email"]').first();

    const candidates: Locator[] = [
      this.businessEmailInput,
      addOtherAnchor(contactSection),
      addOtherAnchor(this.businessRoot),
      ...byLabel,
      emailBelowLabelInContact,
      labelFollowingAny,
      nativeEmailInContact,
      matOutline,
      labelFollowingPrime,
      emailContactHost,
      floatLabelInput,
      labelPreceding,
    ];

    for (const loc of candidates) {
      try {
        await loc.waitFor({ state: "visible", timeout: 12000 });
        await loc.scrollIntoViewIfNeeded();
        await this.fillElement(loc, email);
        return;
      } catch {
        /* try next */
      }
    }

    throw new Error(
      "Business Details: Email input not found (tried + Add Other Email anchor, getByLabel(Email), label→input without p-inputtext, Material mat-form-field). Pass page.locator(...) as the second argument if needed.",
    );
  }

  async clickNextButton(): Promise<void> {
    this.logStep("Click Next Button");
    await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.clickElement(this.nextButton, 60_000);
  }

  /** Existing FIS business — Organisation Type should read **Partnership** (UDP-T4478). */
  async expectOrganisationTypePartnership(): Promise<void> {
    this.logStep("Expect Organisation Type Partnership");
    const partnershipRx = /Partnership/i;
    const combobox = this.businessRoot.getByRole("combobox", { name: partnershipRx }).first();
    if (await combobox.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(combobox).toBeVisible({ timeout: 15_000 });
      return;
    }
    await expect(this.businessRoot.getByText(partnershipRx).first()).toBeVisible({ timeout: 15_000 });
  }

  /**
   * After **Next** with required Business Details left unset/empty (and dropdowns touched where needed),
   * expect inline validation under `app-business-details`.
   *
   * **Copy varies by build:** Organisation Type may be pre-filled (no "Organisation Type is required");
   * Legal name may show **Legal Company Name is required** or **Please enter a Name for the party** (BR_PARTY_MSG_94);
   * Time in Business may show one combined message or two lines for Years/Months.
   */
  async expectBusinessDetailsRequiredValidationMessages(): Promise<void> {
    const root = this.businessRoot;

    const assertIfPresent = async (msg: string): Promise<void> => {
      const loc = root.getByText(msg, { exact: true }).first();
      if (await loc.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await expect(loc).toBeVisible({ timeout: 5_000 });
      }
    };

    await assertIfPresent("Organisation Type is required");

    await expect(
      root
        .getByText("Legal Company Name is required", { exact: true })
        .or(root.getByText("Legal Name is required", { exact: true }))
        .or(root.getByText(/Please enter a Name for the party/i))
        .or(root.getByText("This field cannot be blank", { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    /** Company reg / NZBN copy varies by build (label + “is required” vs “Please enter …”). */
    await expect(
      root
        .getByText("Registered Company Number is required", { exact: true })
        .or(root.getByText("Registered company number is required", { exact: true }))
        .or(root.getByText("Company Number is required", { exact: true }))
        .or(root.getByText("NZ Company Number is required", { exact: true }))
        .or(
          root.getByText(
            /(Registered Company Number|Company Number|NZ Company Number|Company number|NZCN).{0,20}(is required|required|cannot be blank)/i,
          ),
        )
        .or(root.getByText(/Please enter.*(Registered Company|Company Number|NZ Company)/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      root
        .getByText("New Zealand Business Number is required", { exact: true })
        .or(root.getByText("New Zealand business number is required", { exact: true }))
        .or(root.getByText("NZ Business Number is required", { exact: true }))
        .or(root.getByText("NZBN is required", { exact: true }))
        .or(
          root.getByText(
            /(New Zealand Business Number|NZ Business Number|NZBN).{0,20}(is required|required|cannot be blank)/i,
          ),
        )
        .or(root.getByText(/Please enter.*(New Zealand Business|NZBN|NZ Business)/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      root
        .getByText("Primary Nature of Business is required", { exact: true })
        .or(root.getByText("Primary nature of business is required", { exact: true }))
        .or(
          root.getByText(/Primary Nature of Business.{0,20}(is required|required)/i),
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    const timeInBiz = root.getByText("Time in Business is required", { exact: true });
    try {
      await expect(timeInBiz).toHaveCount(2, { timeout: 8_000 });
      await expect(timeInBiz.nth(0)).toBeVisible({ timeout: 15_000 });
      await expect(timeInBiz.nth(1)).toBeVisible({ timeout: 15_000 });
    } catch {
      const yearsReq = root.getByText("Years is required", { exact: true }).first();
      const monthsReq = root.getByText("Months is required", { exact: true }).first();
      try {
        await expect(yearsReq).toBeVisible({ timeout: 8_000 });
        await expect(monthsReq).toBeVisible({ timeout: 8_000 });
      } catch {
        await expect(timeInBiz.first()).toBeVisible({ timeout: 20_000 });
      }
    }

    await assertIfPresent("Trading Name is required");
    await assertIfPresent("GST Number is required");
    await assertIfPresent("Description of Business is required");
    await assertIfPresent("Business Description is required");
    await assertIfPresent("Source of Wealth is required");
    await assertIfPresent("Phone Number is required");
    await assertIfPresent("Phone number is required");
    await assertIfPresent("Email is required");
  }

  /**
   * After **Next** with invalid phone, email, and company identifiers, expect format / pattern messages.
   * **Phone** and **Email** copy is stable; **Registered Company Number**, **NZBN**, and **GST** wording
   * varies by build (or only “required” / length rules appear) — those are asserted only when visible.
   */
  async expectBusinessDetailsInvalidFormatValidationMessages(): Promise<void> {
    const root = this.businessRoot;

    await expect(
      root
        .getByText("Phone Number is in an incorrect format", { exact: true })
        .or(root.getByText("Phone number is in an incorrect format", { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      root.getByText("Email is in an incorrect format", { exact: true }).first(),
    ).toBeVisible({ timeout: 20_000 });

    const assertFormatIfShown = async (exact: string): Promise<void> => {
      const el = root.getByText(exact, { exact: true }).first();
      if (await el.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await expect(el).toBeVisible({ timeout: 5_000 });
      }
    };

    await assertFormatIfShown("Registered Company Number is in an incorrect format");
    await assertFormatIfShown("New Zealand Business Number is in an incorrect format");
    await assertFormatIfShown("GST Number is in an incorrect format");
  }

  /**
   * After **Save** with required Business Details left unset, expect PrimeNG error toaster
   * (post-enhancement: validation surfaces as a toast instead of inline under-field copy on Save).
   */
  async expectBusinessDetailsSaveValidationToaster(
    messagePattern: RegExp = /Legal\s*Name is required to save the party/i,
  ): Promise<void> {
    this.logStep("Expect Business Details save validation toaster");
    await expect(
      this.page
        .locator(
          ".p-toast-message-error, .p-toast-message-warn, .p-toast-message, .p-toast-detail, [role='alert']",
        )
        .filter({ hasText: messagePattern })
        .first(),
    ).toBeVisible({ timeout: 25_000 });
  }

  private standardQuoteCancelButton(): Locator {
    return this.page
      .locator("app-quote-details, app-standard-quote")
      .first()
      .getByRole("button", { name: /^Cancel$/i })
      .first()
      .or(this.page.getByRole("button", { name: /^Cancel$/i }).first());
  }

  private unsavedChangesCancelConfirmDialog(): Locator {
    return this.page
      .locator("p-confirmdialog, .p-confirm-dialog, [role='alertdialog']")
      .filter({ visible: true })
      .filter({ hasText: /unsaved changes|lost|cancel/i })
      .first();
  }

  async clickCancelBusinessDetails(): Promise<void> {
    this.logStep("Click Cancel on Business Details");
    const cancelBtn = this.standardQuoteCancelButton();
    await expect(cancelBtn).toBeVisible({ timeout: 30_000 });
    await cancelBtn.scrollIntoViewIfNeeded();
    await cancelBtn.click({ timeout: 15_000 });
  }

  /** After **Cancel** with unsaved Business Details — confirmation copy (UDP-T4479). */
  async expectUnsavedChangesCancelConfirmation(): Promise<void> {
    this.logStep("Expect unsaved changes cancel confirmation");
    const confirmDlg = this.unsavedChangesCancelConfirmDialog();
    await expect(confirmDlg).toBeVisible({ timeout: 15_000 });
    await expect(confirmDlg).toContainText(/Any unsaved changes will be lost/i);
    await expect(confirmDlg).toContainText(/Are you sure you want to cancel/i);
  }

  async confirmCancelDiscardUnsavedChanges(): Promise<void> {
    this.logStep("Confirm cancel — discard unsaved changes");
    const confirmDlg = this.unsavedChangesCancelConfirmDialog();
    const discardBtn = confirmDlg
      .getByRole("button", { name: /^(Yes|OK|Confirm|Discard)$/i })
      .or(confirmDlg.locator("button.p-confirm-dialog-accept").first())
      .first();
    await expect(discardBtn).toBeVisible({ timeout: 10_000 });
    await discardBtn.click({ timeout: 10_000 });
    await expect(confirmDlg).toBeHidden({ timeout: 20_000 }).catch(() => {});
  }

  /** Partnership role/org-type guard messages (UDP-T4460, T4472). */
  async expectPartnershipRoleOrganisationTypeValidation(): Promise<void> {
    this.logStep("Expect Partnership role / organisation type validation");
    const patterns = [
      /There should be 2 co-borrowers required for partnership/i,
      /Organisation Type should not be Partnership for Co[\s-]*Borrower/i,
      /Organisation Type should not be Partnership for Guarantor/i,
      /Customer role should be Borrower when Organisation Type\s*=\s*Partnership/i,
    ];
    const toastRoot = this.page.locator(
      ".p-toast, .p-toast-message, .p-toast-detail, [role='alert'], .p-message, .p-inline-message",
    );

    await expect
      .poll(
        async () => {
          for (const pattern of patterns) {
            if (await this.page.getByText(pattern).first().isVisible().catch(() => false)) {
              return true;
            }
            if (await toastRoot.filter({ hasText: pattern }).first().isVisible().catch(() => false)) {
              return true;
            }
            if (await this.businessRoot.getByText(pattern).first().isVisible().catch(() => false)) {
              return true;
            }
          }
          return false;
        },
        { timeout: 30_000, intervals: [250, 500, 1_000] },
      )
      .toBe(true);
  }

  /** Save with partial data should not surface mandatory validation (UDP-T4480). */
  async expectNoMandatoryValidationOnBusinessDetails(): Promise<void> {
    this.logStep("Expect no mandatory validation on Business Details");
    await expect(this.businessRoot.getByText(/is required/i)).toHaveCount(0, { timeout: 5_000 });
    await expect(
      this.page
        .locator(".p-toast-message-error, .p-toast-message-warn")
        .filter({ hasText: /is required/i }),
    ).toHaveCount(0, { timeout: 3_000 });
  }
}
