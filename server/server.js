require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const connectDB = require('./config/db');
const Job = require('./models/Job');
const { runScrape } = require('./scraper/scraper');

const jobsRouter = require('./routes/jobs');
const scrapeRouter = require('./routes/scrape');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/jobs', jobsRouter);
app.use('/api/scrape', scrapeRouter);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });

  if (process.env.ENABLE_CRON !== 'false') {
    const schedule = process.env.SCRAPE_CRON || '0 * * * *'; // every hour by default
    console.log(`[server] Scheduling scraper with cron "${schedule}"`);
    cron.schedule(schedule, () => {
      console.log('[cron] Starting scheduled scrape...');
      runScrape(Job).catch((err) => console.error('[cron] Scrape failed:', err.message));
    });
  }
}

start();
