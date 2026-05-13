const PixiPremiumAssets = {
  basePath: '../assets/textures/premium/',
  cache: new Map(),
  images: new Map(),
  preloadPromise: null,
  files: [
    'premium_home_hero.png',
    'premium_bg_artdeco.png',
    'premium_bg_crystal.png',
    'premium_bg_custom.png',
    'premium_bg_cyberpunk.png',
    'premium_bg_egypt.png',
    'premium_bg_japanese.png',
    'premium_bg_medieval.png',
    'premium_bg_ocean.png',
    'premium_bg_prehistoric.png',
    'premium_bg_space.png',
    'premium_bg_steampunk.png',
    'premium_bg_wildwest.png',
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
    'premium_icon_back.png',
    'premium_icon_lock.png',
    'premium_icon_play.png',
    'premium_icon_progress.png',
    'premium_icon_save.png',
    'premium_icon_settings.png',
    'premium_icon_spark.png',
    'premium_minigame_barBalance.png',
    'premium_minigame_coinFlip.png',
    'premium_minigame_dodgeFalling.png',
    'premium_minigame_memoryMatch.png',
    'premium_minigame_numberGuess.png',
    'premium_minigame_patternPress.png',
    'premium_minigame_powerMeter.png',
    'premium_minigame_quickClick.png',
    'premium_minigame_reactionTest.png',
    'premium_minigame_rhythmTap.png',
    'premium_minigame_shieldBlock.png',
    'premium_minigame_targetPractice.png',
    'premium_minigame_timingStrike.png',
    'premium_minigame_undertaleDodge.png',
    'premium_minigame_whackMole.png',
    'premium_theme_artdeco.png',
    'premium_theme_crystal.png',
    'premium_theme_custom.png',
    'premium_theme_cyberpunk.png',
    'premium_theme_egypt.png',
    'premium_theme_japanese.png',
    'premium_theme_medieval.png',
    'premium_theme_ocean.png',
    'premium_theme_prehistoric.png',
    'premium_theme_space.png',
    'premium_theme_steampunk.png',
    'premium_theme_wildwest.png',
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
    return this.texture(`premium_character_${id}.png`);
  },

  characterCard(id) {
    return this.texture(`premium_character_card_${id}.png`);
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
