import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: 'src/setupTests.js'
    ,
    exclude: ['e2e/**', '**/*.spec.ts', '**/*.spec.tsx']
  }
})
