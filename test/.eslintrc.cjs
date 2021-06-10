module.exports = {
  root: true,
  env: {
    browser: true,
    mocha: true
  },
  parser: "@babel/eslint-parser",
  plugins: [ "@babel" ],
  rules: {
    '@babel/semi': 'off',
    'semi': 'off',
    'space-before-function-paren': 'off',
    'no-unused-expressions': 'off',
    'node/no-deprecated-api': 'off',
    'no-undef': 'off',
    'one-var': 'off'
  }
};
