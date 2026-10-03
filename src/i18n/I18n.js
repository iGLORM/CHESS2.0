// Languages. The game is written in English; every other language is a table
// in src/i18n/lang/<id>.js keyed by the English text (I18n.add). Text is
// translated where it is drawn, so screens and story data stay in English:
//   - PIXI.Text: the `text` setter,
//   - Canvas 2D: fillText / strokeText / measureText on the game's own canvases
//     (never on Pixi's internal text canvases),
//   - UIHelpers.wrapText and TextFit translate before they split lines.
// Code that builds a sentence from parts can call I18n.t('Level {0}', n).
//
// Keys may hold placeholders {0}, {1}... and then match any text of that shape
// ("{0}/30 puzzles solved" matches "4/30 puzzles solved"); what a placeholder
// matched is translated too (world names, piece names). A text in capitals
// ("PLAY", from 'Play'.toUpperCase()) uses the key's translation in capitals.
// English draws exactly as before: nothing is looked up.
const I18n = {
  LANGS: [
    { id: 'en', name: 'English', locale: 'en' },
    { id: 'fr', name: 'Français', locale: 'fr' },
    { id: 'es', name: 'Español', locale: 'es' },
    { id: 'pt', name: 'Português', locale: 'pt' },
    { id: 'it', name: 'Italiano', locale: 'it' },
    { id: 'de', name: 'Deutsch', locale: 'de' },
  ],

  // Each language is split into these files in src/i18n/lang/<id>/, loaded
  // when the language is chosen (a file that does not exist is skipped).
  FILES: ['ui', 'characters', 'story', 'missions', 'world', 'training'],

  lang: 'en',
  tables: {},
  _loading: {},
  // Names that stay as they are unless a language gives its own (src/i18n/names.js).
  KEEP: new Set(),
  // Texts made of parts: each part is translated on its own.
  JOINS: ['{0}  ·  {1}', '{0} · {1}', '{0}  |  {1}', '{0} | {1}', '{0}: {1}', '{0}  ({1})', '{0} ({1})', '{0} - {1}', '{0}, {1}'],
  missing: new Set(),   // texts drawn with no translation (for checking)
  _memo: new Map(),
  _outputs: new Set(),
  _listeners: [],

  // Adds translations for a language: { 'English text': 'translation', ... }.
  add(lang, dict) {
    const t = this.tables[lang] || (this.tables[lang] = { exact: new Map(), upper: new Map(), patterns: [] });
    for (const [en, tr] of Object.entries(dict)) {
      if (typeof tr !== 'string' || !tr) continue;
      if (/\{\d+\}/.test(en)) {
        t.patterns.push(this._compile(en, tr));
      } else {
        t.exact.set(en, tr);
        t.exact.set(en.trim(), tr);
      }
      const up = en.toUpperCase();
      if (up !== en && !t.upper.has(up)) t.upper.set(up, tr);
    }
    // Longer patterns first: the most specific shape wins.
    t.patterns.sort((a, b) => b.literal - a.literal);
    if (lang === this.lang) this._memo.clear();
  },

  _compile(en, tr) {
    const parts = en.split(/(\{\d+\})/);
    const order = [];
    const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let src = '^';
    let srcUpper = '^';
    let literal = 0;
    for (const p of parts) {
      const m = /^\{(\d+)\}$/.exec(p);
      if (m) {
        order.push(+m[1]);
        src += '([\\s\\S]+?)';
        srcUpper += '([\\s\\S]+?)';
      } else {
        src += esc(p);
        srcUpper += esc(p.toUpperCase());
        literal += p.replace(/\s/g, '').length;
      }
    }
    return { re: new RegExp(src + '$'), reUpper: new RegExp(srcUpper + '$'), order, tr, literal, en };
  },

  keep(list) { for (const n of list) { this.KEEP.add(n); this.KEEP.add(n.toUpperCase()); } },

  locale() {
    const l = this.LANGS.find(x => x.id === this.lang);
    return l ? l.locale : 'en';
  },

  name(id = this.lang) {
    const l = this.LANGS.find(x => x.id === id);
    return l ? l.name : id;
  },

  // Translates one whole text as it is about to be drawn.
  display(s) {
    if (this.lang === 'en' || typeof s !== 'string' || s.length < 2 || !/[A-Za-z]/.test(s)) return s;
    const hit = this._memo.get(s);
    if (hit !== undefined) return hit;
    let out = s;
    if (!this._outputs.has(s)) {
      const found = this._lookup(s);
      if (found !== null) out = found;
      else if (!this.KEEP.has(s.trim())) this.missing.add(s);
    }
    if (this._memo.size > 20000) this._memo.clear();
    this._memo.set(s, out);
    if (out !== s) this._outputs.add(out);
    return out;
  },

  _lookup(s) {
    const t = this.tables[this.lang];
    if (!t) return null;
    let v = t.exact.get(s);
    if (v !== undefined) return v;
    const trimmed = s.trim();
    if (trimmed !== s) {
      v = t.exact.get(trimmed);
      if (v !== undefined) return s.replace(trimmed, v);
    }
    const isUpper = s === s.toUpperCase() && s !== s.toLowerCase();
    if (isUpper) {
      v = t.upper.get(s);
      if (v !== undefined) return v.toLocaleUpperCase(this.locale());
    }
    for (const p of t.patterns) {
      const m = p.re.exec(s) || (isUpper ? p.reUpper.exec(s) : null);
      if (!m) continue;
      const out = p.tr.replace(/\{(\d+)(?:\|([\w-]+))?\}/g, (_, i, form) => {
        const idx = p.order.indexOf(+i);
        if (idx < 0) return '';
        return form ? this.word(m[idx + 1], form) : this._piece(m[idx + 1]);
      });
      return isUpper ? out.toLocaleUpperCase(this.locale()) : out;
    }
    // Lines, and parts joined by a separator, translated one by one.
    if (s.includes('\n')) {
      const lines = s.split('\n');
      const tr = lines.map(l => this._piece(l));
      if (tr.some((l, i) => l !== lines[i])) return tr.join('\n');
    }
    if (!this._joins) this._joins = this.JOINS.map(j => this._compile(j, j));
    for (const p of this._joins) {
      const m = p.re.exec(s);
      if (!m) continue;
      const a = this._piece(m[1]), b = this._piece(m[2]);
      if (a === m[1] && b === m[2] && !(this.KEEP.has(m[1].trim()) && this.KEEP.has(m[2].trim()))) continue;
      return p.tr.replace('{0}', a).replace('{1}', b);
    }
    return null;
  },

  // A part matched by a placeholder: translated if it is a known text, else kept
  // (numbers, names).
  _piece(s) {
    if (!/[A-Za-z]/.test(s)) return s;
    const v = this._lookup(s);
    return v === null ? s : v;
  },

  // Word forms per language, for words put into a line ({piece|my}): see fill.
  FORMS: {},
  forms(lang, table) { this.FORMS[lang] = Object.assign(this.FORMS[lang] || {}, table); },

  // Fills a line written with named slots ('Ouch! That was my {piece}!'): the
  // whole line is translated first, then the slots filled. A translation can ask
  // for a form of the word, '{piece|my}', from the language's FORMS table
  // (I18n.forms('fr', { my: { rook: 'ma tour', ... } })), so articles and cases agree.
  fill(line, values = {}) {
    if (this.lang === 'en') {
      return line.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
    }
    const tr = this._exactOnly(line);
    const loc = this.locale();
    const out = (tr === null ? line : tr).replace(/\{(\w+)(?:\|([\w-]+))?\}/g, (m, k, form, at, all) => {
      if (!(k in values)) return m;
      const w = this.word(String(values[k]), form);
      // A word that starts a sentence gets a capital ("Ton pion..." not "ton pion...").
      const before = all.slice(0, at);
      return /(^|[.!?…»"]\s+|^\*[^*]*\*\s*\.{3}\s+)$/.test(before) || before === '' ? w.charAt(0).toLocaleUpperCase(loc) + w.slice(1) : w;
    });
    this._outputs.add(out);
    return out;
  },

  // One word in this language, in a form if the language has it.
  word(v, form) {
    const f = this.FORMS[this.lang];
    const k = v.toLowerCase();
    if (f) {
      if (form && f[form] && f[form][k] != null) return f[form][k];
      if (f.base && f.base[k] != null) return f.base[k];
    }
    return /^\d+$/.test(v) ? v : this._piece(v);
  },

  // For code that builds text from parts: I18n.t('Level {0}', 3).
  t(en, ...args) {
    let s = this.lang === 'en' ? en : (this._exactOnly(en) ?? en);
    if (args.length) s = s.replace(/\{(\d+)\}/g, (m, i) => (args[+i] !== undefined ? String(args[+i]) : m));
    return s;
  },

  _exactOnly(en) {
    const t = this.tables[this.lang];
    const v = t && t.exact.get(en);
    if (v === undefined) { this.missing.add(en); return null; }
    this._outputs.add(v);
    return v;
  },

  // Language to use on first start: the system's, when the game has it.
  detect() {
    const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe
      && window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.language_code;
    const tags = [tg, ...(navigator.languages || []), navigator.language].filter(Boolean).map(x => String(x).toLowerCase());
    for (const tag of tags) {
      const base = tag.split('-')[0];
      if (this.LANGS.some(l => l.id === base)) return base;
    }
    return 'en';
  },

  // Switches language; resolves once its files and letters are loaded.
  set(lang) {
    if (!this.LANGS.some(l => l.id === lang)) lang = 'en';
    const changed = lang !== this.lang;
    this.lang = lang;
    this._memo.clear();
    this._outputs.clear();
    this.missing.clear();
    if (document.documentElement) document.documentElement.lang = this.locale();
    if (changed) this._listeners.forEach(fn => { try { fn(lang); } catch (_) { /* keep going */ } });
    return Promise.all([this.load(lang), this.loadFonts()]).then(() => {
      this._memo.clear();
      this.missing.clear();
      return lang;
    });
  },

  // Loads a language's files once (script tags, so it works from file:// too).
  load(lang) {
    if (lang === 'en') return Promise.resolve();
    if (this._loading[lang]) return this._loading[lang];
    const me = document.querySelector('script[src*="i18n/I18n.js"]');
    const v = me && /\?v=([^&]+)/.exec(me.getAttribute('src'));
    const base = me ? me.getAttribute('src').replace(/I18n\.js.*$/, '') : 'i18n/';
    const one = (file) => new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `${base}lang/${lang}/${file}.js${v ? `?v=${v[1]}` : ''}`;
      s.onload = s.onerror = () => resolve();
      document.head.appendChild(s);
    });
    this._loading[lang] = Promise.all(this.FILES.map(one));
    return this._loading[lang];
  },

  onChange(fn) { this._listeners.push(fn); },

  // Ask for every weight now, accented letters included, so the first frame
  // already has them.
  loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const sample = 'ÀÉÖÜßàéñöüœ';
    return Promise.all([
      '16px "Pixelify Sans"', '500 16px "Pixelify Sans"', '600 16px "Pixelify Sans"', 'bold 16px "Pixelify Sans"',
      '16px "Silkscreen"', 'bold 16px "Silkscreen"',
    ].map(f => document.fonts.load(f, sample).catch(() => null)));
  },

  // The saved choice, read before the Store exists so the first frame is right.
  // A player who already has a save and never chose keeps English; only a new
  // player starts in the system's language.
  _saved() {
    try {
      const raw = localStorage.getItem('chess2_progress');
      if (!raw) return null;
      const s = JSON.parse(raw).settings;
      return (s && s.language) || 'en';
    } catch (_) { return null; }
  },

  _install() {
    // PIXI.Text and the other Pixi texts.
    if (typeof PIXI !== 'undefined' && PIXI.AbstractText) {
      const d = Object.getOwnPropertyDescriptor(PIXI.AbstractText.prototype, 'text');
      if (d && d.set) {
        Object.defineProperty(PIXI.AbstractText.prototype, 'text', {
          configurable: true,
          enumerable: d.enumerable,
          get: d.get,
          // A text typed out letter by letter is translated whole beforehand and
          // marked __noI18n, so its partial lines are left alone.
          set(v) { d.set.call(this, typeof v === 'string' && !this.__noI18n ? I18n.display(v) : v); },
        });
      }
      // Pixi measures and draws text on its own canvases: leave those alone.
      try { PIXI.CanvasTextMetrics._context.__noI18n = true; } catch (_) { /* older Pixi */ }
      const pool = PIXI.CanvasPool;
      if (pool && pool.getOptimalCanvasAndContext) {
        const get = pool.getOptimalCanvasAndContext.bind(pool);
        pool.getOptimalCanvasAndContext = (...a) => {
          const r = get(...a);
          if (r && r.context) r.context.__noI18n = true;
          return r;
        };
      }
    }
    // Canvas 2D.
    const C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (C) {
      for (const fn of ['fillText', 'strokeText', 'measureText']) {
        const orig = C[fn];
        C[fn] = function (text, ...rest) {
          if (I18n.lang !== 'en' && !this.__noI18n) text = I18n.display(String(text));
          return orig.call(this, text, ...rest);
        };
      }
    }
  },
};

I18n._install();
I18n.lang = (() => {
  const saved = I18n._saved();
  return saved && I18n.LANGS.some(l => l.id === saved) ? saved : I18n.detect();
})();
if (document.documentElement) document.documentElement.lang = I18n.locale();
// The first screen waits for this (src/main.js).
I18n.ready = I18n.load(I18n.lang);
