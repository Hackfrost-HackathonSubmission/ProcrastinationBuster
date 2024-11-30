const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  devtool: "source-map",
  entry: {
    popup: "./extension-src/popup.tsx",
    background: "./extension-src/background.js",
  },
  output: {
    path: path.resolve(__dirname, "extension"),
    filename: "[name].bundle.js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript",
              ],
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
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
        {
          from: "extension-src/rules.json",
          to: "rules.json",
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
};
