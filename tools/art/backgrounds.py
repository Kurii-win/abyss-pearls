"""Opaque 320x180 backgrounds (shown at x4 = 1280x720 or x6 = 1920x1080).
All variation comes from fixed seeds and ordered dithering."""
from __future__ import annotations

import math
import random

from draw import Canvas, bayer, circle, ellipse, poly, rect
from palette import (ABYSS_1, ABYSS_2, ABYSS_3, CORAL_1, FOAM, INK, KELP_1, KELP_2,
                     PEARL_2, SEA_1, SEA_2, SEA_3, SLATE_1, SLATE_3, VIOLET_1, VIOLET_2,
                     VIOLET_3)

W, H = 320, 180


def _gradient(cv: Canvas, stops) -> None:
    """Vertical gradient through palette stops with 4x4 ordered dither."""
    n = len(stops) - 1
    for y in range(H):
        t = y / (H - 1) * n
        i = min(int(t), n - 1)
        f = t - i
        for x in range(W):
            cv.set(x, y, stops[i + 1] if f > bayer(x, y) else stops[i])


def _lighter(stops, c):
    """Next colour up the gradient (toward the surface)."""
    if c in stops:
        i = stops.index(c)
        return stops[max(0, i - 1)]
    return c


def _rays(cv: Canvas, stops, rng: random.Random, count: int, strength: float) -> None:
    for _ in range(count):
        x0 = rng.randint(20, W - 20)
        width = rng.randint(8, 22)
        slant = rng.uniform(0.25, 0.45)
        depth = rng.randint(90, 150)
        for y in range(depth):
            fade = strength * (1 - y / depth)
            xa = int(x0 + y * slant)
            for x in range(xa, xa + width):
                if 0 <= x < W and bayer(x, y) < fade:
                    cv.set(x, y, _lighter(stops, cv.get(x, y)))


def _far_whale(cv: Canvas, x: int, y: int, c, scale: float = 1.0) -> None:
    s = scale
    m = ellipse(x, y, 26 * s, 7 * s) | poly([(x + 22 * s, y - 2 * s), (x + 38 * s, y - 5 * s),
                                               (x + 44 * s, y - 12 * s), (x + 43 * s, y + 1 * s),
                                               (x + 46 * s, y + 8 * s), (x + 22 * s, y + 4 * s)])
    m |= poly([(x - 6 * s, y + 5 * s), (x + 4 * s, y + 5 * s), (x + 10 * s, y + 13 * s)])
    cv.fill(m, c)


def _fish(cv: Canvas, x: int, y: int, c) -> None:
    for (dx, dy) in ((0, 0), (1, 0), (2, 0), (1, -1), (1, 1), (3, -1), (3, 1)):
        cv.set(x + dx, y + dy, c)


def _seabed(cv: Canvas, rng: random.Random, far_c, near_c, kelp, kelp_tip, coral) -> None:
    # far ridge
    for x in range(W):
        h = 150 + 6 * math.sin(x / 23.0) + 4 * math.sin(x / 9.0 + 1.3)
        for y in range(int(h), H):
            cv.set(x, y, far_c)
    # kelp strands (behind the near ridge)
    for _ in range(14):
        kx = rng.randint(0, W - 1)
        top = rng.randint(105, 140)
        phase = rng.uniform(0, 6.28)
        for y in range(top, H):
            sway = int(round(2.5 * math.sin(y / 7.0 + phase)))
            cv.set(kx + sway, y, kelp)
            if (y + kx) % 6 == 0:
                cv.set(kx + sway + 1, y, kelp)
                cv.set(kx + sway - 1, y - 1, kelp)
        if kelp_tip is not None:
            cv.set(kx + int(round(2.5 * math.sin(top / 7.0 + phase))), top, kelp_tip)
    # near ridge with rocks
    for x in range(W):
        h = 165 + 5 * math.sin(x / 31.0 + 2.0) + 2 * math.sin(x / 7.0)
        for y in range(int(h), H):
            cv.set(x, y, near_c)
    for _ in range(6):
        rx, ry = rng.randint(0, W), rng.randint(160, 172)
        cv.fill(ellipse(rx, ry, rng.randint(5, 11), rng.randint(3, 6)), near_c)
    # coral fans
    for _ in range(4):
        cx, cy = rng.randint(10, W - 10), rng.randint(163, 170)
        for k in range(7):
            a = math.radians(-150 + k * 20)
            for r in range(2, rng.randint(7, 11)):
                cv.set(int(cx + r * math.cos(a)), int(cy + r * math.sin(a)), coral)


def _snow(cv: Canvas, rng: random.Random, colours, count: int) -> None:
    for _ in range(count):
        x, y = rng.randrange(W), rng.randrange(H - 30)
        cv.set(x, y, colours[rng.randrange(len(colours))])


def _bubbles(cv: Canvas, rng: random.Random, c, count: int) -> None:
    for _ in range(count):
        x, y = rng.randrange(8, W - 8), rng.randrange(20, H - 40)
        r = rng.choice((1.5, 2.0, 2.5))
        m = circle(x, y, r)
        inner = circle(x, y, r - 1)
        for p in sorted(m - inner):
            cv.set(p[0], p[1], c)


def background() -> Canvas:
    rng = random.Random(1801)
    stops = [SEA_2, SEA_1, ABYSS_3, ABYSS_2, ABYSS_1, INK]
    cv = Canvas(W, H)
    _gradient(cv, stops)
    _rays(cv, stops, rng, 6, 0.55)
    _far_whale(cv, 220, 70, ABYSS_2, 1.3)
    _far_whale(cv, 60, 112, ABYSS_1, 0.7)
    for _ in range(3):  # small fish schools
        sx, sy = rng.randint(20, W - 60), rng.randint(30, 110)
        for _ in range(7):
            _fish(cv, sx + rng.randint(0, 30), sy + rng.randint(0, 12), SEA_1)
    _seabed(cv, rng, ABYSS_1, INK, KELP_1, KELP_2, CORAL_1)
    _snow(cv, rng, (SLATE_3, PEARL_2, SEA_2), 120)
    _bubbles(cv, rng, SEA_3, 14)
    return cv


def background_freespins() -> Canvas:
    rng = random.Random(1802)
    stops = [ABYSS_2, ABYSS_1, VIOLET_1, INK]
    cv = Canvas(W, H)
    _gradient(cv, stops)
    _rays(cv, stops, rng, 4, 0.35)
    _far_whale(cv, 230, 80, VIOLET_1, 1.3)
    # glowing jellyfish
    for _ in range(5):
        jx, jy = rng.randint(20, W - 20), rng.randint(20, 120)
        r = rng.choice((4, 5, 6))
        bell = {p for p in ellipse(jx, jy, r, r * 0.8) if p[1] <= jy}
        cv.fill(bell, VIOLET_2)
        cv.fill({p for p in bell if (p[0], p[1] - 1) not in bell}, VIOLET_3)
        for k in range(-r + 1, r, 2):
            for t in range(1, rng.randint(6, 12)):
                cv.set(jx + k + int(round(math.sin(t / 2.0 + k))), jy + t, VIOLET_2 if t % 3 else VIOLET_3)
    _seabed(cv, rng, VIOLET_1, INK, KELP_1, SEA_3, VIOLET_2)
    # bioluminescent motes
    _snow(cv, rng, (SEA_3, FOAM, VIOLET_3, SEA_1), 160)
    _bubbles(cv, rng, SEA_2, 10)
    return cv


def build() -> dict:
    return {
        "bg/background.png": background(),
        "bg/background_freespins.png": background_freespins(),
    }
