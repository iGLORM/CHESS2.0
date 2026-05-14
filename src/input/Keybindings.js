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

  static getConflicts(player, action, key) {
    const conflicts = [];
    const saved = store.get('controls');
    const players = ['p1', 'p2'];
    for (const p of players) {
      const bindings = saved[p] || this.DEFAULTS[p];
      for (const act in bindings) {
        if (p === player && act === action) continue;
        if (bindings[act] === key) {
          conflicts.push({ player: p, action: act });
        }
      }
    }
    return conflicts;
  }

  static setBinding(player, action, key) {
    const saved = store.get('controls');
    // Clear any conflicting bindings
    const conflicts = this.getConflicts(player, action, key);
    for (const conflict of conflicts) {
      if (!saved[conflict.player]) saved[conflict.player] = { ...this.DEFAULTS[conflict.player] };
      saved[conflict.player][conflict.action] = null;
    }
    if (!saved[player]) saved[player] = { ...this.DEFAULTS[player] };
    saved[player][action] = key;
    store.set('controls', saved);
    store.saveProgress();
  }
}
