require("dotenv/config");
require("@rabbotio/noconsole");
const config = require("./config");
const server = require("./server");

server.start(config).catch(err => {
  console.error(err);
  console.error(err.stack);
});
