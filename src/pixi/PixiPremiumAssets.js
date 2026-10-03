const PixiPremiumAssets = {
  basePath: '../assets/textures/premium/',
  cache: new Map(),
  images: new Map(),
  preloadPromise: null,
  files: [
    'premium_home_hero.png',
    'premium_bg_chess20.png',
    'premium_bg_pawnhollow.png',
    'premium_bg_trainingcamp.png',
    'premium_bg_slantedsands.png',
    'premium_bg_ironkeep.png',
    'premium_bg_mistymoors.png',
    'premium_bg_royalpalace.png',
    'premium_bg_clockworkcitadel.png',
    'premium_bg_grandlibrary.png',
    'premium_bg_forkedgulch.png',
    'premium_bg_obsidiancourt.png',
    'premium_bg_crystal.png',
    'premium_bg_greatboard.png',
    'premium_bg_custom.png',
    'premium_character_bishbosh.png',
    'premium_character_card_bishbosh.png',
    'premium_character_card_castle.png',
    'premium_character_card_checkmate.png',
    'premium_character_card_endgamer.png',
    'premium_character_card_forkmaster.png',
    'premium_character_card_grandmasterx.png',
    'premium_character_card_knightsade.png',
    'premium_character_card_pawnie.png',
    'premium_character_card_queenie.png',
    'premium_character_card_rokee.png',
    'premium_character_castle.png',
    'premium_character_checkmate.png',
    'premium_character_endgamer.png',
    'premium_character_forkmaster.png',
    'premium_character_grandmasterx.png',
    'premium_character_knightsade.png',
    'premium_character_pawnie.png',
    'premium_character_queenie.png',
    'premium_character_rokee.png',
    'premium_character_captaincapture.png',
    'premium_character_card_captaincapture.png',
    'premium_character_joystick.png',
    'premium_character_card_joystick.png',
    'premium_character_rulekeeper.png',
    'premium_character_card_rulekeeper.png',
    'premium_character_senseitactic.png',
    'premium_character_card_senseitactic.png',
    'premium_character_sergeantsquare.png',
    'premium_character_card_sergeantsquare.png',
    'premium_icon_back.png',
    'premium_icon_lock.png',
    'premium_icon_play.png',
    'premium_icon_progress.png',
    'premium_icon_save.png',
    'premium_icon_settings.png',
    'premium_icon_spark.png',
    'premium_minigame_barBalance.png',
    'premium_minigame_dodgeFalling.png',
    'premium_minigame_memoryMatch.png',
    'premium_minigame_patternPress.png',
    'premium_minigame_powerMeter.png',
    'premium_minigame_reactionTest.png',
    'premium_minigame_rhythmTap.png',
    'premium_minigame_shieldBlock.png',
    'premium_minigame_targetPractice.png',
    'premium_minigame_timingStrike.png',
    'premium_minigame_undertaleDodge.png',
    'premium_minigame_whackMole.png',
    'premium_theme_chess20.png',
    'premium_theme_pawnhollow.png',
    'premium_theme_trainingcamp.png',
    'premium_theme_slantedsands.png',
    'premium_theme_ironkeep.png',
    'premium_theme_mistymoors.png',
    'premium_theme_royalpalace.png',
    'premium_theme_clockworkcitadel.png',
    'premium_theme_grandlibrary.png',
    'premium_theme_forkedgulch.png',
    'premium_theme_obsidiancourt.png',
    'premium_theme_crystal.png',
    'premium_theme_greatboard.png',
    'premium_theme_custom.png',
  ],

  url(name) {
    return `${this.basePath}${name}`;
  },

  _setNearest(texture) {
    if (texture && texture.source) texture.source.scaleMode = 'nearest';
    return texture || PIXI.Texture.EMPTY;
  },

  loadImage(name) {
    if (this.images.has(name)) return Promise.resolve(this.images.get(name));
    return new Promise(resolve => {
      const img = new Image();
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        if (result) this.images.set(name, result);
        resolve(result);
      };
      img.onload = () => finish(img);
      img.onerror = () => finish(null);
      img.src = this.url(name);
      setTimeout(() => finish(img.complete && img.naturalWidth ? img : null), 2500);
    });
  },

  preloadAll() {
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = Promise.all(this.files.map(name => this.loadImage(name)))
      .then(() => {
        for (const name of this.files) {
          try { this.texture(name); } catch (_) {}
        }
      })
      .catch(() => {});
    return this.preloadPromise;
  },

  texture(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const source = this.images.get(name) || this.url(name);
    let texture = PIXI.Texture.EMPTY;
    try {
      texture = PIXI.Texture.from(source);
    } catch (_) {
      texture = PIXI.Texture.EMPTY;
    }
    this.cache.set(name, texture);
    return this._setNearest(texture);
  },

  character(id) {
    if (typeof PixiMinion !== 'undefined' && PixiMinion.isMinion(id)) return PixiMinion.texture(id);
    const face = typeof SideMatches !== 'undefined' && SideMatches.faceOf(id);
    return this.texture(`premium_character_${face || id}.png`);
  },

  // A story character's picture as a sprite: its live pixel art (animated; the
  // close-up face frame when `face`) if it has some, else the still portrait.
  characterSprite(id, face = true) {
    const live = typeof LiveScenes !== 'undefined' && LiveScenes.character(id);
    const sprite = live && LiveScenes.sprite(live, face ? 'face' : '');
    return sprite || new PIXI.Sprite(this.character(id));
  },

  characterCard(id) {
    if (typeof PixiMinion !== 'undefined' && PixiMinion.isMinion(id)) return PixiMinion.texture(id, true);
    const face = typeof SideMatches !== 'undefined' && SideMatches.faceOf(id);
    return this.texture(`premium_character_card_${face || id}.png`);
  },

  theme(id) {
    return this.texture(`premium_theme_${id}.png`);
  },

  background(id) {
    return this.texture(`premium_bg_${id}.png`);
  },

  minigame(key) {
    var cacheKey = `_procedural_minigame_${key}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    if (typeof MiniGameThumbnails !== 'undefined') {
      try {
        var canvas = MiniGameThumbnails.generate(key, 180, 100);
        if (canvas) {
          var tex = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
          this.cache.set(cacheKey, tex);
          return tex;
        }
      } catch (_) {}
    }
    return this.texture(`premium_minigame_${key}.png`);
  },

  icon(name) {
    return this.texture(`premium_icon_${name}.png`);
  },
};
