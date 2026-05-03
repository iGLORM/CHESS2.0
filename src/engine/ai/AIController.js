class AIController {
  static LEVEL_CONFIG = {
    1:  { depth: 1, noise: 0.7,  name: 'Beginner' },
    2:  { depth: 1, noise: 0.4,  name: 'Novice' },
    3:  { depth: 2, noise: 0.3,  name: 'Apprentice' },
    4:  { depth: 2, noise: 0.15, name: 'Intermediate' },
    5:  { depth: 3, noise: 0.1,  name: 'Skilled' },
    6:  { depth: 3, noise: 0.05, name: 'Advanced' },
    7:  { depth: 4, noise: 0.0,  name: 'Expert' },
    8:  { depth: 4, noise: 0.0,  name: 'Master' },
    9:  { depth: 5, noise: 0.0,  name: 'Grandmaster' },
    10: { depth: 5, noise: 0.0,  name: 'Chess 2.0' },
  };

  static getMove(board, color, level) {
    const config = this.LEVEL_CONFIG[level] || this.LEVEL_CONFIG[1];

    if (config.noise > 0) {
      return Search.findBestMoveWithNoise(board, color, config.depth, config.noise);
    }
    return Search.findBestMove(board, color, config.depth);
  }
}
