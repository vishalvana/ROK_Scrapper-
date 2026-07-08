const { scrapeRemoteOK, scrapeWeWorkRemotely, scrapeRemotive } = require('./scraper');

(async () => {
  try {
    console.log('Running quick scraper tests (no DB)');
    const r1 = await scrapeRemoteOK();
    console.log('remoteok:', Array.isArray(r1) ? r1.length : 0);

    const r2 = await scrapeWeWorkRemotely();
    console.log('weworkremotely:', Array.isArray(r2) ? r2.length : 0);

    const r3 = await scrapeRemotive();
    console.log('remotive:', Array.isArray(r3) ? r3.length : 0);
  } catch (err) {
    console.error('Test run failed:', err.message);
    process.exitCode = 1;
  }
})();
