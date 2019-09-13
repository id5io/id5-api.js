module.exports = {
  "env": {
    "browser": true,
    "commonjs": true
  },
  "settings": {
    "import/resolver": {
      "node": {
        "moduleDirectory": ["node_modules", "./"]
      }
    }
  },
  "extends": "standard",
  "plugins": [ ],
  "globals": {
    "ID5": false
  },
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {
    "semi": "off",
    "space-before-function-paren": "off",
  }
};
