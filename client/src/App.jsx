import React, { useEffect, useState, useCallback } from 'react';
import JobCard from './components/JobCard.jsx';
import { fetchJobs, deleteJob, triggerScrape } from './api.js';

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');
  const [error, setError] = useState('');

  const loadJobs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchJobs({ search, location, source, page });
        setJobs(data.jobs);
        setPagination(data.pagination);
      } catch (err) {
        setError(err?.response?.data?.error || err.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    },
    [search, location, source]
  );

  useEffect(() => {
    loadJobs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadJobs(1);
  };

  const handleDelete = async (id) => {
    try {
      await deleteJob(id);
      setJobs((prev) => prev.filter((j) => j._id !== id));
    } catch (err) {
      setError('Failed to delete job');
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeMessage('');
    setError('');
    try {
      const data = await triggerScrape();
      setScrapeMessage(
        `Scrape complete: found ${data.summary.total}, inserted ${data.summary.inserted}, updated ${data.summary.updated}.`
      );
      await loadJobs(1);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Scrape failed');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Job Scraper</h1>
        <p className="subtitle">Live remote job listings scraped from public sources</p>
        <button className="btn-primary" onClick={handleScrape} disabled={scraping}>
          {scraping ? 'Scraping...' : 'Scrape Now'}
        </button>
        {scrapeMessage && <p className="scrape-message">{scrapeMessage}</p>}
      </header>

      <form className="filters" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search title, company, keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          <option value="remoteok">RemoteOK</option>
          <option value="weworkremotely">We Work Remotely</option>
        </select>
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="status-text">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="status-text">
          No jobs found. Try clicking <strong>Scrape Now</strong> to fetch listings.
        </p>
      ) : (
        <>
          <p className="results-count">
            Showing {jobs.length} of {pagination.total} jobs
          </p>
          <div className="job-list">
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} onDelete={handleDelete} />
            ))}
          </div>
          <div className="pager">
            <button
              disabled={pagination.page <= 1}
              onClick={() => loadJobs(pagination.page - 1)}
            >
              ← Prev
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadJobs(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
