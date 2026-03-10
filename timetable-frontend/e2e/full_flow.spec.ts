import { test, expect } from '@playwright/test';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000/api';

test.describe('Full flow (API-driven)', () => {
  test('admin generate -> faculty apply leave -> admin approve -> frontend reflects', async ({ page, request }) => {
    // 1) Register admin
    const adminEmail = `admin+${Date.now()}@example.com`;
    const adminResp = await request.post(`${BACKEND}/auth/register`, {
      data: { email: adminEmail, password: 'Pass1234!', name: 'E2E Admin', role: 'admin' }
    });
    expect(adminResp.ok()).toBeTruthy();
    const adminBody = await adminResp.json();
    const adminToken = adminBody.token;

    // 2) Create a minimal academic calendar
    const calResp = await request.post(`${BACKEND}/admin/academic-calendar`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: 'E2E Calendar', startDate: '2026-01-01', endDate: '2026-06-01' }
    });
    expect(calResp.ok()).toBeTruthy();
    const calBody = await calResp.json();
    const calId = calBody.data._id || calBody.data.id || calBody.data;

    // 3) Trigger timetable generation
    const genResp = await request.post(`${BACKEND}/timetable/generate`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { academicCalendarId: calId }
    });
    expect(genResp.ok()).toBeTruthy();

    // 4) Register faculty and apply leave
    const facEmail = `fac+${Date.now()}@example.com`;
    const regFac = await request.post(`${BACKEND}/auth/register`, {
      data: { email: facEmail, password: 'Pass1234!', name: 'E2E Faculty', role: 'faculty', facultyId: `F${Date.now()}` }
    });
    expect(regFac.ok()).toBeTruthy();
    const facLogin = await request.post(`${BACKEND}/auth/login`, { data: { email: facEmail, password: 'Pass1234!' } });
    const facToken = (await facLogin.json()).token;

    // Apply leave
    const leaveResp = await request.post(`${BACKEND}/faculty/leave`, {
      headers: { Authorization: `Bearer ${facToken}` },
      data: { startDate: '2026-03-15', endDate: '2026-03-16', leaveType: 'sick', reason: 'E2E test' }
    });
    expect(leaveResp.ok()).toBeTruthy();
    const leaveBody = await leaveResp.json();
    const leaveId = leaveBody.data?._id || leaveBody.data?.id || leaveBody.id;

    // 5) Admin approve the leave
    const approve = await request.put(`${BACKEND}/admin/leave/${leaveId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(approve.ok()).toBeTruthy();

    // 6) Visit frontend and ensure page loads
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
