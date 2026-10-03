// Story tournaments: 16 entrants, either four groups of four and a knockout (the
// Queen's Cup) or a straight knockout (the Gulch Shootout). Pure logic, no DOM:
// characters/tournaments.js keeps the state in the save and launches the games.
//
// A tournament is a plain object (saved as JSON). Entrant 0 is the player. Every
// match the player is not in is simulated from the two strengths with its own
// random stream, seeded by the tournament seed and the match id, so the whole
// tournament follows from its seed and the player's results.
//
//   format   'groups' (phases md1 md2 md3 qf sf final) or 'knockout' (r16 qf sf final)
//   entrants [{ id, name, title, piece, level, colors, kind, player?, lot }]
//   groups   four lists of four entrant indexes (groups format; the player's group has
//            the player first so the player plays on every matchday)
//   matches  [{ id, phase, group, slot, a, b, result: null | 'a' | 'b' | 'draw', replays }]
//            knockout matches are created when their phase starts; a knockout result
//            is never 'draw' (a drawn player game is replayed, a simulated one is
//            decided on the spot)
//   phase    index into phases(); status 'playing' | 'out' | 'champion'
const Tournament = {
  GROUP_PHASES: ['md1', 'md2', 'md3', 'qf', 'sf', 'final'],
  KNOCKOUT_PHASES: ['r16', 'qf', 'sf', 'final'],
  PHASE_NAMES: {
    md1: 'Matchday 1', md2: 'Matchday 2', md3: 'Matchday 3',
    r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', final: 'Final',
  },
  GROUP_LETTERS: ['A', 'B', 'C', 'D'],
  // Single round robin in a group of four: [slot, slot] pairs per matchday.
  ROUND_ROBIN: [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]],
  // Standard seeding of a 16 bracket (seed numbers, top to bottom).
  SEED_ORDER: [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11],
  WIN_POINTS: 3,
  DRAW_POINTS: 1,

  /* ------------------------------------------------------------------ */
  /*  Random numbers                                                     */
  /* ------------------------------------------------------------------ */

  // mulberry32: small, fast, and the same everywhere.
  rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },

  // The random stream of one thing in a tournament (a match, a line of dialogue).
  streamFor(seed, key) {
    return this.rng((this.hash(String(key)) ^ Math.imul(seed >>> 0, 2654435761)) >>> 0);
  },

  shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  newSeed() {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  },

  /* ------------------------------------------------------------------ */
  /*  Entrants                                                           */
  /* ------------------------------------------------------------------ */

  // Levels for `count` opponents between top - 3 and top (never below 1), weakest
  // first. A quarter sits at each level, the fewest at the top.
  levels(count, top) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(Math.max(1, top - 3 + Math.floor(i * 4 / count)));
    return out;
  },

  // Draws `count` opponents from name pools: [{ kind, pieces, names, titles, colors }].
  // Names never repeat; kinds are mixed as evenly as the pools allow.
  drawEntrants(rand, pools, count, top) {
    const levels = this.levels(count, top);
    const left = pools.map(p => this.shuffle(p.names, rand));
    const order = this.shuffle(pools.map((_, i) => i), rand);
    const out = [];
    let k = 0;
    while (out.length < count) {
      const pi = order[k % order.length];
      k++;
      if (!left[pi].length) {
        if (left.every(l => !l.length)) throw new Error('Tournament: not enough names');
        continue;
      }
      const pool = pools[pi];
      const pick = arr => arr[Math.floor(rand() * arr.length)];
      out.push({
        name: left[pi].pop(),
        title: pick(pool.titles),
        piece: pick(pool.pieces),
        colors: { ...pick(pool.colors) },
        kind: pool.kind,
      });
    }
    // Strength is dealt at random over the drawn names.
    const lv = this.shuffle(levels, rand);
    out.forEach((e, i) => { e.level = lv[i]; });
    return out;
  },

  /* ------------------------------------------------------------------ */
  /*  Creating a tournament                                              */
  /* ------------------------------------------------------------------ */

  // opts: { seed, format, pools, top (guardian level), player: { name, piece }, attempt }
  create(opts) {
    const seed = (opts.seed === undefined ? this.newSeed() : opts.seed) >>> 0;
    const rand = this.streamFor(seed, 'draw');
    const format = opts.format === 'knockout' ? 'knockout' : 'groups';
    const foes = this.drawEntrants(rand, opts.pools, 15, opts.top || 4);
    const player = Object.assign({ name: 'You', title: 'The Challenger', piece: 'king', level: 0, colors: { primary: '#f4f0e8', secondary: '#8a8494' }, kind: 'you' }, opts.player || {}, { player: true });
    const entrants = [player, ...foes].map((e, i) => ({ ...e, id: `e${i}`, lot: rand() }));
    const t = {
      version: 1,
      seed,
      attempt: opts.attempt || 1,
      format,
      entrants,
      groups: null,
      matches: [],
      phase: 0,
      status: 'playing',
      champion: null,
      outAt: null,
    };
    // Strongest first (the player counts as a top seed), ties broken by lot.
    const bySeed = entrants.map((_, i) => i).filter(i => i !== 0)
      .sort((x, y) => entrants[y].level - entrants[x].level || entrants[x].lot - entrants[y].lot);
    if (format === 'groups') {
      // Four pots of four; every group gets one entrant from each pot.
      const pots = [[0, ...bySeed.slice(0, 3)], bySeed.slice(3, 7), bySeed.slice(7, 11), bySeed.slice(11, 15)];
      const groups = [[], [], [], []];
      for (const pot of pots) {
        const order = this.shuffle(pot, rand);
        order.forEach((e, g) => groups[g].push(e));
      }
      // Group letters are drawn too, so the player is not always in Group A.
      t.groups = this.shuffle(groups, rand).map(g => (g.includes(0) ? [0, ...g.filter(e => e !== 0)] : g));
      this._startPhase(t);
    } else {
      // The player is the top seed (the biggest bounty), so the road gets harder.
      const seeds = [0, ...bySeed];
      const slots = this.SEED_ORDER.map(s => seeds[s - 1]);
      this._knockoutMatches(t, 'r16', slots);
    }
    return t;
  },

  phases(t) {
    return t.format === 'groups' ? this.GROUP_PHASES : this.KNOCKOUT_PHASES;
  },

  phaseId(t, i = t.phase) {
    return this.phases(t)[Math.min(i, this.phases(t).length - 1)];
  },

  phaseName(t, i = t.phase) {
    return this.PHASE_NAMES[this.phaseId(t, i)];
  },

  isGroupPhase(t, i = t.phase) {
    return /^md/.test(this.phaseId(t, i));
  },

  _startPhase(t) {
    const id = this.phaseId(t);
    if (/^md/.test(id)) {
      const day = Number(id.slice(2)) - 1;
      t.groups.forEach((g, gi) => {
        this.ROUND_ROBIN[day].forEach(([x, y], k) => {
          t.matches.push({ id: `${id}_${this.GROUP_LETTERS[gi]}${k + 1}`, phase: id, group: gi, slot: k, a: g[x], b: g[y], result: null, replays: 0 });
        });
      });
      return;
    }
    if (id === 'qf' && t.format === 'groups') {
      const q = this.qualifiers(t);
      // Bracket order: QF1 and QF2 meet in one semi, QF3 and QF4 in the other, so
      // two teams from the same group can only meet again in the final.
      this._knockoutMatches(t, 'qf', [q[0][0], q[1][1], q[2][0], q[3][1], q[1][0], q[0][1], q[3][0], q[2][1]]);
      return;
    }
    const prev = this.phaseId(t, t.phase - 1);
    const winners = this.matchesIn(t, prev).map(m => this.winner(m));
    this._knockoutMatches(t, id, winners);
  },

  // Pairs neighbours in `slots` (bracket order, top to bottom).
  _knockoutMatches(t, phase, slots) {
    for (let k = 0; k < slots.length / 2; k++) {
      t.matches.push({ id: `${phase}_${k + 1}`, phase, group: null, slot: k, a: slots[k * 2], b: slots[k * 2 + 1], result: null, replays: 0 });
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Queries                                                            */
  /* ------------------------------------------------------------------ */

  matchesIn(t, phase) {
    return t.matches.filter(m => m.phase === phase).sort((x, y) => (x.group ?? 0) - (y.group ?? 0) || x.slot - y.slot);
  },

  match(t, id) {
    return t.matches.find(m => m.id === id) || null;
  },

  hasPlayer(m) {
    return m.a === 0 || m.b === 0;
  },

  winner(m) {
    return m.result === 'a' ? m.a : m.result === 'b' ? m.b : null;
  },

  loser(m) {
    return m.result === 'a' ? m.b : m.result === 'b' ? m.a : null;
  },

  // The player's next game, or null when the player is out or has won.
  playerMatch(t) {
    if (t.status !== 'playing') return null;
    return t.matches.find(m => m.phase === this.phaseId(t) && this.hasPlayer(m) && !m.result) || null;
  },

  opponent(t, m = this.playerMatch(t)) {
    if (!m) return null;
    return t.entrants[m.a === 0 ? m.b : m.a];
  },

  playerGroup(t) {
    return t.groups ? t.groups.findIndex(g => g.includes(0)) : -1;
  },

  isOut(t) { return t.status === 'out'; },
  isChampion(t) { return t.status === 'champion'; },

  championEntrant(t) {
    return t.champion === null || t.champion === undefined ? null : t.entrants[t.champion];
  },

  // Where the player finished: 'champion', 'final', 'sf', 'qf', 'r16' or 'group'.
  playerFinish(t) {
    if (t.status === 'champion') return 'champion';
    if (t.status === 'out') return t.outAt;
    return null;
  },

  // Knockout rounds for a bracket: [{ phase, matches: [match | placeholder] }], every
  // round at full size (unknown pairings have a and b null).
  bracket(t) {
    const ids = t.format === 'groups' ? ['qf', 'sf', 'final'] : this.KNOCKOUT_PHASES;
    return ids.map((phase, r) => {
      const size = Math.pow(2, ids.length - 1 - r);
      const found = this.matchesIn(t, phase);
      const matches = [];
      for (let k = 0; k < size; k++) matches.push(found[k] || { id: `${phase}_${k + 1}`, phase, slot: k, a: null, b: null, result: null, pending: true });
      return { phase, name: this.PHASE_NAMES[phase], matches };
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Group standings                                                    */
  /* ------------------------------------------------------------------ */

  _pts(result, side) {
    if (result === 'draw') return this.DRAW_POINTS;
    return result === side ? this.WIN_POINTS : 0;
  },

  // Rows for group g, best first: { entrant, p, w, d, l, pts, pos }.
  // Tiebreaks: points, then head-to-head points between the tied entrants, then the
  // strength of what you scored (each beaten opponent's points, half for a draw),
  // then the drawing of lots made when the tournament began. Before any game the
  // table keeps the draw order (the player first in its group).
  standings(t, g) {
    const ids = t.groups[g];
    const games = t.matches.filter(m => m.group === g && m.result);
    const row = {};
    for (const e of ids) row[e] = { entrant: e, p: 0, w: 0, d: 0, l: 0, pts: 0, sb: 0, h2h: 0 };
    for (const m of games) {
      for (const [me, side] of [[m.a, 'a'], [m.b, 'b']]) {
        const r = row[me];
        r.p++;
        if (m.result === 'draw') r.d++;
        else if (m.result === side) r.w++;
        else r.l++;
        r.pts += this._pts(m.result, side);
      }
    }
    for (const m of games) {
      if (m.result === 'draw') {
        row[m.a].sb += row[m.b].pts / 2;
        row[m.b].sb += row[m.a].pts / 2;
      } else {
        row[this.winner(m)].sb += row[this.loser(m)].pts;
      }
    }
    // Head-to-head among entrants level on points.
    for (const m of games) {
      if (row[m.a].pts !== row[m.b].pts) continue;
      row[m.a].h2h += this._pts(m.result, 'a');
      row[m.b].h2h += this._pts(m.result, 'b');
    }
    const rows = ids.map(e => row[e]);
    // Before any game is played the table keeps the order of the draw.
    if (games.length) rows.sort((x, y) => y.pts - x.pts || y.h2h - x.h2h || y.sb - x.sb || t.entrants[x.entrant].lot - t.entrants[y.entrant].lot);
    rows.forEach((r, i) => { r.pos = i + 1; });
    return rows;
  },

  groupDone(t, g) {
    return t.matches.filter(m => m.group === g && m.result).length === 6;
  },

  // Top two of each group: [[winner, runner-up] x 4].
  qualifiers(t) {
    return t.groups.map((_, g) => this.standings(t, g).slice(0, 2).map(r => r.entrant));
  },

  /* ------------------------------------------------------------------ */
  /*  Playing                                                            */
  /* ------------------------------------------------------------------ */

  // Chance that `a` beats `b` on strength (a level is about 110 Elo).
  expected(la, lb) {
    return 1 / (1 + Math.pow(10, -(la - lb) * 0.28));
  },

  // Plays out a match the player is not in. Knockout draws go to a decider.
  simulate(t, m) {
    if (m.result) return m.result;
    const rand = this.streamFor(t.seed, `${m.id}#${m.replays || 0}`);
    const la = t.entrants[m.a].level, lb = t.entrants[m.b].level;
    const e = this.expected(la, lb);
    const draw = 0.06 + 0.22 * (1 - Math.abs(2 * e - 1));
    const x = rand();
    let result;
    if (x < e - draw / 2) result = 'a';
    else if (x < e + draw / 2) result = 'draw';
    else result = 'b';
    if (result === 'draw' && m.group === null) result = rand() < e ? 'a' : 'b';
    m.result = result;
    return result;
  },

  // Records the player's game ('win' | 'loss' | 'draw') and plays the rest of the
  // phase. Returns what happened: { event, phase, match, replay }
  //   event: 'result' (a group game), 'replay' (drawn knockout game), 'advance'
  //   (through to the next round), 'out', 'champion'.
  recordPlayer(t, result) {
    const m = this.playerMatch(t);
    if (!m) return null;
    const phase = m.phase;
    const mine = m.a === 0 ? 'a' : 'b';
    const theirs = mine === 'a' ? 'b' : 'a';
    if (result === 'draw' && m.group === null) {
      m.replays = (m.replays || 0) + 1;
      return { event: 'replay', phase, match: m.id, replay: true };
    }
    m.result = result === 'win' ? mine : result === 'loss' ? theirs : 'draw';
    return this._finishPhase(t, phase, m);
  },

  _finishPhase(t, phase, m) {
    for (const x of this.matchesIn(t, phase)) if (!x.result) this.simulate(t, x);
    const info = { event: 'result', phase, match: m ? m.id : null, replay: false };
    if (phase === 'final') {
      t.champion = this.winner(this.matchesIn(t, 'final')[0]);
      if (t.champion === 0) { t.status = 'champion'; info.event = 'champion'; }
      else if (m) { t.status = 'out'; t.outAt = 'final'; info.event = 'out'; }
      t.phase = this.phases(t).length;
      return info;
    }
    if (m && m.group === null && this.winner(m) !== 0) {
      t.status = 'out';
      t.outAt = phase;
      info.event = 'out';
    }
    t.phase++;
    this._startPhase(t);
    if (phase === 'md3' && !this.qualifiers(t)[this.playerGroup(t)].includes(0)) {
      t.status = 'out';
      t.outAt = 'group';
      info.event = 'out';
    } else if (t.status === 'playing' && (m && m.group === null || phase === 'md3')) {
      info.event = 'advance';
    }
    if (t.status === 'out') this.playOut(t);
    return info;
  },

  // Once the player is out, the rest of the tournament is simulated to a champion.
  playOut(t) {
    let guard = 10;
    while (t.phase < this.phases(t).length && guard--) {
      const phase = this.phaseId(t);
      if (phase === 'final') {
        this.simulate(t, this.matchesIn(t, 'final')[0]);
        t.champion = this.winner(this.matchesIn(t, 'final')[0]);
        t.phase++;
        break;
      }
      for (const x of this.matchesIn(t, phase)) this.simulate(t, x);
      t.phase++;
      this._startPhase(t);
    }
  },

  // How many games the player has won in this tournament.
  playerWins(t) {
    return t.matches.filter(m => this.hasPlayer(m) && this.winner(m) === 0).length;
  },

  // The player's games so far, oldest first: [{ match, opponent, result: 'win'|'loss'|'draw' }].
  playerHistory(t) {
    return t.matches.filter(m => this.hasPlayer(m) && m.result).map(m => ({
      match: m,
      opponent: t.entrants[m.a === 0 ? m.b : m.a],
      result: m.result === 'draw' ? 'draw' : this.winner(m) === 0 ? 'win' : 'loss',
    }));
  },
};

if (typeof module !== 'undefined') module.exports = Tournament;
