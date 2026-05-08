const PixiColorUtil = {
  hexToNum(hex) {
    if (typeof hex === 'number') return hex;
    if (!hex || hex[0] !== '#') return 0x000000;
    return parseInt(hex.slice(1, 7), 16);
  },

  numToHex(num) {
    return '#' + (num & 0xFFFFFF).toString(16).padStart(6, '0');
  },

  alpha(color, a) {
    if (typeof color === 'string' && color[0] === '#' && color.length === 7) {
      return color + a;
    }
    return color;
  },

  lighten(hex, amount) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  },

  darken(hex, amount) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  },

  alphaFloat(hexAlpha) {
    if (typeof hexAlpha === 'string' && hexAlpha.length === 2) {
      return parseInt(hexAlpha, 16) / 255;
    }
    return 1;
  },
};
