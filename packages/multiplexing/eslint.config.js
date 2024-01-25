import globals from "globals";
import js from "@eslint/js";


export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.globals,
      }
    }
  },
  {
    files: ['test/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
        expect: true,
      }
    }
  }
];
