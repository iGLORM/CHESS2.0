const PixiAnimator = {
  movePiece(sprite, fromX, fromY, toX, toY, duration, onComplete) {
    sprite.x = fromX;
    sprite.y = fromY;

    // Motion trail effect
    if (sprite.parent) {
      this._spawnMotionTrail(sprite.parent, sprite, fromX, fromY, toX, toY, duration || 0.3);
    }

    gsap.to(sprite, {
      x: toX,
      y: toY,
      duration: duration || 0.3,
      ease: 'back.out(1.7)',
      onComplete: onComplete,
    });
  },

  _spawnMotionTrail(parent, sprite, fromX, fromY, toX, toY, duration) {
    const dist = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const steps = Math.min(12, Math.max(6, Math.floor(dist / 15)));
    const dx = (toX - fromX) / steps;
    const dy = (toY - fromY) / steps;

    for (let i = 1; i < steps; i++) {
      setTimeout(() => {
        if (!sprite || !sprite.texture) return;
        const trail = new PIXI.Sprite(sprite.texture);
        trail.anchor.set(0.5);
        trail.x = fromX + dx * i;
        trail.y = fromY + dy * i;
        trail.scale.set(sprite.scale.x * (1 - i / steps) * 0.7);
        trail.alpha = 0.4 * (1 - i / steps);
        trail.tint = 0xffffff;
        parent.addChildAt(trail, 0);

        gsap.to(trail, {
          alpha: 0,
          scale: { x: 0, y: 0 },
          duration: 0.2 + (steps - i) * 0.02,
          ease: 'power2.out',
          onComplete: () => {
            if (trail.parent) trail.parent.removeChild(trail);
            trail.destroy();
          },
        });
      }, i * (duration * 1000 / steps));
    }
  },

  capturePiece(sprite, onComplete) {
    // Scale bounce before shrinking
    gsap.to(sprite.scale, {
      x: 1.3,
      y: 1.3,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(sprite, {
          alpha: 0,
          scale: { x: 0.1, y: 0.1 },
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            if (sprite.parent) sprite.parent.removeChild(sprite);
            if (onComplete) onComplete();
          },
        });
      },
    });
  },

  promotePiece(sprite, onComplete) {
    gsap.to(sprite.scale, {
      x: 1.4,
      y: 1.4,
      duration: 0.15,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  },

  screenShake(container, intensity, duration) {
    const originalX = container.x || 0;
    const originalY = container.y || 0;
    gsap.to(container, {
      x: originalX + intensity,
      y: originalY + intensity,
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      ease: 'power1.inOut',
      onComplete: () => {
        container.x = originalX;
        container.y = originalY;
      },
    });
  },

  flashScreen(graphics, color, duration) {
    graphics.clear();
    graphics.rect(0, 0, Layout.W, Layout.H).fill({ color, alpha: 0.3 });
    graphics.alpha = 1;
    gsap.to(graphics, {
      alpha: 0,
      duration: duration || 0.3,
      ease: 'power2.out',
    });
  },

  highlightPulse(graphics, color) {
    gsap.fromTo(
      graphics,
      { alpha: 0.6 },
      { alpha: 0.2, duration: 0.8, repeat: -1, yoyo: true, ease: 'sine.inOut' }
    );
  },

  killTweensOf(target) {
    gsap.killTweensOf(target);
  },
};
