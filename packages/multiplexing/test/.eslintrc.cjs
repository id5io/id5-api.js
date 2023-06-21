module.exports = {
    root: true,
    env: {
        browser: true,
        mocha: true
    },
    parser: "@babel/eslint-parser",
    plugins: ["@babel"],
    rules: {
        'semi': 'off',
        '@babel/semi': 'off',
        'no-unused-expressions': 'off',
    }
};
