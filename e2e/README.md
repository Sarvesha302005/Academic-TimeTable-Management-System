# E2E Testing Guide

This folder contains end-to-end (E2E) tests for the Timetable Management System using Playwright.

## 📋 Test Suites

### 1. **Authentication Tests** (`auth.spec.js`)
- ✅ Valid student login redirects to dashboard
- ❌ Invalid credentials show error message
- ❌ Email field validation
- ❌ Password field validation
- ✅ Logout functionality

### 2. **Student Timetable Tests** (`student-timetable.spec.js`)
- ✅ Student can view their timetable
- ✅ Timetable displays class information (slots, headers)
- ✅ Student can filter/search timetable
- ✅ Timetable displays day-wise schedule
- ✅ Student can download timetable

### 3. **Admin Dashboard Tests** (`admin-dashboard.spec.js`)
- ✅ Admin can access dashboard
- ✅ Admin can navigate to course management
- ✅ Admin can create a new course
- ✅ Admin can navigate to room management
- ✅ Admin can access faculty management

### 4. **Faculty Dashboard Tests** (`faculty-dashboard.spec.js`)
- ✅ Faculty can access dashboard
- ✅ Faculty can view assigned classes
- ✅ Faculty can view personal timetable
- ✅ Faculty can access preferences
- ✅ Faculty can mark leave/unavailability

### 5. **Error Handling & Edge Cases** (`error-handling.spec.js`)
- ✅ Network timeout handling
- ✅ Empty form validation
- ❌ SQL Injection attempt - safe handling
- ❌ XSS attack attempt - safe handling
- ✅ Session persistence
- ✅ Navigation - back button works
- ✅ Large dataset handling
- ✅ Mobile responsiveness
- ✅ Browser history security

## 🚀 Installation

### 1. Install Dependencies
```bash
# Install at root level with npm workspaces
npm install

# Or install frontend dependencies explicitly
cd timetable-frontend
npm install @playwright/test
```

### 2. Install Browsers
```bash
# From root or timetable-frontend directory
npx playwright install
```

## ▶️ Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Tests with UI (Recommended for Development)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Run Specific Test File
```bash
npx playwright test auth.spec.js
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Tests on Specific Browser
```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit
```

### View Test Report
```bash
npm run test:e2e:report
```

## 📊 Test Coverage

| Category | Valid Cases | Invalid Cases | Total |
|----------|-------------|---------------|-------|
| Authentication | 3 | 2 | 5 |
| Student Timetable | 5 | 0 | 5 |
| Admin Dashboard | 6 | 0 | 6 |
| Faculty Dashboard | 6 | 0 | 6 |
| Error & Edge Cases | 6 | 3 | 9 |
| **TOTAL** | **26** | **5** | **31** |

## 🔧 Configuration

### `playwright.config.js`
- Base URL: `http://localhost:5173`
- Auto-starts frontend dev server
- Runs on Chromium, Firefox, WebKit browsers
- Screenshots on failure
- Videos on failed tests
- HTML report generation

## ⚙️ Prerequisites

1. **Node.js** (v16+)
2. **Backend running** on port 5000
3. **Frontend running** on port 5173
4. **Test data** seeded in database (or mock auth disabled)

## 🔐 Test Credentials

**Note:** Update these with your actual test user credentials

- **Student**: `student@example.com` / `password123`
- **Faculty**: `faculty@example.com` / `facultypassword`
- **Admin**: `admin@example.com` / `adminpassword`

## 📝 Best Practices

1. **Use Data Attributes**: Add `data-testid` attributes to elements for reliable selection
2. **Wait Strategies**: Use Playwright's built-in waiting (auto-waits for elements)
3. **Isolation**: Each test is independent; no shared state
4. **Readability**: Use descriptive test names
5. **Assertions**: Keep assertions specific and meaningful

## 🐛 Troubleshooting

### Tests Timeout
- Verify backend/frontend are running
- Check network connectivity
- Increase timeout in `playwright.config.js`

### "Target page, context or browser has been closed" Error
- Rerun tests
- Clear browser cache: `npx playwright clean`

### Tests Pass Locally but Fail in CI
- Check environment variables
- Verify test database seeding
- Review CI/CD logs

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

## 🤝 Contributing

When adding new tests:
1. Follow existing test structure
2. Use meaningful test descriptions
3. Add comments for complex assertions
4. Test both happy path and edge cases
5. Ensure tests are deterministic (no flaking)
