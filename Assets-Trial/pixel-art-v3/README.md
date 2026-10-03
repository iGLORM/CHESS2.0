# Detailed pixel-art candidates

This is the current art direction: **detailed pixel art**, created with the built-in image generator. Each PNG is an individual asset, with visible square pixel clusters, stepped contours, discrete shading, and actual alpha transparency.

This batch contains **16 individual PNGs**: four bosses, four environment cutouts, three buttons, one frame, two logos, and two collectible icons. All sixteen were visually inspected and checked for real alpha transparency; the gallery loads all sixteen successfully.

The jeweled chess crown in `icons/` is the shared visual reference. The rest of the collection uses it for pixel size and shading language, while changing subjects and palettes. This set is not made from procedural shapes or recolored copies.

## Folders

- `characters/`: full-body chess boss studies.
- `backgrounds/`: elaborate environment cutouts with transparent sky and negative space.
- `ui/`: blank ornate buttons and a panel frame.
- `logos/`: original pixel-art `CHESS 2.0` wordmarks.
- `icons/`: jeweled crown and fractured amethyst rook relic.
- `prompts/`: exact per-image prompts, including the pixel-style constraints.
- `metadata/`: provenance, dimensions, alpha checks and source information.

Open the parent [gallery](../index.html) and select **Pixel art v3 · Imagegen**. Switch the preview backdrop to inspect edges, and use **Open PNG** to inspect the full-size artwork. Shortlisting does not integrate anything.

All accepted files are original imagegen outputs, copied without art postprocessing. Generated alpha can include partially transparent edge pixels. Pixel-art appearance is visually checked; exact shared pixel-grid alignment and production sprite normalization have not been performed. Buttons contain no labels so text can be added later; background cutouts are standalone scene studies, not aligned parallax layer sets.

The simple first collection and smooth `detailed-v2` studies are preserved separately for history. The smooth studies are rejected for this art direction and excluded from the gallery's default collection. No Thrixel assets are used.

Rebuild the parent inventory and gallery after additions:

```sh
python3 Assets-Trial/generators/catalog.py
```

Pillow is needed for the inventory check only. To make additional artwork, reuse the saved imagegen prompts and the crown style reference, save each original result under a new filename, and review the pixel treatment and transparency before adding it to this collection.
