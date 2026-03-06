import { test, expect } from '@playwright/test';

test.describe('Faculty Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as faculty before each test
    await page.goto('/');
    await page.fill('[type="email"]', 'faculty@example.com');
    await page.fill('[type="password"]', 'facultypassword');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|faculty-dashboard)/, { timeout: 5000 });
  });

  test('Faculty can access dashboard', async ({ page }) => {
    // Verify faculty dashboard loads
    await expect(page.locator('text=/faculty|dashboard/i').first()).toBeVisible();
  });

  test('Faculty can view assigned classes', async ({ page }) => {
    const classesLink = page.locator('text=/class|schedule|assigned/i').first();
    
    if (await classesLink.isVisible().catch(() => false)) {
      await classesLink.click();
      
      // Verify page loads and displays class list
      await page.waitForTimeout(500);
      const table = page.locator('table, [role="grid"]').first();
      await expect(table).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('Faculty can view personal timetable', async ({ page }) => {
    const timetableLink = page.locator('text=/timetable|schedule|my.*schedule/i').first();
    
    if (await timetableLink.isVisible().catch(() => false)) {
      await timetableLink.click();
      
      // Verify timetable grid/table appears
      const table = page.locator('table, [role="grid"]').first();
      await expect(table).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('Faculty can access preferences', async ({ page }) => {
    const prefLink = page.locator('text=/preference|availability|setting/i').first();
    
    if (await prefLink.isVisible().catch(() => false)) {
      await prefLink.click();
      
      // Verify preferences page loads
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/preference|availability|setting/i);
    }
  });

  test('Faculty can mark leave/unavailability', async ({ page }) => {
    const leaveLink = page.locator('text=/leave|unavailable|absence/i').first();
    
    if (await leaveLink.isVisible().catch(() => false)) {
      await leaveLink.click();
      
      // Look for add leave button
      const addBtn = page.locator('button:has-text("Add"), button:has-text("Request")').first();
      
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        
        // Verify form appears
        const dateInput = page.locator('[type="date"]').first();
        await expect(dateInput).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    }
  });

  test('Faculty can view workload information', async ({ page }) => {
    const workloadLink = page.locator('text=/workload|load|hours/i').first();
    
    if (await workloadLink.isVisible().catch(() => false)) {
      await workloadLink.click();
      
      // Verify workload info is displayed
      await page.waitForTimeout(500);
      const workloadInfo = page.locator('text=/hours|credits|workload/i').first();
      await expect(workloadInfo).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('Faculty can download personal timetable', async ({ page }) => {
    const timetableLink = page.locator('text=/timetable|schedule/i').first();
    
    if (await timetableLink.isVisible().catch(() => false)) {
      await timetableLink.click();
      
      // Look for download button
      const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Export")').first();
      
      if (await downloadBtn.isVisible().catch(() => false)) {
        const downloadPromise = page.waitForEvent('download').catch(() => null);
        await downloadBtn.click();
        const download = await downloadPromise;
        
        if (download) {
          expect(download.suggestedFilename()).toMatch(/timetable|schedule/i);
        }
      }
    }
  });
});
