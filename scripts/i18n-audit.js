// Layout check for translated text, run inside the game (scripts/i18n-check.mjs
// injects it). window.__i18nAudit() looks at every text on screen, Pixi and
// Canvas 2D, in game units (1280x800 or 800x1280), and reports:
//   offscreen  a text that runs off the screen
//   overflow   a text wider or taller than the box (button, card, panel) it sits in
//   overlap    two different texts on top of each other
//   tiny       a text shrunk below a readable size
// Returns { lang, screen, texts, issues: [{ kind, text, other?, box }] }.
(() => {
  const near = (a, b, pad) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
  const area = (r) => Math.max(0, r.w) * Math.max(0, r.h);
  const inter = (a, b) => {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
    return { x, y, w: Math.min(a.x + a.w, b.x + b.w) - x, h: Math.min(a.y + a.h, b.y + b.h) - y };
  };
  const round = (r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });

  // Canvas 2D: record one frame of fillText calls on the game's canvases.
  function recordCanvas() {
    const out = [];
    const canvases = [document.getElementById('gameCanvas'), document.getElementById('miniGameOverlay')].filter(c => c && c.offsetParent !== null && getComputedStyle(c).display !== 'none');
    const C = CanvasRenderingContext2D.prototype;
    const orig = C.fillText;
    C.fillText = function (text, x, y, maxWidth) {
      if (canvases.includes(this.canvas) && this.globalAlpha > 0.05) {
        const shown = I18n.lang === 'en' ? String(text) : I18n.display(String(text));
        const m = this.measureText(String(text));
        let w = m.width;
        if (maxWidth !== undefined && w > maxWidth) w = maxWidth;
        const left = this.textAlign === 'center' ? x - w / 2 : (this.textAlign === 'right' || this.textAlign === 'end') ? x - w : x;
        const asc = m.actualBoundingBoxAscent || 0, desc = m.actualBoundingBoxDescent || 0;
        const t = this.getTransform();
        const sx = t.a, sy = t.d;
        const unit = this.canvas.width / Layout.W;
        out.push({ src: 'canvas', text: shown, x: (t.e + left * sx) / unit, y: (t.f + (y - asc) * sy) / unit, w: w * sx / unit, h: (asc + desc) * sy / unit, squeezed: maxWidth !== undefined && m.width > maxWidth ? maxWidth / m.width : 1, font: this.font });
      }
      return orig.call(this, text, x, y, maxWidth);
    };
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => { C.fillText = orig; resolve(out); }));
    });
  }

  function pixiTexts() {
    const app = PixiApp.app;
    if (!app) return { texts: [], boxes: [] };
    const unit = app.screen.width / Layout.W;
    const texts = [];
    const boxes = [];
    let order = 0;
    const walk = (o, depth) => {
      order++;
      if (!o.visible || o.alpha <= 0.02 || o.renderable === false) return;
      if (o.mask) { /* masked lists: bounds are clipped below */ }
      if (o instanceof PIXI.AbstractText) {
        if (!o.text || !/\S/.test(o.text)) return;
        const b = o.getBounds();
        const r = { x: b.x / unit, y: b.y / unit, w: b.width / unit, h: b.height / unit };
        let wa = 1, p = o;
        while (p) { wa *= p.alpha; p = p.parent; }
        if (wa < 0.05) return;
        const ws = Math.abs(o.worldTransform.a) / unit;
        const fontSize = (o.style && o.style.fontSize) || 16;
        texts.push({ src: 'pixi', text: o.text, ...r, obj: o, order, size: fontSize * ws, wrap: !!(o.style && o.style.wordWrap) });
        return;
      }
      if (o instanceof PIXI.Graphics || (o instanceof PIXI.Sprite && !(o instanceof PIXI.AbstractText))) {
        const b = o.getBounds();
        if (b.width > 30 && b.height > 18) boxes.push({ x: b.x / unit, y: b.y / unit, w: b.width / unit, h: b.height / unit, obj: o, depth, order });
      }
      for (const c of o.children || []) walk(c, depth + 1);
    };
    walk(app.stage, 0);
    return { texts, boxes };
  }

  // The box a text sits in: the smallest Graphics drawn in the same container
  // (or one level up) that holds the text's centre and is not the whole screen.
  function boxFor(t, boxes) {
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    let best = null;
    const parents = new Set();
    let p = t.obj.parent;
    for (let i = 0; i < 3 && p; i++, p = p.parent) parents.add(p);
    for (const b of boxes) {
      if (!(b.obj instanceof PIXI.Graphics)) continue;
      if (!parents.has(b.obj.parent)) continue;
      if (b.w >= Layout.W * 0.95 || b.h >= Layout.H * 0.95) continue;
      if (cx < b.x || cx > b.x + b.w || cy < b.y || cy > b.y + b.h) continue;
      if (b.w < t.w * 0.5 && b.h < t.h * 0.5) continue;
      if (!best || area(b) < area(best)) best = b;
    }
    return best;
  }

  // A text under a later, large panel (a modal) is hidden: leave it out.
  function hidden(t, boxes) {
    for (const b of boxes) {
      if (b.order <= t.order || area(b) < Layout.W * Layout.H * 0.12) continue;
      if (t.x >= b.x - 1 && t.y >= b.y - 1 && t.x + t.w <= b.x + b.w + 1 && t.y + t.h <= b.y + b.h + 1) {
        let p = t.obj.parent, ancestor = false;
        while (p) { if (p === b.obj) { ancestor = true; break; } p = p.parent; }
        if (!ancestor) return true;
      }
    }
    return false;
  }

  // Screens whose texts scroll or pan (the map, the credits roll).
  const SCROLLING = ['worldMap', 'credits'];

  window.__i18nAudit = async function () {
    const canvas = await recordCanvas();
    const got = pixiTexts();
    const boxes = got.boxes;
    const texts = got.texts.filter(t => !hidden(t, boxes));
    const all = [...texts, ...canvas];
    const scrolling = SCROLLING.includes(store.get('screen'));
    const issues = [];
    const W = Layout.W, H = Layout.H;
    for (const t of all) {
      if (!scrolling && (t.x < -2 || t.y < -2 || t.x + t.w > W + 2 || t.y + t.h > H + 2)) {
        issues.push({ kind: 'offscreen', text: t.text, box: round(t) });
      }
      if (t.src === 'pixi') {
        if (t.size < 9.5) issues.push({ kind: 'tiny', text: t.text, size: Math.round(t.size * 10) / 10, box: round(t) });
        const b = boxFor(t, boxes);
        if (b) {
          const over = Math.max(b.x - t.x, t.x + t.w - (b.x + b.w), b.y - t.y, t.y + t.h - (b.y + b.h));
          if (over > 3) issues.push({ kind: 'overflow', text: t.text, by: Math.round(over), box: round(t), in: round(b) });
        }
      } else if (t.squeezed < 0.72) {
        issues.push({ kind: 'tiny', text: t.text, squeezed: Math.round(t.squeezed * 100) / 100, box: round(t) });
      }
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.text === b.text) continue;              // drop shadows, outlines
        if (!near(a, b, 1)) continue;
        const r = inter(a, b);
        const small = Math.min(area(a), area(b));
        if (small > 0 && area(r) / small > 0.18 && r.h > 3 && r.w > 3) {
          issues.push({ kind: 'overlap', text: a.text, other: b.text, box: round(a), with: round(b) });
        }
      }
    }
    return {
      lang: I18n.lang,
      screen: store.get('screen'),
      texts: all.length,
      issues: issues.map(x => ({ ...x, text: String(x.text).slice(0, 80), other: x.other && String(x.other).slice(0, 80) })),
      missing: [...I18n.missing].filter(s => /[A-Za-z]{2}/.test(s)).slice(0, 200),
    };
  };
})();
