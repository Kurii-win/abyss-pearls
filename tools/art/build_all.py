"""Entry point for all Abyss Pearls art generators (`npm run art`).

Builds every asset into src/assets/, writes layout.json and manifest.json,
runs check.py, then renders the review sheets into docs/art/.
Deterministic: fixed seeds, stable ordering, PNGs saved without metadata.
"""
from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import backgrounds  # noqa: E402
import check  # noqa: E402
import review  # noqa: E402
import symbols  # noqa: E402
import ui  # noqa: E402
from draw import save_png  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ASSETS = os.path.join(ROOT, "src", "assets")
REVIEW = os.path.join(ROOT, "docs", "art")


def write_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="\n") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
        fh.write("\n")


def main() -> int:
    assets = {}
    for mod in (symbols, ui, backgrounds):
        assets.update(mod.build())

    for rel in sorted(assets):
        save_png(assets[rel].to_image(), os.path.join(ASSETS, rel))

    layout = ui.layout()
    write_json(os.path.join(ASSETS, "ui", "layout.json"), layout)

    entries = []
    for rel in check.list_pngs():
        cv = assets.get(rel)
        if cv is None:
            continue  # stale file from an older build; check.py will flag it
        entries.append({"file": rel, "w": cv.w, "h": cv.h,
                        "sha256": check.sha256(os.path.join(ASSETS, rel))})
    write_json(os.path.join(ASSETS, "manifest.json"), {"generator": "tools/art/build_all.py", "files": entries})
    print("built %d assets into %s" % (len(assets), os.path.relpath(ASSETS, ROOT)))

    if check.main() != 0:
        return 1

    for p in review.build(ASSETS, REVIEW, layout):
        print("review sheet: %s" % os.path.relpath(p, ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
