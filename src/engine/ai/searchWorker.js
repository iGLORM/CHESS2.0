// Runs the built-in engine (Search.js) off the main thread.
importScripts(
  '../Board.js',
  '../MoveGen.js',
  '../LegalFilter.js',
  '../MoveExecutor.js',
  '../GameRules.js',
  '../FEN.js',
  'Evaluate.js',
  'Search.js'
);

self.onmessage = (e) => {
  const { id, fen, color, depth, noise } = e.data;
  let move = null;
  try {
    const board = FEN.toBoard(fen);
    move = noise > 0
      ? Search.findBestMoveWithNoise(board, color, depth, noise)
      : Search.findBestMove(board, color, depth);
  } catch (err) {
    move = null;
  }
  self.postMessage({
    id,
    move: move ? { from: move.from, to: move.to, promotion: move.promotion || null } : null,
  });
};
