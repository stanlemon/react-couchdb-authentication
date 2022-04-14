import { default as config } from "@stanlemon/webdev/webpack.config.js";

config.devServer.proxy = {
  "/couchdb": {
    target: "http://localhost:5984/",
    pathRewrite: {
      "^/couchdb": "",
    },
  },
};

export default config;
