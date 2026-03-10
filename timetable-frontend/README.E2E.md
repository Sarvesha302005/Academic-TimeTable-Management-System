Playwright E2E setup

Run the frontend dev server, then execute:

```bash
# from project root
cd timetable-frontend
npx playwright install
npm run dev
npm run test:e2e
```

CI: The workflow runs `npx playwright install --with-deps` before executing `npm run test:e2e`.
