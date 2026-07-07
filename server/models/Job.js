const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, trim: true, default: 'Unknown' },
    location: { type: String, trim: true, default: 'Remote' },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
    url: { type: String, required: true, unique: true },
    source: { type: String, required: true }, // e.g. 'remoteok', 'weworkremotely'
    postedAt: { type: Date },
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Text index to support keyword search across title/company/description/tags
JobSchema.index({ title: 'text', company: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Job', JobSchema);
