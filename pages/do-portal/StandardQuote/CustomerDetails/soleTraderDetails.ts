import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * **Sole Trader** — Step 1 **Business Individual** (`app-sole-trade` / `app-sole-trade-business-details`):
 * Business Details (trading name, GST, description, nature of business, time in business) plus
 * Contact helpers on the same host when tests reuse business-style phone/email steps.
 * **Date of Birth** in Personal Details uses PrimeNG `p-calendar` (avoid hard-coding `ng-tns-*`).
 */
export class DOSoleTraderDetailsPage extends BasePage {
  readonly soleTradeRoot: Locator;
  readonly businessCard: Locator;
  readonly businessEmailInput: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.soleTradeRoot = page.locator("app-sole-trade").first();
    this.businessCard = page.locator("app-sole-trade-business-details").first();
    this.businessEmailInput = this.soleTradeRoot
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

  async waitForSoleTraderBusinessDetailsStep(): Promise<void> {
    await this.soleTradeRoot.waitFor({ state: "visible", timeout: 120000 });
    await this.businessCard.waitFor({ state: "visible", timeout: 60000 });
    await this.businessCard
      .getByText(/Trading Name|Business Details/i)
      .first()
      .waitFor({ state: "visible", timeout: 30000 });
  }

  private floatTextInput(root: Locator, label: RegExp): Locator {
    return root.locator("text").filter({ hasText: label }).locator("#text");
  }

  private personalDetailsCard(): Locator {
    return this.soleTradeRoot
      .locator("gen-card, p-card")
      .filter({ hasText: /Personal Details/i })
      .first();
  }

  /** PrimeNG calendar text input — often readonly; same approach as financial year-ending fields. */
  private async fillPrimeNgDateInput(input: Locator, value: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 20000 });
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 15000, force: true });
    await input.press("Control+A");
    await input.pressSequentially(value, { delay: 40 });
    await input.press("Tab");
    await this.page.waitForTimeout(350);

    const v = (await input.inputValue().catch(() => "")).trim();
    if (v.length > 0) {
      await this.page.keyboard.press("Escape").catch(() => {});
      return;
    }

    await input.evaluate((el: HTMLInputElement, dateStr: string) => {
      el.removeAttribute("readonly");
      el.removeAttribute("disabled");
      el.focus();
      el.value = dateStr;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    }, value);
    await this.page.waitForTimeout(350);
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /**
   * **Personal Details** → Date of Birth * (`p-calendar` input). Hub used something like
   * `input.p-element…ng-tns-*…p-inputtext.p-component` — we match stable classes under `app-sole-trade` only.
   */
  async enterDateOfBirth(dob: string): Promise<void> {
    const personal = this.personalDetailsCard();
    await personal.waitFor({ state: "visible", timeout: 30000 });

    const byRole = personal.getByRole("textbox", { name: /Date of Birth/i });
    if (await byRole.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.fillPrimeNgDateInput(byRole, dob);
      return;
    }

    const labelCal = personal
      .locator("label")
      .filter({ hasText: /Date of Birth/i })
      .first()
      .locator(
        "xpath=following::p-calendar[1]//input[contains(@class,'p-inputtext')][1]",
      );
    if (await labelCal.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.fillPrimeNgDateInput(labelCal, dob);
      return;
    }

    const floatCal = personal
      .locator(".p-float-label")
      .filter({ hasText: /Date of Birth/i })
      .first()
      .locator("input.p-inputtext");
    if (await floatCal.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.fillPrimeNgDateInput(floatCal, dob);
      return;
    }

    const firstCal = personal.locator("p-calendar").first().locator("input.p-inputtext");
    if (await firstCal.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.fillPrimeNgDateInput(firstCal, dob);
      return;
    }

    const hubStable = personal
      .locator(
        "input.p-inputtext.p-component.p-element.ng-star-inserted",
      )
      .first();
    await hubStable.waitFor({ state: "visible", timeout: 20000 });
    await this.fillPrimeNgDateInput(hubStable, dob);
  }

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
      `Sole Trader Business Details: could not open dropdown for "${labelNeedle}" (PrimeNG trigger not found).`,
    );
  }

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

  /** Trading Name * — float `text#text`, label→input, or first `form-control` in the business card. */
  async enterTradingName(value: string): Promise<void> {
    const root = this.businessCard;
    const primary = this.floatTextInput(root, /^Trading Name/i);
    if (await primary.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primary.click();
      await primary.fill(value);
      return;
    }
    const byLabel = root
      .locator("label")
      .filter({ hasText: /^Trading Name/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    if (await byLabel.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byLabel.fill(value);
      return;
    }
    const stable = root
      .locator("input.p-inputtext.p-component.p-element.form-control")
      .first();
    await stable.waitFor({ state: "visible", timeout: 20000 });
    await stable.fill(value);
  }

  /** GST Number — float `text#text`, label→input, or Selector Hub row under `app-sole-trade-business-details`. */
  async enterGstNumber(value: string): Promise<void> {
    const root = this.businessCard;
    const primary = this.floatTextInput(root, /^GST Number/i);
    if (await primary.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primary.click();
      await primary.fill(value);
      return;
    }
    const byLabel = root
      .locator("label")
      .filter({ hasText: /GST Number/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");
    if (await byLabel.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byLabel.fill(value);
      return;
    }
    const hubRow = root
      .locator("form > div:nth-child(1) > div:nth-child(2) text div div:nth-child(2) input")
      .first();
    await hubRow.waitFor({ state: "visible", timeout: 15000 });
    await hubRow.fill(value);
  }

  /** Business Description — `#note` in the business details card. */
  async fillBusinessDescription(note: string): Promise<void> {
    const ta = this.businessCard.locator("#note").first();
    await ta.waitFor({ state: "visible", timeout: 20000 });
    await ta.fill(note);
  }

  async selectPrimaryNatureOfBusiness(optionText: string): Promise<void> {
    await this.selectDropdownByLabel(this.businessCard, "Primary Nature of Business");
    await this.pickDropdownOption(optionText, false);
  }

  /** Time in Business — Years / Months (label grid, then Selector Hub `div:nth-child(6|8)` rows). */
  async enterTimeInBusiness(years: string, months: string): Promise<void> {
    const root = this.businessCard;
    const yearsAnchor = root.getByText(/^Years$/i).first();
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

    const monthsAnchor = root.getByText(/^Months$/i).first();
    const row = monthsAnchor.locator(
      "xpath=ancestor::*[contains(@class,'grid') or contains(@class,'row') or contains(@class,'flex')][1]",
    );
    const pair = row.locator("input.p-inputtext");
    if ((await pair.count()) >= 2) {
      await pair.nth(0).fill(years);
      await pair.nth(1).fill(months);
      return;
    }

    const yearsFb = root
      .locator("form > div:nth-child(1) > div:nth-child(6) text div div:nth-child(2) input")
      .first();
    const monthsFb = root
      .locator("form > div:nth-child(1) > div:nth-child(8) text div div:nth-child(2) input")
      .first();
    await yearsFb.waitFor({ state: "visible", timeout: 15000 });
    await yearsFb.fill(years);
    await monthsFb.waitFor({ state: "visible", timeout: 15000 });
    await monthsFb.fill(months);
  }

  async enterBusinessAreaCode(areaCode: string): Promise<void> {
    const byRole = this.soleTradeRoot.getByRole("textbox", { name: /Area code/i });
    if (await byRole.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byRole.fill(areaCode);
      return;
    }
    const scoped = this.soleTradeRoot
      .locator("input.p-inputtext.p-component.p-element.w-full")
      .first();
    await scoped.waitFor({ state: "visible", timeout: 15000 });
    await scoped.fill(areaCode);
  }

  async enterBusinessPhoneNumber(phone: string): Promise<void> {
    const byRole = this.soleTradeRoot.getByRole("textbox", { name: /Phone number/i });
    if (await byRole.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byRole.fill(phone);
      return;
    }
    await this.page.getByRole("textbox", { name: /Phone number/i }).fill(phone);
  }

  async enterBusinessEmail(email: string, emailFieldOverride?: Locator): Promise<void> {
    if (emailFieldOverride) {
      await emailFieldOverride.waitFor({ state: "visible", timeout: 30000 });
      await this.fillElement(emailFieldOverride, email);
      return;
    }

    const root = this.soleTradeRoot;
    const noEmail = root.getByRole("checkbox", { name: /No Email/i });
    if ((await noEmail.isVisible({ timeout: 4000 }).catch(() => false)) && (await noEmail.isChecked())) {
      await noEmail.uncheck();
      await this.page.waitForTimeout(250);
    }

    const float = this.floatTextInput(root, /^Email/i);
    if (await float.isVisible({ timeout: 8000 }).catch(() => false)) {
      await float.click();
      await float.fill(email);
      return;
    }

    const contactSection = root
      .locator("p-card, gen-card")
      .filter({ hasText: /Contact Details/i })
      .first();

    const anyFollowingLabel = (r: Locator) =>
      r
        .locator("label")
        .filter({ hasText: /^Email/i })
        .first()
        .locator(
          "xpath=following::input[not(@type='hidden') and (@type='text' or @type='email' or not(@type))][1]",
        );

    const addOtherAnchor = (r: Locator) =>
      r
        .locator("a, button, [role='button']")
        .filter({ hasText: /Add Other Email/i })
        .first()
        .locator(
          "xpath=preceding::input[(@type='text' or @type='email' or not(@type)) and not(@type='url')][1]",
        );

    const byLabel = [
      root.getByLabel(/^Email\s*\*?\s*$/i).first(),
      root.getByLabel(/^Email$/i).first(),
    ];

    const labelFollowingPrime = root
      .locator("label")
      .filter({ hasText: /^Email/i })
      .first()
      .locator("xpath=following::input[contains(@class,'p-inputtext')][1]");

    const emailBelowLabelInContact = anyFollowingLabel(contactSection);
    const labelFollowingAny = anyFollowingLabel(root);

    const emailContactHost = root
      .locator(
        'app-personal-detail-email-contact input[type="text"], app-business-detail-email-contact input[type="text"]',
      )
      .first();

    const floatLabelInput = root
      .locator(".p-float-label")
      .filter({ hasText: /^Email/i })
      .first()
      .locator("input:not([type='hidden'])");

    const candidates: Locator[] = [
      this.businessEmailInput,
      addOtherAnchor(contactSection),
      addOtherAnchor(root),
      ...byLabel,
      emailBelowLabelInContact,
      labelFollowingAny,
      labelFollowingPrime,
      emailContactHost,
      floatLabelInput,
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
      "Sole Trader: Email input not found under app-sole-trade. Pass a locator override if needed.",
    );
  }

  async clickNextButton(): Promise<void> {
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
  }
}
