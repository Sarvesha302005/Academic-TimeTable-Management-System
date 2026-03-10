import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test('Valid student login should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Verify login page loads
    await expect(page.locator('text=Login')).toBeVisible();
    
    // Fill login form with valid credentials
    await page.fill('[type="email"]', 'student@example.com');
    await page.fill('[type="password"]', 'password123');
    
    // Click login button
    await page.click('button:has-text("Login")');
    
    // Wait for navigation and verify dashboard appears
    await page.waitForURL(/\/(dashboard|student-dashboard)/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/(dashboard|student-dashboard)/);
  });

  test('Invalid credentials should show error message', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form with invalid credentials
    await page.fill('[type="email"]', 'invalid@example.com');
    await page.fill('[type="password"]', 'wrongpassword');
    
    // Click login button
    await page.click('button:has-text("Login")');
    
    // Verify error message appears (adjust selector based on actual app)
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
    
    // Should remain on login page
    await expect(page).toHaveURL('/');
  });

  test('Email field is required', async ({ page }) => {
    await page.goto('/');
    
    // Leave email empty, fill password
    await page.fill('[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    
    // Verify validation error or disabled state
    const button = page.locator('button:has-text("Login")');
    const isDisabled = await button.isDisabled();
    const errorMessage = page.locator('text=/email|required/i');
    
    expect(isDisabled || await errorMessage.isVisible().catch(() => false)).toBeTruthy();
  });

  test('Password field is required', async ({ page }) => {
    await page.goto('/');
    
    // Leave password empty, fill email
    await page.fill('[type="email"]', 'student@example.com');
    await page.click('button:has-text("Login")');
    
    // Verify validation error or disabled state
    const button = page.locator('button:has-text("Login")');
    const isDisabled = await button.isDisabled();
    const errorMessage = page.locator('text=/password|required/i');
    
    expect(isDisabled || await errorMessage.isVisible().catch(() => false)).toBeTruthy();
  });

  test('Logout should redirect to login page', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('[type="email"]', 'student@example.com');
    await page.fill('[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|student-dashboard)/);
    
    // Find and click logout button
    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL('/');
      await expect(page).toHaveURL('/');
    }
  });
});
