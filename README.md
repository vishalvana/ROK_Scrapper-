# MERN Job Scraper

A full-stack job scraper built with **MongoDB, Express, React, and Node.js (MERN)**.

It scrapes public job listing pages (RemoteOK's public JSON feed and We Work Remotely's public RSS feed),
stores normalized job postings in MongoDB, and lets you browse/search/filter them from a React frontend.

> **Legal & ethical note:** Only the two sources included here are scraped because they explicitly
> provide public JSON/RSS feeds intended for programmatic consumption. If you point this scraper at
> other sites, always check `robots.txt` and the site's Terms of Service first, add rate limiting,
> and identify your bot with a proper `User-Agent`. Do not scrape sites that disallow it (e.g. LinkedIn, Indeed).

---

## Project structure

```
job-scraper-mern/
├── server/                # Express + MongoDB API + scraper
│   ├── config/db.js
│   ├── models/Job.js
│   ├── routes/jobs.js
│   ├── scraper/scraper.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── client/                # React (Vite) frontend
    ├── src/
    ├── index.html
    └── package.json
```

## 1. Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, Docker, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

## 2. Backend setup

```bash
cd server
cp .env.example .env
# edit .env and set MONGO_URI to your MongoDB connection string
npm install
npm run dev        # starts API on http://localhost:5000 with nodemon
```

### API endpoints

| Method | Route                | Description                                   |
|--------|-----------------------|------------------------------------------------|
| GET    | `/api/jobs`           | List jobs. Supports `?search=&location=&source=&page=&limit=` |
| GET    | `/api/jobs/:id`       | Get a single job                              |
| DELETE | `/api/jobs/:id`       | Delete a job                                  |
| POST   | `/api/scrape`         | Trigger a scrape run (fetches new jobs, upserts into DB) |
| GET    | `/api/scrape/status`  | Last scrape run info                          |

You can also run the scraper standalone (no server needed) with:

```bash
npm run scrape
```

### Automatic scheduled scraping

The server schedules a scrape every hour using `node-cron` (see `server.js`). Adjust the cron
expression in `.env` (`SCRAPE_CRON`) or disable it by setting `ENABLE_CRON=false`.

## 3. Frontend setup

```bash
cd client
npm install
npm run dev         # starts Vite dev server on http://localhost:5173
```

The frontend expects the API at `http://localhost:5000` (configurable in `client/src/api.js` or via
`VITE_API_URL` in a `client/.env` file).

## 4. Usage

1. Start MongoDB.
2. Start the backend (`npm run dev` in `server/`).
3. Start the frontend (`npm run dev` in `client/`).
4. Open the app, click **"Scrape Now"** to pull fresh listings, then search/filter by keyword or location.

## 5. Extending the scraper

Add new sources in `server/scraper/scraper.js` by writing a function that returns an array of
normalized job objects (`{ title, company, location, url, source, description, postedAt }`) and
registering it in the `SOURCES` array. Always respect the target site's `robots.txt` and ToS.
