const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { SubresourceIntegrityPlugin } = require('webpack-subresource-integrity');
const webpack = require('webpack');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
//  ►► CHANGE THIS FOR EVERY NEW APP ◄◄
//
//  The Module Federation container name. It must be:
//    - UNIQUE across the entire NetSapiens platform (registration is refused
//      if another app already claimed it)
//    - letters/numbers only, camelCase, no dashes (it becomes a JS global)
//    - PERMANENT — it is baked into the built bundle and the platform derives
//      the app id from it. Changing it later means registering a new app.
//
//  This exact string is what you enter as `webpack_module` in Registered Apps.
// ─────────────────────────────────────────────────────────────────────────────
const MODULE_FEDERATION_NAME = 'truevoipSnake';

module.exports = (_env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    entry: './src/App.tsx',
    // Bundle verification rejects a bundle with no source maps, and the maps
    // must carry `sourcesContent` — so never `noSources`, and dist/*.map ships.
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      // 'auto' lets the remote resolve its own chunk URLs at runtime from
      // wherever remoteEntry.js was loaded — required for a GitHub Pages
      // subpath (/<repo>/). Never hard-code an absolute publicPath here.
      publicPath: isProduction ? 'auto' : 'http://localhost:5005/',
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[id].[contenthash].js' : '[id].js',
      // Required for Subresource Integrity: the browser cannot verify an
      // integrity value against an opaque cross-origin response.
      crossOriginLoading: 'anonymous',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
            },
          },
        },
      ],
    },
    plugins: [
      new ModuleFederationPlugin({
        name: MODULE_FEDERATION_NAME,
        filename: 'remoteEntry.js',
        exposes: {
          // The host loads './App' and hands it the HorizonContext. That is the
          // only entry point it needs.
          './App': './src/App',
        },
        shared: {
          react: { singleton: true, requiredVersion: '^19.2.0', eager: false },
          'react-dom': {
            singleton: true,
            requiredVersion: '^19.2.0',
            eager: false,
          },
          loglevel: {
            singleton: true,
            requiredVersion: '^1.9.2',
            eager: false,
          },
          // Do NOT add '@netsapiens/horizon-sdk' here — the host does not
          // register it as a shared module, and bundle verification rejects a
          // bundle that declares it. It is bundled normally.
          //
          // Do NOT add '@mui/material' or '@emotion/*' here either. Use MUI
          // components through horizonContext.ui instead, which carries the
          // host's live theme and dark mode.
        },
      }),
      new webpack.DefinePlugin({
        // Injected so App.tsx can pass the container name to useRemoteApp
        // without retyping it. Defined once above.
        __MF_NAME__: JSON.stringify(MODULE_FEDERATION_NAME),
      }),
      new HtmlWebpackPlugin({
        template: './index.html',
      }),
      // sha384 integrity values for every chunk the entry loads. Production
      // only — the plugin warns in development mode and provides nothing there.
      ...(isProduction
        ? [new SubresourceIntegrityPlugin({ hashFuncNames: ['sha384'] })]
        : []),
    ],
    devServer: {
      port: 5005,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  };
};
