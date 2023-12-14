import path from 'path';

export default {
  devtool: 'source-map',
  resolve: {
    modules: [
      path.resolve('.'),
      'node_modules'
    ],
  },
  output: {
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
            ['@babel/preset-env', {
              'targets': {
                'browsers': [
                  'chrome >= 61',
                  'safari >= 11',
                  'edge >= 14',
                  'firefox >= 57',
                  'ios >= 11',
                  'node >= 18'
                ]
              }
            }]
          ],
          plugins: ['@babel/plugin-proposal-class-properties',
            '@babel/plugin-transform-object-assign']
        }
      }
    ]
  }
};
