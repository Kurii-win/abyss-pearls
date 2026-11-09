"""Validate generated assets. Run standalone or from build_all.py.

Checks:
  1. every pixel of every PNG in src/assets is a palette colour (alpha 255) or alpha 0
  2. sizes match the spec; backgrounds are fully opaque
  3. whale segments join: the seam rows of top|mid, mid|mid and mid|bottom match exactly
  4. manifest.json lists exactly the PNGs on disk with matching size and sha256
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ASSETS = os.path.join(ROOT, "src", "assets")
sys.path.insert(0, HERE)

from palette import COLOURS  # noqa: E402

SYMBOLS = ["whale_single", "whale_top", "whale_mid", "whale_bottom", "shark", "octopus",
           "turtle", "angler", "pearl", "shell", "starfish", "anchor", "wild", "badge_x2",
           "badge_x3", "chest"]
EXPECTED = {"symbols/%s.png" % s: (48, 48) for s in SYMBOLS}
EXPECTED.update({
    "ui/reel_frame.png": (260, 164),
    "ui/balance_bar.png": (260, 22),
    "ui/cell_highlight.png": (48, 48),
    "ui/spin_button_idle.png": (48, 48),
    "ui/spin_button_pressed.png": (48, 48),
    "ui/spin_button_disabled.png": (48, 48),
    "ui/spin_button_freespins.png": (48, 48),
    "bg/background.png": (320, 180),
    "bg/background_freespins.png": (320, 180),
})
OPAQUE = {"bg/background.png", "bg/background_freespins.png"}


def list_pngs() -> list:
    out = []
    for dirpath, _dirs, files in os.walk(ASSETS):
        for f in files:
            if f.endswith(".png"):
                out.append(os.path.relpath(os.path.join(dirpath, f), ASSETS).replace(os.sep, "/"))
    return sorted(out)


def sha256(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def _rows(img: Image.Image) -> list:
    w, h = img.size
    px = img.load()
    return [[px[x, y] for x in range(w)] for y in range(h)]


def check_whale(errors: list) -> None:
    load = lambda n: _rows(Image.open(os.path.join(ASSETS, "symbols", n + ".png")).convert("RGBA"))
    top, mid, bot = load("whale_top"), load("whale_mid"), load("whale_bottom")
    seams = (("top|mid", top, mid), ("mid|mid", mid, mid), ("mid|bottom", mid, bot))
    for name, upper, lower in seams:
        a, b = upper[-1], lower[0]
        opaque_a = [x for x, p in enumerate(a) if p[3] == 255]
        if len(opaque_a) < 20:
            errors.append("whale seam %s: body too thin at the seam (%d px)" % (name, len(opaque_a)))
        if a != b:
            diff = [x for x in range(len(a)) if a[x] != b[x]]
            errors.append("whale seam %s: rows differ at x=%s" % (name, diff))
        # the two rows either side of the seam must also agree (continuity, not just one row)
        if upper[-2] != lower[1]:
            errors.append("whale seam %s: body profile not continuous across seam" % name)


def run() -> list:
    errors = []
    files = list_pngs()
    missing = sorted(set(EXPECTED) - set(files))
    extra = sorted(set(files) - set(EXPECTED))
    for m in missing:
        errors.append("missing asset: %s" % m)
    for e in extra:
        errors.append("unexpected asset (no spec entry): %s" % e)
    for rel in files:
        img = Image.open(os.path.join(ASSETS, rel))
        if img.mode != "RGBA":
            errors.append("%s: mode %s, expected RGBA" % (rel, img.mode))
            continue
        if rel in EXPECTED and img.size != EXPECTED[rel]:
            errors.append("%s: size %s, expected %s" % (rel, img.size, EXPECTED[rel]))
        bad = 0
        clear = 0
        for (r, g, b, a) in img.getdata():
            if a == 0:
                clear += 1
            elif a != 255 or (r, g, b) not in COLOURS:
                bad += 1
        if bad:
            errors.append("%s: %d pixels off-palette or semi-transparent" % (rel, bad))
        if rel in OPAQUE and clear:
            errors.append("%s: %d transparent pixels in an opaque background" % (rel, clear))
    if not missing:
        check_whale(errors)
    man_path = os.path.join(ASSETS, "manifest.json")
    if os.path.exists(man_path):
        with open(man_path) as fh:
            manifest = json.load(fh)
        listed = {e["file"]: e for e in manifest["files"]}
        if sorted(listed) != files:
            errors.append("manifest.json does not list exactly the PNGs on disk")
        for rel in files:
            e = listed.get(rel)
            if e and e["sha256"] != sha256(os.path.join(ASSETS, rel)):
                errors.append("manifest.json: stale sha256 for %s" % rel)
    else:
        errors.append("manifest.json missing")
    return errors


def main() -> int:
    errors = run()
    if errors:
        print("check.py: FAILED")
        for e in errors:
            print("  - " + e)
        return 1
    print("check.py: OK (%d assets, palette, sizes, whale seams, manifest)" % len(list_pngs()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
