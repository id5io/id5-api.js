module.exports = {
  root: true,
  env: {
    es6: true,
    mocha: true,
  },
  globals: {
    localStorage: true // Used in puppeteer eval() blocks
  },
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', './']
      }
    }
  },
  extends: 'standard',
  parser: "@babel/eslint-parser", // needed to use the import.meta syntax
  rules: {
    'semi': ['error', 'always'],
    'space-before-function-paren': 'off',
    'comma-dangle': 'off',
  }
};
