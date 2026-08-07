/**
 * RSS Portal — header notification bell (`app-notification-bell` / PrimeNG overlay panel).
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export class RSSNotificationBellPage extends BasePage {
  readonly bellButton: Locator;

  constructor(page: Page) {
    super(page);
    this.bellButton = page
      .locator(".layout-topbar-menu button.layout-topbar-button")
      .filter({
        has: page.locator('img.header-icon[alt="Bell"], img[alt="Bell"]'),
      })
      .first();
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Notification Bell";
  }

  notificationBadge(): Locator {
    return this.bellButton.locator("span").filter({ hasText: /\d/ }).first();
  }

  async getNotificationBadgeCount(): Promise<number> {
    this.logStep("Get Notification Badge Count");
    const badge = this.notificationBadge();
    if (!(await badge.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return 0;
    }
    const value = Number.parseInt((await badge.innerText()).trim(), 10);
    return Number.isNaN(value) ? 0 : value;
  }

  notificationPanel(): Locator {
    return this.page
      .locator("app-notification-bell .p-overlaypanel, app-notification-bell p-overlaypanel")
      .filter({ visible: true })
      .or(this.page.locator(".p-overlaypanel").filter({ hasText: /Dismiss All/i }))
      .first();
  }

  async openNotificationPanel(): Promise<void> {
    this.logStep("Open Notification Panel");
    await this.bellButton.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(this.bellButton);
    await this.notificationPanel().waitFor({ state: "visible", timeout: 20_000 });
  }

  async expectNotificationPanelVisible(): Promise<void> {
    this.logStep("Expect Notification Panel Visible");
    await expect(this.notificationPanel()).toBeVisible({ timeout: 15_000 });
  }

  /** Footer legend for notification types (Information / Warnings / Errors). */
  async expectNotificationTypeLegendVisible(): Promise<void> {
    this.logStep("Expect Notification Type Legend Visible");
    const panel = this.notificationPanel();
    await expect(panel.getByText(/^Information$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(panel.getByText(/^Warnings$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(panel.getByText(/^Errors$/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectDismissAllVisible(): Promise<void> {
    this.logStep("Expect Dismiss All Visible");
    await expect(this.notificationPanel().getByText(/Dismiss All/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /** At least one notification row in the open panel (login info, warnings, or errors). */
  async expectAtLeastOneNotificationItem(): Promise<void> {
    this.logStep("Expect At Least One Notification Item");
    const panel = this.notificationPanel();
    const item = panel
      .locator(
        [
          ".notification-item",
          ".notification-list li",
          ".p-overlaypanel-content div",
          "li",
        ].join(", "),
      )
      .filter({ hasText: /\S/ })
      .filter({ hasNotText: /^Dismiss All$/i })
      .filter({ hasNotText: /^Information$/i })
      .filter({ hasNotText: /^Warnings$/i })
      .filter({ hasNotText: /^Errors$/i });
    await expect(item.first()).toBeVisible({ timeout: 15_000 });
  }

  async expectNotificationPanelContents(): Promise<void> {
    await this.expectNotificationPanelVisible();
    await this.expectNotificationTypeLegendVisible();
    await this.expectDismissAllVisible();
    await this.expectAtLeastOneNotificationItem();
  }
}
