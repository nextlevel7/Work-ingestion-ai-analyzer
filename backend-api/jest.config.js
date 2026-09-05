module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  testPathIgnorePatterns: ['<rootDir>/dist'],
  watchPathIgnorePatterns: ['<rootDir>/dist'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
