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
  STARTING_MATERIAL: 39,
  LOW_HEALTH_THRESHOLD: 0.6,

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

  onCapture(capturingColor, capturedPiece, aiColor, board) {
    if (!this._active) return;
    const pieceName = capturedPiece ? (capturedPiece.type || 'piece') : 'piece';
    const ctx = { piece: pieceName };
    if (board) {
      ctx.myPieces = this._countPieces(board, aiColor);
      ctx.theirPieces = this._countPieces(board, aiColor === 'white' ? 'black' : 'white');
    }
    if (capturingColor === aiColor) {
      this._tryShow('bossCapture', ctx);
    } else {
      this._tryShow('playerCapture', ctx);
    }
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

  onMoveComplete(moveNumber, board, aiColor) {
    if (!this._active) return;
    const ctx = { moveNum: moveNumber };
    if (board) {
      ctx.myPieces = this._countPieces(board, aiColor);
      ctx.theirPieces = this._countPieces(board, aiColor === 'white' ? 'black' : 'white');
    }
    if (moveNumber === 10 && !this._triggeredMilestones.has(10)) {
      this._triggeredMilestones.add(10);
      this._tryShow('milestone', ctx);
      return;
    }
    if (moveNumber === 20 && !this._triggeredMilestones.has(20)) {
      this._triggeredMilestones.add(20);
      this._tryShow('milestone', ctx);
      return;
    }
    if (board) this._checkMaterial(board, aiColor);
  },

  onAIThinkStart(board, aiColor) {
    if (!this._active) return;
    if (this._thinkTimer) clearTimeout(this._thinkTimer);
    const ctx = {};
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

  _checkMaterial(board, aiColor) {
    const playerColor = aiColor === 'white' ? 'black' : 'white';
    let bossMat = 0;
    let playerMat = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board.grid[r][c];
        if (!piece || piece.type === 'king') continue;
        const val = this.MATERIAL_VALUES[piece.type] || 0;
        if (piece.color === aiColor) bossMat += val;
        else if (piece.color === playerColor) playerMat += val;
      }
    }

    const ctx = {
      myPieces: this._countPieces(board, aiColor),
      theirPieces: this._countPieces(board, playerColor),
      advantage: bossMat - playerMat,
    };

    if (!this._lowHealthTriggered && bossMat < this.STARTING_MATERIAL * this.LOW_HEALTH_THRESHOLD) {
      this._lowHealthTriggered = true;
      this._tryShow('lowHealth', ctx);
    } else if (!this._playerLowHealthTriggered && playerMat < this.STARTING_MATERIAL * this.LOW_HEALTH_THRESHOLD) {
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
      bossCheck: 3000,
      playerCheck: 3000,
      bossTaunt: 8000,
      milestone: 0,
      lowHealth: 0,
    };
    const now = Date.now();
    const cooldownMs = cooldowns[category] != null ? cooldowns[category] : this._cooldownMs;
    if (now - (this._lastShownTimes[category] || 0) < cooldownMs) return;

    let line = this._pickLine(gd[category], category);
    if (!line) return;

    if (context) {
      line = line.replace(/\{piece\}/g, context.piece || 'piece');
      line = line.replace(/\{myPieces\}/g, String(context.myPieces || '?'));
      line = line.replace(/\{theirPieces\}/g, String(context.theirPieces || '?'));
      line = line.replace(/\{moveNum\}/g, String(context.moveNum || '?'));
      line = line.replace(/\{advantage\}/g, String(context.advantage || 0));
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
