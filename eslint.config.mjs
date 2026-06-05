import eslint from "@eslint/js";
import typescriptEslint from "typescript-eslint";
import prettierConfig from "eslint-plugin-prettier/recommended";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";

const baseEslintConfig = eslint.configs.recommended;
const baseTypescriptConfig = typescriptEslint.configs.recommended;

const customRulesConfig = {
  plugins: {
    "simple-import-sort": simpleImportSortPlugin,
  },
  rules: {
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "no-var": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "eol-last": ["error", "always"],
  },
};

export default [
  baseEslintConfig,
  ...baseTypescriptConfig,
  customRulesConfig,
  prettierConfig,
];
