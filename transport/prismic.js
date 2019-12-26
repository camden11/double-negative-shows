const Prismic = require("prismic-javascript");

const accessToken = process.env.PRISMIC_ACCESS_TOKEN;
exports.Client = Prismic.client(process.env.PRISMIC_URL, { accessToken });
exports.Predicates = Prismic.Predicates;
