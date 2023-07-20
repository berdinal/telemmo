const webpack = require('webpack')
const config = require('./webpack.config.js')

const definePlugin = new webpack.DefinePlugin({
//  'process.env.NODE_ENV': '"development"',
  'process.env.NODE_ENV': '"production"',
//  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
})

config.plugins.push(definePlugin)

module.exports = config
