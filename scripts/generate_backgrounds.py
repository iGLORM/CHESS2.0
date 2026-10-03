"""Paint layered, gently animated pixel-art backgrounds.

Scenes are drawn at 640x400 (one art pixel = two game units). Each scene is a
static base image plus layers the game animates (trees swaying, sand and
clouds drifting, gears turning...). The board covers the centre of the screen
in a game, so landmarks sit towards the left and right edges.

There is one scene per story world. The three hand-painted backgrounds
(trainingcamp, forkedgulch, crystal) get animated regions instead (ripples,
drifting sky), listed in PAINTED below.

    pip install pillow
    python3 scripts/generate_backgrounds.py            # all scenes
    python3 scripts/generate_backgrounds.py pawnhollow # one scene

Outputs assets/textures/backgrounds/{theme}_bg.png, one PNG per layer
({theme}_{layer}.png) and the manifest src/themes/BackgroundScenes.js.
"""
import json
import math
import os
import random
import sys

from PIL import Image, ImageDraw

W, H = 640, 400
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'textures', 'backgrounds')
MANIFEST = os.path.join(ROOT, 'src', 'themes', 'BackgroundScenes.js')

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def hx(c):
    if not isinstance(c, str):
        return tuple(c[:3])
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c[:3])


def dither_pick(colors, t, x, y):
    """Pick from a band palette at position t in [0, 1] with ordered dithering."""
    t = min(1.0, max(0.0, t)) * (len(colors) - 1)
    i = int(t)
    if i >= len(colors) - 1:
        return colors[-1]
    return colors[i + 1] if (t - i) * 16 > BAYER[y % 4][x % 4] + 0.5 else colors[i]


class PeriodicNoise:
    """Value noise that tiles horizontally across the 640px width."""

    def __init__(self, rnd, cell):
        assert W % cell == 0
        self.cell, self.cols, self.grid = cell, W // cell, {}
        self.rnd = rnd

    def _g(self, ix, iy):
        key = (ix % self.cols, iy)
        if key not in self.grid:
            self.grid[key] = self.rnd.random()
        return self.grid[key]

    def __call__(self, x, y):
        fx, fy = x / self.cell, y / self.cell
        ix, iy = math.floor(fx), math.floor(fy)
        tx, ty = fx - ix, fy - iy
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = self._g(ix, iy) + (self._g(ix + 1, iy) - self._g(ix, iy)) * tx
        b = self._g(ix, iy + 1) + (self._g(ix + 1, iy + 1) - self._g(ix, iy + 1)) * tx
        return a + (b - a) * ty


class Canvas:
    """RGB base image, or an RGBA layer when rgba=True."""

    def __init__(self, rgba=False, size=(W, H)):
        self.rgba = rgba
        self.w, self.h = size
        self.img = Image.new('RGBA' if rgba else 'RGB', size, (0, 0, 0, 0) if rgba else (0, 0, 0))
        self.px = self.img.load()
        self.draw = ImageDraw.Draw(self.img)

    def col(self, c, a=255):
        t = hx(c)
        return t + (a,) if self.rgba else t

    def put(self, x, y, c, a=255):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = self.col(c, a)

    def get(self, x, y):
        x, y = min(self.w - 1, max(0, x)), min(self.h - 1, max(0, y))
        return self.px[x, y][:3]

    def rect(self, x0, y0, x1, y1, c):
        self.draw.rectangle([x0, y0, x1, y1], fill=self.col(c))

    def poly(self, pts, c):
        self.draw.polygon(pts, fill=self.col(c))

    def ellipse(self, box, c):
        self.draw.ellipse(box, fill=self.col(c))

    def line(self, pts, c, width=1):
        self.draw.line(pts, fill=self.col(c), width=width)

    # --- base-image painting ---

    def sky(self, colors, y0=0, y1=H, curve=1.0):
        cols = [hx(c) for c in colors]
        for y in range(y0, y1):
            t = ((y - y0) / max(1, y1 - y0 - 1)) ** curve
            for x in range(W):
                self.px[x, y] = self.col(dither_pick(cols, t, x, y))

    def glow(self, cx, cy, radius, color, strength=0.5):
        """Soft dithered glow. On a layer it is painted with alpha."""
        c = hx(color)
        for y in range(max(0, cy - radius), min(self.h, cy + radius)):
            for x in range(max(0, cx - radius), min(self.w, cx + radius)):
                d = math.hypot(x - cx, y - cy) / radius
                if d >= 1:
                    continue
                t = (1 - d) ** 2 * strength
                if t * 16 <= BAYER[y % 4][x % 4] * 0.25 + (1 - t) * 4:
                    continue
                if self.rgba:
                    a = int(min(1.0, t * 1.6) * 255)
                    if a > self.px[x, y][3]:
                        self.px[x, y] = c + (a,)
                else:
                    self.px[x, y] = mix(self.px[x, y], c, min(1.0, t * 1.6))

    def stars(self, rnd, count, y1, colors=('#ffffff', '#fff4c8', '#c8d8ff'), big=0.06):
        for _ in range(count):
            x, y = rnd.randrange(W), rnd.randrange(int(y1))
            c = hx(rnd.choice(colors))
            self.put(x, y, mix(self.get(x, y), c, 0.35 + rnd.random() * 0.65))
            if rnd.random() < big:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    self.put(x + dx, y + dy, mix(self.get(x + dx, y + dy), c, 0.5))

    def ridge(self, rnd, base_y, rough, color, top=None, smooth=0.5, peaks=None, tilt=0.0):
        """A filled mountain/hill silhouette from midpoint displacement.
        tilt slopes the whole line (art px per px, positive = lower on the right)."""
        n = 257
        hts = [0.0] * n
        hts[0], hts[-1] = rnd.uniform(-1, 1), rnd.uniform(-1, 1)
        size, scale = n - 1, 1.0
        while size > 1:
            half = size // 2
            for i in range(half, n - 1, size):
                hts[i] = (hts[i - half] + hts[i + half]) / 2 + rnd.uniform(-1, 1) * scale
            size, scale = half, scale * smooth
        for x in range(W):
            f = x / (W - 1) * (n - 1)
            i = int(f)
            h = hts[i] + (hts[min(n - 1, i + 1)] - hts[i]) * (f - i)
            if peaks:
                for px_, py_, pw in peaks:
                    h -= max(0.0, 1 - abs(x - px_) / pw) * py_ / rough
            y0 = int(base_y + h * rough + (x - W / 2) * tilt)
            for y in range(max(0, y0), H):
                self.px[x, y] = self.col(color)
            if top and 0 <= y0 < H:
                self.px[x, y0] = self.col(top)

    def disc(self, cx, cy, r, colors, light=(-0.6, -0.6)):
        """A lit sphere (planet, moon, sun) with dithered shading bands."""
        cols = [hx(c) for c in colors]
        lx, ly = light
        ln = math.hypot(lx, ly, 0.6)
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                dx, dy = (x - cx) / r, (y - cy) / r
                d2 = dx * dx + dy * dy
                if d2 > 1:
                    continue
                dz = math.sqrt(1 - d2)
                lit = max(0.0, -(dx * lx + dy * ly) / ln + dz * 0.6 / ln)
                self.put(x, y, dither_pick(cols, min(1.0, lit), x, y))

    # --- layer painting ---

    def clouds(self, rnd, colors, y0, y1, density, cell=80, alpha=0.7, fade=12):
        """Horizontally tiling dithered clouds (for drifting layers)."""
        cols = [hx(c) for c in colors]
        n1, n2 = PeriodicNoise(rnd, cell), PeriodicNoise(rnd, max(16, cell // 2))
        for y in range(y0, y1):
            edge = min(1.0, (y - y0) / fade, (y1 - 1 - y) / fade)
            for x in range(W):
                v = n1(x, y * 2.2) * 0.6 + n2(x, y * 2.2) * 0.4 - (1 - density)
                if v <= 0:
                    continue
                t = min(1.0, v / density * 1.8)
                if t * 16 * edge > BAYER[y % 4][x % 4]:
                    self.put(x, y, dither_pick(cols, t, x, y), int(alpha * 255))


class Scene:
    def __init__(self, name):
        self.name = name
        self.base = Canvas()
        self.layers = []

    def layer(self, key, motion=None, size=(W, H), origin=(0, 0)):
        c = Canvas(rgba=True, size=size)
        self.layers.append((key, c, motion or {'type': 'static'}, origin))
        return c

    def save(self):
        for f in os.listdir(OUT):  # layers from an earlier run of this scene
            if f.startswith(self.name + '_') and f.endswith('.png'):
                os.remove(os.path.join(OUT, f))
        self.base.img.save(os.path.join(OUT, f'{self.name}_bg.png'), optimize=True)
        entries = []
        for key, c, motion, (ox, oy) in self.layers:
            bbox = c.img.getbbox()
            if not bbox:
                continue
            if motion['type'] == 'drift':  # keep full width so it tiles
                bbox = (0, bbox[1], c.w, bbox[3])
            img = c.img.crop(bbox)
            fname = f'{self.name}_{key}.png'
            img.save(os.path.join(OUT, fname), optimize=True)
            m = dict(motion)
            for k in ('pivot', 'center'):
                if k in m:  # make pivots relative to the cropped image
                    m[k] = [m[k][0] - ox - bbox[0], m[k][1] - oy - bbox[1]]
            entries.append({'file': fname, 'x': ox + bbox[0], 'y': oy + bbox[1],
                            'w': img.width, 'h': img.height, 'motion': m})
        return {'layers': entries}


# ------------------------------------------------------------------ pieces --

def pine(c, x, yb, h, col):
    for k in range(4):
        w = h * (k + 1) // 7
        top = yb - h + k * h // 5
        c.poly([(x - w, top + h // 3), (x, top), (x + w, top + h // 3)], col)
    c.rect(x - 1, yb - 8, x + 1, yb, col)


def palm(c, x, yb, h, lean, col):
    tx = x
    for k in range(h):
        tx = x + int(lean * (k / h) ** 2 * 18)
        c.rect(tx - 1, yb - k, tx + 1, yb - k, col)
    ty = yb - h
    for a in (-150, -120, -60, -30, -170, -10, -95):
        ang = math.radians(a)
        for s in range(0, 26):
            sx = tx + math.cos(ang) * s
            sy = ty + math.sin(ang) * s + (s / 26) ** 2 * 14
            c.rect(int(sx), int(sy), int(sx) + 1, int(sy) + 1, col)
    return tx


def fern(c, fx, fy, s, flip, col):
    for a in range(-80, 81, 20):
        ang = math.radians(-90 + a * 0.9)
        ln = 70 * s * (1 - abs(a) / 200)
        for k in range(int(ln)):
            t = k / ln
            x = fx + math.cos(ang) * k + flip * t * t * 20 * (a / 80)
            y = fy + math.sin(ang) * k + t * t * 30 * s
            c.rect(int(x), int(y), int(x) + 1, int(y) + 1, col)
            if k % 4 == 0 and k > 6:
                for side in (-1, 1):
                    lx = x + math.cos(ang + side * 1.2) * 6 * s * (1 - t)
                    ly = y + math.sin(ang + side * 1.2) * 6 * s * (1 - t)
                    c.line([(x, y), (lx, ly)], col)


def gear(c, cx, cy, r, teeth, col, hole):
    for t in range(teeth):
        a = t / teeth * math.pi * 2
        pts = [(cx + math.cos(a + da) * rr, cy + math.sin(a + da) * rr)
               for da, rr in ((-0.12, r), (-0.07, r * 1.18), (0.07, r * 1.18), (0.12, r))]
        c.poly(pts, col)
    c.ellipse([cx - r, cy - r, cx + r, cy + r], col)
    c.ellipse([cx - r * 0.35, cy - r * 0.35, cx + r * 0.35, cy + r * 0.35], hole)
    for k in range(5):
        a = k / 5 * math.pi * 2
        hxp, hyp = cx + math.cos(a) * r * 0.65, cy + math.sin(a) * r * 0.65
        c.ellipse([hxp - r * 0.14, hyp - r * 0.14, hxp + r * 0.14, hyp + r * 0.14], hole)


def airship(c, x, y, s):
    body = [hx('#3a2a1c'), hx('#6a4a2c'), hx('#9a6e3c'), hx('#c8a060')]
    rx, ry = int(60 * s), int(20 * s)
    for yy in range(-ry, ry + 1):
        for xx in range(-rx, rx + 1):
            if (xx / rx) ** 2 + (yy / ry) ** 2 <= 1:
                t = 1 - (yy + ry) / (2 * ry)
                col = dither_pick(body, t * 0.9, x + xx, y + yy)
                if (xx + rx - 8) % max(1, int(12 * s)) == 0:
                    col = shade(col, 0.75)
                c.put(x + xx, y + yy, col)
    c.poly([(x - rx - 2, y), (x - rx - 16 * s, y - 14 * s), (x - rx - 12 * s, y), (x - rx - 16 * s, y + 14 * s)], '#2a1c10')
    gy = y + ry + int(6 * s)
    c.rect(x - int(18 * s), gy, x + int(18 * s), gy + int(8 * s), '#2a1c10')
    for wx in range(x - int(14 * s), x + int(14 * s), max(2, int(6 * s))):
        c.rect(wx, gy + 2, wx + 1, gy + 3, '#ffc860')
    c.line([(x - int(12 * s), y + ry - 2), (x - int(16 * s), gy)], '#2a1c10')
    c.line([(x + int(12 * s), y + ry - 2), (x + int(16 * s), gy)], '#2a1c10')


def smoke_column(c, x, y, n, grow, dx, dy, c0, c1):
    for k in range(n):
        r = 3 + k * grow
        sx = x + k * dx + math.sin(k) * 2
        sy = y - k * dy
        c.ellipse([sx - r, sy - r * 0.7, sx + r, sy + r * 0.7], mix(hx(c0), hx(c1), k / n))


def orchard_tree(c, x, yb, r, trunk, leaves, blossom=None, rnd=None):
    """A round fruit/blossom tree: trunk plus dithered leaf clumps."""
    c.rect(x - 2, yb - r - 4, x + 2, yb, trunk)
    c.line([(x, yb - r), (x - r // 2, yb - r - r // 2)], trunk, 2)
    c.line([(x, yb - r), (x + r // 2, yb - r - r // 3)], trunk, 2)
    cols = [hx(v) for v in leaves]
    for (dx, dy, rr) in ((0, -r * 1.5, r), (-r * 0.7, -r * 1.2, r * 0.75), (r * 0.7, -r * 1.25, r * 0.8),
                         (-r * 0.2, -r * 2.1, r * 0.7), (r * 0.4, -r * 1.9, r * 0.6)):
        cx, cy = x + dx, yb + dy
        for yy in range(int(cy - rr), int(cy + rr) + 1):
            for xx in range(int(cx - rr), int(cx + rr) + 1):
                d = math.hypot(xx - cx, yy - cy) / rr
                if d > 1:
                    continue
                lit = 1 - ((yy - (cy - rr)) / (2 * rr)) * 0.8 - (xx - cx) / rr * 0.15
                c.put(xx, yy, dither_pick(cols, lit, xx, yy))
    if blossom and rnd:
        for _ in range(int(r * r * 0.35)):
            a, d = rnd.random() * math.pi * 2, rnd.random() ** 0.5 * r * 1.3
            bx, by = int(x + math.cos(a) * d), int(yb - r * 1.55 + math.sin(a) * d * 0.9)
            if c.px[max(0, min(c.w - 1, bx)), max(0, min(c.h - 1, by))][-1 if c.rgba else 0]:
                c.put(bx, by, rnd.choice(blossom))


def cottage(c, x, yb, w, h, wall, wall_dark, roof, roof_dark, win, door='#3a2414'):
    """A little house with a pitched roof; returns the window rects."""
    c.rect(x, yb - h, x + w, yb, wall)
    c.rect(x + w - max(2, w // 6), yb - h, x + w, yb, wall_dark)
    rh = int(w * 0.55)
    c.poly([(x - 4, yb - h), (x + w // 2, yb - h - rh), (x + w + 4, yb - h)], roof)
    c.poly([(x + w // 2, yb - h - rh), (x + w + 4, yb - h), (x + w // 2 + 2, yb - h)], roof_dark)
    for k in range(3, rh, 4):  # thatch lines
        yy = yb - h - rh + k
        half = int((k / rh) * (w / 2 + 4))
        c.line([(x + w // 2 - half, yy), (x + w // 2 + half, yy)], shade(hx(roof), 0.85))
    c.rect(x + w // 2 - 3, yb - 11, x + w // 2 + 3, yb, door)
    wins = []
    for wx in (x + 4, x + w - 11):
        c.rect(wx, yb - h + 6, wx + 6, yb - h + 12, '#2a1a10')
        c.rect(wx + 1, yb - h + 7, wx + 5, yb - h + 11, win)
        wins.append((wx + 1, yb - h + 7))
    return wins


def column(c, x, y0, y1, w, colors, capital):
    """A fluted column with a capital and base, lit from the left."""
    cols = [hx(v) for v in colors]
    for xx in range(x, x + w):
        t = 1 - (xx - x) / max(1, w - 1)
        for yy in range(y0, y1):
            v = t * 0.9 + 0.05
            if (xx - x) % 5 == 0:
                v *= 0.75
            c.put(xx, yy, dither_pick(cols, v, xx, yy))
    c.rect(x - 4, y0 - 8, x + w + 4, y0, capital)
    c.rect(x - 2, y0 - 12, x + w + 2, y0 - 8, capital)
    c.rect(x - 4, y1, x + w + 4, y1 + 8, capital)


def book_shelf(c, rnd, x0, x1, y0, y1, wood, wood_dark, spines):
    """Floor-to-ceiling shelves packed with book spines."""
    c.rect(x0, y0, x1, y1, wood_dark)
    shelf_h = 34
    y = y0 + 6
    while y + shelf_h < y1:
        x = x0 + 4
        while x < x1 - 4:
            bw = rnd.randrange(3, 7)
            bh = rnd.randrange(shelf_h - 14, shelf_h - 3)
            if x + bw > x1 - 4:
                break
            if rnd.random() < 0.06:  # a leaning book
                c.poly([(x, y + shelf_h - 2), (x + bw, y + shelf_h - 2), (x + bw + 6, y + shelf_h - bh), (x + 6, y + shelf_h - bh)],
                       rnd.choice(spines))
                x += bw + 7
                continue
            col = hx(rnd.choice(spines))
            c.rect(x, y + shelf_h - bh, x + bw - 1, y + shelf_h - 2, col)
            c.rect(x, y + shelf_h - bh, x, y + shelf_h - 2, shade(col, 1.25))
            if bh > 18:
                c.rect(x, y + shelf_h - bh + 4, x + bw - 1, y + shelf_h - bh + 5, '#e0c060')
            x += bw
        c.rect(x0, y + shelf_h - 2, x1, y + shelf_h + 2, wood)
        c.line([(x0, y + shelf_h - 2), (x1, y + shelf_h - 2)], shade(hx(wood), 1.2))
        y += shelf_h + 4
    c.rect(x0, y0, x0 + 3, y1, wood)
    c.rect(x1 - 3, y0, x1, y1, wood)


def clock_face(c, cx, cy, r, rim, face, marks):
    c.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], rim)
    c.ellipse([cx - r, cy - r, cx + r, cy + r], face)
    for k in range(12):
        a = k / 12 * math.pi * 2
        ln = 5 if k % 3 == 0 else 3
        c.line([(cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2)),
                (cx + math.cos(a) * (r - 2 - ln), cy + math.sin(a) * (r - 2 - ln))], marks, 2 if k % 3 == 0 else 1)


def clock_hand(scene, name, cx, cy, length, width, col, speed):
    """A clock hand on its own layer, turning around (cx, cy)."""
    R = length + 3
    c = scene.layer(name, {'type': 'spin', 'center': [cx, cy], 'speed': speed},
                    size=(2 * R, 2 * R), origin=(cx - R, cy - R))
    c.poly([(R - width, R + 4), (R, R - length), (R + width, R + 4)], col)
    c.ellipse([R - 2, R - 2, R + 2, R + 2], col)


def ruined_tower(c, x, yb, w, h, stone, dark, rnd):
    """A broken watchtower: jagged top, a slit window, stone courses."""
    top = yb - h
    edge = [(x + k, top + int(k / w * 14) + rnd.randrange(0, 5) * (k % 3 == 0)) for k in range(0, w + 1, 3)]
    c.poly([(x, yb)] + edge + [(x + w, yb)], stone)
    c.poly([(x + w - w // 4, yb)] + [p for p in edge if p[0] >= x + w - w // 4] + [(x + w, yb)], dark)
    for yy in range(top + 18, yb, 7):
        c.line([(x + 1, yy), (x + w - 1, yy)], shade(hx(stone), 0.82))
        for xx in range(x + (yy // 7) % 2 * 4, x + w, 8):
            c.put(xx, yy + 3, shade(hx(stone), 0.82))
    c.rect(x + w // 2 - 1, top + 30, x + w // 2 + 1, top + 40, '#101412')


# ------------------------------------------------------------------ scenes --

def pawnhollow():
    """A farm village in golden afternoon light: windmill, cottages, orchard."""
    rnd = random.Random(31)
    s = Scene('pawnhollow')
    b = s.base
    b.sky(['#4a86c8', '#6aa4d8', '#94c0e0', '#c4d8d8', '#f0dcb0', '#ffd08a'], 0, 280, curve=1.1)
    b.glow(470, 150, 150, '#fff0b0', 0.35)
    b.disc(470, 150, 22, ['#ffd070', '#ffe8a0', '#fff8d8'], light=(0, -0.2))
    s.layer('clouds', {'type': 'drift', 'speed': 4}).clouds(
        rnd, ['#e8e4e0', '#fff4e8', '#ffffff'], 20, 150, 0.3, cell=80, alpha=0.85)
    b.ridge(rnd, 225, 30, '#7aa0a0', top='#8ab0a8', smooth=0.55, peaks=[(420, 30, 160)])
    b.ridge(rnd, 255, 22, '#6a9a5a', top='#7eae66', smooth=0.5)
    # Patchwork fields on the middle hill.
    for y in range(262, 300):
        for x in range(W):
            if b.px[x, y] == hx('#6a9a5a'):
                band = (x // 70 + y // 12) % 3
                b.put(x, y, ['#7ea85a', '#a8b458', '#8aa04a'][band] if (x + y) % 2 else ['#76a054', '#9eaa52', '#82984a'][band])
    b.ridge(rnd, 300, 12, '#4e8a3a', top='#62a044', smooth=0.45)
    # Birds.
    for i, (bx, by, sp) in enumerate(((240, 70, 9), (280, 90, 7))):
        c = s.layer(f'bird{i}', {'type': 'fly', 'speed': sp, 'amp': 3, 'period': 0.7 + i * 0.2, 'phase': i})
        c.line([(bx - 4, by - 2), (bx, by), (bx + 4, by - 2)], '#3a3a4a')
    # Windmill on the left, sails on a spinning layer.
    mx, my = 70, 196
    b.poly([(mx - 16, 300), (mx - 10, my), (mx + 10, my), (mx + 16, 300)], '#e8d8b8')
    b.poly([(mx + 4, 300), (mx + 6, my), (mx + 10, my), (mx + 16, 300)], '#c8b490')
    b.poly([(mx - 14, my + 2), (mx, my - 18), (mx + 14, my + 2)], '#8a3a2a')
    b.rect(mx - 3, 282, mx + 3, 300, '#5a3a22')
    b.rect(mx - 3, 236, mx + 2, 242, '#3a2a1a')
    R = 50
    sails = s.layer('sails', {'type': 'spin', 'center': [mx, my - 2], 'speed': 0.5},
                    size=(2 * R, 2 * R), origin=(mx - R, my - 2 - R))
    for k in range(4):
        a = k * math.pi / 2 + 0.3
        ex, ey = R + math.cos(a) * 46, R + math.sin(a) * 46
        sails.line([(R, R), (ex, ey)], '#5a3a22', 2)
        nx, ny = -math.sin(a), math.cos(a)
        for t in range(10, 46, 1):
            px_, py_ = R + math.cos(a) * t, R + math.sin(a) * t
            for w_ in range(1, 9):
                col = '#f4ecd8' if (t // 5 + w_ // 3) % 2 else '#d8ccb4'
                sails.put(int(px_ + nx * w_), int(py_ + ny * w_), col)
    sails.ellipse([R - 3, R - 3, R + 3, R + 3], '#3a2a1a')
    # Cottages and a barn.
    chimneys = []
    cottage(b, 108, 305, 34, 22, '#f0e0c0', '#d0bc98', '#c89a4a', '#a07a36', '#ffd070')
    chimneys.append((132, 305 - 22 - 16))
    b.rect(130, 305 - 22 - 20, 134, 305 - 22 - 8, '#7a5a44')
    # Barn (red) on the right with a hay loft.
    bx = 520
    b.rect(bx, 255, bx + 60, 305, '#a83a2a')
    b.rect(bx + 50, 255, bx + 60, 305, '#86281e')
    b.poly([(bx - 5, 256), (bx + 12, 232), (bx + 48, 232), (bx + 65, 256)], '#5a2a22')
    for yy in range(260, 305, 5):
        b.line([(bx, yy), (bx + 50, yy)], '#96301f')
    b.rect(bx + 20, 280, bx + 40, 305, '#f0e0c0')
    b.line([(bx + 20, 280), (bx + 40, 305)], '#a83a2a', 2)
    b.line([(bx + 40, 280), (bx + 20, 305)], '#a83a2a', 2)
    b.rect(bx + 25, 240, bx + 35, 250, '#f0c860')
    cottage(b, 590, 310, 30, 20, '#f0e0c0', '#d0bc98', '#c89a4a', '#a07a36', '#ffd070')
    b.rect(612, 310 - 20 - 18, 616, 310 - 20 - 6, '#7a5a44')
    chimneys.append((614, 310 - 20 - 20))
    smoke = s.layer('smoke', {'type': 'sway', 'pivot': [132, 267], 'amount': 0.05, 'period': 6})
    for (cx_, cy_) in chimneys:
        smoke_column(smoke, cx_, cy_, 9, 1.3, 2, 6, '#c8c0b8', '#f0ece8')
    # Fence and hay bales.
    for fx in range(0, 180, 12):
        b.rect(fx, 312, fx + 2, 326, '#8a6a44')
    b.line([(0, 316), (180, 316)], '#a07e52', 2)
    b.line([(0, 322), (180, 322)], '#a07e52', 2)
    for (hx_, hy_) in ((470, 318), (492, 322), (150, 330)):
        b.ellipse([hx_ - 11, hy_ - 9, hx_ + 11, hy_ + 9], '#e8c060')
        b.ellipse([hx_ - 11, hy_ - 9, hx_ + 5, hy_ + 9], '#f4d480')
        for k in range(-6, 8, 4):
            b.line([(hx_ + k, hy_ - 8), (hx_ + k, hy_ + 8)], '#c8a040')
    b.ridge(rnd, 345, 10, '#3e7a2e', top='#58963c', smooth=0.45)
    # Orchard trees sway at the edges; blossoms speckle the leaves.
    for i, (x, yb, r) in enumerate(((22, 400, 26), (140, 400, 20), (470, 400, 18), (610, 400, 28))):
        c = s.layer(f'tree{i}', {'type': 'sway', 'pivot': [x, yb], 'amount': 0.018, 'period': 4.5 + i * 0.6, 'phase': i * 1.1})
        orchard_tree(c, x, yb, r, '#5a3a22', ['#2e5a24', '#3e7a2e', '#5a9a3a', '#86bc4a'],
                     blossom=['#ffe0ea', '#ffc0d0', '#ffffff'], rnd=rnd)
    # Grass tufts.
    for _ in range(260):
        x, y = rnd.randrange(W), rnd.randrange(350, 400)
        b.line([(x, y), (x + rnd.choice((-1, 0, 1)), y - rnd.randrange(2, 5))], rnd.choice(['#6aac44', '#4e8a34', '#84c054']))
    for _ in range(40):
        x, y = rnd.randrange(W), rnd.randrange(352, 398)
        b.put(x, y, rnd.choice(['#ffe070', '#ffffff', '#ff9aa8']))
    return s


def slantedsands():
    """A desert where everything leans: tilted dunes, pyramids and obelisks."""
    rnd = random.Random(3)
    s = Scene('slantedsands')
    b = s.base
    b.sky(['#2a1438', '#5a1e48', '#9a2e44', '#d8503a', '#f48a3a', '#ffbc50', '#ffe07a'], 0, 300, curve=0.9)
    b.stars(rnd, 90, 80, big=0.02)
    b.disc(430, 120, 34, ['#ff9a30', '#ffc040', '#ffe070', '#fff4b0'], light=(0, -0.2))
    s.layer('sunglow', {'type': 'pulse', 'min': 0.6, 'max': 1.0, 'period': 6}).glow(430, 120, 130, '#ffb040', 0.4)
    s.layer('clouds', {'type': 'drift', 'speed': 4}).clouds(
        rnd, ['#a03a4a', '#e0604a', '#ffa060'], 60, 200, 0.24, cell=80, alpha=0.55)
    b.ridge(rnd, 250, 18, '#b0603a', top='#d08048', smooth=0.45, tilt=0.08)

    def lean(pts, ax, ay, ang):
        ca, sa = math.cos(ang), math.sin(ang)
        return [(ax + (x - ax) * ca - (y - ay) * sa, ay + (x - ax) * sa + (y - ay) * ca) for x, y in pts]

    def pyramid(cx, by, hw, h, lit, dark, ang):
        apex = (cx, by - h)
        b.poly(lean([(cx - hw, by), apex, (cx, by)], cx, by, ang), lit)
        b.poly(lean([apex, (cx + hw, by), (cx, by)], cx, by, ang), dark)
        for k in range(6, h, 7):
            y, w = by - h + k, hw * k // h
            b.line(lean([(cx - w, y), (cx - 1, y)], cx, by, ang), shade(hx(lit), 0.88))
            b.line(lean([(cx, y), (cx + w, y)], cx, by, ang), shade(hx(dark), 0.88))

    pyramid(95, 300, 100, 130, '#d08040', '#7a3822', -0.14)
    pyramid(200, 296, 55, 70, '#c07038', '#6a3020', -0.2)
    pyramid(560, 312, 85, 105, '#c07038', '#6a3020', 0.16)
    # Leaning obelisks.
    for (ox, oy, oh, ang) in ((470, 300, 90, 0.22), (28, 318, 70, -0.25)):
        pts = [(ox - 6, oy), (ox - 4, oy - oh), (ox, oy - oh - 10), (ox + 4, oy - oh), (ox + 6, oy)]
        b.poly(lean(pts, ox, oy, ang), '#8a4a2a')
        b.poly(lean([(ox, oy), (ox, oy - oh - 10), (ox + 4, oy - oh), (ox + 6, oy)], ox, oy, ang), '#5a2a1a')
        for k in range(14, oh - 8, 12):
            b.poly(lean([(ox - 2, oy - k), (ox + 1, oy - k), (ox + 1, oy - k - 5), (ox - 2, oy - k - 5)], ox, oy, ang), '#ffc060')
    b.ridge(rnd, 305, 16, '#9a5230', top='#c8743e', smooth=0.4, tilt=-0.1)
    b.ridge(rnd, 338, 20, '#6a3420', top='#9a5230', smooth=0.45, tilt=0.12)
    b.ridge(rnd, 372, 14, '#3a1a10', top='#5a2c18', smooth=0.45, tilt=-0.08)
    # Dune ripples.
    for y in range(310, 400, 3):
        for x in range(0, W, 2):
            if rnd.random() < 0.08:
                b.put(x, y + int(math.sin(x * 0.05) * 2), shade(b.get(x, y), 1.12))
    s.layer('sand_far', {'type': 'drift', 'speed': 9}).clouds(
        rnd, ['#c8783a', '#e8a060', '#ffd090'], 280, 345, 0.3, cell=40, alpha=0.35, fade=10)
    s.layer('sand_near', {'type': 'drift', 'speed': 18}).clouds(
        rnd, ['#8a4a2a', '#c8783a', '#f0b070'], 340, 400, 0.3, cell=32, alpha=0.4, fade=10)
    for i, (x, yb, h, ln) in enumerate(((50, 385, 64, 1.6), (606, 390, 60, -1.6), (580, 398, 40, -1))):
        c = s.layer(f'palm{i}', {'type': 'sway', 'pivot': [x, yb], 'amount': 0.035, 'period': 3.6 + i * 0.45, 'phase': i * 1.3})
        palm(c, x, yb, h, ln, '#1a0a06')
    return s


def ironkeep():
    """A riveted iron fortress at dusk, forge light pouring from the gate."""
    rnd = random.Random(5)
    s = Scene('ironkeep')
    b = s.base
    b.sky(['#0a0c18', '#141a2e', '#222a44', '#3a3a52', '#5a4250', '#8a4a3a', '#c86a3a'], 0, 300, curve=1.25)
    b.stars(rnd, 200, 150, big=0.03)
    s.layer('clouds', {'type': 'drift', 'speed': 3}).clouds(
        rnd, ['#1e2234', '#34384a', '#5a4a52'], 40, 190, 0.34, cell=80, alpha=0.8)
    b.ridge(rnd, 245, 44, '#1e2230', top='#2a3040', smooth=0.55, peaks=[(320, 40, 200)])
    b.ridge(rnd, 285, 24, '#161822', top='#20242e', smooth=0.5)
    iron, iron_lit, iron_dark, rivet = '#3a4048', '#56606a', '#22262c', '#7a848e'

    def plated(x0, y0, x1, y1):
        b.rect(x0, y0, x1, y1, iron)
        b.rect(x0, y0, x0 + 2, y1, iron_lit)
        b.rect(x1 - 3, y0, x1, y1, iron_dark)
        for yy in range(y0 + 12, y1, 14):
            b.line([(x0, yy), (x1, yy)], iron_dark)
            b.line([(x0, yy + 1), (x1, yy + 1)], iron_lit)
            for xx in range(x0 + 4, x1 - 2, 8):
                b.put(xx, yy - 3, rivet)
        for xx in range(x0 + 16, x1 - 4, 18):
            b.line([(xx, y0), (xx, y1)], iron_dark)

    def tower(x, w, h, base):
        plated(x, base - h, x + w, base + 60)
        for k in range(x, x + w, 7):
            b.rect(k, base - h - 7, k + 4, base - h, iron)
            b.rect(k, base - h - 7, k + 1, base - h, iron_lit)
        b.poly([(x - 3, base - h - 7), (x + w // 2, base - h - 34), (x + w + 3, base - h - 7)], iron_dark)
        b.line([(x + w // 2, base - h - 34), (x - 3, base - h - 7)], iron_lit)

    base = 300
    plated(0, 210, 170, base + 100)
    tower(12, 34, 140, base)
    tower(122, 36, 130, base)
    plated(470, 220, 640, base + 100)
    tower(470, 34, 120, base)
    tower(590, 40, 150, base)
    for x in range(0, 170, 10):
        b.rect(x, 202, x + 6, 210, iron)
    for x in range(470, 640, 10):
        b.rect(x, 212, x + 6, 220, iron)
    # Gate with a portcullis, lit by the forge inside.
    gx, gy1 = 70, 356
    b.rect(gx, 250, gx + 44, gy1, '#5a1e0a')
    b.draw.pieslice([gx, 230, gx + 44, 272], 180, 360, fill=b.col('#5a1e0a'))
    forge = s.layer('forge', {'type': 'pulse', 'min': 0.4, 'max': 1.0, 'period': 2.2})
    for yy in range(234, gy1):
        for xx in range(gx, gx + 45):
            if yy < 251 and math.hypot(xx - gx - 22, yy - 251) > 22:
                continue
            t = (yy - 234) / (gy1 - 234)
            forge.put(xx, yy, dither_pick([hx('#8a2a0a'), hx('#d8561a'), hx('#ffa030'), hx('#ffe080')], t, xx, yy))
    forge.glow(gx + 22, gy1, 70, '#ff7a20', 0.5)
    bars = s.layer('portcullis')
    for xx in range(gx + 3, gx + 44, 6):
        bars.rect(xx, 232, xx + 1, gy1 - 18, '#141418')
    for yy in range(244, gy1 - 18, 8):
        bars.rect(gx, yy, gx + 44, yy + 1, '#141418')
    for xx in range(gx + 3, gx + 44, 6):
        bars.poly([(xx - 1, gy1 - 18), (xx + 2, gy1 - 18), (xx + 0.5, gy1 - 14)], '#141418')
    lights = s.layer('windows', {'type': 'flicker', 'min': 0.5, 'max': 1.0, 'speed': 3})
    for (wx, wy) in ((27, 190), (27, 225), (138, 200), (138, 240), (486, 210), (606, 180), (606, 225), (540, 250), (560, 250)):
        lights.glow(wx + 1, wy + 3, 8, '#ff9a30', 0.45)
        lights.rect(wx, wy, wx + 3, wy + 6, '#ffb040')
    flags = s.layer('flags', {'type': 'sway', 'pivot': [610, 110], 'amount': 0.02, 'period': 2.4})
    for (fx, top) in ((29, base - 140 - 34), (140, base - 130 - 34), (487, base - 120 - 34), (610, base - 150 - 34)):
        b.rect(fx, top - 16, fx, top, iron_lit)
        flags.poly([(fx + 1, top - 16), (fx + 14, top - 13), (fx + 1, top - 9)], '#b8281e')
    smoke = s.layer('smoke', {'type': 'sway', 'pivot': [540, 220], 'amount': 0.05, 'period': 7})
    b.rect(536, 170, 544, 222, iron_dark)
    smoke_column(smoke, 540, 164, 12, 1.2, 3, 7, '#2a2a30', '#5a5a64')
    b.ridge(rnd, 360, 10, '#0c0c12', top='#16161e', smooth=0.45)
    for _ in range(18):
        x, y = rnd.randrange(190, 450), rnd.randrange(300, 340)
        b.put(x, y, '#ff9030')
    return s


def mistymoors():
    """Fog rolling over heather and broken watchtowers under a pale moon."""
    rnd = random.Random(19)
    s = Scene('mistymoors')
    b = s.base
    b.sky(['#141c24', '#1e2a32', '#2e3c42', '#46545a', '#687674', '#8a9690'], 0, 290, curve=1.0)
    b.stars(rnd, 70, 120, colors=('#dde8e4', '#b8c8c4'), big=0.01)
    b.disc(470, 80, 24, ['#6a7a78', '#a8b8b4', '#dce8e2', '#f4fcf8'], light=(-0.5, -0.4))
    b.glow(470, 80, 100, '#c8dcd4', 0.25)
    s.layer('fog_high', {'type': 'drift', 'speed': 2.5}).clouds(
        rnd, ['#4a5a5e', '#6a7a7a', '#8a9a96'], 60, 200, 0.35, cell=80, alpha=0.6)
    b.ridge(rnd, 230, 36, '#2e3a38', top='#3e4a46', smooth=0.55)
    b.ridge(rnd, 268, 22, '#26302c', top='#323e38', smooth=0.5)
    ruined_tower(b, 40, 290, 36, 130, '#2e3634', '#20282a', rnd)
    ruined_tower(b, 556, 295, 32, 110, '#2e3634', '#20282a', rnd)
    ruined_tower(b, 140, 276, 18, 50, '#34403c', '#26302c', rnd)
    lights = s.layer('lantern', {'type': 'flicker', 'min': 0.2, 'max': 1.0, 'speed': 2})
    lights.glow(574, 225, 12, '#9ff0d0', 0.6)
    lights.rect(573, 223, 575, 227, '#c8fff0')
    b.ridge(rnd, 300, 14, '#1e2622', top='#2a342e', smooth=0.45)
    s.layer('fog_mid', {'type': 'drift', 'speed': -4}).clouds(
        rnd, ['#6a7a78', '#8e9c98', '#b0bcb6'], 220, 320, 0.4, cell=64, alpha=0.55, fade=16)
    # Dead trees at the edges.
    for i, (x, yb, h) in enumerate(((100, 360, 70), (600, 368, 80))):
        c = s.layer(f'tree{i}', {'type': 'sway', 'pivot': [x, yb], 'amount': 0.015, 'period': 5 + i})

        def branch(x0, y0, ang, ln, wdt):
            if ln < 5:
                return
            x1, y1 = x0 + math.cos(ang) * ln, y0 + math.sin(ang) * ln
            c.line([(x0, y0), (x1, y1)], '#101614', max(1, int(wdt)))
            branch(x1, y1, ang - 0.45 + rnd.uniform(-0.2, 0.2), ln * 0.68, wdt * 0.7)
            branch(x1, y1, ang + 0.4 + rnd.uniform(-0.2, 0.2), ln * 0.62, wdt * 0.7)
        branch(x, yb, -math.pi / 2 + (0.1 if i else -0.1), h * 0.45, 4)
    for i, (px_, py_) in enumerate(((250, 110), (300, 130))):
        c = s.layer(f'crow{i}', {'type': 'fly', 'speed': -6 - i * 3, 'amp': 3, 'period': 0.9, 'phase': i})
        c.poly([(px_ - 7, py_ - 2), (px_, py_ + 1), (px_ + 7, py_ - 2), (px_, py_ + 3)], '#0c1010')
    # Heather foreground.
    b.ridge(rnd, 345, 12, '#1a2018', top='#2a3024', smooth=0.45)
    for _ in range(900):
        x, y = rnd.randrange(W), rnd.randrange(345, 400)
        if b.get(x, y) in (hx('#1a2018'), hx('#2a3024')):
            b.put(x, y, rnd.choice(['#7a4a7a', '#9a5a8e', '#6a3a68', '#3e5036', '#2e3a2a']))
    s.layer('fog_low', {'type': 'drift', 'speed': 6}).clouds(
        rnd, ['#8e9c98', '#b0bcb6', '#d0dad4'], 320, 400, 0.38, cell=40, alpha=0.5, fade=14)
    return s


def royalpalace():
    """A marble throne hall: columns, red curtains, gold chandeliers."""
    rnd = random.Random(12)
    s = Scene('royalpalace')
    b = s.base
    b.sky(['#2a1020', '#3a1828', '#4a2030', '#3a1828'], 0, 400, curve=1.0)
    # Back wall with a tall arched window showing a sunset sky.
    b.rect(170, 30, 470, 320, '#e8dcd0')
    for yy in range(40, 320, 12):
        off = 0 if (yy // 12) % 2 else 20
        for xx in range(170 + off, 470, 40):
            b.line([(xx, yy), (xx, yy + 12)], '#d8cabc')
        b.line([(170, yy), (470, yy)], '#d8cabc')
    wx0, wx1, wy0, wy1 = 260, 380, 60, 250
    for yy in range(wy0, wy1):
        for xx in range(wx0, wx1):
            inside = yy > wy0 + 60 or math.hypot(xx - 320, yy - (wy0 + 60)) < 60
            if inside:
                t = (yy - wy0) / (wy1 - wy0)
                b.put(xx, yy, dither_pick([hx('#6a4a9a'), hx('#c05a8a'), hx('#ff9a6a'), hx('#ffd08a')], t, xx, yy))
    b.rect(318, wy0, 322, wy1, '#c89a3a')
    b.rect(wx0, 160, wx1, 163, '#c89a3a')
    b.draw.arc([wx0 - 4, wy0 - 4, wx1 + 4, wy0 + 124], 180, 360, fill=b.col('#e0b048'), width=4)
    b.rect(wx0 - 4, wy0 + 60, wx0, wy1, '#e0b048')
    b.rect(wx1, wy0 + 60, wx1 + 4, wy1, '#e0b048')
    rays = s.layer('light', {'type': 'pulse', 'min': 0.4, 'max': 0.9, 'period': 7})
    for yy in range(wy1, 400):
        spread = (yy - wy1) * 0.5
        for xx in range(int(wx0 - spread), int(wx1 + spread)):
            if (xx + yy) % 3 == 0 and 0 <= xx < W:
                rays.put(xx, yy, '#ffe0a0', int(60 * (1 - (yy - wy1) / (400 - wy1))))
    # Checkered marble floor in perspective.
    for yy in range(320, 400):
        t = (yy - 320) / 80
        row = int((t ** 0.7) * 8)
        for xx in range(W):
            u = (xx - 320) / (0.5 + t * 1.5) / 40
            light = (int(math.floor(u)) + row) % 2 == 0
            col = '#f2ece4' if light else '#9a6272'
            if rnd.random() < 0.03:
                col = shade(hx(col), 0.94)
            b.put(xx, yy, col)
    b.rect(0, 318, W, 321, '#c89a3a')
    # Columns.
    marble = ['#8a7a78', '#c8bcb4', '#ece4dc', '#fffaf4']
    for x in (10, 120, 490, 600):
        column(b, x, 40, 318, 30, marble, '#d8a840')
    # Gold frieze along the top.
    b.rect(0, 0, W, 26, '#4a1a2e')
    b.rect(0, 26, W, 30, '#e0b048')
    for xx in range(0, W, 16):
        b.poly([(xx, 26), (xx + 8, 16), (xx + 16, 26)], '#c89a3a')
    # Curtains sway at the sides.
    for i, (x0, x1, pivot) in enumerate(((52, 118, 85), (522, 598, 560))):
        c = s.layer(f'curtain{i}', {'type': 'sway', 'pivot': [pivot, 30], 'amount': -0.01 if i else 0.01, 'period': 6 + i})
        for xx in range(x0, x1):
            fold = math.sin((xx - x0) * 0.35) * 0.5 + 0.5
            for yy in range(30, 300 - int(abs(xx - (x0 + x1) / 2) * 0.8)):
                c.put(xx, yy, dither_pick([hx('#5a0a1a'), hx('#8a1a2a'), hx('#c02a3a'), hx('#e04a4a')], fold * 0.9, xx, yy))
        for xx in range(x0, x1):
            c.put(xx, 30, '#e0b048')
            c.put(xx, 31, '#e0b048')
    # Chandeliers.
    for i, cx in enumerate((200, 440)):
        b.line([(cx, 30), (cx, 70)], '#c89a3a')
        b.ellipse([cx - 22, 68, cx + 22, 80], '#c89a3a')
        b.ellipse([cx - 18, 70, cx + 18, 78], '#8a6a22')
        glow = s.layer(f'chandelier{i}', {'type': 'flicker', 'min': 0.55, 'max': 1.0, 'speed': 2.5 + i})
        for k in range(-18, 19, 9):
            b.rect(cx + k - 1, 62, cx + k + 1, 68, '#fff4e0')
            glow.glow(cx + k, 60, 10, '#ffd070', 0.6)
            glow.rect(cx + k, 58, cx + k, 60, '#fff8c0')
        glow.glow(cx, 74, 46, '#ffc860', 0.25)
    return s


def clockworkcitadel():
    """Brass towers with ticking clock faces, turning gears and steam."""
    rnd = random.Random(9)
    s = Scene('clockworkcitadel')
    s.base.sky(['#1a1008', '#2e1c0e', '#4a2c14', '#7a4a1c', '#b0702a', '#d8a050', '#f0c880'], 0, 400, curve=1.0)
    s.layer('clouds', {'type': 'drift', 'speed': 4}).clouds(
        rnd, ['#5a3a1c', '#8a5a2a', '#c08a48'], 30, 230, 0.4, cell=80, alpha=0.6)
    s.base.ridge(rnd, 290, 20, '#3a2410', top='#4a3018', smooth=0.5)
    for i, (x, y, sc, spd) in enumerate(((420, 60, 0.8, -5),)):
        c = s.layer(f'airship{i}', {'type': 'bob', 'amp': 3, 'period': 6, 'speed': spd})
        airship(c, x, y, sc)
    brass = ['#4a300e', '#8a5a1e', '#c0903a', '#e8c46a']
    city = s.layer('city')
    windows = s.layer('windows', {'type': 'flicker', 'min': 0.5, 'max': 1.0, 'speed': 2})
    smoke = s.layer('smoke', {'type': 'sway', 'pivot': [320, 300], 'amount': 0.05, 'period': 6})

    def brass_tower(x, w, top, clock=None):
        for xx in range(x, x + w):
            t = 1 - (xx - x) / w
            for yy in range(top, 400):
                city.put(xx, yy, dither_pick([hx(v) for v in brass], t * 0.85 + 0.05, xx, yy))
        for yy in range(top + 10, 400, 16):
            city.line([(x, yy), (x + w, yy)], '#3a2408')
            for xx in range(x + 3, x + w - 2, 7):
                city.put(xx, yy + 3, '#f0d890')
        city.poly([(x - 4, top), (x + w // 2, top - w // 2 - 10), (x + w + 4, top)], '#6a4418')
        city.poly([(x + w // 2, top - w // 2 - 10), (x + w + 4, top), (x + w // 2, top)], '#3a2408')
        for yy in range(top + 50 if clock else top + 14, 396, 18):
            for xx in range(x + 5, x + w - 6, 10):
                if rnd.random() < 0.5:
                    city.rect(xx, yy, xx + 3, yy + 5, '#2a1a08')
                    if rnd.random() < 0.6:
                        windows.rect(xx, yy, xx + 3, yy + 5, '#ffc860')
        if clock:
            cx, cy, r = x + w // 2, top + 26, clock
            clock_face(city, cx, cy, r, '#3a2408', '#f4e8c8', '#3a2408')
            clock_hand(s, f'hour{x}', cx, cy, int(r * 0.55), 2, '#2a1a08', 0.03)
            clock_hand(s, f'minute{x}', cx, cy, int(r * 0.85), 1, '#2a1a08', 0.35)

    brass_tower(8, 56, 150, clock=20)
    brass_tower(70, 40, 220)
    brass_tower(120, 34, 250)
    brass_tower(480, 36, 240)
    brass_tower(522, 62, 130, clock=24)
    brass_tower(590, 44, 200)
    for (cx_, top) in ((88, 200), (500, 222), (610, 182)):
        city.rect(cx_ - 3, top - 26, cx_ + 3, top, '#3a2408')
        smoke_column(smoke, cx_, top - 30, 10, 1.6, 3, 7, '#6a5a4a', '#c8b8a0')
    # Pipes linking the towers.
    for (x0, x1, y) in ((64, 120, 300), (518, 590, 320), (154, 200, 350), (440, 480, 350)):
        city.rect(x0, y, x1, y + 6, '#8a5a1e')
        city.line([(x0, y + 1), (x1, y + 1)], '#e8c46a')
        city.rect(x0 + (x1 - x0) // 2 - 3, y - 2, x0 + (x1 - x0) // 2 + 3, y + 8, '#4a300e')
    for i, (cx, cy, r, teeth, col, hole, spd) in enumerate(((180, 330, 30, 10, '#6a4418', '#c0903a', 0.25),
                                                           (215, 368, 22, 8, '#8a5a1e', '#e8c46a', -0.34),
                                                           (460, 330, 34, 12, '#6a4418', '#c0903a', -0.2))):
        R = int(r * 1.25) + 2
        c = s.layer(f'gear{i}', {'type': 'spin', 'center': [cx, cy], 'speed': spd},
                    size=(2 * R, 2 * R), origin=(cx - R, cy - R))
        gear(c, R, R, r, teeth, col, hole)
    return s


def grandlibrary():
    """Endless shelves by candlelight, floating candles and a moonlit window."""
    rnd = random.Random(14)
    s = Scene('grandlibrary')
    b = s.base
    b.sky(['#120a0a', '#1e1210', '#2a1a14', '#1e1210'], 0, 400, curve=1.0)
    # Back: a tall moonlit window between distant shelves.
    for yy in range(40, 260):
        for xx in range(250, 390):
            inside = yy > 100 or math.hypot(xx - 320, yy - 100) < 70
            if inside:
                t = (yy - 40) / 220
                b.put(xx, yy, dither_pick([hx('#0e1430'), hx('#1e2a58'), hx('#3a4a80')], t, xx, yy))
    b.stars(rnd, 30, 1, colors=('#ffffff',))
    for _ in range(40):
        x, y = rnd.randrange(255, 385), rnd.randrange(50, 250)
        if b.get(x, y)[2] > 40:
            b.put(x, y, '#e0e8ff')
    b.disc(350, 110, 14, ['#8a9ac8', '#c8d4f0', '#f4f8ff'], light=(-0.5, -0.4))
    for xx in (285, 320, 355):
        b.rect(xx - 1, 40, xx + 1, 260, '#3a2418')
    b.rect(250, 150, 390, 152, '#3a2418')
    b.draw.arc([246, 26, 394, 174], 180, 360, fill=b.col('#5a3a24'), width=5)
    b.rect(246, 100, 250, 262, '#5a3a24')
    b.rect(390, 100, 394, 262, '#5a3a24')
    moon = s.layer('moonlight', {'type': 'pulse', 'min': 0.35, 'max': 0.7, 'period': 9})
    for yy in range(262, 400):
        spread = (yy - 262) * 0.45
        for xx in range(int(250 - spread), int(390 + spread)):
            if (xx + yy) % 3 == 0:
                moon.put(xx, yy, '#a8b8f0', int(50 * (1 - (yy - 262) / 138)))
    spines = ['#7a1e1e', '#1e4a7a', '#2a6a3a', '#8a5a1e', '#5a2a6a', '#a8883a', '#3a2a1a', '#6a1a3a', '#1e5a5a']
    book_shelf(b, rnd, 170, 246, 60, 300, '#6a4428', '#2a1a10', spines)
    book_shelf(b, rnd, 394, 470, 60, 300, '#6a4428', '#2a1a10', spines)
    book_shelf(b, rnd, 0, 160, 0, 360, '#7a5030', '#241408', spines)
    book_shelf(b, rnd, 480, 640, 0, 360, '#7a5030', '#241408', spines)
    # Rolling ladders.
    for lx in (120, 506):
        b.line([(lx, 20), (lx + 14, 360)], '#a07040', 2)
        b.line([(lx + 18, 20), (lx + 32, 360)], '#a07040', 2)
        for k in range(30, 360, 16):
            t = k / 360
            b.line([(lx + t * 14, k), (lx + 18 + t * 14, k)], '#a07040', 2)
    # Floor: inlaid wood.
    for yy in range(300, 400):
        for xx in range(160, 480):
            plank = (xx // 20 + (yy // 10) % 2) % 2
            b.put(xx, yy, shade(hx('#5a3420' if plank else '#6e4428'), 0.9 + rnd.random() * 0.08))
    b.rect(0, 360, 160, 400, '#3a2214')
    b.rect(480, 360, 640, 400, '#3a2214')
    b.rect(160, 298, 480, 300, '#8a5a30')
    # Floating candles and books bob gently.
    for i, (x, y) in enumerate(((190, 40), (440, 50), (230, 20), (410, 18), (140, 380), (500, 390))):
        if y > 300:
            continue
        c = s.layer(f'candle{i}', {'type': 'bob', 'amp': 4, 'period': 4 + i * 0.7, 'phase': i, 'speed': 0})
        c.rect(x - 2, y, x + 2, y + 12, '#f4ead0')
        c.rect(x - 2, y, x - 1, y + 12, '#fffaf0')
        c.glow(x, y - 3, 12, '#ffc860', 0.55)
        c.rect(x, y - 5, x, y - 2, '#fff4a0')
    for i, (x, y, col) in enumerate(((210, 90, '#7a1e1e'), (430, 110, '#1e4a7a'))):
        c = s.layer(f'book{i}', {'type': 'bob', 'amp': 5, 'period': 5 + i, 'phase': i * 2, 'speed': 0})
        c.poly([(x - 10, y), (x, y + 3), (x + 10, y), (x + 10, y + 3), (x, y + 6), (x - 10, y + 3)], col)
        c.poly([(x - 9, y - 1), (x, y + 2), (x, y + 4), (x - 9, y + 1)], '#f4ead0')
        c.poly([(x + 9, y - 1), (x, y + 2), (x, y + 4), (x + 9, y + 1)], '#e8dcc0')
    lamps = s.layer('lamps', {'type': 'flicker', 'min': 0.5, 'max': 1.0, 'speed': 3})
    for (lx, ly) in ((80, 150), (560, 150), (80, 290), (560, 290)):
        b.rect(lx - 3, ly, lx + 3, ly + 8, '#3a2418')
        lamps.glow(lx, ly - 2, 30, '#ffb040', 0.4)
        lamps.rect(lx - 1, ly - 5, lx + 1, ly, '#ffe080')
    return s


def obsidiancourt():
    """A throne room of black volcanic glass over a river of lava."""
    rnd = random.Random(21)
    s = Scene('obsidiancourt')
    b = s.base
    b.sky(['#0a0406', '#1a080a', '#2e0c0c', '#4a1210', '#6a1c10'], 0, 330, curve=1.1)
    s.layer('smoke', {'type': 'drift', 'speed': 3}).clouds(
        rnd, ['#1a0a0a', '#2e1210', '#4a1e14'], 0, 170, 0.4, cell=80, alpha=0.7)
    glass = ['#0a080e', '#16121c', '#26203a', '#4a3e6a', '#8a7ab0']
    # Distant spires.
    for (x, w, h) in ((190, 20, 120), (225, 14, 90), (400, 16, 100), (430, 22, 130), (300, 12, 60), (340, 10, 70)):
        b.poly([(x, 300), (x + w // 2, 300 - h), (x + w, 300)], '#160e16')
        b.line([(x + w // 2, 300 - h), (x + w // 2 - 2, 300)], '#2e2438')
    # Throne silhouette behind the board.
    b.rect(296, 190, 344, 300, '#120c14')
    b.poly([(290, 190), (320, 150), (350, 190)], '#120c14')
    for k in (-18, 0, 18):
        b.poly([(320 + k - 5, 190), (320 + k, 170 - (10 if k == 0 else 0)), (320 + k + 5, 190)], '#120c14')
    # Obsidian pillars: glassy facets with violet sheen.

    def pillar(x, w, top):
        for xx in range(x, x + w):
            facet = ((xx - x) * 3 // w)
            base_t = [0.55, 0.25, 0.1][facet]
            for yy in range(top, 400):
                sheen = 0.25 if (yy + (xx - x) * 2) % 90 < 5 else 0
                b.put(xx, yy, dither_pick([hx(v) for v in glass], base_t + sheen, xx, yy))
        b.poly([(x - 2, top), (x + w // 2, top - 26), (x + w + 2, top)], glass[1])
        b.line([(x + w // 2, top - 26), (x - 2, top)], glass[3])
        b.line([(x + 1, top), (x + 1, 400)], glass[4])

    for (x, w, top) in ((10, 34, 40), (70, 26, 110), (122, 22, 170), (496, 22, 170), (544, 26, 110), (596, 34, 40)):
        pillar(x, w, top)
    # Braziers.
    fire = s.layer('braziers', {'type': 'flicker', 'min': 0.5, 'max': 1.0, 'speed': 4})
    for bx in (160, 480):
        b.poly([(bx - 12, 268), (bx + 12, 268), (bx + 6, 282), (bx - 6, 282)], '#26203a')
        b.rect(bx - 2, 282, bx + 2, 320, '#16121c')
        fire.glow(bx, 258, 36, '#ff6a20', 0.6)
        fire.poly([(bx - 9, 268), (bx - 4, 250), (bx, 258), (bx + 3, 244), (bx + 9, 268)], '#ff8a20')
        fire.poly([(bx - 5, 268), (bx, 254), (bx + 5, 268)], '#ffd060')
    # Glass floor with reflections, then the lava river in front.
    for yy in range(300, 360):
        for xx in range(W):
            t = (yy - 300) / 60
            col = dither_pick([hx('#0c0a10'), hx('#16121c'), hx('#221c2a')], 0.3 + math.sin(xx * 0.02 + yy * 0.3) * 0.2 + t * 0.2, xx, yy)
            b.put(xx, yy, col)
    b.line([(0, 300), (W, 300)], '#4a3e6a')
    for yy in range(360, 400):
        for xx in range(W):
            v = math.sin(xx * 0.06 + math.sin(yy * 0.3) * 2) * 0.5 + 0.5
            b.put(xx, yy, dither_pick([hx('#6a1008'), hx('#c83a10'), hx('#ff7a20'), hx('#ffc860')], v * 0.8, xx, yy))
    b.line([(0, 360), (W, 360)], '#0a080e', 2)
    lava = s.layer('lava', {'type': 'pulse', 'min': 0.3, 'max': 0.9, 'period': 3})
    for k in range(0, W, 40):
        lava.glow(k + 20, 380, 40, '#ffb040', 0.5)
    s.layer('lava_flow', {'type': 'drift', 'speed': 10}).clouds(
        rnd, ['#ff5a10', '#ff9a30', '#ffe080'], 362, 400, 0.3, cell=32, alpha=0.6, fade=6)
    return s


# Every world is now a live scene drawn in code (src/themes/scenes/<id>.js), and its still
# is written by `node scripts/live-scene.js bg <id>`. The scene functions above are kept for
# reference only: generating them again would overwrite those stills.
SCENES = {}

# Hand-painted backgrounds: animated regions as fractions of the image.
# ripple: displacement wobble (amp in game px, speed = map scroll px/s).
# skyDrift: the band scrolls sideways, mirrored so it tiles seamlessly.
PAINTED = {
    'trainingcamp': {'effects': [
        {'type': 'ripple', 'rect': [0.12, 0.2, 0.34, 0.64], 'amp': [2, 5], 'speed': [0, 40], 'cell': 16},
        {'type': 'ripple', 'rect': [0.1, 0.62, 0.62, 0.74], 'amp': [3, 1], 'speed': [10, 0], 'cell': 24},
        {'type': 'ripple', 'rect': [0, 0.76, 1, 1], 'amp': [6, 1], 'speed': [18, 0], 'cell': 70},
        {'type': 'ripple', 'rect': [0, 0, 0.47, 0.42], 'amp': [3, 2], 'speed': [7, 2], 'cell': 60},
        {'type': 'ripple', 'rect': [0.86, 0.18, 1, 0.48], 'amp': [3, 2], 'speed': [7, 2], 'cell': 60},
    ]},
    'forkedgulch': {'effects': [
        {'type': 'skyDrift', 'rect': [0, 0, 1, 0.45], 'speed': 5},
        {'type': 'ripple', 'rect': [0, 0.52, 1, 0.66], 'amp': [1, 2], 'speed': [0, 8], 'cell': 20},
        {'type': 'ripple', 'rect': [0, 0.64, 0.52, 1], 'amp': [3, 1], 'speed': [8, 0], 'cell': 70},
        {'type': 'ripple', 'rect': [0.82, 0.64, 1, 0.8], 'amp': [3, 1], 'speed': [8, 0], 'cell': 70},
    ]},
    'crystal': {'effects': [
        {'type': 'ripple', 'rect': [0, 0.3, 0.14, 0.7], 'amp': [2, 5], 'speed': [0, -30], 'cell': 10},
        {'type': 'ripple', 'rect': [0.86, 0.3, 1, 0.7], 'amp': [2, 5], 'speed': [0, -30], 'cell': 10},
    ]},
}


def write_manifest(data):
    body = json.dumps(data, indent=1, sort_keys=True)
    with open(MANIFEST, 'w') as f:
        f.write('// Generated by scripts/generate_backgrounds.py; edit that script, not this file.\n')
        f.write('// Layer positions and sizes are in 640x400 art pixels (one = two game units).\n')
        f.write(f'const BACKGROUND_SCENES = {body};\n')


if __name__ == '__main__':
    old = {}
    if os.path.exists(MANIFEST):  # keep scenes not regenerated this run
        src = open(MANIFEST).read()
        old = json.loads(src[src.index('{'):src.rindex('}') + 1])
    data = {k: v for k, v in old.items() if k in SCENES}  # drop retired scenes
    for name in (sys.argv[1:] or SCENES):
        data[name] = SCENES[name]().save()
        print('background', name, len(data[name]['layers']), 'layers')
    data.update(PAINTED)
    write_manifest(data)
