module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        "/dist/",
        "/node_modules/"
    ],
    moduleNameMapper: {
        '^@social-freedom/types$': '<rootDir>/../types/src',
        '^\./(shared|daos|services)/(.*)$': '<rootDir>/src/$1/$2'
    }
};