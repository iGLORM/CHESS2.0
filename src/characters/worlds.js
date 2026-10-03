// The eleven worlds of the Shattered Board, in journey order. Each holds one or
// more story stages; a world's `art` is the theme (board, pieces, background,
// song) its fights use. Where each world stands on the world map is set by the map
// scene (`places` in src/themes/scenes/worldmap.js).
const WORLDS = [
  { id: 'pawnhollow', name: 'Pawn Hollow', art: 'pawnhollow', stages: [1] },
  { id: 'trainingcamp', name: 'The Training Camp', art: 'trainingcamp', stages: [2, 3, 4, 5, 6] },
  { id: 'slantedsands', name: 'The Slanted Sands', art: 'slantedsands', stages: [7] },
  { id: 'ironkeep', name: 'The Iron Keep', art: 'ironkeep', stages: [8] },
  { id: 'mistymoors', name: 'The Misty Moors', art: 'mistymoors', stages: [9] },
  { id: 'royalpalace', name: 'The Royal Palace', art: 'royalpalace', stages: [10] },
  { id: 'clockworkcitadel', name: 'The Clockwork Citadel', art: 'clockworkcitadel', stages: [11] },
  { id: 'grandlibrary', name: 'The Grand Library', art: 'grandlibrary', stages: [12] },
  { id: 'forkedgulch', name: 'Forked Gulch', art: 'forkedgulch', stages: [13] },
  { id: 'obsidiancourt', name: 'The Obsidian Court', art: 'obsidiancourt', stages: [14] },
  // The final fight keeps the original hand-painted Soulbound art (ThemeManager.EXTRA_BACKDROPS).
  { id: 'soulboundpixel', name: 'Soulbound Pixel', art: 'crystal', stages: [15], fightBackdrop: 'crystal_classic' },
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
    // On a New Game+ run the final stage counts once that run is won.
    const finished = save.ngPlus ? !!save.ngCleared : !!save.completed;
    return stage < (save.maxUnlockedLevel || 1) || (stage === STORY_STAGES.length && finished);
  },

  // A new save sees no world until Pawnie (stage 1) is beaten: that game cannot be
  // surrendered, and the save reopens straight on it.
  firstFightPending(save) {
    return !!save && !!save.difficultyTier && !save.ngPlus && !save.completed && !this.isBeaten(save, 1);
  },

  isUnlocked(save, stage) {
    if (typeof SuperUser !== 'undefined' && SuperUser.active()) return true;
    return stage <= ((save && save.maxUnlockedLevel) || 1) && !this.roadBlock(save, stage);
  },

  // What blocks the road to a stage you have reached: a wandering rival, or the
  // Arena before the Obsidian Court (SideContent). Null once beaten, on New Game+,
  // or for stages without a block.
  roadBlock(save, stage) {
    if (typeof SideContent === 'undefined' || !save || save.ngPlus) return null;
    if (this.isBeaten(save, stage)) return null;
    return SideContent.roadBlock(save, stage);
  },

  // The Great Board broke into four fragments: yours (handed back after training),
  // then the EndGamer's, Checkmate's and Grandmaster X's. The other guardians hold
  // keepsakes (src/characters/keepsakes.js).
  FRAGMENT_STAGES: [6, 12, 14, 15],
  FRAGMENT_COUNT: 4,

  hasFragment(stage) {
    return this.FRAGMENT_STAGES.includes(stage);
  },

  fragments(save) {
    if (save && save.ngPlus) return this.FRAGMENT_COUNT;   // the board is whole on a New Game+ run
    return this.FRAGMENT_STAGES.filter(s => this.isBeaten(save, s)).length;
  },

  // A world is restored once its last stage is beaten (Pawn Hollow never broke).
  isRestored(save, world) {
    if (world.id === 'pawnhollow' || (save && save.ngPlus)) return true;
    return this.isBeaten(save, world.stages[world.stages.length - 1]);
  },
};
