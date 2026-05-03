#!/bin/bash
# Chess 2.0 — Quick Start
export PATH="$HOME/node/bin:$PATH"
cd "$(dirname "$0")"
npx electron . "$@"
