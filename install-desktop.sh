#!/bin/bash
# Install Chess 2.0 desktop entry
# Run this to add a desktop shortcut and application menu entry

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_FILE="$SCRIPT_DIR/chess2.desktop"
ICON_FILE="$SCRIPT_DIR/icon.png"

if [ ! -f "$DESKTOP_FILE" ]; then
    echo "Error: chess2.desktop not found in $SCRIPT_DIR"
    exit 1
fi

# Update the Exec path to absolute
sed "s|Path=.*|Path=$SCRIPT_DIR|" "$DESKTOP_FILE" > /tmp/chess2.desktop
sed -i "s|Exec=.*|Exec=bash -c 'cd \"$SCRIPT_DIR\" && npx electron .'|" /tmp/chess2.desktop

# Install to applications directory
mkdir -p "$HOME/.local/share/applications"
cp /tmp/chess2.desktop "$HOME/.local/share/applications/chess2.desktop"

# Also copy to Desktop if it exists
if [ -d "$HOME/Desktop" ]; then
    cp /tmp/chess2.desktop "$HOME/Desktop/chess2.desktop"
    chmod +x "$HOME/Desktop/chess2.desktop"
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$HOME/.local/share/icons" 2>/dev/null || true
fi

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo "Chess 2.0 desktop entry installed!"
echo "You can now find it in your application menu or on the desktop."
