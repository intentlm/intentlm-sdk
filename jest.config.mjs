/** @type {import('jest').Config} */
export default {
  preset:          'ts-jest',
  testEnvironment: 'node',
  testMatch:       ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig:        'tsconfig.test.json',
      diagnostics:     { ignoreCodes: [151002] },
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
