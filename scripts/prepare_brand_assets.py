"""HER Beauty brand asset pipeline.

Derives every web-ready brand asset from the master logo artwork
(`her-logo-master.jpg`, a JPEG despite its history of being named .png):

  public/logo/her-logo.png              transparent-background logo (matte knockout)
  public/logo/her-logo-chip.png         circular emblem crop, transparent (nav / favicon source)
  public/logo/her-logo-mono-copper.png  flat copper silhouette on transparent
  public/logo/her-logo-mono-linen.png   flat linen silhouette on transparent (dark surfaces)
  public/favicon.ico                    multi-size ICO built from the chip
  public/icon.svg                       vector favicon / apple-touch fallback mark
  public/og.png                         1200x630 social share card

The knockout is a matte removal: the paper background colour is sampled from
the image corners, per-pixel alpha is derived from luminance + chroma distance
to that matte, then the original ink colour is recovered by un-premultiplying.

Run with:  python scripts/prepare_brand_assets.py
"""

from __future__ import annotations

import os
import struct
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, "her-logo-master.jpg")
if not os.path.exists(MASTER):  # tolerate the old mis-named file
    MASTER = os.path.join(ROOT, "her-logo.png")

LOGO_DIR = os.path.join(ROOT, "public", "logo")
PUBLIC_DIR = os.path.join(ROOT, "public")

# Brand palette (must mirror tailwind.config.ts / src/lib/brand.ts)
ESPRESSO = (31, 22, 20)        # #1F1614 brand-dark
COPPER = (158, 85, 64)         # #9E5540 brand-copper
COPPER_DARK = (110, 53, 37)    # #6E3525 brand-700
LINEN = (250, 246, 240)        # #FAF6F0 brand-linen
LINEN_LIGHT = (250, 246, 240)  # #FAF6F0 brand-textLight
MUTED = (125, 111, 106)        # #7D6F6A brand-muted

FONT_BOLD = r"C:\Windows\Fonts\georgiab.ttf"
FONT_REG = r"C:\Windows\Fonts\georgia.ttf"


def _lum(rgb):
    r, g, b = (c / 255.0 for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _chroma(rgb):
    r, g, b = rgb[:3]
    return max(r, g, b) - min(r, g, b)


def smoothstep(edge0, edge1, x):
    if edge1 == edge0:
        return 0.0 if x < edge0 else 1.0
    t = min(max((x - edge0) / (edge1 - edge0), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def load_master():
    return Image.open(MASTER).convert("RGB")


def knockout(src: Image.Image):
    """Return RGBA image with the paper background removed."""
    w, h = src.size
    px = src.load()
    # Sample the paper matte from the four corners (8px insets).
    samples = [px[i, j] for i in (8, w - 9) for j in (8, h - 9)]
    matte = tuple(sum(c[k] for c in samples) // len(samples) for k in range(3))
    matte_lum = _lum(matte)

    out = Image.new("RGBA", (w, h))
    opx = out.load()
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            lum = _lum(c)
            chroma = _chroma(c)
            # Distance from paper: paper is light AND low-chroma.
            d_lum = max(0.0, matte_lum - lum) / max(matte_lum, 1e-6)
            d_chr = max(0.0, chroma - 26) / 110.0
            a = max(smoothstep(0.115, 0.68, d_lum), smoothstep(0.13, 0.55, d_chr))
            a = min(a, 1.0)
            if a <= 0.004:
                opx[x, y] = (0, 0, 0, 0)
                continue
            # Un-premultiply against the matte to recover true ink colour.
            ink = []
            for k in range(3):
                v = (c[k] - (1.0 - a) * matte[k]) / a
                ink.append(min(255, max(0, int(round(v)))))
            opx[x, y] = (ink[0], ink[1], ink[2], int(round(a * 255)))
    return out


def art_bbox(rgba: Image.Image, pad_ratio=0.02):
    """Bounding box of visible artwork, padded slightly."""
    alpha = rgba.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    bbox = alpha.getbbox()
    if not bbox:
        bbox = (0, 0, rgba.width, rgba.height)
    pad = int(max(rgba.width, rgba.height) * pad_ratio)
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(rgba.width, bbox[2] + pad)
    y1 = min(rgba.height, bbox[3] + pad)
    return (x0, y0, x1, y1)


def circularize(rgba: Image.Image):
    """Fade alpha to zero outside the emblem circle (kills paper specks)."""
    w, h = rgba.size
    bbox = art_bbox(rgba, pad_ratio=0.0)
    cx = (bbox[0] + bbox[2]) / 2
    cy = (bbox[1] + bbox[3]) / 2
    r = max(bbox[2] - bbox[0], bbox[3] - bbox[1]) / 2
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    rgba.putalpha(Image.composite(rgba.getchannel("A"), Image.new("L", (w, h), 0), mask))
    return rgba


def mono(rgba: Image.Image, colour):
    out = Image.new("RGBA", rgba.size, colour + (0,))
    out.putalpha(rgba.getchannel("A"))
    return out


def write_png(path, img):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print("  wrote", os.path.relpath(path, ROOT))


def write_ico(path, chip: Image.Image):
    sizes = [16, 24, 32, 48, 64]
    directory = b""
    payloads = b""
    offset = 6 + 16 * len(sizes)
    for s in sizes:
        raw = chip.resize((s, s), Image.LANCZOS).tobytes("raw", "BGRA")
        and_mask = b"\x00" * (((s + 31) // 32) * 4 * s)
        bmp = struct.pack("<IiiHHIIiiII", 40, s, s * 2, 1, 32, 0,
                          len(raw) + len(and_mask), 0, 0, 0, 0)
        payload = bmp + raw + and_mask
        directory += struct.pack("<BBBBHHII", s, s, 0, 0, 1, 32, len(payload), offset)
        payloads += payload
        offset += len(payload)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<HHH", 0, 1, len(sizes)) + directory + payloads)
    print("  wrote", os.path.relpath(path, ROOT), f"({len(sizes)} sizes)")


def build_icon_svg(chip: Image.Image):
    """Embed the real logo mark as an SVG favicon (base64 PNG data URI)."""
    import base64
    import io

    buf = io.BytesIO()
    chip.resize((128, 128), Image.LANCZOS).save(buf, "PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'
        f'<image href="data:image/png;base64,{b64}" x="0" y="0" width="128" height="128"/>'
        "</svg>"
    )


def build_og(chip: Image.Image):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), LINEN)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W - 560, H - 420, W + 260, H + 400), fill=COPPER + (26,))
    gd.ellipse((-320, -320, 320, 320), fill=COPPER + (16,))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    img.paste(glow, (0, 0), glow)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle((28, 28, W - 28, H - 28), outline=COPPER + (110,), width=2)

    chip_size = 330
    chip_img = chip.resize((chip_size, chip_size), Image.LANCZOS)
    lx, ly = 96, (H - chip_size) // 2
    img.paste(chip_img, (lx, ly), chip_img)

    tx = lx + chip_size + 72
    try:
        f_name = ImageFont.truetype(FONT_BOLD, 92)
        f_tag = ImageFont.truetype(FONT_REG, 40)
        f_slogan = ImageFont.truetype(FONT_REG, 34)
    except OSError:
        f_name = f_tag = f_slogan = ImageFont.load_default()
    d.text((tx, 150), "HER Beauty", font=f_name, fill=ESPRESSO)
    d.text((tx, 268), "Hair  ·  Nails  ·  Beauty", font=f_tag, fill=COPPER)
    d.line((tx, 340, tx + 430, 340), fill=COPPER + (160,), width=2)
    d.text((tx, 372), "Where beauty meets opportunity", font=f_slogan, fill=MUTED)
    d.text((tx, 452), "Salon · Packages · Retail · Training · Events",
           font=f_slogan, fill=MUTED)
    return img


def main():
    os.makedirs(LOGO_DIR, exist_ok=True)
    print("master:", os.path.relpath(MASTER, ROOT))
    src = load_master()

    ko = circularize(knockout(src))
    write_png(os.path.join(LOGO_DIR, "her-logo.png"), ko.resize((1024, 1024), Image.LANCZOS))

    chip = ko.crop(art_bbox(ko, pad_ratio=0.015))
    side = max(chip.width, chip.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(chip, ((side - chip.width) // 2, (side - chip.height) // 2), chip)
    chip = canvas
    write_png(os.path.join(LOGO_DIR, "her-logo-chip.png"), chip.resize((512, 512), Image.LANCZOS))

    write_png(os.path.join(LOGO_DIR, "her-logo-mono-copper.png"),
              mono(chip, COPPER).resize((512, 512), Image.LANCZOS))
    write_png(os.path.join(LOGO_DIR, "her-logo-mono-linen.png"),
              mono(chip, LINEN_LIGHT).resize((512, 512), Image.LANCZOS))

    write_ico(os.path.join(PUBLIC_DIR, "favicon.ico"), chip)

    with open(os.path.join(PUBLIC_DIR, "icon.svg"), "w", encoding="utf-8") as fh:
        fh.write(build_icon_svg(chip))
    print("  wrote public/icon.svg")

    write_png(os.path.join(PUBLIC_DIR, "og.png"), build_og(chip))
    print("done.")


if __name__ == "__main__":
    main()
