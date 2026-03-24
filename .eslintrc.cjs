/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { node: true, es2022: true, browser: true },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  extends: ["eslint:recommended"],
  overrides: [
    {
      files: ["client/src/**/*.{js,jsx}"],
      env: { browser: true, node: false },
    },
    {
      files: ["server/src/**/*.js"],
      env: { node: true, browser: false },
    },
  ],
  ignorePatterns: ["node_modules/", "client/dist/", "**/node_modules/"],
};
