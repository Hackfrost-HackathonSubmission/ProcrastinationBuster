const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    popup: "./extension-src/popup.tsx",
    background: "./extension-src/background.js",
  },
  output: {
    path: path.resolve(__dirname, "extension"),
    filename: "[name].bundle.js",
    clean: false, // Important! Don't clean the output directory
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "extension-src/manifest.json",
          to: "manifest.json",
          force: false, // Don't overwrite if exists
          noErrorOnMissing: true,
        },
        {
          from: "extension-src/background.js",
          to: "background.js",
          force: false,
          noErrorOnMissing: true,
        },
        {
          from: "extension-src/popup.html",
          to: "popup.html",
          force: false,
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
};
