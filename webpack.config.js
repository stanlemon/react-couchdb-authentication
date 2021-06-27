const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: ["./example/Example.tsx"],
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "example", "out"),
    publicPath: "/",
  },
  devtool: "eval-source-map",
  devServer: {
    hot: true,
    historyApiFallback: true,
    proxy: {
      "/couchdb": {
        target: "http://localhost:5984/",
        pathRewrite: { '^/couchdb': '' },
      }
    },
  },
  module: {
    rules: [
      {
        test: /\.([j|t]s)x?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
  resolve: {
    // Enable webpack to find files without these extensions
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "example", "index.html"),
    }),
  ],
};
