# Assets-Trial

An expandable library of **unselected asset candidates** for Chess 2.0. Nothing in this directory is loaded by the game, referenced by its runtime, or deployed. These are visual experiments, not new story characters or approved designs.

**Current direction: [pixel-art-v3](pixel-art-v3/README.md).** The gallery opens this collection by default: individually image-generated, detailed pixel art with visible square pixel clusters and stepped contours. `detailed-v2/` contains rejected smooth illustrations and is explicitly labeled as rejected in the gallery. The original simple studies remain available in a separate collection.

Open **[index.html](index.html)** in a browser to browse the collection. Search by theme/name, filter categories, switch light/dark checkerboards, shortlist candidates, and export the shortlist as JSON. Shortlists stay in the browser where local storage is available; export them for a portable record. Selection does not copy or integrate files.

The first collection contains **204 candidate PNGs**: 9 bosses, 30 scenery layers/props, 84 UI elements and states, 54 icons, 15 logos/emblems, and 12 effect frames. One additional transparent UI contact sheet is provided for review.

## Organization

| Folder | Contents |
|---|---|
| `characters/bosses/` | Original boss character concepts; illustrated and small pixel sprite studies |
| `backgrounds/` | Six scenery themes with transparent layers and supporting props |
| `ui/` | Four material families: buttons, empty panel frames, toggles and badges |
| `logos/wordmarks/` | Original `CHESS 2.0` pixel lettering in two treatments and three palettes |
| `logos/emblems/` | Crown, rook and knight hexagonal emblems in three palettes |
| `icons/` | Eighteen gameplay symbols in three palettes |
| `effects/` | Four-frame spark burst sequence in three palettes |
| `metadata/` | Dimensions, logical pixel sizes, UI content bounds and authoring details |
| `prompts/` | Exact prompts for the built-in image generator |
| `generators/` | Standalone drawing scripts, catalog validator and gallery template |

`manifest.json` is the authoritative file inventory: dimensions, alpha coverage, visible bounds and SHA-256 hashes. Counts include palette variants, interaction states and animation frames. Files named `_preview.png` are transparent contact sheets, excluded from candidate counts.

## Transparency and pixel sizing

The notes below about exact pixel grids and reproducible drawing scripts apply to the **original simple studies**. The current `pixel-art-v3` collection uses imagegen; its original outputs and exact prompts are preserved. Its pixel-art appearance is reviewed visually, not presented as a guaranteed uniform export grid or production animation sheet.

Every PNG has actual RGBA transparency. Checkerboards in the browser are preview backgrounds, never baked into the images. Buttons are blank; panel centers are cut out. Scenery consists of layer silhouettes with transparent sky and gaps so the layers can be composed later over any backdrop.

Code-drawn UI, scenery, marks and effects use a small logical pixel grid exported at **4× nearest-neighbor scale**. The six native boss sprites are exported directly at **96×112 pixels (1×)**. Dimensions and coordinates in metadata explicitly distinguish logical pixels from exported pixels. Use nearest-neighbor sampling when inspecting or resizing these assets. Illustrated boss concepts are larger pixel-style artwork produced by the built-in image generator; the artwork and edge glow can contain partial alpha, and they do not share the strict pixel grid of the code-drawn set.

Layer each background in filename order: `01` distant, `02` middle, `03` foreground. Keep the three layers aligned on the same canvas; do not crop them separately. These are scenery candidates; placement around the actual chess board will need a later composition pass.

UI state canvases match within each button family. Use `metadata/ui.json` for text-safe bounds, anchors, and suggested slice insets. Decorated frames should keep their supplied aspect ratio unless ornaments are separated; stretching the full frame can distort ornaments.

Effect frames share a fixed 256×256 canvas, with the pivot at logical `(32, 32)`, exported `(128, 128)`. The suggested frame duration is 90 ms. They are candidate burst frames, not an animation already installed in the game.

## Making more candidates

Drawing scripts require Python 3 and Pillow. From this directory:

```sh
python3 generators/marks.py
python3 generators/ui.py
python3 generators/scenery.py
python3 characters/generate_pixel_bosses.py
python3 generators/catalog.py
```

These scripts only write inside `Assets-Trial`. They reproduce their named files, so preserve edited candidates under new variant names before rerunning. Add palettes, motifs or scene recipes to extend the collection. Boss image prompts are saved separately; reproducing those uses the built-in image generator and produces a fresh variation.

After adding PNGs, run `catalog.py` to validate real transparency and rebuild `manifest.json` and the offline gallery. An entirely opaque PNG or entirely empty image fails validation. Visual review remains necessary for style, silhouettes and edges.

For a future selection, keep the original candidate and copy the approved version into the game's real asset directory only during a separately requested integration task. This collection itself makes no changes to gameplay, saves, scripts, cache versions, or existing production art.
