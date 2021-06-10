module.exports = {
  env: {
    browser: true
  },
  root: true,
  settings: {
    "import/resolver": {
      node: {
        moduleDirectory: ["node_modules", "./"]
      }
    }
  },
  extends: "standard",
  parser: "@babel/eslint-parser",
  plugins: [ "@babel" ],
  globals: {
    ID5: false
  },
  rules: {
    "semi": "off",
    "@babel/semi": "error",
    "space-before-function-paren": "off",
  }
};
