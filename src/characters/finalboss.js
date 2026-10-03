// Grandmaster X Unbound: the last fight of the story. Beaten three times, Grandmaster
// X will not accept it: he tears every guardian's power out of the worlds (the
// 'ascension' scene, story.js) and plays you once more on the Great Board itself,
// with all their rules at once. Only this win finishes the story (save.completed),
// gives the last fragment and plays the ending.
//
// It is a side match (SideMatches): GameScreen starts it from the Continue button
// after a win over Grandmaster X, and the Soulbound Pixel map starts it again while
// it is pending (save.unbound and not finished). Pawnie's plain chess is the only
// rule he leaves out; the EndGamer's endgame start would replace the whole board,
// so the EndGamer gives him nothing either.
const FinalBoss = {
  ID: 'final_unbound',

  RULE: {
    title: 'Every Power',
    lines: [
      'He stole every guardian\'s power: four bishops and two queens for him, no rooks for you, the mist, the gear walls, double takes, and every capture a challenge he plays at full strength.',
      'Checkmate him within 40 of your moves, or the board stays broken.',
    ],
    twisted: true,
    // Bish-Bosh's bishops, Queenie's corner queen; Rook-E takes your rooks.
    fen: 'qbbqkbbr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBN1 w - - 0 1',
    fog: true,                                                    // the Knight of the Mist
    walls: [{ row: 4, col: 2 }, { row: 4, col: 5 }, { row: 3, col: 2 }, { row: 3, col: 5 }],   // Castle
    lockPlies: 4,
    doubleTake: true,                                             // ForkMaster
    moveLimit: 40,                                                // Checkmate's hourglass
    everyCapture: true,                                           // his own
    alwaysChallengeWhenTaking: ['rook'],
    bossChallengeChance: 0.6,
    maxBotSkill: true,
    weakestGames: true,
    tenseMusic: true,
    signature: ['LavaTilt', 'RookStack', 'SiegeCannon', 'KnightCollapse', 'TimingStrike', 'ShieldBlock', 'ReactionTest', 'CheckmateRun'],
  },

  // A save waiting for the last fight: Grandmaster X beaten, the story not finished.
  pending(save) {
    return !!(save && save.unbound && !save.completed);
  },

  def() {
    const gmx = STORY_STAGES.find(c => c.id === 'grandmasterx');
    const def = {
      id: this.ID,
      name: 'Grandmaster X',
      title: 'Unbound',
      level: gmx.level,
      theme: 'greatboard',
      colors: gmx.colors,
      face: 'grandmasterx',
      piece: 'king',
      personality: gmx.personality,
      rule: this.RULE,
      kicker: 'THE GREAT BOARD  ·  THE LAST GAME',
      winTitle: 'The Board Is Free!',
      dialogue: {
        before: 'Every rule they ever had is mine now. Forty moves, on the board I broke. Win, and it is yours. Lose, and it stays broken forever.',
        after: 'No... the powers are leaving me. Going home. I can feel the worlds pulling them back...',
        win: 'You see? Nobody crosses. Nobody ever crosses. Get up and try again, if you dare.',
      },
      gameDialogue: {
        gameStart: ['Every power in the world, against one small king.', 'The board I broke. A fitting place for you to fall.'],
        bossCapture: ['Your {piece}. Stolen like everything else.', 'Your {piece}, gone. I have all their tricks now.'],
        playerCapture: ['My {piece}?! That power was mine!', 'You took my {piece}. It means nothing. I have more.'],
        bossCheck: ['Check. Every guardian is checking you at once.', 'Check. Feel all of them.'],
        playerCheck: ['Check?! No. No, no, no.', 'You dare check the Unbound?'],
      },
      reward: { coins: 150, stars: 3 },
      once: this.ID,
      returnTo: { screen: 'worldMap' },
      onResult: (result) => this._result(result, def),
    };
    return def;
  },

  // Starts the last game; `scene` plays the ascension first.
  start(scene = true) {
    const save = store.getActiveSave();
    if (save && !save.unbound) {
      store.setActiveSave({ unbound: true });
      store.saveProgress();
    }
    SideMatches.start(this.def(), { scene: scene ? 'ascension' : null });
  },

  // The first win finishes the story: the map plays the last fragment, then the ending
  // and the Credits.
  _result(result, def) {
    const save = store.getActiveSave();
    if (result !== 'win' || !save || save.completed) return;
    const stage = STORY_STAGES.length;
    store.set('storyMapEvent', {
      stage,
      fragment: StoryProgress.hasFragment(stage),
      keepsake: typeof Keepsakes !== 'undefined' && Keepsakes.forGuardian('grandmasterx') ? 'grandmasterx' : null,
    });
    store.set('storyScenePending', 'ending');
    const changes = { completed: true, storyLevel: stage, maxUnlockedLevel: stage };
    store.setActiveSave(changes);
    if (save.difficultyTier === 'expert' && !store.get('madnessUnlocked')) store.set('madnessUnlocked', true);
    def.returnTo = { screen: 'credits', data: { returnTo: 'worldMap' } };
  },
};

// A game restored after the app was closed finds its opponent again.
SideMatches.addResolver('final_', id => (id === FinalBoss.ID ? FinalBoss.def() : null));
