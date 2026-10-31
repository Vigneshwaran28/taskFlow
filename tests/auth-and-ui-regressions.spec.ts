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
});
