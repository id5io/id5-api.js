import globals from "globals";
import js from "@eslint/js";


export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
      }
    }
  },
  {
    files: ['test/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
      }
    }
  }
];
