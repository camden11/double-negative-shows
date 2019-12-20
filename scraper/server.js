const initExpress = require("./initExpress");
const initApi = require("./initApi");

const start = async config => {
  const app = await initExpress(config);
  await initApi(app, config);
};

module.exports = {
  start
};
