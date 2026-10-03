// Great Board mode (unlocked by finishing the story): one match on a board split
// into four quarters, each carrying a guardian's rule. The quarters and their rules
// are picked at random every game. GreatBoard.make() returns a rule object that
// GameScreen, BossRules and PixiBossFX read like any Boss Rule; region lookups go
// through GreatBoard.regionAt(rule, row, col).
const GreatBoard = {
  // The rules a quarter can carry.
  REGIONS: {
    mist: { name: 'The Misty Moors', short: 'Mist', world: 'mistymoors', color: '#7fa8c0',
      text: 'Mist hides his pieces here, unless your pieces can see them.' },
    gears: { name: 'The Clockwork Citadel', short: 'Gears', world: 'clockworkcitadel', color: '#e0a848',
      text: 'Two gear walls stand here. Lose a challenge here and the square locks for 3 turns.' },
    iron: { name: 'The Iron Keep', short: 'Iron', world: 'ironkeep', color: '#b8bcc8',
      text: 'Every capture here starts a challenge.' },
    forks: { name: 'Forked Gulch', short: 'Forks', world: 'forkedgulch', color: '#e07848',
      text: 'A capture here by a piece that forks two of queen, rook, bishop or knight takes both, for either side.' },
    sands: { name: 'The Slanted Sands', short: 'Calm', world: 'slantedsands', color: '#f0d078',
      text: 'The sands are calm: captures here never start a challenge.' },
  },

  // The four quarters of the board, in board rows (0 = rank 8) and columns (0 = a-file).
  QUARTERS: [
    { id: 'nw', label: 'a5-d8', rows: [0, 3], cols: [0, 3] },
    { id: 'ne', label: 'e5-h8', rows: [0, 3], cols: [4, 7] },
    { id: 'sw', label: 'a1-d4', rows: [4, 7], cols: [0, 3] },
    { id: 'se', label: 'e1-h4', rows: [4, 7], cols: [4, 7] },
  ],

  // A fresh Great Board: four different region rules on the four quarters.
  // `random` is injectable for tests.
  make(random = Math.random) {
    const ids = Object.keys(this.REGIONS);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const regions = this.QUARTERS.map((q, i) => ({ ...q, rule: ids[i] }));
    const rule = {
      title: 'The Great Board',
      lines: regions.map(r => `${this.REGIONS[r.rule].short} (${r.label}): ${this.REGIONS[r.rule].text}`),
      greatBoard: true,
      regions,
    };
    // Gear walls: two on the quarter's middle ranks (3-6), which are empty at the start.
    const gears = regions.find(r => r.rule === 'gears');
    if (gears) {
      const spots = [];
      for (let row = Math.max(2, gears.rows[0]); row <= Math.min(5, gears.rows[1]); row++) {
        for (let col = gears.cols[0]; col <= gears.cols[1]; col++) spots.push({ row, col });
      }
      rule.walls = [];
      while (rule.walls.length < 2 && spots.length) rule.walls.push(spots.splice(Math.floor(random() * spots.length), 1)[0]);
      rule.lockPlies = 4;
    }
    if (regions.some(r => r.rule === 'mist')) rule.fog = true;
    return rule;
  },

  // The region rule id at a square, or null (also for non-Great-Board rules).
  regionAt(rule, row, col) {
    if (!rule || !rule.regions) return null;
    const r = rule.regions.find(q => row >= q.rows[0] && row <= q.rows[1] && col >= q.cols[0] && col <= q.cols[1]);
    return r ? r.rule : null;
  },

  // Is a square under mist (for the fog of war)?
  misted(rule, row, col) {
    return this.regionAt(rule, row, col) === 'mist';
  },

  // Bot strengths offered on the setup screen (AI levels 0-12).
  LEVELS: [
    { name: 'Easy', level: 3 },
    { name: 'Normal', level: 6 },
    { name: 'Hard', level: 9 },
    { name: 'Master', level: 12 },
  ],

  unlocked() {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    return (store.get('storySaves') || []).some(save => save && save.completed);
  },
};

if (typeof module !== 'undefined') module.exports = GreatBoard;
