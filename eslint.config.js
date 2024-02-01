import globals from "globals";
import js from "@eslint/js";


export default [
  {
    ignores: ['test/pages/**', 'integration/resources/**']
  },
  js.configs.recommended,
  {
    files: ['src/**','lib/**'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
      }
    }
  },
  {
    files: ['test/spec/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
        expect: true,
        chai: true,
        clone: true,
      }
    }
  },
  {
    files: ['integration/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.mocha,
        ...globals.browser, // Some code is getting evaluated in the browser by puppeteer
      }
    }
  }
];
