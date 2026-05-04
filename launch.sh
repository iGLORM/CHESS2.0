#!/bin/bash
# Chess 2.0 — Linux/macOS Launcher
cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
    echo "Node.js not found. Install Node.js from https://nodejs.org/"
    exit 1
fi

npx electron . "$@"
