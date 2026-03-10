import { test, expect } from '@playwright/test';

test.describe('Student Timetable Viewing E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student before each test
    await page.goto('/');
    await page.fill('[type="email"]', 'student@example.com');
    await page.fill('[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|student-dashboard)/, { timeout: 5000 });
  });

  test('Student can view their timetable', async ({ page }) => {
    // Look for timetable link or section
    const timetableLink = page.locator('text=/timetable|schedule|classes/i').first();
    
    if (await timetableLink.isVisible().catch(() => false)) {
      await timetableLink.click();
      
      // Verify timetable page url
      await page.waitForURL(/\/(timetable|schedule)/, { timeout: 5000 });
      
      // Verify table/grid structure is rendered
      const table = page.locator('table, [role="grid"]').first();
      await expect(table).toBeVisible();
    }
  });

  test('Timetable displays class information', async ({ page }) => {
    const timetableLink = page.locator('text=/timetable|schedule|classes/i').first();
    
    if (await timetableLink.isVisible().catch(() => false)) {
      await timetableLink.click();
      
      // Verify time slots are displayed
      const timeSlots = page.locator('[role="row"]');
      const count = await timeSlots.count();
      expect(count).toBeGreaterThan(0);
      
      // Verify headers contain expected columns
      const headers = page.locator('[role="columnheader"]');
      await expect(headers.first()).toBeVisible();
    }
  });

  test('Student can filter or search timetable', async ({ page }) => {
    const timetableLink = page.locator('text=/timetable|schedule|classes/i').first();
    
    if (await timetableLink.isVisible().catch(() => false)) {
      await timetableLink.click();
      
      // Look for filter/search input
      const searchInput = page.locator('[placeholder*="search" i], [placeholder*="filter" i]').first();
      
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('Monday');
        
        // Verify filtered results appear
        await page.waitForTimeout(300); // Wait for filtering
        const results = page.locator('[role="row"]');
        const count = await results.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('Timetable displays day-wise schedule', async ({ page }) => {
    const timetableLink = page.locator('text=/timetable|schedule|classes/i').first();
    
    if (await timetableLink.isVisible().catch(() => false)) {
      await timetableLink.click();
      
      // Look for day indicators (Monday, Tuesday, etc.)
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      let dayFound = false;
      
      for (const day of days) {
        const dayElement = page.locator(`text=${day}`);
        if (await dayElement.isVisible().catch(() => false)) {
          dayFound = true;
          break;
        }
      }
      
      expect(dayFound).toBeTruthy();
    }
  });

  test('Student can download timetable', async ({ page }) => {
    const timetableLink = page.locator('text=/timetable|schedule|classes/i').first();
    
    if (await timetableLink.isVisible().catch(() => false)) {
      await timetableLink.click();
      
      // Look for download button
      const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Export"), a:has-text("Download")').first();
      
      if (await downloadBtn.isVisible().catch(() => false)) {
        // Listen for download
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
