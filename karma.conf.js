var webpack = require('webpack');

module.exports = function (config) {
  config.set({
    browsers: [ 'Chrome' ], //run in Chrome
    client: {
        clearContext: false
    },
    singleRun: true, //just run once by default
    frameworks: [ 'jasmine', 'jasmine-matchers' ], //use the mocha test framework
    files: [
      'tests.webpack.js' //just load this file
    ],
    preprocessors: {
      'tests.webpack.js': [ 'webpack', 'sourcemap' ] //preprocess with webpack and our sourcemap loader
    },
    reporters: [ 'progress', 'coverage', 'kjhtml', 'karma-node-notifier', 'live-html' ], //report results in this format
    webpack: { //kind of a copy of your webpack config
      devtool: 'inline-source-map', //just do inline source maps instead of the default
      resolve: { extensions: ['.js', '.jsx' ] },
      module: {
        loaders: [
          { test: /\.jsx?$/, loader: 'babel-loader' }
        ]
      }
    },
    webpackServer: {
      noInfo: true //please don't spam the console when running in karma!
    },
  });
};
