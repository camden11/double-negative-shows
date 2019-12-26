const osmosis = require("osmosis");

module.exports = fbEventUrl => {
  const scrap = pageId =>
    new Promise(resolve => {
      osmosis
        .get(`${fbEventUrl}https://www.facebook.com/pg/${pageId}/events/`)
        .set([
          osmosis
            .find("#upcoming_events_card > div > div:not(:first-child)")
            .set({
              title: "td:nth-child(2) > div > div:first-child span",
              month: "td:nth-child(1) span > span:first-child",
              day: "td:nth-child(1) span > span:nth-child(2)",
              time: "td:nth-child(2) > div > div:nth-child(2) span:first-child",
              url: "td:nth-child(2) > div > div:first-child a@href"
            })
        ])
        .data(data => {
          resolve(data);
        })
        .done()
        .log(console.log)
        .error(console.error)
        .debug(console.debug);
    });

  return scrap;
};
