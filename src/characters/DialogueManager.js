const DialogueManager = {
  _cooldownMs: 8000,
  _lastShownTime: 0,
  _lastShownTimes: {},
  _usedLines: new Set(),
  _character: null,
  _active: false,
  _onShow: null,
  _thinkTimer: null,
  _triggeredMilestones: new Set(),
  _lowHealthTriggered: false,
  _playerLowHealthTriggered: false,

  MATERIAL_VALUES: { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 },
  LOW_HEALTH_THRESHOLD: 0.6,
  MIN_GAP_MS: 2500,   // between any two bubbles, so a capture that checks says one thing

  init(character, onShowCallback) {
    this._character = character;
    this._onShow = onShowCallback;
    this._active = true;
    this._lastShownTime = 0;
    this._lastShownTimes = {};
    this._usedLines = new Set();
    this._thinkTimer = null;
    this._triggeredMilestones = new Set();
    this._lowHealthTriggered = false;
    this._playerLowHealthTriggered = false;
    this._startMaterial = null;
    this._moveNum = 0;
  },

  destroy() {
    this._active = false;
    this._character = null;
    this._onShow = null;
    if (this._thinkTimer) {
      clearTimeout(this._thinkTimer);
      this._thinkTimer = null;
    }
    this._usedLines.clear();
    this._triggeredMilestones.clear();
    this._lowHealthTriggered = false;
    this._playerLowHealthTriggered = false;
  },

  onGameStart() {
    this._tryShow('gameStart');
  },

  // A story twist just happened (doubleTake, clockLow, lock, eyes, mystery...).
  onTwist(category, context) {
    this._tryShow(category, context);
  },

  onCapture(capturingColor, capturedPiece, aiColor, board) {
    if (!this._active) return;
    const pieceName = capturedPiece ? (capturedPiece.type || 'piece') : 'piece';
    const ctx = { piece: pieceName };
    if (board) {
      ctx.myPieces = this._countPieces(board, aiColor);
      ctx.theirPieces = this._countPieces(board, aiColor === 'white' ? 'black' : 'white');
    }
    // Queens and rooks get their own lines where a character has them.
    const big = pieceName === 'queen' || pieceName === 'rook';
    const gd = (this._character && this._character.gameDialogue) || {};
    const category = capturingColor === aiColor ? 'bossCapture' : 'playerCapture';
    this._tryShow(big && gd[category + 'Big'] ? category + 'Big' : category, ctx);
  },

  onCheck(checkedColor, aiColor, board) {
    if (!this._active) return;
    const ctx = {};
    if (board) {
      ctx.myPieces = this._countPieces(board, aiColor);
      ctx.theirPieces = this._countPieces(board, aiColor === 'white' ? 'black' : 'white');
    }
    if (checkedColor !== aiColor) {
      this._tryShow('bossCheck', ctx);
    } else {
      this._tryShow('playerCheck', ctx);
    }
  },

  // `plies` counts half-moves; lines talk about full moves.
  onMoveComplete(plies, board, aiColor) {
    if (!this._active) return;
    const moveNumber = Math.ceil(plies / 2);
    this._moveNum = moveNumber;
    // Each side's own army at the start (story fights often begin uneven or in an endgame).
    if (board && !this._startMaterial) {
      const first = this._material(board, aiColor);
      this._startMaterial = { boss: Math.max(first.boss, 1), player: Math.max(first.player, 1) };
    }
    const ctx = { moveNum: moveNumber };
    if (board) {
      ctx.myPieces = this._countPieces(board, aiColor);
      ctx.theirPieces = this._countPieces(board, aiColor === 'white' ? 'black' : 'white');
    }
    for (const at of [10, 20]) {
      if (moveNumber === at && plies % 2 === 0 && !this._triggeredMilestones.has(at)) {
        this._triggeredMilestones.add(at);
        this._tryShow('milestone', ctx);
        return;
      }
    }
    if (board) this._checkMaterial(board, aiColor);
  },

  onAIThinkStart(board, aiColor) {
    if (!this._active) return;
    if (this._thinkTimer) clearTimeout(this._thinkTimer);
    const ctx = { moveNum: Math.max(1, this._moveNum || 1) };
    if (board) {
      ctx.myPieces = this._countPieces(board, aiColor);
      ctx.theirPieces = this._countPieces(board, aiColor === 'white' ? 'black' : 'white');
    }
    this._thinkTimer = setTimeout(() => {
      this._tryShow('bossTaunt', ctx);
      this._thinkTimer = null;
    }, 3000);
  },

  onAIThinkEnd() {
    if (this._thinkTimer) {
      clearTimeout(this._thinkTimer);
      this._thinkTimer = null;
    }
  },

  _material(board, aiColor) {
    const total = { boss: 0, player: 0 };
    for (const row of board.grid) {
      for (const piece of row) {
        if (!piece || piece.type === 'king') continue;
        const val = this.MATERIAL_VALUES[piece.type] || 0;
        if (piece.color === aiColor) total.boss += val;
        else if (piece.color !== 'none') total.player += val;
      }
    }
    return total;
  },

  // "Losing" lines fire once a side has lost 40% of what it started with,
  // and only while the other side is actually ahead.
  _checkMaterial(board, aiColor) {
    const playerColor = aiColor === 'white' ? 'black' : 'white';
    const now = this._material(board, aiColor);
    const start = this._startMaterial || now;
    const ctx = {
      myPieces: this._countPieces(board, aiColor),
      theirPieces: this._countPieces(board, playerColor),
      advantage: now.boss - now.player,
    };
    const bossLow = now.boss < start.boss * this.LOW_HEALTH_THRESHOLD && now.boss < now.player;
    const playerLow = now.player < start.player * this.LOW_HEALTH_THRESHOLD && now.player < now.boss;
    if (!this._lowHealthTriggered && bossLow) {
      this._lowHealthTriggered = true;
      this._tryShow('lowHealth', ctx);
    } else if (!this._playerLowHealthTriggered && playerLow) {
      this._playerLowHealthTriggered = true;
      this._tryShow('playerLowHealth', ctx);
    }
  },

  _countPieces(board, color) {
    let count = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board.grid[r][c];
        if (p && p.color === color) count++;
      }
    return count;
  },

  _tryShow(category, context) {
    if (!this._active || !this._character || !this._onShow) return;
    const gd = this._character.gameDialogue;
    if (!gd || !gd[category]) return;

    const cooldowns = {
      gameStart: 0,
      bossCapture: 5000,
      playerCapture: 5000,
      bossCaptureBig: 0,
      playerCaptureBig: 0,
      bossCheck: 3000,
      playerCheck: 3000,
      bossTaunt: 8000,
      milestone: 0,
      lowHealth: 0,
    };
    const now = Date.now();
    const cooldownMs = cooldowns[category] != null ? cooldowns[category] : this._cooldownMs;
    if (now - (this._lastShownTimes[category] || 0) < cooldownMs) return;
    // Twist reactions and the opening line always get through; the rest wait their turn.
    const urgent = category === 'gameStart' || !(category in cooldowns) && category !== 'playerLowHealth';
    if (!urgent && now - this._lastShownTime < this.MIN_GAP_MS) return;

    let line = this._pickLine(gd[category], category);
    if (!line) return;

    if (context) {
      line = line.replace(/\{piece\}/g, context.piece || 'piece');
      line = line.replace(/\{myPieces\}/g, String(context.myPieces || '?'));
      line = line.replace(/\{theirPieces\}/g, String(context.theirPieces || '?'));
      line = line.replace(/\{moveNum\}/g, String(context.moveNum || '?'));
      line = line.replace(/\{advantage\}/g, String(context.advantage || 0));
      line = line.replace(/\{left\}/g, String(context.left != null ? context.left : '?'));
    }

    this._lastShownTimes[category] = now;
    this._lastShownTime = now;
    this._onShow(line, this._character);
  },

  _pickLine(lines, category) {
    const unused = lines.filter((l, i) => !this._usedLines.has(category + i));
    if (unused.length > 0) {
      const idx = Math.floor(Math.random() * unused.length);
      const picked = unused[idx];
      const origIdx = lines.indexOf(picked);
      this._usedLines.add(category + origIdx);
      return picked;
    }
    return lines[Math.floor(Math.random() * lines.length)];
  },
};
