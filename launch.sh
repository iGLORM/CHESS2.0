#!/bin/bash
# Chess 2.0 — Linux/macOS Launcher
cd "$(dirname "$0")"

# Add local Node.js to PATH if it exists
if [ -d "$HOME/node/bin" ]; then
    export PATH="$HOME/node/bin:$PATH"
fi

if ! command -v node &>/dev/null; then
    echo "Node.js not found. Install Node.js from https://nodejs.org/"
    exit 1
fi

npx electron . "$@"
