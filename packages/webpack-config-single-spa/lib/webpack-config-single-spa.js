const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const _HtmlWebpackPlugin = require("html-webpack-plugin");
const StandaloneSingleSpaPlugin = require("standalone-single-spa-webpack-plugin");
const SystemJSPublicPathPlugin = require("systemjs-webpack-interop/SystemJSPublicPathWebpackPlugin");

module.exports = webpackConfigSingleSpa;

function webpackConfigSingleSpa(opts) {
  if (typeof opts !== "object") {
    throw Error(`webpack-config-single-spa requires an opts object`);
  }

  if (typeof opts.orgName !== "string") {
    throw Error(`webpack-config-single-spa requires an opts.orgName string`);
  }

  if (typeof opts.projectName !== "string") {
    throw Error(
      `webpack-config-single-spa requires an opts.projectName string`
    );
  }

  if (opts.orgPackagesAsExternal !== false) {
    opts.orgPackagesAsExternal = true;
  }

  let webpackConfigEnv = opts.webpackConfigEnv || {};

  let argv = opts.argv || {};

  let isProduction = argv.p || argv.mode === "production";

  let HtmlWebpackPlugin = opts.HtmlWebpackPlugin || _HtmlWebpackPlugin;

  const isHttps = webpackConfigEnv.https;

  let httpsDevServerConfig;

  if (argv.https) {
    console.warn(
      "webpack-config-single-spa: running 'npm start -- --https' makes it impossible to respect the SINGLE_SPA_TLS_OPTIONS config. Use 'npm start -- --env https' instead"
    );
  }

  if (isHttps) {
    if (process.env.SINGLE_SPA_TLS_OPTIONS) {
      try {
        /* The SINGLE_SPA_TLS_OPTIONS env var is a file path of a js file that looks something like this:
          const fs = require('fs');

          module.exports = {
            key: fs.readFileSync('~/.local-ssl/localhost.key'),
            cert: fs.readFileSync('~/.local-ssl/localhost.crt')
          };
         */
        httpsDevServerConfig = require(process.env.SINGLE_SPA_TLS_OPTIONS);
      } catch (err) {
        console.error(
          `webpack-config-single-spa: the SINGLE_SPA_TLS_OPTIONS environment variable is set, but could not be loaded via require()`
        );
        throw err;
      }
    } else {
      console.warn(
        "webpack-config-single-spa: An untrusted TLS certificate will be generated. Consider setting SINGLE_SPA_TLS_OPTIONS env variable, explained at https://single-spa.js.org/create-single-spa#tls"
      );
      // Have webpack generate a cert that will not be trusted by the OS
      httpsDevServerConfig = true;
    }
  } else {
    httpsDevServerConfig = false;
  }

  return {
    mode: isProduction ? "production" : "development",
    entry: path.resolve(
      process.cwd(),
      `src/${opts.orgName}-${opts.projectName}.js`
    ),
    output: {
      filename: `${opts.orgName}-${opts.projectName}.js`,
      libraryTarget: "system",
      path: path.resolve(process.cwd(), "dist"),
      uniqueName: opts.projectName,
      devtoolNamespace: `${opts.projectName}`,
      publicPath: "",
    },
    module: {
      rules: [
        {
          test: /\.(js|ts)x?$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve("babel-loader", { paths: [__dirname] }),
          },
        },
        {
          test: /\.css$/i,
          include: [/node_modules/, /src/],
          use: [
            {
              loader: require.resolve("style-loader", { paths: [__dirname] }),
            },
            {
              loader: require.resolve("css-loader", { paths: [__dirname] }),
              options: {
                modules: false,
              },
            },
          ],
        },
        {
          test: /\.html$/i,
          exclude: /node_modules/,
          use: [require.resolve("raw-loader", { paths: [__dirname] })],
        },
      ],
    },
    devtool: "source-map",
    devServer: {
      compress: true,
      historyApiFallback: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      firewall: false,
      host: "localhost",
      client: {
        host: "localhost",
      },
      https: httpsDevServerConfig,
    },
    externals: opts.orgPackagesAsExternal
      ? ["single-spa", new RegExp(`^@${opts.orgName}/`)]
      : ["single-spa"],
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: webpackConfigEnv.analyze ? "server" : "disabled",
      }),
      new SystemJSPublicPathPlugin({
        systemjsModuleName: `@${opts.orgName}/${opts.projectName}`,
        rootDirectoryLevel: opts.rootDirectoryLevel,
      }),
      !isProduction && !opts.disableHtmlGeneration && new HtmlWebpackPlugin(),
      !isProduction &&
        !opts.disableHtmlGeneration &&
        new StandaloneSingleSpaPlugin({
          appOrParcelName: `@${opts.orgName}/${opts.projectName}`,
          disabled: !webpackConfigEnv.standalone,
          HtmlWebpackPlugin,
          ...opts.standaloneOptions,
        }),
    ].filter(Boolean),
    resolve: {
      extensions: [".mjs", ".js", ".jsx", ".wasm", ".json"],
    },
  };
}
