const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  entry: {
    popup: "./extension-src/popup.tsx",
    background: "./extension-src/background.js",
  },
  output: {
    path: path.resolve(__dirname, "extension"), // This is where all built files will go
    filename: "[name].bundle.js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                { targets: { chrome: "58", firefox: "57" } },
              ],
              ["@babel/preset-react", { runtime: "automatic" }],
              "@babel/preset-typescript",
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
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
        { from: "extension-src/manifest.json", to: "manifest.json" },
        { from: "extension-src/background.js", to: "background.js" },
        { from: "extension-src/popup.html", to: "popup.html" },
        { from: "extension-src/blocked.html", to: "blocked.html" },
        { from: "extension-src/icon48.png", to: "icon48.png" },
        {
          from: "extension-src/rules.json",
          to: "rules.json",
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
};
