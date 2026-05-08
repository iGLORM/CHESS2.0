const PixiTextStyles = {
  // "Silkscreen" for titles — bold pixel display font
  // "Pixelify Sans" for body/UI — modern readable pixel font
  FONT_TITLE: '"Silkscreen", monospace',
  FONT_BODY: '"Pixelify Sans", sans-serif',

  TITLE: {
    fontFamily: '"Silkscreen", monospace',
    fontSize: 32,
    fontWeight: 'bold',
    fill: '#ffffff',
  },

  SUBTITLE: {
    fontFamily: '"Pixelify Sans", sans-serif',
    fontSize: 16,
    fontWeight: '600',
    fill: '#ffffff',
    letterSpacing: 1,
  },

  BODY: {
    fontFamily: '"Pixelify Sans", sans-serif',
    fontSize: 18,
    fill: '#ffffff',
    wordWrap: true,
    wordWrapWidth: 700,
  },

  LABEL: {
    fontFamily: '"Pixelify Sans", sans-serif',
    fontSize: 18,
    fontWeight: '600',
    fill: '#ffffff',
  },

  BUTTON: {
    fontFamily: '"Pixelify Sans", sans-serif',
    fontSize: 20,
    fontWeight: '600',
    fill: '#ffffff',
  },

  LARGE_NUMBER: {
    fontFamily: '"Silkscreen", monospace',
    fontSize: 48,
    fontWeight: 'bold',
    fill: '#ffffff',
  },

  HINT: {
    fontFamily: '"Pixelify Sans", sans-serif',
    fontSize: 14,
    fill: '#ffffff',
  },

  create(overrides) {
    return Object.assign({}, overrides);
  },

  clone(base, overrides) {
    return Object.assign({}, base, overrides);
  },
};
