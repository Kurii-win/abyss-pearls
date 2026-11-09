"""Review sheets for Kurii (docs/art/, not shipped):
contact_sheet.png, contact_sheet_gray.png, reel_mock.png."""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

from draw import save_png

SHEET_BG = (42, 47, 58)
LABEL = (220, 224, 232)
SCALE = 2


def _label(text: str) -> Image.Image:
    font = ImageFont.load_default_imagefont()
    l, t, r, b = font.getbbox(text)
    img = Image.new("RGBA", (r - l + 2, b - t + 2), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((1 - l, 1 - t), text, fill=LABEL + (255,), font=font)
    return img.resize((img.width * 2, img.height * 2), Image.NEAREST)


def _up(img: Image.Image, s: int = SCALE) -> Image.Image:
    return img.resize((img.width * s, img.height * s), Image.NEAREST)


def _stack(*imgs: Image.Image) -> Image.Image:
    out = Image.new("RGBA", (imgs[0].width, sum(i.height for i in imgs)), (0, 0, 0, 0))
    y = 0
    for i in imgs:
        out.paste(i, (0, y))
        y += i.height
    return out


def contact_sheet(assets_dir: str) -> Image.Image:
    def load(rel):
        return Image.open(os.path.join(assets_dir, rel)).convert("RGBA")

    sym = lambda n: load("symbols/%s.png" % n)
    wild_x3 = sym("wild").copy()
    wild_x3.alpha_composite(sym("badge_x3"))
    wild_x2 = sym("wild").copy()
    wild_x2.alpha_composite(sym("badge_x2"))
    rows = [
        [("whale_single", sym("whale_single")), ("whale_top", sym("whale_top")),
         ("whale_mid", sym("whale_mid")), ("whale_bottom", sym("whale_bottom")),
         ("stack t+m+b", _stack(sym("whale_top"), sym("whale_mid"), sym("whale_bottom"))),
         ("stack t+m+m+b", _stack(sym("whale_top"), sym("whale_mid"), sym("whale_mid"), sym("whale_bottom")))],
        [("shark", sym("shark")), ("octopus", sym("octopus")), ("turtle", sym("turtle")),
         ("angler", sym("angler")), ("pearl", sym("pearl")), ("shell", sym("shell")),
         ("starfish", sym("starfish")), ("anchor", sym("anchor"))],
        [("wild", sym("wild")), ("badge_x2", sym("badge_x2")), ("badge_x3", sym("badge_x3")),
         ("wild+x2", wild_x2), ("wild+x3", wild_x3), ("chest", sym("chest")),
         ("cell_highlight", load("ui/cell_highlight.png"))],
        [("spin idle", load("ui/spin_button_idle.png")), ("spin pressed", load("ui/spin_button_pressed.png")),
         ("spin disabled", load("ui/spin_button_disabled.png")),
         ("spin freespins", load("ui/spin_button_freespins.png")),
         ("balance_bar", load("ui/balance_bar.png"))],
        [("reel_frame", load("ui/reel_frame.png"))],
        [("background", load("bg/background.png")), ("background_freespins", load("bg/background_freespins.png"))],
    ]
    pad = 16
    laid = []
    width = 0
    y = pad
    for row in rows:
        x = pad
        row_h = 0
        for name, img in row:
            big = _up(img)
            lab = _label(name)
            laid.append((big, lab, x, y))
            x += max(big.width, lab.width) + pad
            row_h = max(row_h, big.height + lab.height + 4)
        width = max(width, x)
        y += row_h + pad
    sheet = Image.new("RGBA", (width, y), SHEET_BG + (255,))
    for big, lab, x, yy in laid:
        sheet.alpha_composite(big, (x, yy))
        sheet.alpha_composite(lab, (x, yy + big.height + 4))
    return sheet.convert("RGB")


def reel_mock(assets_dir: str, layout: dict) -> Image.Image:
    def load(rel):
        return Image.open(os.path.join(assets_dir, rel)).convert("RGBA")

    s = layout["scale"]
    cell = layout["cell"] * s
    bg = load("bg/background.png")
    bg = bg.resize((bg.width * 4, bg.height * 4), Image.NEAREST)
    W, H = 680, 420
    canvas = bg.crop((300, 150, 300 + W, 150 + H))
    fr = layout["reel_frame"]
    fx, fy = 20, 16
    canvas.alpha_composite(_up(load(fr["file"]), s), (fx, fy))
    grid = [
        ["whale_top", "shark", "chest", "turtle", "angler"],
        ["whale_mid", "wild", "octopus", "anchor", "starfish"],
        ["whale_bottom", "pearl", "shell", "wild", "chest"],
    ]
    ix, iy = fx + fr["inner"]["x"] * s, fy + fr["inner"]["y"] * s
    for r, row in enumerate(grid):
        for c, name in enumerate(row):
            tile = load("symbols/%s.png" % name)
            if (r, c) == (1, 1):
                tile.alpha_composite(load("symbols/badge_x3.png"))
            if (r, c) == (2, 3):
                tile.alpha_composite(load("symbols/badge_x2.png"))
            pos = (ix + c * cell, iy + r * cell)
            canvas.alpha_composite(_up(tile, s), pos)
            if (r, c) == (1, 1):
                canvas.alpha_composite(_up(load("ui/cell_highlight.png"), s), pos)
    canvas.alpha_composite(_up(load("ui/spin_button_idle.png"), s), (fx + fr["w"] * s + 30, fy + 116))
    canvas.alpha_composite(_up(load("ui/balance_bar.png"), s), (fx, fy + fr["h"] * s + 12))
    return canvas.convert("RGB")


def build(assets_dir: str, out_dir: str, layout: dict) -> list:
    sheet = contact_sheet(assets_dir)
    gray = sheet.convert("L").convert("RGB")
    mock = reel_mock(assets_dir, layout)
    paths = []
    for name, img in (("contact_sheet.png", sheet), ("contact_sheet_gray.png", gray), ("reel_mock.png", mock)):
        p = os.path.join(out_dir, name)
        save_png(img, p)
        paths.append(p)
    return paths
