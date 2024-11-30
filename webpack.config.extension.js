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
    clean: true, // Clean the output directory before emit
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
        },
        {
          from: "extension-src/background.js",
          to: "background.js",
        },
        {
          from: "extension-src/popup.html",
          to: "popup.html",
        },
        {
          from: "extension-src/blocked.html",
          to: "blocked.html",
        },
      ],
    }),
  ],
};
