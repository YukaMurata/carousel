// プラグインを利用するためにwebpackを読み込んでおく
const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: process.env.NODE_ENV,
  devtool:
    process.env.NODE_ENV === 'production' ? '#cheap-module-source-map' : false,
  entry: {
    index: [path.resolve(__dirname, 'js/index/index.js')],
  },
  output: {
    path: path.resolve(__dirname, '../js'),
    filename: '[name].bundle.js',
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          name: 'vendor',
          chunks: 'initial',
          enforce: true,
        },
      },
    },
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            warnings: false,
            drop_console: true,
          },
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      ie: 11,
                    },
                    // 必要な箇所にだけpolyfillを読み込む設定
                    useBuiltIns: 'usage',
                    corejs: 3,
                  },
                ],
              ],
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    modules: ['node_modules', path.resolve(__dirname)],
  },
  plugins: [
    // JS内の'process.env.NODE_ENV'が'development'か'production'に置き換わる
    new webpack.EnvironmentPlugin({ NODE_ENV: 'development' }),
    // 共通プラグインを利用するときはこれを書いておけばインポート不要
    new webpack.ProvidePlugin({
      velocity: 'velocity-animate',
    }),
  ],
};
