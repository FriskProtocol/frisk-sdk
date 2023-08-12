const path = require("path");

module.exports = {
  entry: "./src/index.ts",
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
  },
  experiments: {
    outputModule: true,
  },
  mode: "none",
  optimization: {
    concatenateModules: true,
  },
  output: {
    filename: "frisk.js",
    path: path.resolve(__dirname, "dist"),
    chunkFormat: "module",
    clean: true,
    iife: false,
    library: {
      type: "module",
    },
    module: true,
  },
  target: "node",
};
