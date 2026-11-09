"""Symbol tiles (48x48 native) for Abyss Pearls.

Hero: Whale (single + stack segments top/mid/bottom).
High: Shark, Octopus. Mid: Sea turtle, Anglerfish.
Low: Pearl, Shell, Starfish, Anchor.
Wild: Kraken Eye (+ x2 / x3 badges). Scatter: Treasure Chest.
"""
from __future__ import annotations

import math
import os
import random

from draw import (Canvas, bezier, border, brush, checker, circle, dilate, ellipse,
                  glow, inner_edge, line, ordered, outline, part, poly, polyline, rect,
                  sector, shade, sparkle)
from palette import (ABYSS_1, ABYSS_2, ABYSS_3, CORAL_1, CORAL_2, CORAL_3, FOAM,
                     GOLD_1, GOLD_2, GOLD_3, INK, KELP_1, KELP_2, KELP_3, PEARL,
                     PEARL_2, SAND_1, SAND_2, SEA_1, SEA_2, SEA_3, SLATE_1, SLATE_2,
                     SLATE_3, VIOLET_1, VIOLET_2, VIOLET_3)

T = 48  # native tile size


# ---------------------------------------------------------------------------
# Whale (hero)
# ---------------------------------------------------------------------------
def whale_single() -> Canvas:
    cv = Canvas(T, T)
    body = ellipse(21, 28, 18, 10.5) | poly([(30, 22), (40, 22), (43, 19), (44, 24), (38, 32), (30, 35)])
    fluke = poly([(41, 21), (35, 12), (37, 11), (43, 17), (46, 10), (47, 12), (45, 21), (42, 24)])
    fin = poly([(15, 34), (22, 34), (27, 42), (24, 43)])
    belly = {(x, y) for (x, y) in body if y >= 31 - (x > 28) * ((x - 28) // 3)}

    part(cv, fin, ABYSS_3, SEA_1, ABYSS_2)
    part(cv, fluke, ABYSS_3, SEA_2, ABYSS_2)
    shade(cv, body, ABYSS_3, SEA_2, ABYSS_2)
    shade(cv, belly, PEARL, None, PEARL_2, ldir=(0, -1))
    for gx in range(6, 32, 3):  # throat grooves
        for (x, y) in sorted(belly):
            if x == gx and y >= 33:
                cv.set(x, y, PEARL_2)
    # mouth line + eye
    cv.fill(polyline([(4, 30), (9, 31), (17, 31)]), ABYSS_1)
    cv.set(12, 28, PEARL)
    cv.set(13, 28, INK)
    # bioluminescent spots along the back
    for (x, y) in [(14, 21), (19, 20), (24, 20), (29, 21), (22, 23), (17, 23), (27, 24)]:
        cv.set(x, y, SEA_3)
    cv.set(19, 20, FOAM)
    cv.set(24, 20, FOAM)
    outline(cv)
    # spout (drawn after outline so droplets stay crisp, then outlined lightly)
    spout = {(10, 13), (11, 12), (12, 11), (12, 10), (13, 9), (11, 9), (10, 7), (13, 6), (15, 8), (16, 11), (8, 10)}
    for (x, y) in sorted(spout):
        cv.set(x, y, FOAM)
    for (x, y) in [(12, 14), (12, 15), (11, 16)]:
        cv.set(x, y, SEA_3)
    sparkle(cv, 6, 5, SEA_3, 1, FOAM)
    return cv


WHALE_X0, WHALE_X1 = 6, 40      # body column (inclusive) through the stack
WHALE_BELLY_X = 29              # belly starts here (right side = ventral)
SEAM_CLEAR = (46, 47, 0, 1)     # rows (mod 48) kept free of decoration


def _whale_mid_spots() -> list:
    """Extra glow specks for one mid section (y relative to section top).
    Seeded so both mid tiles are identical; kept clear of the seam rows."""
    rng = random.Random(4801)
    spots = []
    for _ in range(7):
        x = rng.randint(WHALE_X0 + 3, WHALE_BELLY_X - 4)
        y = rng.randint(4, 43)
        spots.append((x, y))
    return spots


def whale_stack() -> Canvas:
    """Tall whale on a 48x192 canvas: head | body | body | tail.
    Rows near every seam are a pure function of x, so the segments join."""
    cv = Canvas(T, T * 4)
    cx = (WHALE_X0 + WHALE_X1 + 1) / 2
    head = ellipse(cx, 22, (WHALE_X1 - WHALE_X0 + 1) / 2, 19)
    column = rect(WHALE_X0, 22, WHALE_X1, 150)
    tail_stock = poly([(WHALE_X0, 150), (WHALE_X1, 150), (29, 174), (18, 174)])
    body = head | column | tail_stock
    fluke = poly([(23, 170), (10, 176), (2, 177), (0, 181), (9, 185), (19, 184), (23, 179),
                  (27, 184), (38, 185), (47, 181), (45, 177), (37, 176), (25, 170)])
    fin = poly([(WHALE_X1 - 1, 24), (44, 28), (47, 36), (46, 42), (43, 41), (WHALE_X1 - 1, 35)])

    part(cv, fin, ABYSS_3, SEA_2, ABYSS_2, ldir=(1, -1))
    cv.fill({p for p in fin if p[0] >= 44 and p[1] >= 37}, PEARL_2)  # pale fin tip
    part(cv, fluke, ABYSS_3, SEA_2, ABYSS_2, ldir=(0, -1))
    # back: light on the left edge only (x-direction), so the column is y-invariant
    shade(cv, body, ABYSS_3, SEA_3, ABYSS_2, ldir=(-1, 0))
    for (x, y) in sorted(body):  # top of the head catches the light
        if (x, y - 1) not in body:
            cv.set(x, y, SEA_3)
    for (x, y) in sorted(body):  # second light band on the back
        if (x - 1, y) in body and (x - 2, y) not in body and y >= 8:
            cv.set(x, y, SEA_2)
    # pale belly (ventral side, right): diagonal throat under the jaw
    belly = {(x, y) for (x, y) in body
             if x >= WHALE_BELLY_X and y >= 30 - 1.4 * (x - WHALE_BELLY_X) and y <= 166 - (x - WHALE_BELLY_X)}
    shade(cv, belly, PEARL, None, PEARL_2, ldir=(-1, 0))
    for (x, y) in sorted(belly):  # throat grooves: vertical, so they run across seams
        if x in (WHALE_BELLY_X + 3, WHALE_BELLY_X + 6, WHALE_BELLY_X + 9) and (x, y - 2) in belly:
            cv.set(x, y, PEARL_2)
    # jaw line along the throat edge
    for (x, y) in sorted(belly):
        if (x, y - 1) not in belly and (x, y - 1) in body:
            cv.set(x, y - 1, ABYSS_1)
    cv.fill(line(WHALE_BELLY_X - 1, 30, WHALE_BELLY_X - 1, 26), ABYSS_1)
    # tubercles on the rostrum
    for (x, y) in [(24, 5), (20, 7), (27, 8), (23, 10), (18, 12), (26, 13), (30, 11)]:
        cv.set(x, y, SEA_2)
    # eye
    cv.fill(rect(23, 26, 24, 27), INK)
    cv.set(23, 26, PEARL)
    cv.set(25, 27, ABYSS_1)
    # hero accent: two staggered rows of glowing photophores down the back
    for y in range(28, 172):
        if y % 48 in SEAM_CLEAR:
            continue
        for (x, phase) in ((11, 3), (19, 8)):
            if y % 12 == phase and (x, y) in body and (x, y) not in belly:
                cv.set(x, y, FOAM)
                cv.set(x - 1, y, SEA_3)
                cv.set(x + 1, y, SEA_3)
                cv.set(x, y - 1, SEA_3)
                cv.set(x, y + 1, SEA_3)
    for base in (T, 2 * T):
        for (x, y) in _whale_mid_spots():
            if cv.get(x, base + y) == ABYSS_3:
                cv.set(x, base + y, SEA_2)
    outline(cv)
    for k in (1, 2):
        assert cv.crop(0, k * T, T, T).px == cv.crop(0, T, T, T).px, "whale mid sections differ"
    return cv


def whale_segments() -> dict:
    stack = whale_stack()
    return {
        "whale_top": stack.crop(0, 0, T, T),
        "whale_mid": stack.crop(0, T, T, T),
        "whale_bottom": stack.crop(0, 3 * T, T, T),
    }


# ---------------------------------------------------------------------------
# High / mid symbols
# ---------------------------------------------------------------------------
def shark() -> Canvas:
    cv = Canvas(T, T)
    body = poly([(1, 27), (7, 21), (18, 18), (31, 18), (39, 22), (43, 24), (43, 28),
                 (36, 31), (24, 34), (12, 33), (4, 30)])
    dorsal = poly([(17, 19), (25, 4), (28, 5), (31, 19)])
    tail = poly([(40, 23), (45, 8), (47, 9), (46, 24), (47, 39), (45, 40), (40, 29)])
    pect = poly([(15, 31), (24, 32), (17, 42), (14, 41)])
    pelvic = poly([(31, 30), (35, 29), (34, 35)])

    part(cv, tail, SLATE_2, SLATE_3, SLATE_1)
    part(cv, dorsal, SLATE_2, SLATE_3, SLATE_1)
    shade(cv, body, SLATE_2, SLATE_3, SLATE_1)
    belly = {(x, y) for (x, y) in body if y >= 28 + (x > 30) * ((30 - x) // 5)}
    shade(cv, belly, PEARL, None, PEARL_2, ldir=(0, -1))
    part(cv, pelvic, SLATE_2, SLATE_3, SLATE_1)
    part(cv, pect, SLATE_2, SLATE_3, SLATE_1)
    # gills
    for gx in (13, 15, 17):
        cv.fill(line(gx, 22, gx - 1, 26), SLATE_1)
    # eye + mouth + teeth
    cv.set(7, 24, INK)
    cv.set(8, 24, INK)
    cv.set(7, 23, PEARL)
    cv.fill(polyline([(3, 29), (7, 30), (11, 30)]), INK)
    for tx in (4, 6, 8, 10):
        cv.set(tx, 31, PEARL)
    outline(cv)
    return cv


def octopus() -> Canvas:
    cv = Canvas(T, T)
    tentacles = [
        ((17, 27), (8, 29), (1, 37), (5, 44)),
        ((31, 27), (40, 29), (47, 37), (43, 44)),
        ((20, 30), (14, 36), (11, 45), (17, 46)),
        ((28, 30), (34, 36), (37, 45), (31, 46)),
        ((22, 31), (21, 38), (19, 44), (23, 46)),
        ((26, 31), (27, 38), (29, 44), (25, 46)),
    ]
    for p in tentacles:
        path = bezier(*p)
        m = brush(path, 3.0, 0.9)
        part(cv, m, CORAL_2, CORAL_3, CORAL_1)
        # suckers along the path
        for i, (x, y, t) in enumerate(path):
            if i % 10 == 5 and t < 0.85:
                cv.set(int(x), int(y) + 1, CORAL_3)
    mantle = ellipse(24, 16, 13, 13) | ellipse(24, 26, 10, 6)
    part(cv, mantle, CORAL_2, CORAL_3, CORAL_1, lw=1, dw=2)
    # highlight blob + spots
    cv.fill(ellipse(19, 9, 4, 3), CORAL_3)
    cv.set(17, 8, PEARL)
    for (x, y) in [(28, 8), (31, 12), (27, 13), (33, 17), (15, 16)]:
        cv.set(x, y, CORAL_1)
    # eyes with horizontal pupils
    for ex in (18, 28):
        cv.fill(ellipse(ex + 0.5, 22, 3.5, 3), GOLD_3)
        cv.fill(rect(ex - 2, 22, ex + 2, 22), INK)
        cv.fill(line(ex - 3, 18, ex + 3, 18), CORAL_1)
    outline(cv)
    return cv


def turtle() -> Canvas:
    cv = Canvas(T, T)
    skin = (SAND_2, PEARL_2, SAND_1)
    flip_fl = poly([(14, 17), (5, 11), (1, 12), (2, 15), (10, 23)])
    flip_rl = poly([(15, 34), (9, 40), (10, 43), (17, 38)])
    head = ellipse(24, 7, 5, 5.5) | rect(21, 10, 26, 13)
    tailp = poly([(22, 39), (26, 39), (24, 45)])
    from draw import mirror_x
    for m in (flip_fl, mirror_x(flip_fl, T), flip_rl, mirror_x(flip_rl, T), head, tailp):
        part(cv, m, *skin)
    # skin scale spots
    for (x, y) in [(5, 13), (8, 15), (42, 13), (39, 15), (11, 39), (36, 39)]:
        cv.set(x, y, SAND_1)
    for ex in (21, 27):
        cv.set(ex, 6, INK)
    cv.set(24, 2, PEARL)
    shell = ellipse(24, 26, 13.5, 15)
    part(cv, shell, KELP_2, KELP_3, KELP_1, lw=1, dw=1)
    # marginal ring
    rim = inner_edge(shell) | inner_edge(ellipse(24, 26, 12.5, 14))
    for (x, y) in sorted(rim):
        cv.set(x, y, KELP_1 if (x + y) % 4 else KELP_2)
    # scutes
    sc = KELP_1
    cv.fill(polyline([(19, 15), (24, 13), (29, 15)]), sc)
    cv.fill(polyline([(19, 15), (18, 21), (19, 29), (20, 35)]), sc)
    cv.fill(polyline([(29, 15), (30, 21), (29, 29), (28, 35)]), sc)
    cv.fill(line(18, 21, 30, 21), sc)
    cv.fill(line(19, 29, 29, 29), sc)
    cv.fill(polyline([(20, 35), (24, 37), (28, 35)]), sc)
    for (x0, y0, x1, y1) in ((18, 21, 12, 19), (19, 29, 12, 31), (30, 21, 36, 19), (29, 29, 36, 31)):
        cv.fill(line(x0, y0, x1, y1), sc)
    # plate highlights
    for (x, y) in [(22, 17), (23, 17), (21, 23), (22, 23), (21, 31), (14, 24), (33, 24), (15, 33), (32, 33)]:
        cv.set(x, y, KELP_3)
    outline(cv)
    return cv


def angler() -> Canvas:
    cv = Canvas(T, T)
    body = ellipse(27, 28, 16, 13)
    tail = poly([(41, 25), (47, 18), (47, 39), (41, 32)])
    jaw = poly([(9, 33), (22, 30), (28, 38), (16, 42)])
    part(cv, tail, VIOLET_2, VIOLET_3, VIOLET_1)
    shade(cv, body | jaw, VIOLET_2, VIOLET_3, VIOLET_1, dw=2)
    # open mouth
    mouth = poly([(11, 27), (24, 29), (13, 36)])
    cv.fill(mouth, INK)
    for (x, y) in [(13, 28), (16, 29), (19, 29), (22, 30), (14, 35), (17, 33), (20, 32)]:
        cv.set(x, y, PEARL)
    for (x, y) in [(13, 29), (16, 30), (19, 30), (14, 34), (17, 32)]:
        cv.set(x, y, PEARL_2)
    # dorsal spines
    for sx in (30, 34, 38):
        cv.fill(line(sx, 16, sx + 2, 12), VIOLET_2)
    # bioluminescent spots
    for (x, y) in [(31, 22), (35, 26), (33, 31), (29, 35), (37, 32), (25, 38)]:
        cv.set(x, y, VIOLET_3)
    # eye
    cv.fill(rect(25, 21, 26, 22), GOLD_3)
    cv.set(26, 22, INK)
    outline(cv)
    # illicium (rod) + glowing lure, drawn over the outline
    rod = [(22, 16), (20, 11), (16, 7), (12, 6)]
    for (x, y, _t) in bezier(rod[0], rod[1], rod[2], rod[3], 40):
        cv.set(int(x), int(y), VIOLET_3)
    lure = circle(9.5, 6.5, 3)
    glow(cv, lure, GOLD_2, GOLD_1)
    shade(cv, lure, GOLD_3, PEARL, GOLD_2)
    return cv


# ---------------------------------------------------------------------------
# Low symbols
# ---------------------------------------------------------------------------
def pearl() -> Canvas:
    cv = Canvas(T, T)
    sphere = circle(24, 25, 14)
    shade(cv, sphere, PEARL_2, None, SLATE_3, dw=2)
    cv.fill(circle(21, 22, 9.5) & sphere, PEARL)
    cv.fill(ellipse(18, 18, 3, 2.5), FOAM)
    cv.set(16, 17, PEARL)
    # iridescent arc
    arc = sector(24, 25, 12.5, 11, 110, 160)
    cv.fill(arc, VIOLET_3)
    outline(cv)
    sparkle(cv, 41, 9, PEARL_2, 2, PEARL)
    sparkle(cv, 7, 40, PEARL_2, 1, PEARL)
    return cv


def shell() -> Canvas:
    cv = Canvas(T, T)
    cx, cy = 24, 40
    fan = set()
    for y in range(0, 48):
        for x in range(0, 48):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            a = math.atan2(dy, dx)
            if not (-math.pi * 0.95 <= a <= -math.pi * 0.05):
                continue
            r = math.hypot(dx, dy)
            edge = 32 + 1.6 * abs(math.cos(a * 9))
            if r <= edge:
                fan.add((x, y))
    ears = poly([(15, 36), (33, 36), (31, 43), (17, 43)])
    part(cv, ears, SAND_2, PEARL, SAND_1)
    shade(cv, fan, SAND_2, PEARL, SAND_1)
    # ribs radiating from the hinge
    for k in range(1, 9):
        a = -math.pi * (0.05 + 0.9 * (k / 9))
        for r in range(6, 34):
            x = int(cx + r * math.cos(a))
            y = int(cy + r * math.sin(a))
            if (x, y) in fan:
                cv.set(x, y, SAND_1)
    # soft coral growth bands
    for r0 in (14, 23):
        for (x, y) in sorted(fan):
            r = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if r0 <= r < r0 + 1.0 and cv.get(x, y) == SAND_2:
                cv.set(x, y, CORAL_3)
    cv.fill(line(19, 39, 29, 39), SAND_1)
    outline(cv)
    return cv


def starfish() -> Canvas:
    cv = Canvas(T, T)
    cx, cy = 24, 25
    star = set()
    for y in range(48):
        for x in range(48):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            a = math.atan2(dy, dx) + math.pi / 2
            r = math.hypot(dx, dy)
            lim = 7 + 15 * abs(math.cos(2.5 * a)) ** 2.2
            if r <= lim:
                star.add((x, y))
    shade(cv, star, CORAL_3, SAND_2, CORAL_2, dw=2)
    # bumps along each arm's centreline
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        for r in (4, 8, 12, 16):
            x = int(cx + r * math.cos(a))
            y = int(cy + r * math.sin(a))
            cv.set(x, y, SAND_2)
    cv.set(cx, cy, PEARL)
    outline(cv)
    return cv


def anchor() -> Canvas:
    cv = Canvas(T, T)
    metal = (SLATE_2, SLATE_3, SLATE_1)
    eye = ring(24, 7, 4.5, 2)
    shank = rect(22, 11, 25, 40)
    stock = rect(13, 14, 34, 16) | circle(13, 15.5, 2.2) | circle(35, 15.5, 2.2)
    arms = sector(24, 25, 18, 14.5, 25, 155)
    fl_l = poly([(5, 33), (11, 26), (13, 33)])
    fl_r = poly([(43, 33), (37, 26), (35, 33)])
    crown = ellipse(24, 41, 4, 2.5)
    for m in (arms | fl_l | fl_r | crown, shank, stock, eye):
        part(cv, m, *metal)
    # rope loop through the eye and around the shank
    rope = bezier((27, 9), (34, 13), (31, 22), (23, 24), 30) + bezier((23, 24), (16, 26), (17, 31), (24, 33), 30)
    for i, (x, y, _t) in enumerate(rope):
        cv.set(int(x), int(y), SAND_2 if (i // 4) % 2 else SAND_1)
    outline(cv)
    return cv


def ring(cx, cy, r_out, r_in):
    from draw import ring as _ring
    return _ring(cx, cy, r_out, r_in)


# ---------------------------------------------------------------------------
# Wild + badges
# ---------------------------------------------------------------------------
def wild() -> Canvas:
    """Kraken Eye: a slit-pupil eye in a glowing violet frame, gripped by tentacle tips."""
    cv = Canvas(T, T)
    frame_outer = rect(3, 3, 44, 44) - {(3, 3), (44, 3), (3, 44), (44, 44)}
    frame_inner = rect(7, 7, 40, 40)
    # glow halo outside the frame
    glow(cv, frame_outer, SEA_3, SEA_1)
    part(cv, frame_outer - frame_inner, VIOLET_2, VIOLET_3, VIOLET_1)
    cv.fill(frame_inner, VIOLET_1)
    cv.fill(border(frame_inner) & frame_outer, INK)
    # rivets
    for (x, y) in [(5, 5), (42, 5), (5, 42), (42, 42), (23, 5), (23, 42), (5, 23), (42, 23)]:
        cv.set(x, y, GOLD_3)
    # radiating glow behind the eye
    rays = set()
    for k in range(12):
        a = k * math.pi / 6
        for r in range(15, 18):
            rays.add((int(24 + r * math.cos(a)), int(24 + r * 0.95 * math.sin(a))))
    cv.fill(rays & frame_inner, VIOLET_2)
    # almond eye (lens of two circles)
    R, k = 17.0, 9.5
    lens = circle(24, 24 - k, R) & circle(24, 24 + k, R)
    lens = {p for p in lens if 8 <= p[0] <= 39}
    cv.fill(border(lens), INK)
    shade(cv, lens, FOAM, PEARL, SEA_3, ldir=(0, -1))
    iris = circle(24, 24, 7.5) & lens
    shade(cv, iris, GOLD_2, GOLD_3, GOLD_1, dw=1)
    cv.fill(inner_edge(circle(24, 24, 5)) & iris, GOLD_3)
    pupil = ellipse(24, 24, 1.6, 6.5)
    cv.fill(pupil, INK)
    cv.set(21, 20, PEARL)
    cv.set(22, 20, PEARL)
    cv.set(21, 21, PEARL)
    # eyelids
    cv.fill({p for p in border(lens) if p[1] < 24}, VIOLET_3)
    cv.fill(shift_up(border(lens), 1) - lens - border(lens), INK)
    # tentacle tips curling over two corners
    for p, flip in (((0, 47), False), ((47, 0), True)):
        if not flip:
            path = bezier((3, 47), (0, 37), (9, 31), (11, 37), 40)
        else:
            path = bezier((44, 0), (47, 10), (38, 16), (36, 10), 40)
        m = brush(path, 2.4, 0.9)
        part(cv, m, CORAL_2, CORAL_3, CORAL_1)
        for i, (x, y, t) in enumerate(path):
            if i % 9 == 4 and t < 0.8:
                cv.set(int(x), int(y), PEARL_2)
    return cv


def shift_up(mask, n):
    return {(x, y - n) for (x, y) in mask}


GLYPHS = {
    "x": ["...", "1.1", ".1.", "1.1", "..."],
    "2": ["111", "..1", "111", "1..", "111"],
    "3": ["111", "..1", ".11", "..1", "111"],
}


def _glyph(cv: Canvas, ch: str, x0: int, y0: int, c, scale: int = 2) -> None:
    for gy, row in enumerate(GLYPHS[ch]):
        for gx, v in enumerate(row):
            if v == "1":
                for sy in range(scale):
                    for sx in range(scale):
                        cv.set(x0 + gx * scale + sx, y0 + gy * scale + sy, c)


def badge(mult: int) -> Canvas:
    """48x48 overlay: a multiplier pill in the top-right corner of the wild."""
    cv = Canvas(T, T)
    fill, rim, text = ((SEA_2, FOAM, PEARL) if mult == 2 else (CORAL_2, GOLD_3, GOLD_3))
    pill = rect(26, 1, 46, 16) - {(26, 1), (46, 1), (26, 16), (46, 16)}
    shade(cv, pill, fill, rim, INK if mult == 3 else SEA_1)
    cv.fill(inner_edge(pill), rim)
    cv.fill({p for p in inner_edge(pill) if p[1] == 16 or p[0] == 46}, GOLD_1 if mult == 3 else SEA_1)
    _glyph(cv, "x", 29, 4, text)
    _glyph(cv, str(mult), 37, 4, text)
    outline(cv)
    return cv


# ---------------------------------------------------------------------------
# Scatter
# ---------------------------------------------------------------------------
def chest() -> Canvas:
    """Treasure Chest scatter: open, spilling light and pearls."""
    cv = Canvas(T, T)
    # light rays fanning upward from the opening
    for ang in (-130, -108, -90, -72, -50):
        a = math.radians(ang)
        for r in range(8, 25):
            x = int(round(24 + r * math.cos(a)))
            y = int(round(21 + r * math.sin(a)))
            c = GOLD_3 if r < 15 else (GOLD_2 if r % 3 else None)
            if c is not None:
                cv.set(x, y, c)
    lid = poly([(8, 23), (39, 23), (36, 11), (11, 11)])
    lid_lining = poly([(11, 22), (36, 22), (34, 14), (13, 14)])
    part(cv, lid, SAND_1, SAND_2, CORAL_1)
    cv.fill(lid_lining, CORAL_1)
    cv.fill(rect(11, 11, 36, 12) & lid, GOLD_2)
    # pearls heaped in the chest
    heap = [(15, 23, 3), (21, 21, 3.5), (27, 22, 3.5), (33, 23, 3), (18, 25, 3), (24, 24, 3), (30, 25, 3)]
    for (x, y, r) in heap:
        m = circle(x, y, r)
        part(cv, m, PEARL_2, PEARL, SLATE_3)
        cv.set(int(x - r / 2), int(y - r / 2), PEARL)
    box = rect(7, 27, 40, 43)
    shade(cv, box, SAND_1, SAND_2, CORAL_1)
    for py in (32, 37):
        cv.fill(line(8, py, 39, py), CORAL_1)
    bands = rect(7, 27, 10, 43) | rect(37, 27, 40, 43) | rect(7, 27, 40, 28)
    shade(cv, bands, GOLD_2, GOLD_3, GOLD_1)
    lock = rect(21, 29, 26, 35)
    part(cv, lock, GOLD_3, PEARL, GOLD_2)
    cv.fill(rect(23, 31, 24, 32) | {(23, 33)}, INK)
    outline(cv)
    # glow halo around the whole chest
    glow(cv, cv.opaque(), GOLD_2, GOLD_1)
    sparkle(cv, 6, 8, GOLD_3, 2, PEARL)
    sparkle(cv, 42, 6, GOLD_3, 1, PEARL)
    sparkle(cv, 44, 22, PEARL_2, 1, PEARL)
    return cv


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
def build() -> dict:
    """Return {relative path: Canvas} for every symbol tile, in stable order."""
    out = {}
    out["symbols/whale_single.png"] = whale_single()
    for name, cv in whale_segments().items():
        out["symbols/%s.png" % name] = cv
    for name, fn in (("shark", shark), ("octopus", octopus), ("turtle", turtle), ("angler", angler),
                     ("pearl", pearl), ("shell", shell), ("starfish", starfish), ("anchor", anchor),
                     ("wild", wild), ("chest", chest)):
        out["symbols/%s.png" % name] = fn()
    out["symbols/badge_x2.png"] = badge(2)
    out["symbols/badge_x3.png"] = badge(3)
    return out
