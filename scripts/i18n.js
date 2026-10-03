#!/usr/bin/env node
// Translation helper for src/i18n (see src/i18n/I18n.js).
//   node scripts/i18n.js extract            every English text found in src/, by file (JSON)
//   node scripts/i18n.js missing <lang>     texts that <lang> has no translation for
//   node scripts/i18n.js stats              how many texts each language covers
//   node scripts/i18n.js stale <lang>       translations whose English text no longer exists
// Texts are the string and template literals in the game's code that look like
// words for the player; a template's ${...} parts become {0}, {1}... A few that
// look like words but are never shown are listed in IGNORE.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SKIP_DIRS = ['vendor', 'stockfish', 'i18n', 'scenes', 'web'];

const IGNORE = new Set([
  'Pixelify Sans', 'Silkscreen', 'Chess 2.0', 'Stockfish', 'Courier New', 'Arial', 'Helvetica',
]);

function files(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.includes(e.name)) out.push(...files(p)); } else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// A small JavaScript lexer: string and template literals, skipping comments and
// regular expressions.
function literals(src) {
  const out = [];
  let i = 0;
  let prev = '';   // last significant character, to tell a regex from a division
  const REGEX_AFTER = '(,=:[!&|?{};+-*%<>~^';
  function readString(q) {
    let s = '';
    i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') {
        const n = src[i + 1];
        s += n === 'n' ? '\n' : n === 't' ? '\t' : n === '\n' ? '' : n;
        i += 2;
        continue;
      }
      s += src[i++];
    }
    i++;
    return s;
  }
  function readTemplate() {
    let s = '';
    let n = 0;
    i++;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { const c = src[i + 1]; s += c === 'n' ? '\n' : c; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        scan('}');
        i++;
        s += `{${n++}}`;
        continue;
      }
      s += src[i++];
    }
    i++;
    return s;
  }
  function readRegex() {
    i++;
    let inClass = false;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) break;
      else if (c === '\n') break;
      i++;
    }
    i++;
    while (/[a-z]/i.test(src[i] || '')) i++;
  }
  function scan(until) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (until && c === '}' && depth === 0) return;
      if (c === '{') depth++;
      if (c === '}') depth--;
      if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? src.length : i + 2; continue; }
      if (c === '\'' || c === '"') { out.push(readString(c)); prev = 'a'; continue; }
      if (c === '`') { out.push(readTemplate()); prev = 'a'; continue; }
      if (c === '/') {
        const word = /(?:return|typeof|case|in|of)\s*$/.test(src.slice(Math.max(0, i - 8), i));
        if (REGEX_AFTER.includes(prev) || prev === '' || word) { readRegex(); prev = 'a'; continue; }
      }
      if (!/\s/.test(c)) prev = /[A-Za-z0-9_$)\]]/.test(c) ? 'a' : c;
      i++;
    }
  }
  scan(null);
  return out;
}

function isText(s) {
  const t = s.trim();
  if (t.length < 2 || !/[A-Za-z]/.test(t) || IGNORE.has(t)) return false;
  if (/^[#.]?[\w-]+\.(png|jpe?g|webp|js|json|css|html|woff2?|svg|mp3|wav)(\?.*)?$/i.test(t)) return false;
  if (/^(https?:|data:|\.\/|\.\.\/|\/)/.test(t)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /^(rgba?|hsla?)\(/.test(t)) return false;
  if (/\b\d+px\b/.test(t) && /(sans|serif|monospace|Pixelify|Silkscreen)/.test(t)) return false;
  if (/^[a-z][A-Za-z0-9_$-]*$/.test(t)) return false;          // keys, ids, event names
  if (/^[A-Z][A-Z0-9_]+$/.test(t) && t.includes('_')) return false; // CONSTANTS
  if (/^[\w$.]+\(.*\)$/.test(t)) return false;                   // code
  if (/^[a-z]+(\.[a-zA-Z]+)+$/.test(t)) return false;            // dotted keys
  if (/^\{\d+\}(\s*\{\d+\})*$/.test(t)) return false;            // only placeholders
  if (/^[\w-]+(\s+[\w-]+)*$/.test(t) && /^[a-z]/.test(t) && !t.includes(' ')) return false;
  if (/^(position|go|uci|isready|setoption|ucinewgame|bestmove|info)\b/.test(t)) return false;  // UCI
  if (/^([a-h][1-8]){2}[qrbn]?(\s([a-h][1-8]){2}[qrbn]?)*$/.test(t)) return false;            // moves
  if (/^[rnbqkpRNBQKP1-8/]+ [wb] /.test(t)) return false;                                      // FEN
  return true;
}

function extract() {
  const byFile = {};
  for (const f of files(SRC)) {
    const rel = path.relative(ROOT, f);
    const seen = new Set();
    for (const s of literals(fs.readFileSync(f, 'utf8'))) {
      if (isText(s) && !seen.has(s)) { seen.add(s); }
    }
    if (seen.size) byFile[rel] = [...seen];
  }
  return byFile;
}

// Every translation of a language (src/i18n/lang/<lang>/*.js), as one object.
function loadLang(lang) {
  const dir = path.join(SRC, 'i18n', 'lang', lang);
  const tables = {};
  const sandbox = { I18n: { add(l, dict) { Object.assign(tables[l] || (tables[l] = {}), dict); }, forms() {}, keep() {} } };
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js')).sort()) {
      vm.runInNewContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f });
    }
  }
  return tables[lang] || {};
}

// Names every language keeps (src/i18n/names.js).
function keptNames() {
  const out = new Set();
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'i18n', 'names.js'), 'utf8'), { I18n: { keep(list) { list.forEach(n => out.add(n)); } } });
  return out;
}

// Strings the extractor finds that are not shown to players (ids, code, sound patterns).
function isNoise(s) {
  return /^[a-z]+:[a-z]+$/.test(s) || /^[x.o\-]{8,}$/.test(s) || /^[.wasd]{8,}$/.test(s) || /^[A-Z][a-z]+[A-Z][A-Za-z]+$/.test(s)
    || /(^|\s)(error|failed|unavailable)\b.*:$/i.test(s) || /^[\w]+#/.test(s) || /^[a-z_]+_\{0\}/.test(s) || /^\{0\}[a-zA-Z_]*$/.test(s)
    || /^[a-z-]+:/.test(s) || /^\n/.test(s) || /^(power\d|Key[A-Z]|Arrow)/.test(s) || /^[A-Z]{2,}$/.test(s) && s.length <= 4 && s !== 'ON' && s !== 'OFF';
}

const LANGS = ['fr', 'es', 'pt', 'it', 'de'];

if (require.main === module) {
  const [cmd, lang] = process.argv.slice(2);
  if (cmd === 'extract') {
    console.log(JSON.stringify(extract(), null, 1));
  } else if (cmd === 'missing') {
    const dict = loadLang(lang);
    const keep = keptNames();
    const out = {};
    for (const [f, list] of Object.entries(extract())) {
      const miss = list.filter(s => !(s in dict) && !(s.trim() in dict) && !keep.has(s.trim()) && !isNoise(s));
      if (miss.length) out[f] = miss;
    }
    console.log(JSON.stringify(out, null, 1));
  } else if (cmd === 'stats') {
    const keep = keptNames();
    const all = new Set(Object.values(extract()).flat().filter(s => !keep.has(s.trim()) && !isNoise(s)));
    for (const l of LANGS) {
      const dict = loadLang(l);
      const have = [...all].filter(s => s in dict || s.trim() in dict).length;
      console.log(`${l.padEnd(4)} ${have}/${all.size}`);
    }
  } else if (cmd === 'stale') {
    // Keys a language has that no longer match any English text in the code.
    const all = new Set(Object.values(extract()).flat().map(s => s.trim()));
    const dict = loadLang(lang);
    console.log(JSON.stringify(Object.keys(dict).filter(k => !all.has(k.trim())), null, 1));
  } else {
    console.log('usage: node scripts/i18n.js extract | missing <lang> | stats');
  }
}

module.exports = { extract, literals, isText, loadLang, keptNames, isNoise, LANGS };
