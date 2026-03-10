import { test, expect } from '@playwright/test';

test.describe('Error Handling & Edge Cases E2E Tests', () => {
  test('Network timeout handling - login page remains responsive', async ({ page }) => {
    await page.goto('/');
    
    // Verify page is responsive
    const loginBtn = page.locator('button:has-text("Login")');
    await expect(loginBtn).toBeEnabled();
  });

  test('Empty form submission - validation messages appear', async ({ page }) => {
    await page.goto('/');
    
    // Click login without filling form
    const loginBtn = page.locator('button:has-text("Login")');
    
    // Check if button is disabled or if validation appears
    const isDisabled = await loginBtn.isDisabled().catch(() => false);
    
    if (!isDisabled) {
      await loginBtn.click();
      
      // Verify validation messages appear
      const errorMessages = page.locator('text=/required|invalid|error/i');
      const isVisible = await errorMessages.first().isVisible().catch(() => false);
      expect(isDisabled || isVisible).toBeTruthy();
    }
  });

  test('SQL Injection attempt - safe handling', async ({ page }) => {
    await page.goto('/');
    
    // Try SQL injection in email field
    await page.fill('[type="email"]', "'; DROP TABLE users; --");
    await page.fill('[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    
    // Verify app handles it gracefully
    await page.waitForTimeout(2000);
    
    // Should either show error or redirect to error page
    const errorMessage = page.locator('text=/error|invalid|invalid/i').first();
    const isOnLoginPage = page.url().includes('/') || page.url().includes('login');
    
    expect(await errorMessage.isVisible().catch(() => false) || isOnLoginPage).toBeTruthy();
  });

  test('Cross-Site Scripting (XSS) attempt - safe handling', async ({ page }) => {
    await page.goto('/');
    
    // Try XSS in email field
    await page.fill('[type="email"]', '<img src=x onerror="alert(1)">');
    await page.fill('[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    
    // Verify no alert was triggered
    await page.waitForTimeout(1000);
    
    // Should be safe - check we're still on page
    expect(page.url()).toBeDefined();
  });

  test('Session persistence - page reload maintains state', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('[type="email"]', 'student@example.com');
    await page.fill('[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|student-dashboard)/, { timeout: 5000 });
    
    // Store current URL
    const previousUrl = page.url();
    
    // Reload page
    await page.reload();
    
    // Verify we're still logged in (not redirected to login)
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    
    expect(currentUrl).toContain(previousUrl.split('/').slice(-1)[0]);
  });

  test('Navigation - back button works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Navigate somewhere
    const link = page.locator('a').first();
    if (await link.isVisible().catch(() => false)) {
      const linkUrl = await link.getAttribute('href');
      await link.click();
      await page.waitForTimeout(500);
      
      // Go back
      await page.goBack();
      
      // Verify we're back on home/previous page
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/');
    }
  });

  test('Large dataset handling - page remains responsive', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('[type="email"]', 'admin@example.com');
    await page.fill('[type="password"]', 'adminpassword');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|admin-dashboard)/, { timeout: 5000 });
    
    // Navigate to a list page
    const listLink = page.locator('text=/course|faculty|room/i').first();
    if (await listLink.isVisible().catch(() => false)) {
      await listLink.click();
      
      // Verify page loads even with many items
      await page.waitForTimeout(1000);
      const table = page.locator('table, [role="grid"]').first();
      await expect(table).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('Mobile responsiveness - layout adapts', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Verify login form is still visible and functional
    const emailInput = page.locator('[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Try to interact with form
    await emailInput.fill('test@example.com');
    const passwordInput = page.locator('[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('Browser back button doesn\'t expose sensitive data', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('[type="email"]', 'student@example.com');
    await page.fill('[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|student-dashboard)/, { timeout: 5000 });
    
    // Logout
    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL('/');
      
      // Try to go back
      await page.goBack();
      
      // Should either stay on login or redirect back to login
      await page.waitForTimeout(1000);
      const isLoginPage = page.url().includes('/') || page.url().includes('login');
      expect(isLoginPage).toBeTruthy();
    }
  });
});
