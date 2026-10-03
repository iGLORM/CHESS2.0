class PixiDialogueBubble extends PIXI.Container {
  constructor(config) {
    super();
    this.label = 'dialogueBubble';
    this.zIndex = 200;
    this._duration = config.duration || 5000;
    this._dismissed = false;
    this._build(config);
    this._animateIn();
  }

  _build(config) {
    if (config.anchor) { this._buildSpeech(config); return; }
    const { name, text, colors, cols, characterId } = config;
    const isPortrait = Layout.isPortrait;
    const portraitSize = isPortrait ? 64 : 48;
    const bubbleW = isPortrait ? 520 : 260;
    const padding = isPortrait ? 16 : 12;
    const nameSize = isPortrait ? 18 : 13;
    const textSize = isPortrait ? 18 : 15;

    const portrait = new PIXI.Sprite();
    portrait.x = padding;
    portrait.y = padding;
    portrait.width = portraitSize;
    portrait.height = portraitSize;

    const live = characterId && typeof LiveScenes !== 'undefined' && LiveScenes.character(characterId);
    if (live) {
      // Live character art: the animated close-up, acting out the line's mood.
      LiveScenes.attach(live, portrait, 'face');
    } else if (characterId && typeof PixiMinion !== 'undefined' && PixiMinion.isMinion(characterId)) {
      // Mission minions have no character art: use their piece portrait.
      portrait.texture = PixiMinion.texture(characterId);
    } else if (characterId) {
      const imgPath = `../assets/textures/characters/${characterId}.png`;
      PIXI.Assets.load(imgPath).then(tex => {
        if (!this.destroyed) {
          portrait.texture = tex;
          portrait.texture.source.scaleMode = 'nearest';
        }
      }).catch(() => {
        const canvas = SpriteGen.generateCharacterSprite(colors, portraitSize);
        portrait.texture = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
      });
    } else {
      const canvas = SpriteGen.generateCharacterSprite(colors, portraitSize);
      portrait.texture = PIXI.Texture.from({ resource: canvas, scaleMode: 'nearest' });
    }

    const portraitBorder = new PIXI.Graphics();
    portraitBorder.roundRect(padding - 2, padding - 2, portraitSize + 4, portraitSize + 4, 4)
      .stroke({ color: PixiColorUtil.hexToNum(colors.primary), alpha: 0.7, width: 2 });

    const textOffsetX = padding + portraitSize + padding;
    const maxTextW = bubbleW - textOffsetX - padding;

    const nameText = new PIXI.Text({
      text: name,
      style: {
        fontFamily: PixiTextStyles.FONT_BODY,
        fontSize: nameSize,
        fontWeight: 'bold',
        fill: PixiColorUtil.hexToNum(colors.primary),
      },
    });
    nameText.x = textOffsetX;
    nameText.y = padding;

    const bodyText = new PIXI.Text({
      text: text,
      style: {
        fontFamily: PixiTextStyles.FONT_BODY,
        fontSize: textSize,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: maxTextW,
        lineHeight: textSize + 4,
      },
    });
    bodyText.x = textOffsetX;
    bodyText.y = padding + nameSize + 6;

    const maxBodyH = (textSize + 4) * 4;
    if (bodyText.height > maxBodyH) {
      bodyText.height = maxBodyH;
    }

    const textContentH = padding + nameSize + 6 + Math.min(bodyText.height, maxBodyH) + padding;
    const portraitContentH = padding + portraitSize + padding;
    const bubbleH = Math.max(textContentH, portraitContentH);

    const bg = new PIXI.Graphics();
    const fillColor = PixiColorUtil.hexToNum(colors.secondary);
    const borderColor = PixiColorUtil.hexToNum(colors.primary);

    bg.roundRect(3, 3, bubbleW, bubbleH, 8).fill({ color: 0x000000, alpha: 0.35 });
    bg.roundRect(0, 0, bubbleW, bubbleH, 8).fill({ color: fillColor, alpha: 0.88 });
    bg.roundRect(0, 0, bubbleW, bubbleH, 8).stroke({ color: borderColor, alpha: 0.7, width: 2 });

    const tailSize = 8;
    if (!isPortrait) {
      const tailX = bubbleW;
      const tailY = bubbleH / 2;
      bg.moveTo(tailX, tailY - tailSize);
      bg.lineTo(tailX + tailSize, tailY);
      bg.lineTo(tailX, tailY + tailSize);
      bg.closePath();
      bg.fill({ color: fillColor, alpha: 0.88 });
    }

    this.addChild(bg);
    this.addChild(portraitBorder);
    this.addChild(portrait);
    this.addChild(nameText);
    this.addChild(bodyText);

    if (isPortrait) {
      this.x = (Layout.W - bubbleW) / 2;
      this.y = 170;
    } else {
      this.x = 720;
      this.y = 340;
    }
  }

  // A comic speech bubble whose tail comes out of the speaker's mouth (config.anchor,
  // screen px): below the stage character in landscape, below the top panel in portrait.
  // Cream paper, dark ink, the speaker's name in their colour; it lets clicks through.
  _buildSpeech(config) {
    const { name, text, colors, anchor } = config;
    const portrait = !!anchor.portrait;
    const w = portrait ? 470 : 224, pad = portrait ? 16 : 12;
    const nameSize = portrait ? 17 : 12, textSize = portrait ? 19 : 15;
    const INK = 0x1a1024, PAPER = 0xfff6e4, SHADE = 0xe8d8bc;
    const nameText = new PIXI.Text({ text: name.toUpperCase(), style: { fontFamily: PixiTextStyles.FONT_BODY, fontSize: nameSize, fontWeight: 'bold', fill: PixiColorUtil.hexToNum(colors.primary), stroke: { color: INK, width: 3 }, letterSpacing: 1 } });
    nameText.x = pad; nameText.y = pad - 2;
    const body = new PIXI.Text({ text, style: { fontFamily: PixiTextStyles.FONT_BODY, fontSize: textSize, fontWeight: '700', fill: 0x2a1c30, wordWrap: true, wordWrapWidth: w - pad * 2, lineHeight: textSize + 4 } });
    body.x = pad; body.y = nameText.y + nameText.height + 2;
    const maxH = (textSize + 4) * 5;
    if (body.height > maxH) body.scale.set(Math.max(0.72, maxH / body.height));
    const h = Math.round(body.y + body.height + pad);

    // Where the bubble goes: under the mouth, inside the screen.
    const gapY = portrait ? 34 : 26;
    const bx = portrait ? Math.max(24, Math.min(Layout.W - 24 - w, anchor.x - w + 70)) : Math.round(anchor.x - w / 2);
    const by = Math.round(anchor.y + gapY);
    const clampX = Math.max(8, Math.min(Layout.W - 8 - w, bx));
    this.x = clampX; this.y = by;
    // The tail: a stepped pixel wedge from the bubble's top edge up to the mouth.
    const tx = anchor.x - clampX, ty = anchor.y - by + 4;
    const g = new PIXI.Graphics();
    const step = 4, base = portrait ? 26 : 20;
    const wedge = (grow, color) => {
      for (let y = 0; y > ty; y -= step) {
        const f = y / ty, half = Math.max(2, (base / 2) * (1 - f)) + grow;
        const cx = tx + (base / 2) * (1 - f) * 0.6 - 4;
        g.rect(Math.round(cx - half), y - step, Math.round(half * 2), step + 1).fill(color);
      }
    };
    g.roundRect(4, 5, w, h, 10).fill({ color: 0x000000, alpha: 0.35 });
    wedge(3, INK);
    g.roundRect(-3, -3, w + 6, h + 6, 12).fill(INK);
    g.roundRect(0, 0, w, h, 9).fill(PAPER);
    g.rect(6, h - 6, w - 12, 3).fill(SHADE);
    wedge(0, PAPER);
    this.addChild(g, nameText, body);
    this.eventMode = 'none';
    this._speech = true;
  }

  _animateIn() {
    if (this._speech) {
      // Pops out of the mouth: grows from the tail's end.
      this.alpha = 0;
      const sy = this.y;
      this.y = sy - 10;
      this.scale.set(0.85);
      gsap.to(this, { alpha: 1, y: sy, duration: 0.25, ease: 'back.out(2)' });
      gsap.to(this.scale, { x: 1, y: 1, duration: 0.25, ease: 'back.out(2)' });
      this._dismissTimer = setTimeout(() => this.dismiss(), this._duration);
      return;
    }
    this.alpha = 0;
    const startX = this.x;
    this.x = startX + 20;
    gsap.to(this, { alpha: 1, x: startX, duration: 0.3, ease: 'back.out(1.5)' });

    this._dismissTimer = setTimeout(() => {
      this.dismiss();
    }, this._duration);
  }

  dismiss() {
    if (this._dismissed) return;
    this._dismissed = true;
    if (this._dismissTimer) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
    gsap.to(this, {
      alpha: 0,
      duration: 0.3,
      onComplete: () => {
        if (this.parent) this.parent.removeChild(this);
        this.destroy({ children: true });
      },
    });
  }

  destroy(options) {
    if (this._dismissTimer) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
    gsap.killTweensOf(this);
    this._dismissed = true;
    super.destroy(options);
  }
}
