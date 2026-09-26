# Stockfish (bundled engine)

Chess 2.0 includes an unmodified copy of the Stockfish chess engine, used for the
stronger computer opponents and for move analysis.

| | |
|---|---|
| Files | `stockfish-18-lite-single.js`, `stockfish-18-lite-single.wasm` |
| Build | Stockfish.js 18, "lite single-threaded" flavour (npm package `stockfish@18.0.7`) |
| Port by | Nathan Rugg / Chess.com — https://github.com/nmrugg/stockfish.js |
| Based on | Stockfish 18 — https://github.com/official-stockfish/Stockfish (tag `sf_18`) |
| Neural network | by Linmiao Xu (linrock), see https://tests.stockfishchess.org/nns |
| Licence | GNU General Public License, version 3 (full text in `COPYING.txt`) |

Stockfish.js is Copyright (c) 2026 Chess.com, LLC. Stockfish is Copyright (c)
T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other Stockfish developers
(see the AUTHORS file in the source).

## No warranty

Stockfish is free software: you can redistribute it and/or modify it under the
terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version. It is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See `COPYING.txt` for details.

## Source code

The complete corresponding source code for these exact files is the Stockfish.js
repository at commit `32d4b5ae40c01db88219bfbe2b82dbe6dec93832` (the commit the
npm package 18.0.7 was published from), which contains the Stockfish engine
source and the build scripts:

- Download: https://github.com/nmrugg/stockfish.js/archive/32d4b5ae40c01db88219bfbe2b82dbe6dec93832.tar.gz
- Browse: https://github.com/nmrugg/stockfish.js/tree/32d4b5ae40c01db88219bfbe2b82dbe6dec93832

Desktop builds of Chess 2.0 also ship this archive in the `licenses/stockfish/source`
folder next to the game.

## How the game uses it

Stockfish runs as a separate program inside a Web Worker. The game only sends it
text commands over the UCI protocol and reads its text replies; no Chess 2.0 code
is compiled into or linked with Stockfish. You may replace these two files with
your own build of Stockfish.js and the game will use it.
