/**
 * Job scraper module.
 *
 * Pulls listings from public, scrape-friendly sources:
 *  - RemoteOK: publishes a public JSON feed at https://remoteok.com/api
 *  - We Work Remotely: publishes public RSS feeds per category
 *
 * Both sources are used here specifically because they expose structured
 * public feeds meant for programmatic use. If you add other sources, check
 * robots.txt / ToS first, and keep request rates polite.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

const USER_AGENT =
  'Mozilla/5.0 (compatible; JobScraperBot/1.0; +https://example.com/bot)';

const client = axios.create({
  timeout: 15000,
  headers: { 'User-Agent': USER_AGENT },
});

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function requestWithRetry(url, config = {}, retries = 3, baseDelay = 500) {
  let attempt = 0;
  while (true) {
    try {
      return await client.get(url, config);
    } catch (err) {
      attempt += 1;
      const status = err.response?.status;
      const isRetryable = !err.response || status >= 500 || status === 429 || status === 526;
      if (!isRetryable || attempt > retries) {
        throw err;
      }
      const jitter = Math.round(Math.random() * 100);
      const delay = Math.round(baseDelay * Math.pow(2, attempt - 1) + jitter);
      console.warn(`[scraper] Request to ${url} failed (status=${status || 'n/a'}). retry ${attempt}/${retries} in ${delay}ms: ${err.message}`);
      await sleep(delay);
    }
  }
}

/**
 * Scrape RemoteOK's public JSON feed.
 * Returns normalized job objects.
 */
async function scrapeRemoteOK() {
  const url = 'https://remoteok.com/api';
  const { data } = await requestWithRetry(url, { responseType: 'json' });

  // First element is metadata, not a job - skip it
  const jobs = Array.isArray(data) ? data.slice(1) : [];

  return jobs
    .filter((j) => j.id && j.position)
    .map((j) => ({
      title: j.position,
      company: j.company || 'Unknown',
      location: j.location || 'Remote',
      description: (j.description || '').slice(0, 2000),
      tags: Array.isArray(j.tags) ? j.tags : [],
      url: j.url ? `https://remoteok.com${j.url.startsWith('/') ? '' : '/'}${j.url.replace(/^https?:\/\/remoteok\.com/, '')}` : `https://remoteok.com/l/${j.id}`,
      source: 'remoteok',
      postedAt: j.date ? new Date(j.date) : undefined,
    }));
}

/**
 * Scrape We Work Remotely's public RSS feed (programming category).
 * Uses cheerio to parse the HTML-ish description field for company/location
 * where possible, and xml2js to parse the RSS/XML itself.
 */
async function scrapeWeWorkRemotely() {
  const feeds = [
    { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', tag: 'programming' },
    { url: 'https://weworkremotely.com/categories/remote-design-jobs.rss', tag: 'design' },
  ];

  const parser = new xml2js.Parser({ explicitArray: false, trim: true });
  const allJobs = [];

  for (const feed of feeds) {
    try {
      const { data: xml } = await requestWithRetry(feed.url, { responseType: 'text' });
      const parsed = await parser.parseStringPromise(xml);
      const items = parsed?.rss?.channel?.item || [];
      const itemArray = Array.isArray(items) ? items : [items];

      for (const item of itemArray) {
        if (!item?.title || !item?.link) continue;

        // WWR titles are usually formatted "Company: Job Title"
        let company = 'Unknown';
        let title = item.title;
        const parts = item.title.split(':');
        if (parts.length > 1) {
          company = parts[0].trim();
          title = parts.slice(1).join(':').trim();
        }

        // Strip HTML from description for plain text storage
        const $ = cheerio.load(item.description || '');
        const description = $.text().slice(0, 2000);

        allJobs.push({
          title,
          company,
          location: 'Remote',
          description,
          tags: [feed.tag],
          url: item.link,
          source: 'weworkremotely',
          postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        });
      }
    } catch (err) {
      console.error(`[scraper] Failed to fetch WWR feed ${feed.url}:`, err.message);
    }
  }

  return allJobs;
}

/**
 * Scrape Remotive's public API.
 * API: https://remotive.io/api/remote-jobs
 */
async function scrapeRemotive() {
    const url = 'https://remotive.io/api/remote-jobs';
  try {
    const { data } = await requestWithRetry(url, { responseType: 'json' });
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

    return jobs
      .filter((j) => j.id && j.url && j.title)
      .map((j) => ({
        title: j.title,
        company: j.company_name || 'Unknown',
        location: j.candidate_required_location || 'Remote',
        description: (j.description || '').replace(/<[^>]+>/g, '').slice(0, 2000),
        tags: Array.isArray(j.tags) ? j.tags : [],
        url: j.url,
        source: 'remotive',
        postedAt: j.publication_date ? new Date(j.publication_date) : undefined,
      }));
  } catch (err) {
    console.error('[scraper] Failed to fetch Remotive:', err.message);
    return [];
  }
}

// Register all source scrapers here. Each must return an array of
// { title, company, location, description, tags, url, source, postedAt }
const SOURCES = [
  { name: 'remoteok', run: scrapeRemoteOK },
  { name: 'weworkremotely', run: scrapeWeWorkRemotely },
  { name: 'remotive', run: scrapeRemotive },
];

/**
 * Runs all registered scrapers and upserts results into MongoDB
 * (deduped by unique `url`). Safe to call repeatedly (e.g. via cron).
 */
async function runScrape(JobModel) {
  const summary = { total: 0, inserted: 0, updated: 0, errors: [] };

  for (const source of SOURCES) {
    try {
      console.log(`[scraper] Running source: ${source.name}`);
      const jobs = await source.run();
      summary.total += jobs.length;

      for (const job of jobs) {
        const result = await JobModel.updateOne(
          { url: job.url },
          { $set: job },
          { upsert: true }
        );
        if (result.upsertedCount > 0) summary.inserted += 1;
        else if (result.modifiedCount > 0) summary.updated += 1;
      }
    } catch (err) {
      console.error(`[scraper] Source ${source.name} failed:`, err.message);
      summary.errors.push({ source: source.name, message: err.message });
    }
  }

  console.log('[scraper] Run complete:', summary);
  return summary;
}

module.exports = { runScrape, scrapeRemoteOK, scrapeWeWorkRemotely, scrapeRemotive, SOURCES };

// Allow running standalone: `npm run scrape`
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  const connectDB = require('../config/db');
  const Job = require('../models/Job');

  (async () => {
    await connectDB();
    await runScrape(Job);
    process.exit(0);
  })();
}
