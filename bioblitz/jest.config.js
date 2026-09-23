module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  testTimeout: 30000,
  modulePathIgnorePatterns: [
    "<rootDir>/bioblitz-deployment/",
    "<rootDir>/functions/",
    "<rootDir>/importer/",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/bioblitz-deployment/"],
};
