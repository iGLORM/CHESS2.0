#!/usr/bin/env python3
"""
Texture Organizer — drop PNGs in assets/dropbox/ and tell me to run this.
It sorts them into assets/textures/ automatically.

SINGLE FILE MODE (sprite sheet):
  Drop one image with all 12 pieces and say "remodel the pieces".

  Layout: 6 columns x 2 rows
    Row 0 (top):    white king, queen, rook, bishop, knight, pawn
    Row 1 (bottom): black king, queen, rook, bishop, knight, pawn

  Naming:
    <theme>_pieces.png  → auto-detects theme (e.g. space_pieces.png)
    anything_else.png    → sliced and applied to EVERY theme

INDIVIDUAL FILE MODE:
  <theme>_light.png          → boards/
  <theme>_dark.png           → boards/
  <theme>_bg.png             → backgrounds/
  <theme>_<color>_<type>.png → pieces/

Examples:
  space_light.png            → assets/textures/boards/space_light.png
  space_white_knight.png     → assets/textures/pieces/space_white_knight.png
  space_bg.png               → assets/textures/backgrounds/space_bg.png
"""
import os
import re
import shutil
import argparse
from PIL import Image

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DROPBOX = os.path.join(PROJECT, 'assets', 'dropbox')
TEXTURES = os.path.join(PROJECT, 'assets', 'textures')

# All available theme IDs (must match src/themes/themes.js)
ALL_THEMES = [
    'space', 'medieval', 'ocean', 'egypt', 'cyberpunk',
    'japanese', 'artdeco', 'wildwest', 'prehistoric', 'steampunk'
]

# Standard chess sprite sheet layout (6 columns x 2 rows)
SHEET_PIECES = [
    ['white_king', 'white_queen', 'white_rook', 'white_bishop', 'white_knight', 'white_pawn'],
    ['black_king', 'black_queen', 'black_rook', 'black_bishop', 'black_knight', 'black_pawn'],
]

PIECE_RE = re.compile(r'^(\w+)_(white|black)_(pawn|rook|knight|bishop|queen|king)\.png$', re.I)
BOARD_RE = re.compile(r'^(\w+)_(light|dark)\.png$', re.I)
BG_RE    = re.compile(r'^(\w+)_bg\.png$', re.I)
SHEET_RE = re.compile(r'^(\w+)_pieces\.png$', re.I)

def slice_sheet(path, theme):
    img = Image.open(path)
    w, h = img.size
    cols = 6
    rows = 2
    piece_w = w // cols
    piece_h = h // rows
    out_dir = os.path.join(TEXTURES, 'pieces')
    os.makedirs(out_dir, exist_ok=True)

    count = 0
    for row in range(rows):
        for col in range(cols):
            left = col * piece_w
            upper = row * piece_h
            right = left + piece_w
            lower = upper + piece_h
            piece = img.crop((left, upper, right, lower))
            name = f"{theme}_{SHEET_PIECES[row][col]}.png"
            out_path = os.path.join(out_dir, name)
            piece.save(out_path)
            print(f"  {name}  →  {os.path.relpath(out_path, PROJECT)}")
            count += 1
    print(f"\nSliced {count} pieces from sheet for theme '{theme}'.")
    return count

def organize(theme_hint=None):
    if not os.path.isdir(DROPBOX):
        print(f"Dropbox folder missing: {DROPBOX}")
        return

    files = [f for f in os.listdir(DROPBOX) if f.lower().endswith('.png')]
    if not files:
        print("No PNG files found in dropbox.")
        return

    moved = 0
    sliced = 0
    for f in files:
        src = os.path.join(DROPBOX, f)
        dest = None

        # Check for sprite sheet with explicit theme
        m = SHEET_RE.match(f)
        if m:
            theme = m.group(1)
            sliced += slice_sheet(src, theme)
            os.remove(src)
            continue

        # Check for loose piece
        m = PIECE_RE.match(f)
        if m:
            dest = os.path.join(TEXTURES, 'pieces', f)
        else:
            m = BOARD_RE.match(f)
            if m:
                dest = os.path.join(TEXTURES, 'boards', f)
            else:
                m = BG_RE.match(f)
                if m:
                    dest = os.path.join(TEXTURES, 'backgrounds', f)

        if dest:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.move(src, dest)
            print(f"  {f}  →  {os.path.relpath(dest, PROJECT)}")
            moved += 1
        else:
            # UNRECOGNIZED NAME — treat as sprite sheet for ALL themes
            print(f"  {f}  →  Unrecognized name. Treating as sprite sheet for ALL themes...")
            total = 0
            for theme in ALL_THEMES:
                total += slice_sheet(src, theme)
            os.remove(src)
            sliced += total
            print(f"\nApplied to all {len(ALL_THEMES)} themes ({total} files total).")

    if moved or sliced:
        print(f"\nDone. Moved {moved} individual file(s), sliced {sliced} from sheet(s).")
        print("Restart the game to see the new textures.")
    else:
        print("\nNothing was moved. Check your filenames.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Organize textures from dropbox')
    parser.add_argument('--theme', help='Theme for pieces.png if no theme prefix')
    args = parser.parse_args()
    organize(args.theme)
