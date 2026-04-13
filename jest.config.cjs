const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './backend',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/backend/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/backend/.next/',
    '<rootDir>/supervisor_born/',
    '<rootDir>/web/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/backend/node_modules/',
    '<rootDir>/supervisor_born/',
    '<rootDir>/web/'
  ],
  // Test only in backend directory
  roots: ['<rootDir>/backend'],
  rootDir: '.',
  // TypeScript support
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  }
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
