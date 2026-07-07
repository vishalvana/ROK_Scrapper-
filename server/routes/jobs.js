const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// GET /api/jobs?search=&location=&source=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { search, location, source, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (source) {
      query.source = source;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ postedAt: -1, scrapedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Job.countDocuments(query),
    ]);

    res.json({
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(400).json({ error: 'Invalid job id' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid job id' });
  }
});

module.exports = router;
