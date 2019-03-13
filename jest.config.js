module.exports = {
    preset: "jest-preset-angular",
    roots: ['./'],
    setupFilesAfterEnv: ["<rootDir>/setup-jest.ts"],
    globals: {
      'ts-jest': {
        tsConfigFile: './tsconfig.spec.json',
        allowSyntheticDefaultImports: true
      },
      __TRANSFORM_HTML__: true
    },
    preset: "jest-preset-angular",
    transformIgnorePatterns: [
      "<rootDir>/node_modules/(?!(ngx-cookie-service)/)"
    ],
    transform: {
      '^.+\\.(ts|html)$': 'jest-preset-angular/preprocessor.js',
      '^.+\\.js$': 'babel-jest'
    },
}