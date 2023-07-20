const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const { merge, objOf } = require('ramda')

const package = require('./package.json')

const externals = fs.readdirSync('node_modules')
  .filter(module => module !== '.bin')
  .reduce((modules, module) =>
      merge(modules, objOf(module, `commonjs ${module}`)), {})

module.exports = {
  mode: 'development',  // 'development' or 'production'
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'telemmo.js',
  },
  target: 'node',
  devtool: 'source-map',
  externals,
  module: {
    rules: [
      {
        test: /\.json$/,
        use: 'json-loader',
      },
      // {
      //   test: /\.js$/,
      //   use: [
      //     'gettext-loader',
      //     'babel-loader',
      //   ],
      // },
    ],
  },
  plugins: [
    new webpack.BannerPlugin(
      'if (process.env.NEW_RELIC_LICENSE_KEY) require("newrelic");',
      { raw: true, entryOnly: true }),
    new webpack.BannerPlugin(
      'require("source-map-support").install();',
      { raw: true, entryOnly: true }),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(package.version),
    }),
  ],
}
