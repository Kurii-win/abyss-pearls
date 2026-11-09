"""Shared pixel-art helpers for the Abyss Pearls generators.

Everything works on a Canvas of palette RGB tuples (or None = transparent)
and on "masks" (Python sets of (x, y) integer pixels). No anti-aliasing,
no blending: a pixel is either a palette colour or fully transparent.
Randomness only ever comes from a seeded random.Random passed in.
"""
from __future__ import annotations

import math
import os
import random

from PIL import Image, ImageDraw

from palette import COLOURS, INK

# 4x4 ordered-dither threshold matrix (values 0..15).
BAYER4 = (
    (0, 8, 2, 10),
    (12, 4, 14, 6),
    (3, 11, 1, 9),
    (15, 7, 13, 5),
)


def bayer(x: int, y: int) -> float:
    """Ordered-dither threshold in (0, 1)."""
    return (BAYER4[y % 4][x % 4] + 0.5) / 16.0


# ---------------------------------------------------------------------------
# Canvas
# ---------------------------------------------------------------------------
class Canvas:
    def __init__(self, w: int, h: int, fill=None):
        self.w = w
        self.h = h
        self.px = [fill] * (w * h)

    def inb(self, x: int, y: int) -> bool:
        return 0 <= x < self.w and 0 <= y < self.h

    def set(self, x: int, y: int, c) -> None:
        if self.inb(x, y):
            if c is not None and c not in COLOURS:
                raise ValueError("colour %r is not in the palette" % (c,))
            self.px[y * self.w + x] = c

    def get(self, x: int, y: int):
        if self.inb(x, y):
            return self.px[y * self.w + x]
        return None

    def fill(self, mask, c) -> None:
        for (x, y) in sorted(mask):
            self.set(x, y, c)

    def opaque(self) -> set:
        return {(i % self.w, i // self.w) for i, c in enumerate(self.px) if c is not None}

    def paste(self, other: "Canvas", ox: int, oy: int) -> None:
        for y in range(other.h):
            for x in range(other.w):
                c = other.px[y * other.w + x]
                if c is not None:
                    self.set(ox + x, oy + y, c)

    def crop(self, x0: int, y0: int, w: int, h: int) -> "Canvas":
        out = Canvas(w, h)
        for y in range(h):
            for x in range(w):
                out.px[y * w + x] = self.get(x0 + x, y0 + y)
        return out

    def to_image(self, scale: int = 1) -> Image.Image:
        img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        img.putdata([(0, 0, 0, 0) if c is None else (c[0], c[1], c[2], 255) for c in self.px])
        if scale != 1:
            img = img.resize((self.w * scale, self.h * scale), Image.NEAREST)
        return img


# ---------------------------------------------------------------------------
# Mask constructors
# ---------------------------------------------------------------------------
def ellipse(cx: float, cy: float, rx: float, ry: float) -> set:
    """Pixels whose centres fall inside the ellipse. cx/cy in pixel-edge coords."""
    out = set()
    for y in range(int(math.floor(cy - ry)) - 1, int(math.ceil(cy + ry)) + 2):
        for x in range(int(math.floor(cx - rx)) - 1, int(math.ceil(cx + rx)) + 2):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1.0:
                out.add((x, y))
    return out


def circle(cx: float, cy: float, r: float) -> set:
    return ellipse(cx, cy, r, r)


def rect(x0: int, y0: int, x1: int, y1: int) -> set:
    """Inclusive rectangle."""
    return {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}


def poly(points) -> set:
    """Filled polygon (aliased) via Pillow on an offscreen mask."""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    ox, oy = int(math.floor(min(xs))) - 1, int(math.floor(min(ys))) - 1
    w = int(math.ceil(max(xs))) - ox + 2
    h = int(math.ceil(max(ys))) - oy + 2
    img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(img).polygon([(x - ox, y - oy) for x, y in points], fill=1, outline=1)
    data = img.load()
    return {(x + ox, y + oy) for y in range(h) for x in range(w) if data[x, y]}


def line(x0: int, y0: int, x1: int, y1: int) -> set:
    """Bresenham line (1px)."""
    out = set()
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    x, y = x0, y0
    while True:
        out.add((x, y))
        if x == x1 and y == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy
    return out


def polyline(points) -> set:
    out = set()
    for a, b in zip(points, points[1:]):
        out |= line(a[0], a[1], b[0], b[1])
    return out


def ring(cx: float, cy: float, r_out: float, r_in: float) -> set:
    return circle(cx, cy, r_out) - circle(cx, cy, r_in)


def sector(cx: float, cy: float, r_out: float, r_in: float, a0: float, a1: float) -> set:
    """Ring sector; angles in degrees, 0 = +x, 90 = +y (screen down)."""
    out = set()
    for (x, y) in ring(cx, cy, r_out, r_in):
        a = math.degrees(math.atan2(y + 0.5 - cy, x + 0.5 - cx)) % 360
        lo, hi = a0 % 360, a1 % 360
        inside = lo <= a <= hi if lo <= hi else (a >= lo or a <= hi)
        if inside:
            out.add((x, y))
    return out


def bezier(p0, p1, p2, p3, steps: int = 64):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        x = mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0]
        y = mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1]
        pts.append((x, y, t))
    return pts


def brush(path, r0: float, r1: float) -> set:
    """Stamp discs along a path of (x, y, t); radius goes r0 -> r1."""
    out = set()
    for x, y, t in path:
        r = r0 + (r1 - r0) * t
        if r < 0.75:
            out.add((int(math.floor(x)), int(math.floor(y))))
        else:
            out |= circle(x, y, r)
    return out


# ---------------------------------------------------------------------------
# Mask operations
# ---------------------------------------------------------------------------
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def shift(mask, dx: int, dy: int) -> set:
    return {(x + dx, y + dy) for (x, y) in mask}


def dilate(mask, n: int = 1, diag: bool = False) -> set:
    out = set(mask)
    nb = N8 if diag else N4
    for _ in range(n):
        out = out | {(x + dx, y + dy) for (x, y) in out for dx, dy in nb}
    return out


def erode(mask, n: int = 1) -> set:
    out = set(mask)
    for _ in range(n):
        out = {(x, y) for (x, y) in out if all((x + dx, y + dy) in out for dx, dy in N4)}
    return out


def border(mask, diag: bool = False) -> set:
    """Pixels just outside the mask."""
    return dilate(mask, 1, diag) - set(mask)


def inner_edge(mask) -> set:
    return set(mask) - erode(mask, 1)


def mirror_x(mask, width: int) -> set:
    return {(width - 1 - x, y) for (x, y) in mask}


# ---------------------------------------------------------------------------
# Painting helpers
# ---------------------------------------------------------------------------
def shade(cv: Canvas, mask, base, light=None, dark=None,
          ldir=(-1, -1), lw: int = 1, dw: int = 1) -> None:
    """Fill a mask with rim lighting: pixels facing the light get `light`,
    pixels facing away get `dark`. ldir points toward the light."""
    mask = set(mask)
    cv.fill(mask, base)
    lx, ly = ldir
    for (x, y) in sorted(mask):
        if dark is not None and any((x - lx * k, y - ly * k) not in mask for k in range(1, dw + 1)):
            cv.set(x, y, dark)
        if light is not None and any((x + lx * k, y + ly * k) not in mask for k in range(1, lw + 1)):
            cv.set(x, y, light)


def part(cv: Canvas, mask, base, light=None, dark=None, ldir=(-1, -1),
         lw: int = 1, dw: int = 1, outline=INK) -> None:
    """Paint a shaded part with its own outline (separates overlapping parts)."""
    if outline is not None:
        cv.fill(border(mask), outline)
    shade(cv, mask, base, light, dark, ldir, lw, dw)


def outline(cv: Canvas, c=INK, diag: bool = False) -> None:
    """Outline every transparent pixel touching an opaque one."""
    edge = border(cv.opaque(), diag)
    for (x, y) in sorted(edge):
        if cv.inb(x, y) and cv.get(x, y) is None:
            cv.set(x, y, c)


def dither(cv: Canvas, mask, c, density: float, rng: random.Random) -> None:
    """Seeded random dither: each pixel of the mask gets c with probability density."""
    for (x, y) in sorted(mask):
        if rng.random() < density:
            cv.set(x, y, c)


def checker(mask, parity: int = 0) -> set:
    return {(x, y) for (x, y) in mask if (x + y) % 2 == parity}


def ordered(mask, density: float) -> set:
    """Ordered (Bayer) subset of a mask with the given density."""
    return {(x, y) for (x, y) in mask if bayer(x, y) < density}


def glow(cv: Canvas, mask, inner_c, outer_c=None, only_empty: bool = True) -> None:
    """Two-ring halo around a mask: solid inner ring, checkered outer ring."""
    r1 = border(mask, diag=True)
    r2 = border(set(mask) | r1, diag=False)
    for (x, y) in sorted(r1):
        if not only_empty or cv.get(x, y) is None:
            cv.set(x, y, inner_c)
    if outer_c is not None:
        for (x, y) in sorted(checker(r2)):
            if not only_empty or cv.get(x, y) is None:
                cv.set(x, y, outer_c)


def sparkle(cv: Canvas, x: int, y: int, c, arm: int = 2, core=None) -> None:
    """Small four-point sparkle."""
    for k in range(-arm, arm + 1):
        cv.set(x + k, y, c)
        cv.set(x, y + k, c)
    if core is not None:
        cv.set(x, y, core)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def save_png(img: Image.Image, path: str) -> None:
    """Deterministic PNG: no metadata chunks, fixed compression."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, format="PNG", optimize=False, compress_level=9)
