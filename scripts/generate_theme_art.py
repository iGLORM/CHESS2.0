"""Generate per-theme piece sets and board textures.

Every theme's pieces are repainted from one master set (the Crystal pieces):
the master supplies the silhouettes, outline and shading; each theme supplies
the materials (a shade ramp per side, an outline colour and an inlay colour).
Boards are painted procedurally per world (planks and grass, tatami, iron,
marble with gold inlay...). The Crystal (Soulbound Pixel) board is kept as is.

    pip install pillow
    python3 scripts/generate_theme_art.py            # everything
    python3 scripts/generate_theme_art.py pieces     # or: boards, previews

Outputs assets/textures/pieces/{theme}_{color}_{type}.png (64x64) and
assets/textures/boards/{theme}_board.png (8x8 squares, SQ px each).
"""
import colorsys
import math
import os
import random
import sys

from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
PIECES = os.path.join(ROOT, 'assets', 'textures', 'pieces')
BOARDS = os.path.join(ROOT, 'assets', 'textures', 'boards')
MASTER = 'crystal'
TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']


def hx(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- pieces ---
# ramp: shadow -> highlight. gem: dark -> bright.
MATERIALS = {
    'pawnhollow': {  # pale birch vs. walnut, apple-red inlay
        'white': dict(ramp=['#7a6446', '#b89a6e', '#e0c89a', '#f6e6c4', '#fffaec'], outline='#1e1208', gem=['#8a1a14', '#d83a2a', '#ff9a7a']),
        'black': dict(ramp=['#140c06', '#2e1c10', '#4e321e', '#74502e', '#9e7448'], outline='#070402', gem=['#2a6a1a', '#5aae34', '#b8f080']),
    },
    'trainingcamp': {  # ivory rice paper vs. indigo lacquer, hologram inlay
        'white': dict(ramp=['#6e6878', '#a8a2b4', '#d8d4e0', '#f2f0f8', '#ffffff'], outline='#140e1c', gem=['#1a6a8a', '#3ac8f0', '#b8f4ff']),
        'black': dict(ramp=['#08081a', '#161838', '#262a5a', '#3a4282', '#6a74b8'], outline='#03030c', gem=['#1a6a8a', '#3ac8f0', '#b8f4ff']),
    },
    'slantedsands': {  # sandstone vs. lapis lazuli
        'white': dict(ramp=['#7a5430', '#b88a58', '#e0bc88', '#f6dcb0', '#fff4dc'], outline='#241405', gem=['#1a3a8a', '#3a6ad8', '#9ac0ff']),
        'black': dict(ramp=['#070b24', '#15215c', '#263d96', '#3f63c9', '#86a6f0'], outline='#03040f', gem=['#8a6a10', '#e8b830', '#fff2a0']),
    },
    'ironkeep': {  # polished steel vs. blackened iron, forge-glow inlay
        'white': dict(ramp=['#4a525c', '#7e8894', '#b2bcc6', '#dce2e8', '#fafcff'], outline='#0c0e12', gem=['#8a2a08', '#e8621a', '#ffc070']),
        'black': dict(ramp=['#08090b', '#16181c', '#26292f', '#3c4048', '#5e646e'], outline='#000000', gem=['#8a2a08', '#e8621a', '#ffc070']),
    },
    'mistymoors': {  # weathered pale stone vs. moss slate, ghost-light inlay
        'white': dict(ramp=['#56605a', '#8c9890', '#bcc8c0', '#e0eae4', '#f8fffa'], outline='#0e1412', gem=['#1a6a58', '#4ad0a8', '#c0fff0']),
        'black': dict(ramp=['#070c0a', '#141e1a', '#22322a', '#34483e', '#526a5c'], outline='#020403', gem=['#1a6a58', '#4ad0a8', '#c0fff0']),
    },
    'royalpalace': {  # white marble vs. plum marble, gold inlay
        'white': dict(ramp=['#7a6e70', '#b8acae', '#e2d8d8', '#f8f2f0', '#ffffff'], outline='#1e1016', gem=['#8a6a10', '#e8b830', '#fff2a0']),
        'black': dict(ramp=['#14040c', '#32101e', '#521c32', '#7a2e4a', '#a85070'], outline='#070104', gem=['#8a6a10', '#e8b830', '#fff2a0']),
    },
    'clockworkcitadel': {  # brass vs. gunmetal with copper
        'white': dict(ramp=['#4e340c', '#8a6420', '#c0943a', '#e4c26c', '#fff0bc'], outline='#1a1004', gem=['#0e6a62', '#2ad0c0', '#b0fff4']),
        'black': dict(ramp=['#0c0e12', '#20242c', '#3a404c', '#5a6270', '#8e98a8'], outline='#000000', gem=['#7a3208', '#e0781c', '#ffc890']),
    },
    'grandlibrary': {  # parchment vs. oxblood leather, gilt inlay
        'white': dict(ramp=['#6e5a40', '#a89070', '#d6c29e', '#f0e4c8', '#fffaec'], outline='#1c1208', gem=['#1e3a7a', '#4a78d0', '#b0c8ff']),
        'black': dict(ramp=['#120406', '#2c0c10', '#4a161a', '#6e2428', '#984040'], outline='#060102', gem=['#8a6a10', '#e8b830', '#fff2a0']),
    },
    'forkedgulch': {  # bleached bone vs. saddle leather
        'white': dict(ramp=['#6e5c46', '#a8937a', '#d4c3a6', '#f0e6d2', '#fffaf0'], outline='#1c1008', gem=['#16706a', '#2fbfb0', '#a8f0e6']),
        'black': dict(ramp=['#170d08', '#33201a', '#553428', '#7c4d38', '#a8735a'], outline='#080403', gem=['#16706a', '#2fbfb0', '#a8f0e6']),
    },
    'obsidiancourt': {  # ash-grey pumice vs. obsidian glass, lava inlay
        'white': dict(ramp=['#5a545a', '#8e8890', '#bcb6bc', '#e0dce0', '#f8f6f8'], outline='#100c10', gem=['#8a2a00', '#ff6a00', '#ffcc60']),
        'black': dict(ramp=['#0a0610', '#1c1428', '#322646', '#4e3e70', '#8a78c0'], outline='#000000', gem=['#8a2a00', '#ff6a00', '#ffcc60']),
    },
    'custom': {  # classic ivory vs. ebony
        'white': dict(ramp=['#6e6658', '#aaa292', '#d6d0c2', '#f2eee4', '#ffffff'], outline='#121014', gem=['#3a5a9a', '#6a90e0', '#c0d4ff']),
        'black': dict(ramp=['#08080a', '#1a1a20', '#303038', '#4c4c58', '#7c7c8a'], outline='#000000', gem=['#8a6a10', '#e0b030', '#fff0a0']),
    },
}


def classify(p):
    """'clear' | 'outline' | 'gem' | 'body' for one master pixel."""
    r, g, b, a = p
    if a < 128:
        return 'clear'
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if v < 0.16:
        return 'outline'
    if s > 0.35 and 0.24 <= h <= 0.40:  # green key-colour leftovers
        return 'outline'
    if s > 0.28 and 0.42 <= h <= 0.62 and v > 0.3:  # the master's cyan inlay
        return 'gem'
    return 'body'


def luminance(p):
    return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255


def repaint(master, mat):
    w, h = master.size
    px = master.load()
    kinds = [[classify(px[x, y]) for y in range(h)] for x in range(w)]

    # Smooth the master's noisy shading a little before quantising, so shade
    # bands come out as clean shapes instead of speckle.
    lum = [[luminance(px[x, y]) for y in range(h)] for x in range(w)]
    smooth = [[0.0] * h for _ in range(w)]
    body = []
    for x in range(w):
        for y in range(h):
            if kinds[x][y] != 'body':
                continue
            acc, n = 0.0, 0
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and kinds[xx][yy] == 'body':
                        wgt = 2 if dx == 0 and dy == 0 else 1
                        acc += lum[xx][yy] * wgt
                        n += wgt
            smooth[x][y] = acc / n
            body.append(smooth[x][y])

    body.sort()
    lo = body[int(len(body) * 0.03)]
    hi = body[int(len(body) * 0.97)]
    ramp = [hx(c) for c in mat['ramp']]
    gem = [hx(c) for c in mat['gem']]
    outline = hx(mat['outline'])

    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    op = out.load()
    for x in range(w):
        for y in range(h):
            k = kinds[x][y]
            if k == 'clear':
                continue
            if k == 'outline':
                op[x, y] = outline + (255,)
            elif k == 'gem':
                v = colorsys.rgb_to_hsv(*[c / 255 for c in px[x, y][:3]])[2]
                op[x, y] = gem[min(2, int(v * 3))] + (255,)
            else:
                t = (smooth[x][y] - lo) / max(1e-6, hi - lo)
                t = min(1.0, max(0.0, t)) ** 1.15
                op[x, y] = ramp[min(len(ramp) - 1, int(t * len(ramp)))] + (255,)

    # Pixels outside the silhouette that touch it get the outline, so every
    # piece reads against any square colour.
    for x in range(w):
        for y in range(h):
            if op[x, y][3] or kinds[x][y] != 'clear':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and kinds[xx][yy] == 'body':
                    op[x, y] = outline + (255,)
                    break
    return out


def make_pieces():
    masters = {t: Image.open(os.path.join(PIECES, f'{MASTER}_white_{t}.png')).convert('RGBA') for t in TYPES}
    for theme, sides in MATERIALS.items():
        for color, mat in sides.items():
            for t in TYPES:
                repaint(masters[t], mat).save(os.path.join(PIECES, f'{theme}_{color}_{t}.png'), optimize=True)
        print('pieces', theme)


# ---------------------------------------------------------------- boards ---
SQ = 32  # texels per square; the board is drawn scaled to fit


def noise_grid(seed, cells):
    rnd = random.Random(seed)
    return [[rnd.random() for _ in range(cells + 1)] for _ in range(cells + 1)]


def value_noise(grid, cells, x, y, size):
    fx, fy = x / size * cells, y / size * cells
    ix, iy = int(fx), int(fy)
    tx, ty = fx - ix, fy - iy
    tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    a = grid[iy][ix] + (grid[iy][ix + 1] - grid[iy][ix]) * tx
    b = grid[iy + 1][ix] + (grid[iy + 1][ix + 1] - grid[iy + 1][ix]) * tx
    return a + (b - a) * ty


class Noise:
    def __init__(self, seed, size, octaves=((4, 0.5), (8, 0.3), (16, 0.2))):
        self.size = size
        self.layers = [(noise_grid(seed * 31 + i, c), c, w) for i, (c, w) in enumerate(octaves)]

    def __call__(self, x, y):
        return sum(value_noise(g, c, x % self.size, y % self.size, self.size) * w for g, c, w in self.layers)


def rand(x, y, salt=0):
    """Deterministic white noise in [0, 1) for texel (x, y)."""
    h = (x * 374761393 + y * 668265263 + salt * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65536


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def quant(c, step=6):
    return tuple(v - v % step for v in c)


# Each painter returns the colour of texel (x, y) of a square.
# light: bool, sq: (col, row), base: the theme square colour.

def wood(n, grain_dir):
    def paint(x, y, base, light, sq):
        col, row = sq
        u, v = (x, y) if (col + row + grain_dir) % 2 == 0 else (y, x)
        off = (col * 37 + row * 91) % 200
        g = n(u * 0.25 + off, v * 3.0 + off)
        rings = math.sin((v + off) * 0.45 + g * 9) * 0.5 + 0.5
        f = 0.86 + rings * 0.16 + (n(u + off, v + off) - 0.5) * 0.12
        return shade(base, f)
    return paint


def marble(n, vein):
    def paint(x, y, base, light, sq):
        col, row = sq
        gx, gy = col * SQ + x, row * SQ + y
        t = math.sin((gx + gy) * 0.03 + n(gx, gy) * 4.0)
        v = abs(t)
        c = shade(base, 0.96 + n(gx * 2, gy * 2) * 0.08)
        if v < 0.025:
            c = mix(c, vein, 0.35)
        elif v < 0.07:
            c = mix(c, vein, 0.1)
        return c
    return paint


def metal_plate(n, rivet):
    def paint(x, y, base, light, sq):
        col, row = sq
        brushed = n(x * 0.3 + col * 50, y * 4 + row * 50)
        c = shade(base, 0.92 + brushed * 0.14)
        for rx, ry in ((3, 3), (SQ - 4, 3), (3, SQ - 4), (SQ - 4, SQ - 4)):
            d = (x - rx) ** 2 + (y - ry) ** 2
            if d <= 1:
                c = shade(rivet, 1.15 if (x - rx) + (y - ry) < 0 else 0.8)
        if x == 0 or y == 0:
            c = shade(c, 1.08)
        if x == SQ - 1 or y == SQ - 1:
            c = shade(c, 0.85)
        return c
    return paint


def planks(n, gaps=False, nails=None):
    """Horizontal boards, three per square; weathered: gaps and nail heads."""
    def paint(x, y, base, light, sq):
        col, row = sq
        board = y // 11
        off = (col * 53 + row * 29 + board * 71) % 300
        g = n(x * 0.3 + off, y * 3 + off)
        f = 0.88 + g * 0.18 + (board % 2) * 0.03
        c = shade(base, f)
        if y % 11 == 10:
            c = shade(base, 0.55 if gaps else 0.72)
        elif gaps and rand(col * SQ + x, row * SQ + y, 9) < 0.05:
            c = shade(c, 0.85)
        if nails and y % 11 == 5 and x in (2, SQ - 3):
            c = nails
        return c
    return paint


def grass(n):
    def paint(x, y, base, light, sq):
        col, row = sq
        gx, gy = col * SQ + x, row * SQ + y
        f = 0.88 + n(gx * 1.5, gy * 1.5) * 0.16
        blade = rand(gx, gy // 2, 5)
        if blade < 0.12:
            f *= 1.18
        elif blade > 0.9:
            f *= 0.82
        c = shade(base, f)
        if rand(gx, gy, 6) < 0.006:
            c = (255, 236, 120) if rand(gx, gy, 7) < 0.5 else (255, 250, 240)
        return c
    return paint


def either(light_paint, dark_paint):
    def paint(x, y, base, light, sq):
        return (light_paint if light else dark_paint)(x, y, base, light, sq)
    return paint


def tatami(n, binding):
    """Woven straw: fine rows, a dark cloth binding along two edges."""
    def paint(x, y, base, light, sq):
        col, row = sq
        horizontal = (col + row) % 4 < 2
        u, v = (x, y) if horizontal else (y, x)
        f = 0.94 + (0.06 if v % 2 else -0.02) + (n(u * 2 + col * 40, v * 0.5 + row * 40) - 0.5) * 0.1
        c = shade(base, f)
        if v < 2 or v > SQ - 3:
            c = binding
        return c
    return paint


def sandstone(n):
    """Layered strata with a chiselled block seam."""
    def paint(x, y, base, light, sq):
        col, row = sq
        gx, gy = col * SQ + x, row * SQ + y
        strata = math.sin(gy * 0.7 + n(gx, gy) * 5) * 0.5 + 0.5
        f = 0.9 + strata * 0.12 + (rand(gx, gy, 3) < 0.1) * 0.04
        c = shade(base, f)
        if (y == 15 and x > 1) or (x == (15 if y < 15 else 5)):
            c = shade(base, 0.8)
        return c
    return paint


def flagstone(n, moss):
    """Irregular flagstones with mossy cracks."""
    def paint(x, y, base, light, sq):
        col, row = sq
        gx, gy = col * SQ + x, row * SQ + y
        c = shade(base, 0.86 + n(gx, gy) * 0.22)
        crack = abs(math.sin(gx * 0.11 + n(gy, gx) * 7)) < 0.05 or abs(math.sin(gy * 0.13 + n(gx + 50, gy) * 6)) < 0.04
        if crack:
            c = mix(shade(c, 0.7), moss, 0.5)
        elif n(gx * 2 + 99, gy * 2) > 0.72:
            c = mix(c, moss, 0.45)
        return c
    return paint


def marble_inlay(n, vein, gold):
    """Marble squares framed by a thin gold inlay."""
    stone = marble(n, vein)

    def paint(x, y, base, light, sq):
        if x == 0 or y == 0:
            return gold
        if x == 1 or y == 1:
            return shade(gold, 0.7)
        return stone(x, y, base, light, sq)
    return paint


def inlaid_wood(n, inlay):
    """Polished parquet with a pale string inlay around each square."""
    grain = wood(n, 0)

    def paint(x, y, base, light, sq):
        c = grain(x, y, base, light, sq)
        if x in (2, SQ - 3) and 2 <= y <= SQ - 3 or y in (2, SQ - 3) and 2 <= x <= SQ - 3:
            return mix(c, inlay, 0.6)
        if (x + y) % 16 == 0:
            c = shade(c, 1.06)  # polish sheen
        return c
    return paint


def obsidian(n, sheen):
    """Black glass with curved conchoidal ripples and a violet sheen."""
    def paint(x, y, base, light, sq):
        col, row = sq
        gx, gy = col * SQ + x, row * SQ + y
        cx, cy = (col * 7 + row * 3) % 5 * 6 + 4, (col * 3 + row * 5) % 5 * 6 + 4
        ring = math.sin(math.hypot(x - cx, y - cy) * 0.9 + n(gx, gy) * 3)
        c = shade(base, 0.9 + n(gx * 1.3, gy * 1.3) * 0.16)
        if ring > 0.97:
            c = mix(c, sheen, 0.14 if light else 0.1)
        if x + y == 6 or x + y == 8:
            c = mix(c, (255, 255, 255), 0.12)
        return c
    return paint


def board_theme(theme):
    import json
    return json.loads(os.popen(
        "node -e \"const s=require('fs').readFileSync('" + os.path.join(ROOT, 'src/themes/themes.js') +
        "','utf8');const T=eval(s+';THEMES');console.log(JSON.stringify(T.find(t=>t.id==='" + theme + "').colors))\"").read())


def make_boards():
    size = SQ * 8
    n = Noise(7, size)
    painters = {
        'pawnhollow': either(planks(n), grass(n)),
        'trainingcamp': either(tatami(n, hx('#2e3a2a')), wood(n, 0)),
        'slantedsands': sandstone(n),
        'ironkeep': metal_plate(n, hx('#262a30')),
        'mistymoors': flagstone(n, hx('#4e6a3a')),
        'royalpalace': marble_inlay(n, hx('#a07080'), hx('#e0b048')),
        'clockworkcitadel': metal_plate(n, hx('#5a3a14')),
        'grandlibrary': inlaid_wood(n, hx('#f0d8a0')),
        'forkedgulch': planks(n, gaps=True, nails=hx('#3a3230')),
        'obsidiancourt': obsidian(n, hx('#8a7ab0')),
    }
    for theme, paint in painters.items():
        cols = board_theme(theme)
        light, dark = hx(cols['lightSquare']), hx(cols['darkSquare'])
        img = Image.new('RGB', (size, size))
        p = img.load()
        for row in range(8):
            for col in range(8):
                is_light = (row + col) % 2 == 0
                base = light if is_light else dark
                for y in range(SQ):
                    for x in range(SQ):
                        p[col * SQ + x, row * SQ + y] = quant(paint(x, y, base, is_light, (col, row)), 4)
        img.save(os.path.join(BOARDS, f'{theme}_board.png'), optimize=True)
        print('board', theme)


# -------------------------------------------------------------- previews ---
PREMIUM = os.path.join(ROOT, 'assets', 'textures', 'premium')
BACKGROUNDS = os.path.join(ROOT, 'assets', 'textures', 'backgrounds')


def scene_image(theme):
    """The theme's background with its animated layers at rest, 1280x800."""
    import json
    src = open(os.path.join(ROOT, 'src', 'themes', 'BackgroundScenes.js')).read()
    scenes = json.loads(src[src.index('{'):src.rindex('}') + 1])
    path = next(os.path.join(BACKGROUNDS, f) for f in os.listdir(BACKGROUNDS) if f.startswith(theme + '_bg.'))
    img = Image.open(path).convert('RGBA')
    for layer in scenes.get(theme, {}).get('layers', []):
        img.alpha_composite(Image.open(os.path.join(BACKGROUNDS, layer['file'])).convert('RGBA'), (layer['x'], layer['y']))
    return img.resize((1280, 800), Image.NEAREST if img.width == 640 else Image.LANCZOS)


def make_previews():
    """Theme Select cards (premium_theme_*) and the fallback backdrops (premium_bg_*)."""
    for theme in MATERIALS:
        if theme == 'custom':
            continue
        bg = scene_image(theme)
        bg.convert('RGB').save(os.path.join(PREMIUM, f'premium_bg_{theme}.png'), optimize=True)
        card = bg.resize((320, 200), Image.LANCZOS).crop((0, 10, 320, 190))
        board = Image.open(os.path.join(BOARDS, f'{theme}_board.png')).convert('RGBA').crop((0, 0, SQ * 8, SQ * 3))
        bw = 160
        board = board.resize((bw, bw * 3 // 8), Image.NEAREST)
        bx, by = (320 - bw) // 2, 180 - board.height - 14
        card.paste((0, 0, 0), (bx - 2, by - 2, bx + bw + 2, by + board.height + 2))
        card.paste(board, (bx, by))
        sq = bw // 8
        for i, (color, t) in enumerate((('black', 'rook'), ('black', 'queen'), ('white', 'knight'), ('white', 'king'))):
            piece = Image.open(os.path.join(PIECES, f'{theme}_{color}_{t}.png')).convert('RGBA').resize((sq * 2, sq * 2), Image.NEAREST)
            card.alpha_composite(piece, (bx + sq * (1 + i * 1.6).__int__(), by - sq))
        card.save(os.path.join(PREMIUM, f'premium_theme_{theme}.png'), optimize=True)
        print('preview', theme)


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'pieces'):
        make_pieces()
    if what in ('all', 'boards'):
        make_boards()
    if what in ('all', 'previews'):
        make_previews()
