class Keybindings {
  static DEFAULTS = {
    p1: {
      select: 'mouse',
      cancel: 'Escape',
      undo: 'z',
    },
    p2: {
      select: 'mouse',
      cancel: 'Escape',
    },
  };

  static getBindings(player) {
    const saved = store.get('controls');
    return saved[player] || this.DEFAULTS[player];
  }

  static setBinding(player, action, key) {
    const saved = store.get('controls');
    if (!saved[player]) saved[player] = { ...this.DEFAULTS[player] };
    saved[player][action] = key;
    store.set('controls', saved);
    store.saveProgress();
  }
}
