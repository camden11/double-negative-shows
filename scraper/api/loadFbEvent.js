const puppeteer = require("puppeteer");
const md5 = require("md5");
const LRU = require("lru-cache");

const cache = new LRU({
  max: 100,
  maxAge: 1000 * 60 * 60 // 1 hour
});

const urlKey = url => md5(url);

const waitAndScroll = async (page, iterations) => {
  for (let i = 0; i < iterations; i++) {
    await page.waitFor(1000);
    await page.evaluate(_ => {
      window.scrollBy(0, window.innerHeight);
    });
  }
};

const loadPage = async url => {
  const startTime = Date.now();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || undefined,
      args: [
        "--no-sandbox",
        "--headless",
        "--disable-gpu",
        "--disable-dev-shm-usage"
      ]
    });
    const page = await browser.newPage();
    await page.goto(url);
    // wait for div#reaction_units
    const detailSectionSelector = "#upcoming_events_card";
    // this line may cause timeout exception
    await page.waitForSelector(detailSectionSelector);
    await waitAndScroll(page, 10);
    const content = await page.content();
    return content;
  } catch (error) {
    console.log(`puppeteer ${error}`);
    return "";
  } finally {
    browser && browser.close().then(() => console.log(`puppeteer closed`));
    console.log(`loadPage ${url} took ${Date.now() - startTime} ms.`);
  }
};

const loadCacheFirst = async url => {
  const key = urlKey(url);
  const cachedData = cache.get(key);
  if (cachedData) {
    console.log(`hit:  ${url}`);
    return cachedData;
  }
  console.log(`miss: ${url}`);
  const data = await loadPage(url);
  if (!data) {
    return "";
  }
  cache.set(key, data);
  return data;
};

module.exports = () => url => loadCacheFirst(url);
