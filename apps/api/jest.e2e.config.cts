/** Tests de bout en bout : vraie base PostgreSQL (DATABASE_URL_TEST), réinitialisée au démarrage. */
module.exports = {
  displayName: 'api-e2e',
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/e2e/**/*.e2e.spec.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@simulateur/engine$': '<rootDir>/../../libs/engine/src/index.ts',
    '^@simulateur/shared-types$':
      '<rootDir>/../../libs/shared-types/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js'],
  setupFiles: ['<rootDir>/src/e2e/setup-env.ts'],
  globalSetup: '<rootDir>/src/e2e/global-setup.ts',
  testTimeout: 30000,
};
