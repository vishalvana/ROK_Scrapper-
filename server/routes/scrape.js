const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { runScrape } = require('../scraper/scraper');

let lastScrape = null;
let scrapeInProgress = false;

// POST /api/scrape - trigger a scrape run
router.post('/', async (req, res) => {
  if (scrapeInProgress) {
    return res.status(409).json({ error: 'A scrape is already in progress' });
  }

  scrapeInProgress = true;
  try {
    const summary = await runScrape(Job);
    lastScrape = { ...summary, finishedAt: new Date() };
    res.json({ message: 'Scrape complete', summary: lastScrape });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    scrapeInProgress = false;
  }
});

// GET /api/scrape/status - info on last scrape run
router.get('/status', (req, res) => {
  res.json({ inProgress: scrapeInProgress, lastScrape });
});

module.exports = router;
