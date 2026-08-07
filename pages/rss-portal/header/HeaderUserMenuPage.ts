/**
 * RSS Portal — header user menu (username / profile icon, top-right).
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export class RSSHeaderUserMenuPage extends BasePage {
  readonly userMenuButton: Locator;

  constructor(page: Page) {
    super(page);
    this.userMenuButton = page
      .locator(".layout-topbar-menu")
      .getByRole("button")
      .filter({
        hasNot: page.locator('img[alt="Bell"], img[src*="contact-topbar-primary"]'),
      })
      .last();
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Header User Menu";
  }

  userMenuPanel(): Locator {
    return this.page
      .locator(".p-overlaypanel-content")
      .filter({ hasText: /My Profile/i })
      .filter({ visible: true })
      .first();
  }

  myProfileMenuItem(): Locator {
    return this.userMenuPanel().locator("span").filter({ hasText: /My Profile/i }).first();
  }

  changePasswordMenuItem(): Locator {
    return this.userMenuPanel().locator("span").filter({ hasText: /Change password/i }).first();
  }

  logoutMenuItem(): Locator {
    return this.userMenuPanel().locator("span").filter({ hasText: /Logout/i }).first();
  }

  async openUserMenu(): Promise<void> {
    this.logStep("Open User Menu");
    await this.userMenuButton.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(this.userMenuButton);
    await expect(this.userMenuPanel()).toBeVisible({ timeout: 10_000 });
    await this.expectUserMenuVisible();
  }

  async expectUserMenuVisible(): Promise<void> {
    this.logStep("Expect User Menu Visible");
    await expect(this.myProfileMenuItem()).toBeVisible({ timeout: 10_000 });
    if (await this.changePasswordMenuItem().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(this.changePasswordMenuItem()).toBeVisible({ timeout: 5_000 });
    }
    await expect(this.logoutMenuItem()).toBeVisible({ timeout: 10_000 });
  }

  async clickMyProfile(): Promise<void> {
    this.logStep("Click My Profile");
    await this.clickElement(this.myProfileMenuItem());
    await this.waitForLoadingComplete();
  }

  async openMyProfileFromTopbar(): Promise<void> {
    await this.openUserMenu();
    await this.clickMyProfile();
  }

  async clickLogout(): Promise<void> {
    this.logStep("Click Logout");
    await this.clickElement(this.logoutMenuItem());
    await this.waitForLoadingComplete();
  }
}
