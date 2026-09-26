// The eleven worlds of the Shattered Board, in journey order. Each holds one or
// more story stages; a world's `art` is the theme (board, pieces, background,
// song) its fights and map node use. `pos` is the node's
// place on the world map (map coordinates), `r` its radius.
const WORLDS = [
  { id: 'pawnhollow', name: 'Pawn Hollow', art: 'pawnhollow', stages: [1], pos: [190, 300], r: 70 },
  { id: 'trainingcamp', name: 'The Training Camp', art: 'trainingcamp', stages: [2, 3, 4, 5, 6], pos: [560, 130], r: 64 },
  { id: 'slantedsands', name: 'The Slanted Sands', art: 'slantedsands', stages: [7], pos: [920, 160], r: 70 },
  { id: 'ironkeep', name: 'The Iron Keep', art: 'ironkeep', stages: [8], pos: [1230, 330], r: 70 },
  { id: 'mistymoors', name: 'The Misty Moors', art: 'mistymoors', stages: [9], pos: [1540, 160], r: 70 },
  { id: 'royalpalace', name: 'The Royal Palace', art: 'royalpalace', stages: [10], pos: [1850, 330], r: 70 },
  { id: 'clockworkcitadel', name: 'The Clockwork Citadel', art: 'clockworkcitadel', stages: [11], pos: [2160, 160], r: 70 },
  { id: 'grandlibrary', name: 'The Grand Library', art: 'grandlibrary', stages: [12], pos: [2470, 330], r: 70 },
  { id: 'forkedgulch', name: 'Forked Gulch', art: 'forkedgulch', stages: [13], pos: [2780, 160], r: 70 },
  { id: 'obsidiancourt', name: 'The Obsidian Court', art: 'obsidiancourt', stages: [14], pos: [3090, 330], r: 70 },
  { id: 'soulboundpixel', name: 'Soulbound Pixel', art: 'crystal', stages: [15], pos: [3420, 230], r: 88 },
];

// Each story character fights in its world's theme.
for (const world of WORLDS) {
  for (const stage of world.stages) {
    const ch = STORY_STAGES[stage - 1];
    ch.theme = world.art;
    ch.world = world;
  }
}

const StoryProgress = {
  // Stage numbers a save has beaten.
  isBeaten(save, stage) {
    if (!save) return false;
    return stage < (save.maxUnlockedLevel || 1) || (stage === STORY_STAGES.length && !!save.completed);
  },

  isUnlocked(save, stage) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    return stage <= ((save && save.maxUnlockedLevel) || 1);
  },

  // Fragments of the Great Board held: Pawnie's (after training) plus one per guardian.
  fragments(save) {
    let n = this.isBeaten(save, 6) ? 1 : 0;
    for (let s = 7; s <= STORY_STAGES.length; s++) if (this.isBeaten(save, s)) n++;
    return n;
  },

  // A world is restored once its last stage is beaten (Pawn Hollow never broke).
  isRestored(save, world) {
    if (world.id === 'pawnhollow') return true;
    return this.isBeaten(save, world.stages[world.stages.length - 1]);
  },
};
