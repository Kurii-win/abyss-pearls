"""UI pieces: reel frame, spin button states, balance bar, win cell highlight.
No text is baked in: the View renders all labels and numbers."""
from __future__ import annotations

import math

from draw import (Canvas, border, circle, ellipse, inner_edge, line, ordered, outline,
                  part, poly, rect, sector, shade, sparkle)
from palette import (ABYSS_1, ABYSS_2, ABYSS_3, CORAL_1, CORAL_2, CORAL_3, FOAM, GOLD_1,
                     GOLD_2, GOLD_3, INK, PEARL, PEARL_2, SEA_1, SEA_2, SEA_3, SLATE_1,
                     SLATE_2, SLATE_3, VIOLET_1, VIOLET_2, VIOLET_3)

CELL = 48
COLS, ROWS = 5, 3
BORDER = 10
FRAME_W = COLS * CELL + 2 * BORDER   # 260
FRAME_H = ROWS * CELL + 2 * BORDER   # 164

BAR_W, BAR_H = FRAME_W, 22
BAR_PAD = 3
BAR_GAP = 4
BUTTON = 48


def _pearl_stud(cv: Canvas, x: float, y: float, r: float = 2.2) -> None:
    m = circle(x, y, r)
    cv.fill(border(m), INK)
    shade(cv, m, PEARL_2, PEARL, SLATE_2)


def reel_frame() -> Canvas:
    cv = Canvas(FRAME_W, FRAME_H)
    W, H = FRAME_W, FRAME_H
    outer = rect(0, 0, W - 1, H - 1) - {(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)}
    inner = rect(BORDER, BORDER, BORDER + COLS * CELL - 1, BORDER + ROWS * CELL - 1)
    # frame body: teal metal with gold trims
    shade(cv, outer, SEA_1, SEA_2, ABYSS_2, lw=1, dw=1)
    cv.fill(inner_edge(outer), INK)
    trim_o = inner_edge(rect(2, 2, W - 3, H - 3))
    trim_i = inner_edge(rect(BORDER - 3, BORDER - 3, W - BORDER + 2, H - BORDER + 2))
    cv.fill(trim_o, GOLD_2)
    cv.fill({p for p in trim_o if p[0] == 2 or p[1] == 2}, GOLD_3)
    cv.fill(trim_i, GOLD_1)
    cv.fill({p for p in trim_i if p[0] == W - BORDER + 2 or p[1] == H - BORDER + 2}, GOLD_2)
    # inner bevel
    bevel = inner_edge(rect(BORDER - 2, BORDER - 2, W - BORDER + 1, H - BORDER + 1))
    cv.fill(bevel, ABYSS_2)
    cv.fill(inner_edge(rect(BORDER - 1, BORDER - 1, W - BORDER, H - BORDER)), INK)
    # reel backing: dark, with drum shading at top and bottom, and faint reel dividers
    cv.fill(inner, ABYSS_1)
    for (x, y) in sorted(inner):
        iy = y - BORDER
        edge = min(iy, ROWS * CELL - 1 - iy)
        if edge < 6 and (x + y) % 2 == 0 and edge < 3 + (x % 2):
            cv.set(x, y, INK)
    for c in range(1, COLS):
        x = BORDER + c * CELL
        for y in range(BORDER, BORDER + ROWS * CELL):
            cv.set(x, y, ABYSS_2)
    # pearl studs along the border
    for x in range(30, W - 20, 40):
        _pearl_stud(cv, x + 0.5, 5.5)
        _pearl_stud(cv, x + 0.5, H - 4.5)
    for y in range(42, H - 30, 40):
        _pearl_stud(cv, 5.5, y + 0.5)
        _pearl_stud(cv, W - 4.5, y + 0.5)
    # coral clusters on the corners
    for (cx, cy) in ((6, 6), (W - 6, 6), (6, H - 6), (W - 6, H - 6)):
        m = circle(cx, cy, 5)
        part(cv, m, CORAL_2, CORAL_3, CORAL_1)
        for (dx, dy) in ((-2, -2), (1, -2), (-2, 1), (1, 1), (0, 0)):
            cv.set(int(cx) + dx, int(cy) + dy, CORAL_1 if (dx + dy) % 2 else CORAL_3)
        cv.set(int(cx) - 1, int(cy) - 1, PEARL)
    return cv


def _arrow_icon(cx: float, cy: float) -> tuple:
    arc = sector(cx, cy, 10.5, 7, 300, 230)
    head = poly([(cx - 13.5, cy - 9), (cx - 3, cy - 13), (cx - 5, cy - 1)])
    return arc, head


def spin_button(state: str) -> Canvas:
    """state: idle | pressed | disabled | freespins"""
    cv = Canvas(BUTTON, BUTTON)
    styles = {
        "idle": (SEA_2, SEA_3, SEA_1, GOLD_2, GOLD_3, GOLD_1, PEARL, PEARL_2),
        "pressed": (SEA_1, SEA_2, ABYSS_3, GOLD_1, GOLD_2, GOLD_1, PEARL_2, SLATE_3),
        "disabled": (SLATE_1, SLATE_2, ABYSS_2, SLATE_2, SLATE_3, SLATE_1, SLATE_3, SLATE_2),
        "freespins": (VIOLET_2, VIOLET_3, VIOLET_1, GOLD_2, GOLD_3, GOLD_1, GOLD_3, GOLD_2),
    }
    base, light, dark, rim, rim_l, rim_d, icon, icon_d = styles[state]
    dy = 1 if state == "pressed" else 0
    cx, cy = 24, 23 + dy
    if state != "pressed":
        cv.fill(ellipse(24, 26, 22, 21), INK)  # drop shadow
    ring_m = circle(cx, cy, 22)
    shade(cv, ring_m, rim, rim_l, rim_d)
    face = circle(cx, cy, 19)
    cv.fill(border(face), INK)
    shade(cv, face, base, light, dark, lw=2, dw=2)
    if state in ("idle", "freespins"):
        cv.fill(ellipse(cx - 6, cy - 9, 7, 3) & face, light)
    arc, head = _arrow_icon(cx, cy)
    icon_m = arc | head
    cv.fill(border(icon_m), INK)
    shade(cv, icon_m, icon, None, icon_d)
    if state == "freespins":
        sparkle(cv, 37, 9, PEARL, 2, PEARL)
    outline(cv)
    return cv


def bar_segments() -> list:
    inner_w = BAR_W - 2 * BAR_PAD
    seg_w = (inner_w - 2 * BAR_GAP) // 3
    segs = []
    x = BAR_PAD
    for name in ("balance", "bet", "win"):
        segs.append({"name": name, "x": x + 1, "y": BAR_PAD + 1, "w": seg_w - 2, "h": BAR_H - 2 * BAR_PAD - 2})
        x += seg_w + BAR_GAP
    return segs


def balance_bar() -> Canvas:
    cv = Canvas(BAR_W, BAR_H)
    outer = rect(0, 0, BAR_W - 1, BAR_H - 1) - {(0, 0), (BAR_W - 1, 0), (0, BAR_H - 1), (BAR_W - 1, BAR_H - 1)}
    shade(cv, outer, SEA_1, SEA_2, ABYSS_2)
    cv.fill(inner_edge(outer), INK)
    cv.fill({p for p in inner_edge(rect(1, 1, BAR_W - 2, BAR_H - 2)) if p[1] == 1}, GOLD_2)
    for s in bar_segments():
        well = rect(s["x"], s["y"], s["x"] + s["w"] - 1, s["y"] + s["h"] - 1)
        cv.fill(border(well), INK)
        cv.fill(well, ABYSS_1)
        cv.fill({p for p in well if p[1] == s["y"]}, INK)
        cv.fill({p for p in border(well) if p[1] == s["y"] + s["h"]}, SEA_2)
    segs = bar_segments()
    for a, b in zip(segs, segs[1:]):
        sx = (a["x"] + a["w"] + b["x"]) / 2
        _pearl_stud(cv, sx, BAR_H / 2, 1.6)
    return cv


def cell_highlight() -> Canvas:
    cv = Canvas(CELL, CELL)
    frame = rect(0, 0, CELL - 1, CELL - 1) - rect(3, 3, CELL - 4, CELL - 4)
    cv.fill(frame, GOLD_2)
    cv.fill(inner_edge(rect(0, 0, CELL - 1, CELL - 1)), GOLD_3)
    cv.fill(inner_edge(rect(2, 2, CELL - 3, CELL - 3)), GOLD_1)
    # corner brackets
    for (cx, cy, sx, sy) in ((0, 0, 1, 1), (CELL - 1, 0, -1, 1), (0, CELL - 1, 1, -1), (CELL - 1, CELL - 1, -1, -1)):
        for k in range(10):
            for t in range(3, 5):
                cv.set(cx + sx * k, cy + sy * t, GOLD_3)
                cv.set(cx + sx * t, cy + sy * k, GOLD_3)
        cv.set(cx + sx * 5, cy + sy * 5, PEARL)
        cv.set(cx + sx * 6, cy + sy * 5, FOAM)
        cv.set(cx + sx * 5, cy + sy * 6, FOAM)
    for (x, y) in ((24, 0), (24, 47), (0, 24), (47, 24)):
        cv.set(x, y, PEARL)
    return cv


def layout() -> dict:
    return {
        "scale": 2,
        "cell": CELL,
        "reel_frame": {
            "file": "ui/reel_frame.png",
            "w": FRAME_W,
            "h": FRAME_H,
            "inner": {"x": BORDER, "y": BORDER, "w": COLS * CELL, "h": ROWS * CELL},
            "cols": COLS,
            "rows": ROWS,
            "inner_fill": "opaque",
        },
        "balance_bar": {
            "file": "ui/balance_bar.png",
            "w": BAR_W,
            "h": BAR_H,
            "segments": bar_segments(),
        },
        "spin_button": {
            "w": BUTTON,
            "h": BUTTON,
            "states": {
                "idle": "ui/spin_button_idle.png",
                "pressed": "ui/spin_button_pressed.png",
                "disabled": "ui/spin_button_disabled.png",
                "freespins": "ui/spin_button_freespins.png",
            },
        },
        "cell_highlight": {"file": "ui/cell_highlight.png", "w": CELL, "h": CELL},
        "note": "All coordinates are native pixels; multiply by scale. Text is rendered by the View.",
    }


def build() -> dict:
    out = {
        "ui/reel_frame.png": reel_frame(),
        "ui/balance_bar.png": balance_bar(),
        "ui/cell_highlight.png": cell_highlight(),
    }
    for st in ("idle", "pressed", "disabled", "freespins"):
        out["ui/spin_button_%s.png" % st] = spin_button(st)
    return out
