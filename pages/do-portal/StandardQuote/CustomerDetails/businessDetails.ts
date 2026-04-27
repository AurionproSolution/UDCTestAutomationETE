import { Locator, Page } from "@playwright/test";
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
  }

  async waitForBusinessDetailsStep(): Promise<void> {
    await this.businessRoot.waitFor({ state: "visible", timeout: 120000 });
    await this.businessRoot
      .getByText(/Organisation Type/i)
      .first()
      .waitFor({ state: "visible", timeout: 30000 });
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
        await trigger.waitFor({ state: "visible", timeout });
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
    await this.selectDropdownByLabel(this.businessRoot, "Organisation Type");
    await this.pickDropdownOption(optionName, true);
  }

  private floatTextInput(label: RegExp): Locator {
    return this.businessRoot.locator("text").filter({ hasText: label }).locator("#text");
  }

  async enterLegalName(value: string): Promise<void> {
    const primary = this.floatTextInput(/^Legal Name/i);
    if (await primary.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primary.click();
      await primary.fill(value);
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

  async enterTradingName(value: string): Promise<void> {
    const primary = this.floatTextInput(/^Trading Name/i);
    if (await primary.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primary.click();
      await primary.fill(value);
      return;
    }
    const fb = this.businessRoot
      .locator("form > div:nth-child(1) > div:nth-child(3) text div div:nth-child(2) input")
      .first();
    await fb.waitFor({ state: "visible", timeout: 15000 });
    await fb.fill(value);
  }

  async enterRegisteredCompanyNumber(value: string): Promise<void> {
    const primary = this.floatTextInput(/Registered Company Number/i);
    if (await primary.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primary.fill(value);
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

  async enterNzBusinessNumber(value: string): Promise<void> {
    const primary = this.floatTextInput(/New Zealand Business Number/i);
    if (await primary.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primary.fill(value);
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

  async enterGstNumber(value: string): Promise<void> {
    const primary = this.floatTextInput(/^GST Number/i);
    if (await primary.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primary.fill(value);
      return;
    }
    const fb = this.businessRoot
      .locator("form > div:nth-child(1) > div:nth-child(7) text div div:nth-child(2) input")
      .first();
    await fb.waitFor({ state: "visible", timeout: 15000 });
    await fb.fill(value);
  }

  async fillBusinessDescription(note: string): Promise<void> {
    const ta = this.businessRoot.locator("#note").first();
    await ta.waitFor({ state: "visible", timeout: 15000 });
    await ta.fill(note);
  }

  async selectPrimaryNatureOfBusiness(optionText: string): Promise<void> {
    await this.selectDropdownByLabel(this.businessRoot, "Primary Nature of Business");
    await this.pickDropdownOption(optionText, false);
  }

  async selectSourceOfWealth(optionName: string): Promise<void> {
    await this.selectDropdownByLabel(this.businessRoot, "Source of Wealth");
    await this.pickDropdownOption(optionName, true);
  }

  async enterTimeInBusiness(years: string, months: string): Promise<void> {
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
    const scoped = this.businessRoot.locator(
      "input.p-inputtext.p-component.p-element.w-full",
    ).first();
    await scoped.waitFor({ state: "visible", timeout: 15000 });
    await scoped.fill(areaCode);
  }

  async enterBusinessPhoneNumber(phone: string): Promise<void> {
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
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
  }
}
