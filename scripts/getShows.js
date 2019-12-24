require("dotenv").config({ path: __dirname + "/./../.env" });
const Prismic = require("prismic-javascript");
const fetch = require("isomorphic-unfetch");

const accessToken = process.env.PRISMIC_ACCESS_TOKEN;
const PrismicClient = Prismic.client(process.env.PRISMIC_URL, { accessToken });

const main = async () => {
  const venueData = await PrismicClient.query(
    Prismic.Predicates.at("document.type", "venue")
  );

  const venues = venueData.results
    .map(venue => venue.data)
    .filter(venue => venue.facebook_id);

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    const response = await fetch(
      `http://localhost:${process.env.PORT}/scrap/?pageId=${venue.facebook_id}`
    );
    const events = await response.json();
    console.log(events);
  }
};

main();
