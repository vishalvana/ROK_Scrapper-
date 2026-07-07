const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/job_scraper';

  try {
    await mongoose.connect(uri);
    console.log(`[db] Connected to MongoDB at ${uri}`);
  } catch (err) {
    console.error('[db] MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
