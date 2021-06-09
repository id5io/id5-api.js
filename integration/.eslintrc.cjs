module.exports = {
  env: {
    es6: true,
    mocha: true,
  },
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', './']
      }
    }
  },
  extends: 'standard',
  rules: {
    'semi': ['error', 'always'],
    'space-before-function-paren': 'off',
    'comma-dangle': 'off',
  }
};
