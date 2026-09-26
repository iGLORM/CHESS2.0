// A fragment of the Great Board: a jagged broken piece of a world's board
// (its own checker colours), with a bevelled glowing rim and a twinkle.
// PixiShard.create(size, themeId) -> Container centred on (0, 0); `size` is
// roughly its radius. Call PixiShard.kill(shard) before destroying it if it
// may still be animating (its twinkle loops forever).
const PixiShard = {
  // Jagged outline: points around a circle with a seeded, uneven radius so
  // every world's shard breaks differently but the same way each time.
  _outline(size, seed) {
    let s = seed;
    const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const pts = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (rand() - 0.5) * 0.35;
      const r = size * (i % 2 ? 0.62 + rand() * 0.2 : 0.9 + rand() * 0.25);
      pts.push(Math.cos(a) * r, Math.sin(a) * r * 1.08);
    }
    return pts;
  },

  _seed(themeId) {
    let h = 7;
    for (const ch of themeId || 'crystal') h = (h * 31 + ch.charCodeAt(0)) % 2147483646;
    return h + 1;
  },

  create(size, themeId = 'crystal', options = {}) {
    const cols = ThemeManager.getTheme(themeId).colors;
    const light = PixiColorUtil.hexToNum(cols.lightSquare);
    const dark = PixiColorUtil.hexToNum(cols.darkSquare);
    const accent = PixiColorUtil.hexToNum(cols.accent);
    const outline = this._outline(size, this._seed(themeId));
    const c = new PIXI.Container();
    c.label = 'shard';

    // Soft glow behind.
    if (options.glow !== false) {
      const glow = new PIXI.Graphics()
        .circle(0, 0, size * 1.6).fill({ color: accent, alpha: 0.12 })
        .circle(0, 0, size * 1.2).fill({ color: 0xffffff, alpha: 0.1 });
      c.addChild(glow);
      c._glow = glow;
    }

    // Drop shadow, then the board surface: a tilted checker pattern cut by the outline.
    c.addChild(new PIXI.Graphics().poly(outline.map((v, i) => v + (i % 2 ? size * 0.12 : size * 0.06))).fill({ color: 0x000000, alpha: 0.45 }));
    const face = new PIXI.Container();
    const checks = new PIXI.Graphics();
    const sq = Math.max(3, size * 0.5);
    for (let r = -4; r < 4; r++) {
      for (let q = -4; q < 4; q++) checks.rect(q * sq, r * sq, sq, sq).fill((r + q) % 2 === 0 ? light : dark);
    }
    checks.rotation = 0.35;
    const mask = new PIXI.Graphics().poly(outline).fill(0xffffff);
    face.addChild(checks, mask);
    checks.mask = mask;
    c.addChild(face);

    // Glass sheen across the top half, and the broken edge: bright rim on the
    // lit (upper-left) side, darker below.
    c.addChild(new PIXI.Graphics().poly(outline).fill({ color: 0xffffff, alpha: 0.08 }));
    const sheen = new PIXI.Graphics().poly([-size, -size * 0.2, size * 0.3, -size * 1.2, size * 0.7, -size * 1.2, -size, size * 0.3]).fill({ color: 0xffffff, alpha: 0.22 });
    const sheenMask = new PIXI.Graphics().poly(outline).fill(0xffffff);
    sheen.mask = sheenMask;
    c.addChild(sheen, sheenMask);
    const rim = new PIXI.Graphics();
    const n = outline.length / 2;
    for (let i = 0; i < n; i++) {
      const x0 = outline[i * 2], y0 = outline[i * 2 + 1];
      const x1 = outline[((i + 1) % n) * 2], y1 = outline[((i + 1) % n) * 2 + 1];
      const lit = (x0 + x1) * -0.5 + (y0 + y1) * -0.5 > 0;
      rim.moveTo(x0, y0).lineTo(x1, y1).stroke({ color: lit ? 0xffffff : accent, width: Math.max(1.5, size * 0.12), alpha: lit ? 0.95 : 0.85 });
    }
    c.addChild(rim);

    // A four-point twinkle on the tip.
    if (options.sparkle !== false) {
      const t = size * 0.35;
      const star = new PIXI.Graphics()
        .poly([0, -t, t * 0.22, -t * 0.22, t, 0, t * 0.22, t * 0.22, 0, t, -t * 0.22, t * 0.22, -t, 0, -t * 0.22, -t * 0.22])
        .fill(0xffffff);
      star.x = outline[0] + size * 0.05;
      star.y = outline[1] + size * 0.1;
      star.scale.set(0.2);
      c.addChild(star);
      c._star = star;
      if (typeof gsap !== 'undefined') {
        gsap.to(star.scale, { x: 1, y: 1, duration: 0.35, yoyo: true, repeat: -1, repeatDelay: 1.6 + (this._seed(themeId) % 10) / 10, ease: 'sine.inOut' });
        if (c._glow) gsap.to(c._glow, { alpha: 0.55, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }
    }
    return c;
  },

  kill(shard) {
    if (!shard || typeof gsap === 'undefined') return;
    if (shard._star) gsap.killTweensOf(shard._star.scale);
    if (shard._glow) gsap.killTweensOf(shard._glow);
  },

  // The world whose fragment you won on a stage (Pawnie's for the Camp).
  themeForStage(stage) {
    if (typeof WORLDS === 'undefined') return 'crystal';
    if (stage <= 6) return 'pawnhollow';
    const world = WORLDS.find(w => w.stages.includes(stage));
    return world ? world.art : 'crystal';
  },
};
