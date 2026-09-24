// Loads the browser engine scripts into a sandbox so they can be tested with Node.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');

function loadGame(files) {
  const context = vm.createContext({ console, Math, JSON, Date });
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(SRC, file), 'utf8'), context, { filename: file });
  }
  // Top-level class declarations live in the script scope, not on the global object.
  return new Proxy({}, { get: (_, name) => vm.runInContext(String(name), context) });
}

const ENGINE = [
  'engine/Board.js',
  'engine/MoveGen.js',
  'engine/LegalFilter.js',
  'engine/MoveExecutor.js',
  'engine/GameRules.js',
  'engine/FEN.js',
];

module.exports = { loadGame, ENGINE };
