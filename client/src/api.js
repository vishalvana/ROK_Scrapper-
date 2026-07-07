import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_URL });

export async function fetchJobs({ search = '', location = '', source = '', page = 1, limit = 20 } = {}) {
  const { data } = await api.get('/api/jobs', {
    params: { search, location, source, page, limit },
  });
  return data;
}

export async function deleteJob(id) {
  const { data } = await api.delete(`/api/jobs/${id}`);
  return data;
}

export async function triggerScrape() {
  const { data } = await api.post('/api/scrape');
  return data;
}

export async function fetchScrapeStatus() {
  const { data } = await api.get('/api/scrape/status');
  return data;
}

export default api;
