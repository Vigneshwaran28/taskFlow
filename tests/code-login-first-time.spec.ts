import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";

test.describe("First-time CodeKey Login & Password Setup", () => {
  test.beforeEach(async () => {
    execSync("node --env-file=../server/.env ./tests/helpers/resetTestUser.mjs", { stdio: "ignore" });
  });

  test("Direct login with TF-491297 from /login omits temporary password field and sets new password", async ({ page, context }) => {
    // Clear cookies for fresh session
    await context.clearCookies();
    page.on("console", msg => console.log("PAGE LOG:", msg.text()));

    // 1. Visit /login
    await page.goto("/login");
    await expect(page).toHaveTitle(/TaskFlow/i);

    // 2. Fill login access code (TF-491297)
    const codeInput = page.locator('input[name="email"]');
    await expect(codeInput).toBeVisible();
    await codeInput.fill("TF-491297");

    // 3. Click Continue
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 4. Should navigate directly to workspace (/titan) and show ForcePasswordChange
    await page.waitForURL(url => url.pathname.includes("/titan"), { timeout: 15000 });

    // 5. Verify title and heading for first-time code login
    await expect(page.getByRole("heading", { name: /Create your password/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Set your personal password to get started/i)).toBeVisible();

    // 6. CRITICAL VERIFICATION: No temporary password field should be present!
    const tempPasswordInput = page.locator('input[name="currentPassword"]');
    await expect(tempPasswordInput).toHaveCount(0);

    // 7. Verify New password and Confirm new password fields ARE present
    const newPasswordInput = page.locator('input[name="newPassword"]');
    const confirmPasswordInput = page.locator('input[name="confirm"]');
    await expect(newPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();

    // 8. Test validation: mismatch
    await newPasswordInput.fill("ValidPass123!@#");
    await confirmPasswordInput.fill("Mismatch123!@#");
    await page.locator('button:has-text("Save and continue")').click();
    await expect(page.getByText(/The passwords don't match/i)).toBeVisible();

    // 9. Enter matching passwords and submit
    await confirmPasswordInput.fill("ValidPass123!@#");
    await page.locator('button:has-text("Save and continue")').click();

    // 10. Force password change dialog should disappear and workspace opens
    await expect(page.getByRole("heading", { name: /Create your password/i })).toHaveCount(0, { timeout: 15000 });
  });

  test("Direct login with TF-491297 from root workspace address form", async ({ page, context }) => {
    await context.clearCookies();

    // Go to root landing page
    await page.goto("/");

    // Enter TF-491297 into the workspace address / login code input
    const addressInput = page.locator('input[placeholder*="acme"], input[id*="workspace"], input[type="text"]').first();
    await expect(addressInput).toBeVisible();
    await addressInput.fill("TF-491297");

    // Click continue
    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
    await continueBtn.click();

    // Should navigate directly to workspace without bouncing to tenant login
    await page.waitForURL(url => url.pathname.includes("/titan"), { timeout: 15000 });
    expect(page.url()).toContain("/titan");
  });
});
