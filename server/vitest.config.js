/** @type {import('vitest').UserConfig} */
export default {
  test: {
    include: ["src/**/*.test.js", "src/**/__tests__/**/*.js"],
    environment: "node",
    globals: true,
  },
};
