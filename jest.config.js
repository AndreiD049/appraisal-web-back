module.exports = async () => {
  return {
    rootDir: '.',
    verbose: true,
    coveragePathIgnorePatterns: [
      '/node_modules/',
    ],
    preset: '@shelf/jest-mongodb',
    globalSetup: '<rootDir>/tests/setup.js',
  }
};