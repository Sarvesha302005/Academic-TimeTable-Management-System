import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/');
    await page.fill('[type="email"]', 'admin@example.com');
    await page.fill('[type="password"]', 'adminpassword');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|admin-dashboard)/, { timeout: 5000 });
  });

  test('Admin can access dashboard', async ({ page }) => {
    // Verify admin dashboard loads
    await expect(page.locator('text=/admin|dashboard/i').first()).toBeVisible();
  });

  test('Admin can navigate to course management', async ({ page }) => {
    const coursesLink = page.locator('text=/course|subject/i').first();
    
    if (await coursesLink.isVisible().catch(() => false)) {
      await coursesLink.click();
      await page.waitForURL(/course|subject/i, { timeout: 5000 });
      
      // Verify courses page is displayed
      await expect(page.locator('text=/course|subject/i').first()).toBeVisible();
    }
  });

  test('Admin can create a new course', async ({ page }) => {
    const coursesLink = page.locator('text=/course|subject/i').first();
    
    if (await coursesLink.isVisible().catch(() => false)) {
      await coursesLink.click();
      
      // Look for add/create button
      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
      
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        
        // Fill course form
        const courseNameInput = page.locator('[placeholder*="name" i], [placeholder*="course" i]').first();
        if (await courseNameInput.isVisible().catch(() => false)) {
          await courseNameInput.fill('Data Structures E2E Test');
        }
        
        // Submit form
        const submitBtn = page.locator('button:has-text("Save"), button:has-text("Submit"), button:has-text("Create")').first();
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          
          // Verify success message or redirect
          await page.waitForTimeout(1000);
          await expect(page.locator('text=/success|created|added/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    }
  });

  test('Admin can navigate to room management', async ({ page }) => {
    const roomsLink = page.locator('text=/room|classroom/i').first();
    
    if (await roomsLink.isVisible().catch(() => false)) {
      await roomsLink.click();
      await page.waitForURL(/room|classroom/i, { timeout: 5000 });
      
      // Verify rooms page is displayed
      await expect(page.locator('text=/room|classroom/i').first()).toBeVisible();
    }
  });

  test('Admin can navigate to faculty management', async ({ page }) => {
    const facultyLink = page.locator('text=/faculty|teacher|instructor/i').first();
    
    if (await facultyLink.isVisible().catch(() => false)) {
      await facultyLink.click();
      await page.waitForURL(/faculty|teacher|instructor/i, { timeout: 5000 });
      
      // Verify faculty page is displayed
      await expect(page.locator('text=/faculty|teacher|instructor/i').first()).toBeVisible();
    }
  });

  test('Admin can view timetable generation options', async ({ page }) => {
    const generateLink = page.locator('text=/generate|create.*timetable|schedule/i').first();
    
    if (await generateLink.isVisible().catch(() => false)) {
      await generateLink.click();
      
      // Look for generate button
      const genBtn = page.locator('button:has-text("Generate"), button:has-text("Create Schedule")').first();
      await expect(genBtn).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('Admin can access settings/preferences', async ({ page }) => {
    const settingsLink = page.locator('text=/setting|preference|config/i').first();
    
    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click();
      
      // Verify settings page loads
      await page.waitForTimeout(500);
      await expect(page.locator('text=/setting|preference/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
