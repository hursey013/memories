module.exports = {
  root: true,
  env: { es2023: true, node: true },
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  rules: {
    "no-console": "off",
    "import/order": [
      "warn",
      {
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
        groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]]
      }
    ]
  },
  settings: { "import/resolver": { node: true } }
};
