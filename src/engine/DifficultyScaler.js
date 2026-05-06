const DIFFICULTY_TIERS = {
  rookie:       { label: 'Rookie',       elo: '<400',     minAi: 1, maxAi: 2,  desc: 'Gentle introduction to the game' },
  beginner:     { label: 'Beginner',     elo: '400-800',   minAi: 1, maxAi: 4,  desc: 'Learning the ropes' },
  intermediate: { label: 'Intermediate', elo: '800-1200',  minAi: 2, maxAi: 6,  desc: 'Solid fundamentals' },
  advanced:     { label: 'Advanced',     elo: '1200-1600', minAi: 3, maxAi: 8,  desc: 'Tactical challenges await' },
  expert:       { label: 'Expert',       elo: '1600-2000', minAi: 5, maxAi: 10, desc: 'The ultimate test' },
  madness:      { label: 'Madness',      elo: '???',       minAi: 8, maxAi: 12, desc: 'Impossible opponents' },
};

const DifficultyScaler = {
  TIER_CONFIG: DIFFICULTY_TIERS,

  getAiLevel(tier, characterLevel) {
    const config = DIFFICULTY_TIERS[tier];
    if (!config) return 1;
    const step = (config.maxAi - config.minAi) / 9;
    const aiLevel = config.minAi + Math.floor((characterLevel - 1) * step);
    return Math.max(config.minAi, Math.min(config.maxAi, aiLevel));
  },

  getTierLabel(tier) {
    return DIFFICULTY_TIERS[tier]?.label || tier;
  },

  getTierElo(tier) {
    return DIFFICULTY_TIERS[tier]?.elo || '';
  },
};
