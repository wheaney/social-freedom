module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        "/dist/",
        "/node_modules/"
    ],
    moduleNameMapper: {
        '^@social-freedom/types$': '<rootDir>/../types/src',
        '^src/(.*)$': '<rootDir>/src/$1'
    }
};