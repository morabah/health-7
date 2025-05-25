module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files
    "**/*.d.ts", // Ignore type declarations
    "**/node_modules/**", // Ignore node_modules
    "**/coverage/**", // Ignore test coverage
  ],
  plugins: ["@typescript-eslint", "import", "prettier"],
  settings: {
    "import/resolver": {
      typescript: {},
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        moduleDirectory: ["node_modules", "src/"],
      },
    },
  },
  rules: {
    // TypeScript
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],

    // Import
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "object",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-cycle": "error",
    "import/no-unresolved": "error",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
      },
    ],

    // Best practices
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-param-reassign": ["error", { props: true }],
    "prefer-const": "error",
    "prefer-template": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "no-useless-constructor": "off",
    "class-methods-use-this": "off",

    // Formatting (handled by Prettier)
    "prettier/prettier": [
      "error",
      {
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: false,
        trailingComma: "es5",
        bracketSpacing: true,
        arrowParens: "always",
        endOfLine: "auto",
      },
    ],
  },
};
