import * as client from "./client";
import * as merchant from "./merchant";
import * as nodeRelayer from "./nodeRelayer";
import * as utils from "./utils/utils";

if (process.env.NODE_ENV !== "production") {
  console.log("Looks like we are in development mode!");
}

export { client, merchant, nodeRelayer, utils };
