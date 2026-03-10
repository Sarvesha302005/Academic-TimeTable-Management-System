// Setup for Vitest + Testing Library
import * as matchers from '@testing-library/jest-dom/matchers'
import { expect } from 'vitest'

// Extend Vitest's expect with DOM matchers
expect.extend(matchers)

// optional: configure global mocks or helpers here
