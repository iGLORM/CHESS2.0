#!/bin/bash
# Chess 2.0 Launcher

NODE_PATH="$HOME/node/bin"
PROJECT_DIR="$HOME/projects/chess"

# Find node/npx
if command -v node &>/dev/null; then
    export PATH="$PATH"
elif [ -f "$NODE_PATH/node" ]; then
    export PATH="$NODE_PATH:$PATH"
else
    notify-send "Chess 2.0" "Node.js not found. Install Node.js first."
    exit 1
fi

cd "$PROJECT_DIR"
npx electron . "$@"
