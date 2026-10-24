module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  // Les tests e2e (base PostgreSQL réelle) tournent via `nx run api:e2e`.
  testPathIgnorePatterns: ['/node_modules/', '\\.e2e\\.spec\\.ts$'],
};
