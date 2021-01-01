let id5Api = require('./package.json');
let path = require('path');
let webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  resolve: {
    modules: [
      path.resolve('.'),
      'node_modules'
    ],
  },
  output: {
    jsonpFunction: id5Api.globalVarName + "Chunk",
    filename: 'id5-api.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: path.resolve('./node_modules'), // required to prevent loader from choking on node_modules
        loader: 'babel-loader',
        options: {
          presets: [
            '@babel/preset-env',
            { 'plugins': ['@babel/plugin-proposal-class-properties'] }
          ]
        }
      }
    ]
  }
};
