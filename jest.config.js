module.exports = {
  collectCoverage: true,
  coverageReporters: ['lcov'],
  collectCoverageFrom: ['src/**/*.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/__fixtures__/'],
  // testMatch: ['**/__tests__/error-handling-tests.js'],
};
