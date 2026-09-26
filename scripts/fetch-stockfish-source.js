#!/usr/bin/env node
// Downloads the exact source code of the bundled Stockfish build so desktop
// releases can ship it next to the game (GPLv3 "corresponding source").
// Run automatically by the build:* npm scripts; does nothing if already present.
const fs = require('fs');
const path = require('path');
const https = require('https');

const COMMIT = '32d4b5ae40c01db88219bfbe2b82dbe6dec93832';   // stockfish.js, npm stockfish@18.0.7
const SOURCE_URL = `https://github.com/nmrugg/stockfish.js/archive/${COMMIT}.tar.gz`;
const OUT_DIR = path.join(__dirname, '..', 'third_party', 'stockfish-source');
const OUT_FILE = path.join(OUT_DIR, `stockfish.js-${COMMIT}.tar.gz`);

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'chess-2.0-build' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(download(new URL(res.headers.location, url).toString(), dest, redirects - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const tmp = dest + '.part';
      const file = fs.createWriteStream(tmp);
      res.pipe(file);
      file.on('finish', () => file.close(() => { fs.renameSync(tmp, dest); resolve(); }));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  if (fs.existsSync(OUT_FILE) && fs.statSync(OUT_FILE).size > 0) {
    console.log('Stockfish source already present:', path.relative(process.cwd(), OUT_FILE));
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Downloading Stockfish source', COMMIT.slice(0, 10), '...');
  await download(SOURCE_URL, OUT_FILE);
  fs.writeFileSync(path.join(OUT_DIR, 'README.txt'),
    'Complete source code of the Stockfish engine bundled with Chess 2.0\n' +
    '(Stockfish.js 18, npm package stockfish@18.0.7, git commit ' + COMMIT + ').\n' +
    'Licensed under the GNU General Public License v3; see ../COPYING.txt.\n' +
    'Also available at ' + SOURCE_URL + '\n');
  console.log('Saved', path.relative(process.cwd(), OUT_FILE), `(${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
}

main().catch((err) => {
  console.error('Could not download the Stockfish source:', err.message);
  console.error('Release builds must include it (GPLv3). Check your connection and run again.');
  process.exit(1);
});
