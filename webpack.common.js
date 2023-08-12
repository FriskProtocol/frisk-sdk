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
  output: {
    filename: "frisk.js",
    path: path.resolve(__dirname, "dist"),
    globalObject: "this",
    library: {
      name: "frisk",
      type: "umd",
    },
    clean: true,
  },
};
