// Story stars, drawn as chunky five-point pixel stars.
// PixiStar.create(size, lit) -> Graphics centred on (0, 0); size is the outer radius.
// PixiStar.row(count, got, size, gap) -> Container of `count` stars, the first `got`
// lit (or a boolean array), laid out left to right from x = 0.
const PixiStar = {
  GOLD: 0xffd24a,
  GOLD_HI: 0xfff2a8,
  GOLD_LO: 0xc8861e,
  EMPTY: 0x3a3446,
  EMPTY_HI: 0x5a5466,
  OUTLINE: 0x140e1a,

  points(size, inner = 0.46) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? size * inner : size;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r));
    }
    return pts;
  },

  create(size, lit = true) {
    const g = new PIXI.Graphics();
    const out = this.points(size + 2);
    g.poly(out).fill(this.OUTLINE);
    g.poly(this.points(size)).fill(lit ? this.GOLD : this.EMPTY);
    // A lit upper-left facet and a shaded lower-right one give it some depth.
    const s = size;
    g.poly([0, -s + 2, -Math.round(s * 0.28), -Math.round(s * 0.2), 0, -Math.round(s * 0.05)]).fill(lit ? this.GOLD_HI : this.EMPTY_HI);
    g.poly([Math.round(s * 0.2), Math.round(s * 0.2), Math.round(s * 0.55), Math.round(s * 0.72), 0, Math.round(s * 0.38)]).fill({ color: lit ? this.GOLD_LO : 0x000000, alpha: lit ? 1 : 0.25 });
    return g;
  },

  row(count, got, size = 10, gap = 4) {
    const c = new PIXI.Container();
    for (let i = 0; i < count; i++) {
      const lit = Array.isArray(got) ? !!got[i] : i < got;
      const st = this.create(size, lit);
      st.x = size + i * (size * 2 + gap);
      st.y = size;
      c.addChild(st);
    }
    return c;
  },
};
