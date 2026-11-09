"""Abyss Pearls master palette (original, hand-picked for this project).

Every opaque pixel of every shipped asset must be one of these colours
(check.py enforces it). Reskinning the game = editing this file.
"""
from __future__ import annotations


def _rgb(hex_str: str) -> tuple:
    h = hex_str.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


# --- Deep water: navy to teal --------------------------------------------
INK = _rgb("#05070f")       # outlines, deepest abyss
ABYSS_1 = _rgb("#101a38")   # reel backing, deep background
ABYSS_2 = _rgb("#182a52")
ABYSS_3 = _rgb("#21406e")   # whale back
SEA_1 = _rgb("#145a72")
SEA_2 = _rgb("#22858b")
SEA_3 = _rgb("#3fbaa8")     # bioluminescent teal
FOAM = _rgb("#a6eedc")      # brightest water light, iridescence

# --- Pearl whites ----------------------------------------------------------
PEARL = _rgb("#f4f0e6")
PEARL_2 = _rgb("#cdc6da")   # lilac pearl shade

# --- Slate (shark, anchor, disabled UI) -----------------------------------
SLATE_1 = _rgb("#3a4a63")
SLATE_2 = _rgb("#6b7d96")
SLATE_3 = _rgb("#a5b4c6")

# --- Coral accents ---------------------------------------------------------
CORAL_1 = _rgb("#7d2433")
CORAL_2 = _rgb("#c9473f")
CORAL_3 = _rgb("#f08a68")

# --- Gold accents ----------------------------------------------------------
GOLD_1 = _rgb("#8a5513")
GOLD_2 = _rgb("#dc9d22")
GOLD_3 = _rgb("#ffe387")

# --- Violet (angler, kraken eye, free spins) -------------------------------
VIOLET_1 = _rgb("#2e1a52")
VIOLET_2 = _rgb("#6a3fa6")
VIOLET_3 = _rgb("#b78af0")

# --- Kelp greens (turtle, seabed) -----------------------------------------
KELP_1 = _rgb("#1f4a2a")
KELP_2 = _rgb("#4f8a3c")
KELP_3 = _rgb("#93c46a")

# --- Sand / driftwood ------------------------------------------------------
SAND_1 = _rgb("#6e5040")
SAND_2 = _rgb("#b59c80")

# Ordered name -> RGB map (stable order; used by check.py and the report).
ALL = {
    name: value
    for name, value in [
        ("INK", INK), ("ABYSS_1", ABYSS_1), ("ABYSS_2", ABYSS_2), ("ABYSS_3", ABYSS_3),
        ("SEA_1", SEA_1), ("SEA_2", SEA_2), ("SEA_3", SEA_3), ("FOAM", FOAM),
        ("PEARL", PEARL), ("PEARL_2", PEARL_2),
        ("SLATE_1", SLATE_1), ("SLATE_2", SLATE_2), ("SLATE_3", SLATE_3),
        ("CORAL_1", CORAL_1), ("CORAL_2", CORAL_2), ("CORAL_3", CORAL_3),
        ("GOLD_1", GOLD_1), ("GOLD_2", GOLD_2), ("GOLD_3", GOLD_3),
        ("VIOLET_1", VIOLET_1), ("VIOLET_2", VIOLET_2), ("VIOLET_3", VIOLET_3),
        ("KELP_1", KELP_1), ("KELP_2", KELP_2), ("KELP_3", KELP_3),
        ("SAND_1", SAND_1), ("SAND_2", SAND_2),
    ]
}

COLOURS = frozenset(ALL.values())


def to_hex(rgb: tuple) -> str:
    return "#%02x%02x%02x" % rgb
