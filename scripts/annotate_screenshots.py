"""
Annotate high-DPI Playwright screenshots with crisp red circles/rounded callouts
and numbered callout badges (1, 2, 3) for non-technical test packs.
Reads:  test pack/screenshots/raw/*.png + test pack/screenshots/manifest.json
Writes: test pack/screenshots/*.png + test pack/screenshots/annotated_manifest.json
"""

import json
import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCREENSHOT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "test pack", "screenshots"))
RAW_DIR = os.path.join(SCREENSHOT_DIR, "raw")
MANIFEST_PATH = os.path.join(SCREENSHOT_DIR, "manifest.json")

RED = (220, 38, 38, 255)          # #DC2626 vivid callout red
RED_SOFT = (220, 38, 38, 28)      # subtle 11% red tint inside small callouts
WHITE = (255, 255, 255, 255)
SHADOW = (31, 22, 20, 110)

FONT_BOLD_PATH = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_REG_PATH = r"C:\Windows\Fonts\segoeui.ttf"


def load_font(path, size):
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


# All bounding boxes are now measured directly from live Playwright DOM locators
# in scripts/capture_screenshots.mjs at the exact scroll position of each screenshot.
CURATED_OVERRIDES = {}


def draw_callout(img: Image.Image, c: dict, badge_font, tag_font):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    W, H = img.size
    x, y, w, h = int(c["x"]), int(c["y"]), int(c["w"]), int(c["h"])
    x2, y2 = min(W - 8, x + w), min(H - 8, y + h)
    x, y = max(8, x), max(8, y)

    shape = c.get("shape", "rect")
    # Subtle tint only on compact targets so large cards stay 100% readable
    fill_rgba = RED_SOFT if (w * h) < (900 * 240) else (0, 0, 0, 0)

    if shape == "circle" or (w < 260 and h < 130):
        # Red ellipse / circle highlight with white outer contrast ring
        pad_e = 10
        ex1, ey1 = max(6, x - pad_e), max(6, y - pad_e)
        ex2, ey2 = min(W - 6, x2 + pad_e), min(H - 6, y2 + pad_e)
        draw.ellipse([ex1 - 3, ey1 - 3, ex2 + 3, ey2 + 3], outline=WHITE, width=13)
        draw.ellipse([ex1, ey1, ex2, ey2], fill=fill_rgba, outline=RED, width=7)
        bx, by = ex1 + 6, ey1 + 6
    else:
        radius = 22
        draw.rounded_rectangle([x - 3, y - 3, x2 + 3, y2 + 3], radius=radius + 3, outline=WHITE, width=13)
        draw.rounded_rectangle([x, y, x2, y2], radius=radius, fill=fill_rgba, outline=RED, width=7)
        bx, by = x, y

    # Position numbered red badge (1, 2, 3) cleanly on top-left (or bottom-left if near top edge)
    r = 29
    cx = max(r + 8, min(W - r - 8, bx - 6))
    cy = by - 6 if by > (r + 18) else min(H - r - 8, y2 + 6)

    # Drop shadow + white border + solid red circle
    draw.ellipse([cx - r + 3, cy - r + 4, cx + r + 3, cy + r + 4], fill=SHADOW)
    draw.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=WHITE)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=RED)

    num_str = str(c["num"])
    tb = draw.textbbox((0, 0), num_str, font=badge_font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    draw.text((cx - tw / 2, cy - th / 2 - 4), num_str, font=badge_font, fill=WHITE)

    return Image.alpha_composite(img, overlay)


def main():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)

    badge_font = load_font(FONT_BOLD_PATH, 34)
    tag_font = load_font(FONT_BOLD_PATH, 22)

    annotated_manifest = {}
    count = 0

    for snap_id, entry in sorted(manifest.items()):
        raw_path = entry["rawFile"]
        out_path = os.path.join(SCREENSHOT_DIR, f"{snap_id}.png")
        if not os.path.exists(raw_path):
            print(f"[skip] Missing raw screenshot: {raw_path}")
            continue

        callouts = CURATED_OVERRIDES.get(snap_id, entry["callouts"])
        # Re-number sequentially 1..N just in case
        normalized = []
        for idx, c in enumerate(callouts, 1):
            nc = dict(c)
            nc["num"] = idx
            normalized.append(nc)

        img = Image.open(raw_path).convert("RGBA")
        for c in normalized:
            img = draw_callout(img, c, badge_font, tag_font)

        # Save optimized crisp RGB PNG
        img.convert("RGB").save(out_path, format="PNG", optimize=True)
        annotated_manifest[snap_id] = {
            "id": snap_id,
            "path": out_path,
            "url": entry.get("url", "https://her-beauty-production.up.railway.app/"),
            "callouts": normalized,
        }
        count += 1
        print(f"Annotated {snap_id}.png ({len(normalized)} red callouts)")

    out_manifest = os.path.join(SCREENSHOT_DIR, "annotated_manifest.json")
    with open(out_manifest, "w", encoding="utf-8") as fh:
        json.dump(annotated_manifest, fh, indent=2)
    print(f"\nCompleted {count} annotated screenshots -> {out_manifest}")


if __name__ == "__main__":
    main()
