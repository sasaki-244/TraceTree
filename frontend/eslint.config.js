export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src/**/*.ts",
      "src/**/*.tsx",
    ],
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {},
  },
]
