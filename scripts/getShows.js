require("dotenv").config({ path: __dirname + "/./../.env" });
const Prismic = require("../transport/prismic");
const Airtable = require("../transport/airtable");
const fetch = require("isomorphic-unfetch");
const moment = require("moment");
const formatDate = require("../utils/formatDate");
const FIELDS = require("../utils/airtableFieldNames");

const ARTIST_QUERY_LIMIT = 100;
const AIRTABLE_POST_LIMIT = 10;

const getVenues = async () => {
  const venueData = await Prismic.Client.query(
    Prismic.Predicates.at("document.type", "venue"),
    { fetchLinks: "city.name" }
  );

  const venues = venueData.results
    .map(venue => {
      return {
        ...venue.data,
        uid: venue.uid,
        city: {
          ...venue.data.city.data,
          uid: venue.data.city.uid
        }
      };
    })
    .filter(venue => venue.facebook_id);

  return venues;
};

const getScrapedEvents = async venues => {
  const scrapedEvents = [];

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    const response = await fetch(
      `http://localhost:${process.env.PORT}/scrap/?pageId=${venue.facebook_id}`
    );
    const events = await response.json();
    events.forEach(event => {
      scrapedEvents.push({
        [FIELDS.title]: event.title,
        [FIELDS.date]: formatDate(event.month, event.day, event.time),
        [FIELDS.venue]: venue.name,
        [FIELDS.venueId]: venue.uid,
        [FIELDS.url]: `https://www.facebook.com/${event.url}`,
        [FIELDS.city]: venue.city.name,
        [FIELDS.cityId]: venue.city.uid
      });
    });
  }

  return scrapedEvents;
};

const getAllArtists = async () => {
  const allArtists = [];
  let finished = false;
  let iteration = 0;

  while (!finished) {
    const artistData = await Prismic.Client.query(
      Prismic.Predicates.at("document.type", "artist"),
      { pageSize: ARTIST_QUERY_LIMIT, page: iteration }
    );
    artistData.results.forEach(artist => {
      allArtists.push({
        ...artist.data,
        uid: artist.uid,
        genres: artist.data.genres.map(genre => genre.genre.uid)
      });
    });

    if (allArtists.length >= artistData.total_results_size) {
      finished = true;
    } else {
      iteration += 1;
    }
  }
  return allArtists;
};

const filterEvents = async (events, artists) => {
  const filteredEvents = [];

  events.forEach(event => {
    artists.forEach(artist => {
      if (event[FIELDS.title] && event[FIELDS.title].includes(artist.name)) {
        if (event[FIELDS.artistIds]) {
          if (!event[FIELDS.artistIds].includes(artist.uid)) {
            event[FIELDS.artistIds].push(artist.uid);
          }
        } else {
          event[FIELDS.artistIds] = [artist.uid];
        }
        if (event[FIELDS.genreIds]) {
          artist.genres.forEach(genre => {
            if (!event[FIELDS.genreIds].includes(genre)) {
              event[FIELDS.genreIds].push(genre);
            }
          });
        } else {
          event[FIELDS.genreIds] = artist.genres;
        }
      }
    });
    if (event[FIELDS.artistIds]) {
      event[FIELDS.artistIds] = event[FIELDS.artistIds].toString();
      event[FIELDS.genreIds] = event[FIELDS.genreIds].toString();
      filteredEvents.push(event);
    }
  });

  return filteredEvents;
};

const getAirtableMap = async () => {
  const allShows = {};
  await Airtable.select({}).eachPage((records, fetchNextPage) => {
    records.forEach(record => {
      allShows[record.fields.Title] = {
        ...record.fields,
        id: record.id
      };
    });
    fetchNextPage();
  });
  return allShows;
};

const deletePastShows = async map => {
  const pastShows = [];
  for (key in map) {
    let currentShow = map[key];
    const diff = moment()
      .utc()
      .diff(currentShow[FIELDS.date]);
    if (diff > 0) {
      pastShows.push(currentShow.id);
      delete map[key];
    }
  }

  for (let i = 0; i < Math.ceil(pastShows.length / AIRTABLE_POST_LIMIT); i++) {
    const showSubset = pastShows.slice(
      i * AIRTABLE_POST_LIMIT,
      Math.min((i + 1) * AIRTABLE_POST_LIMIT, pastShows.length)
    );
    await Airtable.destroy(showSubset);
  }
  console.log(`Removed ${pastShows.length} past shows`);
};

const updateExistingShows = async (shows, map) => {
  const updatedShows = shows.filter(show => !!map[show[FIELDS.title]]);
  for (
    let i = 0;
    i < Math.ceil(updatedShows.length / AIRTABLE_POST_LIMIT);
    i++
  ) {
    const showSubset = updatedShows.slice(
      i * AIRTABLE_POST_LIMIT,
      Math.min((i + 1) * AIRTABLE_POST_LIMIT, updatedShows.length)
    );
    await Airtable.replace(
      showSubset.map(show => {
        return {
          id: map[show[FIELDS.title]].id,
          fields: show
        };
      })
    );
  }
  console.log(`Updated ${updatedShows.length} shows`);
};

const createNewShows = async (shows, map) => {
  const newShows = shows.filter(show => !map[show[FIELDS.title]]);
  for (let i = 0; i < Math.ceil(newShows.length / AIRTABLE_POST_LIMIT); i++) {
    const showSubset = newShows.slice(
      i * AIRTABLE_POST_LIMIT,
      Math.min((i + 1) * AIRTABLE_POST_LIMIT, newShows.length)
    );
    await Airtable.create(
      showSubset.map(show => {
        return {
          fields: show
        };
      })
    );
  }
  console.log(`Created ${newShows.length} new shows`);
};

const main = async () => {
  const venues = await getVenues();
  const scrapedEvents = await getScrapedEvents(venues);
  const allArtists = await getAllArtists();
  const shows = await filterEvents(scrapedEvents, allArtists);
  const airtableMap = await getAirtableMap();
  await deletePastShows(airtableMap);
  await updateExistingShows(shows, airtableMap);
  await createNewShows(shows, airtableMap);
};

main();
