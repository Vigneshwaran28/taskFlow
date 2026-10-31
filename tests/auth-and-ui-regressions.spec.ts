import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";

test.describe("Auth & UI Regression Tests", () => {
  test.beforeEach(async () => {
    // Reset test user (TF-491297, id: 5) to must_change_password = true
    execSync("node --env-file=../server/.env ./tests/helpers/resetTestUser.mjs", { stdio: "ignore" });
  });

  test("Standard email login with mustChangePassword DOES ask for Temporary password field", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Visit workspace login (/titan/login)
    await page.goto("/titan/login");

    // 2. Fill email and password (standard login)
    await page.locator('input[name="email"]').fill("edgevicky28@gmail.com");
    await page.locator('input[name="password"]').fill("ValidPass123!@#");

    // 3. Submit
    await page.locator('button[type="submit"]').click();

    // 4. Navigates into workspace (/titan) with password change requirement
    await page.waitForURL(url => url.pathname === "/titan" || url.pathname === "/titan/", { timeout: 15000 });

    // 5. For standard email login, heading is "Choose your password" and Temporary password IS required
    await expect(page.getByRole("heading", { name: /Choose your password/i })).toBeVisible({ timeout: 10000 });
    const tempPasswordInput = page.locator('input[name="currentPassword"]');
    await expect(tempPasswordInput).toBeVisible();
    await expect(page.locator('input[name="newPassword"]')).toBeVisible();
    await expect(page.locator('input[name="confirm"]')).toBeVisible();
  });

  test("Select dropdowns have custom-icon styling without double arrow overlay", async ({ page }) => {
    await page.goto("/login");
    // Verify select elements in the app have data-custom-icon attribute and background-image none
    const selects = page.locator('select[data-custom-icon="true"]');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const select = selects.nth(i);
      const bgImage = await select.evaluate(el => window.getComputedStyle(el).backgroundImage);
      expect(bgImage).toBe("none");
    }
  });

  test("In glass style, floating dropdowns and notification popovers have opaque background to avoid text bleed-through", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Visit workspace login
    await page.goto("/titan/login");
    await page.locator('input[name="email"]').fill("edgevicky28@gmail.com");
    await page.locator('input[name="password"]').fill("ValidPass123!@#");
    await page.locator('button[type="submit"]').click();

    // 2. Complete password setup since user 5 has must_change_password = true
    await page.waitForURL(url => url.pathname === "/titan" || url.pathname === "/titan/", { timeout: 15000 });
    const chooseHeading = page.getByRole("heading", { name: /Choose your password/i });
    await chooseHeading.waitFor({ state: "visible", timeout: 10000 });
    await page.locator('input[name="currentPassword"]').fill("ValidPass123!@#");
    await page.locator('input[name="newPassword"]').fill("BrandNewPass456!@#");
    await page.locator('input[name="confirm"]').fill("BrandNewPass456!@#");
    await page.locator('button:has-text("Save and continue")').click();
    await expect(chooseHeading).toHaveCount(0, { timeout: 15000 });

    // 3. Set data-style="glass" on html
    await page.evaluate(() => {
      document.documentElement.dataset.style = "glass";
    });

    // Close onboarding tour if present
    const closeTour1 = page.locator('button[aria-label="Close the tour"]');
    if (await closeTour1.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeTour1.click();
    }

    // 4. Click notification bell
    const bellBtn = page.locator('button[aria-label*="Notification"]').first();
    await expect(bellBtn).toBeVisible({ timeout: 10000 });
    await bellBtn.click();

    // 5. Verify notification popover is visible and has opaque background
    const popover = page.locator('div[role="region"][aria-label="Notifications"]');
    await expect(popover).toBeVisible();

    const bgColor = await popover.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Background must be rgb(255, 255, 255) / opaque, NOT transparent rgba(..., 0.62)
    expect(bgColor).toBe("rgb(255, 255, 255)");
  });

  test("Notification badge count is prominent, properly visible, and marks read correctly", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Visit workspace login and complete first-time password setup for user 5
    await page.goto("/titan/login");
    await page.locator('input[name="email"]').fill("edgevicky28@gmail.com");
    await page.locator('input[name="password"]').fill("ValidPass123!@#");
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(url => url.pathname === "/titan" || url.pathname === "/titan/", { timeout: 15000 });
    const chooseHeading = page.getByRole("heading", { name: /Choose your password/i });
    await chooseHeading.waitFor({ state: "visible", timeout: 10000 });
    await page.locator('input[name="currentPassword"]').fill("ValidPass123!@#");
    await page.locator('input[name="newPassword"]').fill("BrandNewPass456!@#");
    await page.locator('input[name="confirm"]').fill("BrandNewPass456!@#");
    await page.locator('button:has-text("Save and continue")').click();
    await expect(chooseHeading).toHaveCount(0, { timeout: 15000 });

    // Close onboarding tour if present
    const closeTour2 = page.locator('button[aria-label="Close the tour"]');
    if (await closeTour2.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeTour2.click();
    }

    // 2. Notification badge must be visible with unread count
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).toBeVisible({ timeout: 10000 });
    await expect(badge).toHaveText("1");

    // 3. Verify styling: bold, white text on red-600 background with border ring and shadow
    const classList = (await badge.getAttribute("class")) || "";
    expect(classList).toContain("bg-red-600");
    expect(classList).toContain("text-white");
    expect(classList).toContain("font-bold");
    expect(classList).toContain("ring-2");
    expect(classList).toContain("-top-1");
    expect(classList).toContain("-right-1");

    // 4. Click notification bell to open popover
    const bellBtn = page.locator('button[aria-label*="Notification"]').first();
    await bellBtn.click();
    const popover = page.locator('div[role="region"][aria-label="Notifications"]');
    await expect(popover).toBeVisible();

    // 5. Verify the notification item is displayed
    await expect(page.getByText("Test Task Reminder")).toBeVisible();

    // 6. Click Mark all read
    const markAllReadBtn = page.locator('button:has-text("Mark all read")');
    await expect(markAllReadBtn).toBeVisible();
    await markAllReadBtn.click();

    // 7. Verify badge is gone
    await expect(badge).toHaveCount(0);
  });
});

