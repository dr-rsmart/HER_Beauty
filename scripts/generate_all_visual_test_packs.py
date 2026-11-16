"""
Generate Non-Technical PowerPoint Test Packs & Markdown Guide for HER Beauty.
Follows:
1. Exact design tokens from presentation/generate_pptx.py (HER_Business_Plan.pptx)
2. CTP Now reference look-and-feel (Cover, How-To-Use Guide, >=60% width Screenshot Frame
   with red circles/callouts, Plain-Language Active-Voice Steps with inline bolding,
   Scannable Verification Criteria with checkmarks & warning icons, Test Sign-Off Matrix)
3. Generates:
   - 01_Platform_Master_and_Executive_Governance_Test_Pack.pptx (11 slides)
   - 02_Studio_Directors_and_Hub_Admins_Test_Pack.pptx (12 slides)
   - 03_Artisans_and_Mentors_HER_Pathway_Test_Pack.pptx (11 slides)
   - 04_Client_and_Student_Accounts_Test_Pack.pptx (12 slides)
   - 1. HER_Beauty_Platform_Look_and_Feel.pptx (10 slides)
   - 2. HER_Beauty_Stakeholder_Test_Pack.pptx (16 slides)
   - HER_Beauty_Non_Technical_Test_Pack.pptx (updated if not locked by PowerPoint)
   - HER_Beauty_Non_Technical_Test_Pack.md (complete Markdown with local screenshot paths)
"""

import json
import os
import re
import struct
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE

# ---------------------------------------------------------------------------
# DESIGN TOKENS (Matched 1:1 to HER_Business_Plan.pptx)
# ---------------------------------------------------------------------------
DARK = RGBColor(0x1F, 0x16, 0x14)          # deep espresso
DARK2 = RGBColor(0x2C, 0x1E, 0x1B)         # lighter espresso
COPPER = RGBColor(0x9E, 0x55, 0x40)        # primary copper / rose-gold
COPPER_LIGHT = RGBColor(0xD4, 0x9B, 0x88)  # light copper
COPPER_PALE = RGBColor(0xE2, 0xB8, 0xAB)   # pale champagne copper
LINEN = RGBColor(0xFA, 0xF6, 0xF0)         # warm linen / ivory slide background
CARD = RGBColor(0xFF, 0xFF, 0xFF)          # crisp white card
CARD_ALT = RGBColor(0xF6, 0xEF, 0xE7)      # soft warm sand tint
BORDER = RGBColor(0xE5, 0xD8, 0xCC)        # subtle warm border
TEXT_DARK = RGBColor(0x24, 0x1B, 0x18)     # espresso charcoal text
TEXT_LIGHT = RGBColor(0xFA, 0xF6, 0xF0)    # warm light text
MUTED = RGBColor(0x7D, 0x6F, 0x6A)         # muted taupe
MUTED_LIGHT = RGBColor(0xB5, 0xA5, 0x9E)   # muted light taupe

# Scannable Visual Status Accents (Checkmarks, Warning Triangles, Red Callouts)
CALLOUT_RED = RGBColor(0xDC, 0x26, 0x26)
CALLOUT_RED_BG = RGBColor(0xFE, 0xE2, 0xE2)
PASS_GREEN = RGBColor(0x1B, 0x7A, 0x43)
PASS_GREEN_BG = RGBColor(0xE9, 0xF7, 0xEF)
WARN_AMBER = RGBColor(0xB4, 0x53, 0x09)
WARN_AMBER_BG = RGBColor(0xFE, 0xF3, 0xC7)

HEADING_FONT = "Segoe UI"
BODY_FONT = "Segoe UI"

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
DATE_STR = "18 April 2026"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
OUTPUT_DIR = os.path.join(REPO_DIR, "test pack")
SCREENSHOT_DIR = os.path.join(OUTPUT_DIR, "screenshots")
ANNOTATED_MANIFEST_PATH = os.path.join(SCREENSHOT_DIR, "annotated_manifest.json")

_DECK_LOGO = os.path.join(REPO_DIR, "presentation", "her-logo-deck.png")
_MASTER_LOGO = os.path.join(REPO_DIR, "her-logo-master.jpg")
LOGO_PATH = _DECK_LOGO if os.path.exists(_DECK_LOGO) else _MASTER_LOGO


def _png_size(path):
    with open(path, "rb") as fh:
        header = fh.read(24)
    if header[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", header[16:24])
    return (800, 800)


_LW, _LH = _png_size(LOGO_PATH)
LOGO_ASPECT = _LW / float(_LH)

with open(ANNOTATED_MANIFEST_PATH, "r", encoding="utf-8") as _fh:
    MANIFEST = json.load(_fh)


# ---------------------------------------------------------------------------
# JARGON GUARDRAIL (Ensures 100% Non-Technical Plain Language)
# ---------------------------------------------------------------------------
BANNED_JARGON = [
    r"\bAPI\b",
    r"\bdatabase\b",
    r"\bseed(?:ed|ing)?\b",
    r"\bSSE\b",
    r"\bJWT\b",
    r"\bPrisma\b",
    r"\bPostgreSQL\b",
    r"\bJSON\b",
    r"\bendpoint\b",
    r"\bThe user should\b",
]


def assert_plain_language(text: str, context: str):
    for pat in BANNED_JARGON:
        if re.search(pat, text, flags=re.IGNORECASE if "user should" in pat or "database" in pat or "seed" in pat else 0):
            raise ValueError(f"Banned technical term matching {pat!r} found in {context}: {text!r}")


# ---------------------------------------------------------------------------
# PPTX DRAWING PRIMITIVES
# ---------------------------------------------------------------------------
def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, left, top, width, height, color, border_color=None, border_pt=1.0, shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, left, top, width, height)
    sp.fill.solid()
    sp.fill.fore_color.rgb = color
    if border_color is not None:
        sp.line.color.rgb = border_color
        sp.line.width = Pt(border_pt)
    else:
        sp.line.fill.background()
    sp.shadow.inherit = False
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        try:
            sp.adjustments[0] = 0.035
        except Exception:
            pass
    return sp


def add_rich_paragraph(p, markdown_text: str, size: float, color: RGBColor,
                       bold_color: RGBColor = None, font: str = BODY_FONT, base_bold: bool = False):
    """Parse **bold** segments so URLs, emails, passwords & codes stand out cleanly."""
    parts = re.split(r"(\*\*.*?\*\*)", markdown_text)
    for part in parts:
        if not part:
            continue
        is_b = part.startswith("**") and part.endswith("**") and len(part) > 4
        clean = part[2:-2] if is_b else part
        run = p.add_run()
        run.text = clean
        run.font.name = font
        run.font.size = Pt(size)
        run.font.bold = True if (is_b or base_bold) else False
        run.font.color.rgb = (bold_color if (is_b and bold_color) else color)


def add_text(slide, left, top, width, height, text, size, color,
             bold=False, font=BODY_FONT, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, italic=False, bold_color=None, line_spacing=None):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    if line_spacing:
        p.line_spacing = line_spacing
    if "**" in text:
        add_rich_paragraph(p, text, size, color, bold_color=bold_color, font=font, base_bold=bold)
    else:
        run = p.add_run()
        run.text = text
        run.font.size = Pt(size)
        run.font.color.rgb = color
        run.font.bold = bold
        run.font.italic = italic
        run.font.name = font
    return box


def add_logo(slide, left, top, height, on_card=True):
    w = height * LOGO_ASPECT
    if on_card:
        pad = Inches(0.07)
        card = add_rect(slide, left - pad, top - pad, w + pad * 2,
                        height + pad * 2, LINEN, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        try:
            card.adjustments[0] = 0.08
        except Exception:
            pass
    slide.shapes.add_picture(LOGO_PATH, left, top, width=w, height=height)
    return w


def add_pathway_strip(slide, top, left=Inches(0.85), total_width=Inches(6.8)):
    steps = ["LEARN", "PRACTISE", "EARN", "GROW", "EMPOWER"]
    gap = Inches(0.06)
    w = Emu(int((total_width - gap * (len(steps) - 1)) / len(steps)))
    h = Inches(0.38)
    colors = [COPPER, COPPER_LIGHT, COPPER_PALE, COPPER_LIGHT, COPPER]
    tcolors = [TEXT_LIGHT, TEXT_DARK, TEXT_DARK, TEXT_DARK, TEXT_LIGHT]
    for i, step in enumerate(steps):
        x = left + i * (w + gap)
        shp = MSO_SHAPE.PENTAGON if i == 0 else MSO_SHAPE.CHEVRON
        sp = add_rect(slide, x, top, w, h, colors[i], shape=shp)
        p = sp.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = step
        r.font.name = HEADING_FONT
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = tcolors[i]


def add_header(slide, badge_num: str, role_kicker: str, title: str, deck_footer: str):
    """HER_Business_Plan.pptx espresso header band + copper accent + logo chip."""
    add_rect(slide, 0, 0, SLIDE_W, Inches(1.10), DARK)
    add_rect(slide, 0, Inches(1.10), SLIDE_W, Inches(0.05), COPPER)

    # Number chip
    add_rect(slide, Inches(0.38), Inches(0.26), Inches(0.56), Inches(0.56), COPPER,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(slide, Inches(0.38), Inches(0.26), Inches(0.56), Inches(0.56),
             badge_num, 17, TEXT_LIGHT, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

    # Role kicker + clear slide title
    add_text(slide, Inches(1.10), Inches(0.16), Inches(10.3), Inches(0.26),
             role_kicker.upper(), 9.5, COPPER_PALE, bold=True)
    add_text(slide, Inches(1.10), Inches(0.41), Inches(10.3), Inches(0.56),
             title, 22, TEXT_LIGHT, bold=True, font=HEADING_FONT)

    # HER Logo on linen chip
    add_logo(slide, Inches(12.02), Inches(0.18), Inches(0.72), on_card=True)

    # Subtle bottom footer
    add_text(slide, Inches(0.38), Inches(7.14), Inches(9.5), Inches(0.26),
             f"HER Beauty Studio & Social Enterprise  |  {deck_footer}  |  {DATE_STR}",
             8.5, MUTED)
    add_text(slide, Inches(11.6), Inches(7.14), Inches(1.35), Inches(0.26),
             f"Slide {badge_num}", 8.5, MUTED, align=PP_ALIGN.RIGHT)


# ---------------------------------------------------------------------------
# SPECIAL SLIDE 1: COVER SLIDE (CTP Now + HER Business Plan Design Tokens)
# ---------------------------------------------------------------------------
def add_cover_slide(prs, deck_title: str, role_subtitle: str, hero_snap_id: str, cred_summary: str):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, DARK)

    # Left vertical copper double-bar (from HER_Business_Plan.pptx)
    add_rect(s, 0, 0, Inches(0.18), SLIDE_H, COPPER)
    add_rect(s, Inches(0.18), 0, Inches(0.06), SLIDE_H, COPPER_LIGHT)

    # Kicker & Project Name
    add_text(s, Inches(0.85), Inches(0.62), Inches(7.2), Inches(0.32),
             "HER BEAUTY STUDIO & SOCIAL ENTERPRISE  \u00b7  USER ACCEPTANCE TEST PACK",
             11, COPPER_LIGHT, bold=True)
    add_rect(s, Inches(0.85), Inches(1.00), Inches(2.4), Inches(0.045), COPPER)

    # Logo chip top-right
    add_logo(s, Inches(11.55), Inches(0.52), Inches(1.05), on_card=True)

    # Main Title & Role Subtitle
    add_text(s, Inches(0.85), Inches(1.22), Inches(6.9), Inches(1.30),
             deck_title, 34, TEXT_LIGHT, bold=True, font=HEADING_FONT, line_spacing=1.05)
    add_text(s, Inches(0.85), Inches(2.62), Inches(6.8), Inches(0.55),
             role_subtitle, 15.5, COPPER_PALE, italic=True)

    # CTP Now signature guide bar: What to check | What to expect | How to verify
    add_rect(s, Inches(0.85), Inches(3.30), Inches(6.75), Inches(0.52), DARK2,
             border_color=COPPER, border_pt=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, Inches(1.02), Inches(3.30), Inches(6.45), Inches(0.52),
             "\u2713 What to check     |     \u2713 What to expect     |     \u2713 How to verify & sign off",
             11.5, TEXT_LIGHT, bold=True, anchor=MSO_ANCHOR.MIDDLE)

    # Login summary card on cover
    add_rect(s, Inches(0.85), Inches(3.98), Inches(6.75), Inches(0.95), DARK2,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, Inches(1.05), Inches(4.08), Inches(6.40), Inches(0.28),
             "TEST ACCOUNT & ACCESS SUMMARY", 9.5, COPPER_LIGHT, bold=True)
    add_text(s, Inches(1.05), Inches(4.36), Inches(6.40), Inches(0.50),
             cred_summary, 11, TEXT_LIGHT, bold_color=COPPER_PALE)

    # Pathway strip
    add_text(s, Inches(0.85), Inches(5.12), Inches(6.8), Inches(0.28),
             "THE HER PATHWAY", 9.5, MUTED_LIGHT, bold=True)
    add_pathway_strip(s, Inches(5.40), left=Inches(0.85), total_width=Inches(6.75))

    # Hero preview screenshot card on the right
    hero_path = os.path.join(SCREENSHOT_DIR, f"{hero_snap_id}.png")
    if os.path.exists(hero_path):
        add_rect(s, Inches(7.85), Inches(1.88), Inches(5.05), Inches(3.35), CARD,
                 border_color=COPPER_LIGHT, border_pt=1.5, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s, Inches(7.85), Inches(1.88), Inches(5.05), Inches(0.28), DARK2)
        add_text(s, Inches(8.02), Inches(1.88), Inches(4.70), Inches(0.28),
                 "LIVE SYSTEM PREVIEW  \u00b7  http://localhost:5176",
                 8.5, COPPER_PALE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        s.shapes.add_picture(hero_path, Inches(7.94), Inches(2.22), width=Inches(4.87), height=Inches(2.91))

    # Bottom metadata bar with Date, Founder & Location
    add_rect(s, Inches(0.85), Inches(6.18), Inches(11.98), Inches(0.03), COPPER)
    add_text(s, Inches(0.85), Inches(6.34), Inches(6.8), Inches(0.35),
             "Director: Mrs Monean N Jacobs  \u00b7  4 White Heart, Jamestown 7600",
             11.5, TEXT_LIGHT, bold=True)
    add_text(s, Inches(0.85), Inches(6.68), Inches(6.8), Inches(0.32),
             "HER Beauty. HER Style. HER Identity.  \u00b7  Where beauty meets opportunity",
             10.5, MUTED_LIGHT, italic=True)
    add_text(s, Inches(8.20), Inches(6.34), Inches(4.63), Inches(0.65),
             f"Date: {DATE_STR}\nFOR NON-TECHNICAL STAKEHOLDER SIGN-OFF",
             10.5, COPPER_PALE, bold=True, align=PP_ALIGN.RIGHT, line_spacing=1.2)


# ---------------------------------------------------------------------------
# SPECIAL SLIDE 2: HOW TO USE THIS TEST PACK (Modeled on CTP Now Slide 2)
# ---------------------------------------------------------------------------
def add_how_to_use_slide(prs, deck_footer: str, role_name: str, accounts_list: list[tuple[str, str, str]]):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, LINEN)
    add_header(s, "02", "HOW TO USE THIS GUIDE", "Your Simple 3-Step Testing Instructions", deck_footer)

    cards = [
        ("1", "FOLLOW NUMBERED STEPS", COPPER,
         "Read the plain-language steps on the right side of each slide. Every web link, email address, password and promo code is shown in **bold** so you know exactly what to type or click."),
        ("2", "MATCH RED CALLOUTS \u2460 \u2461 \u2462", CALLOUT_RED,
         "Look at the large screen capture on the left (over 60% of the slide). Red circles and numbered red badges (**1**, **2**, **3**) point directly to each button, menu or box."),
        ("3", "CHECK & TICK SIGN-OFF", PASS_GREEN,
         "Compare your screen against the green **\u2713 Verification Criteria** checklist. At the end of this pack, tick **Pass** or **Fail** on the Test Sign-Off Matrix."),
    ]
    cw = Inches(3.98)
    cgap = Inches(0.30)
    for idx, (num, title, acc, body) in enumerate(cards):
        x = Inches(0.38) + idx * (cw + cgap)
        add_rect(s, x, Inches(1.38), cw, Inches(2.55), CARD, border_color=BORDER,
                 shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s, x, Inches(1.38), cw, Inches(0.08), acc)
        badge = add_rect(s, x + Inches(0.22), Inches(1.62), Inches(0.48), Inches(0.48), acc,
                         shape=MSO_SHAPE.OVAL)
        add_text(s, x + Inches(0.22), Inches(1.62), Inches(0.48), Inches(0.48),
                 num, 15, TEXT_LIGHT, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        add_text(s, x + Inches(0.82), Inches(1.68), cw - Inches(1.0), Inches(0.38),
                 title, 13, TEXT_DARK, bold=True)
        add_text(s, x + Inches(0.22), Inches(2.24), cw - Inches(0.44), Inches(1.55),
                 body, 11, TEXT_DARK, bold_color=COPPER, line_spacing=1.2)

    # Credentials & System Access Card
    add_rect(s, Inches(0.38), Inches(4.15), Inches(12.56), Inches(2.75), CARD,
             border_color=COPPER_LIGHT, border_pt=1.2, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(s, Inches(0.38), Inches(4.15), Inches(12.56), Inches(0.44), DARK)
    add_text(s, Inches(0.60), Inches(4.15), Inches(12.10), Inches(0.44),
             f"\u2713  READY-TO-USE LOGIN DETAILS FOR: {role_name.upper()}   |   Browser Link: http://localhost:5176",
             11.5, COPPER_PALE, bold=True, anchor=MSO_ANCHOR.MIDDLE)

    # List accounts cleanly
    row_top = Inches(4.72)
    for i, (person, email, pwd) in enumerate(accounts_list[:4]):
        y = row_top + i * Inches(0.38)
        add_text(s, Inches(0.62), y, Inches(4.4), Inches(0.34),
                 f"\u2713  **{person}**", 11, TEXT_DARK, bold_color=TEXT_DARK)
        add_text(s, Inches(5.10), y, Inches(4.5), Inches(0.34),
                 f"Email: **{email}**", 11, TEXT_DARK, bold_color=COPPER)
        add_text(s, Inches(9.70), y, Inches(3.0), Inches(0.34),
                 f"Password: **{pwd}**", 11, TEXT_DARK, bold_color=DARK)

    # Warning / Tip banner at bottom of card
    add_rect(s, Inches(0.58), Inches(6.30), Inches(12.16), Inches(0.46), WARN_AMBER_BG,
             border_color=WARN_AMBER, border_pt=0.8, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, Inches(0.74), Inches(6.30), Inches(11.85), Inches(0.46),
             "\u26a0  Helpful Tip: Use Microsoft Edge or Google Chrome. Make sure the local HER Beauty system is open at **http://localhost:5176** before starting Step 1.",
             10, WARN_AMBER, bold_color=TEXT_DARK, anchor=MSO_ANCHOR.MIDDLE)


# ---------------------------------------------------------------------------
# CORE TEST CASE SLIDE (>= 60% Width Annotated Screenshot + Steps + Criteria)
# ---------------------------------------------------------------------------
def add_test_case_slide(prs, slide_num: str, test_id: str, role_kicker: str, title: str,
                        snap_id: str, steps: list[str], verifications: list[str],
                        tip_text: str, deck_footer: str):
    # Validate non-technical plain language on every text item
    assert_plain_language(title, f"{test_id} title")
    for st in steps:
        assert_plain_language(st, f"{test_id} step")
    for vc in verifications:
        assert_plain_language(vc, f"{test_id} verification")
    assert_plain_language(tip_text, f"{test_id} tip")

    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, LINEN)
    add_header(s, slide_num, f"{test_id}  \u00b7  {role_kicker}", title, deck_footer)

    # =========================================================================
    # LEFT PANEL: SCREENSHOT AREA = 8.20" WIDE (61.5% of 13.333" slide width!)
    # Embedded PNG = 8.04" wide (60.3% of slide width!) x 4.80" tall (exact 1440:860)
    # =========================================================================
    frame_left = Inches(0.38)
    frame_top = Inches(1.26)
    frame_w = Inches(8.20)   # 61.5% of slide width (>= 60% rule!)
    frame_h = Inches(5.72)

    add_rect(s, frame_left, frame_top, frame_w, frame_h, CARD,
             border_color=BORDER, border_pt=1.2, shape=MSO_SHAPE.ROUNDED_RECTANGLE)

    # Browser Top Chrome Bar
    add_rect(s, frame_left, frame_top, frame_w, Inches(0.34), DARK2)
    for d_idx, dot_col in enumerate([CALLOUT_RED, WARN_AMBER, PASS_GREEN]):
        add_rect(s, frame_left + Inches(0.14 + d_idx * 0.16), frame_top + Inches(0.11),
                 Inches(0.11), Inches(0.11), dot_col, shape=MSO_SHAPE.OVAL)

    meta = MANIFEST.get(snap_id, {})
    live_url = meta.get("url", "http://localhost:5176")
    add_text(s, frame_left + Inches(0.70), frame_top, Inches(5.10), Inches(0.34),
             f"Browser: {live_url}", 8.5, COPPER_PALE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, frame_left + Inches(5.85), frame_top, Inches(2.22), Inches(0.34),
             "Red Callouts \u2460 \u2461 \u2462", 8.5, TEXT_LIGHT, bold=True,
             align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)

    # Crisp Annotated Screenshot (8.04" x 4.80" = 60.3% of slide width!)
    img_path = os.path.join(SCREENSHOT_DIR, f"{snap_id}.png")
    img_left = frame_left + Inches(0.08)
    img_top = frame_top + Inches(0.40)
    img_w = Inches(8.04)
    img_h = Inches(4.80)
    if os.path.exists(img_path):
        s.shapes.add_picture(img_path, img_left, img_top, width=img_w, height=img_h)
    else:
        add_rect(s, img_left, img_top, img_w, img_h, CARD_ALT, border_color=CALLOUT_RED)
        add_text(s, img_left, img_top, img_w, img_h, f"Missing screenshot: {snap_id}.png",
                 14, CALLOUT_RED, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

    # Bottom Red Callout Legend Bar inside Screenshot Frame
    leg_top = frame_top + Inches(5.26)
    add_rect(s, frame_left + Inches(0.08), leg_top, img_w, Inches(0.38), CALLOUT_RED_BG,
             border_color=CALLOUT_RED, border_pt=0.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    callouts = meta.get("callouts", [])
    legend_parts = [f"({c['num']}) {c['label']}" for c in callouts[:3]]
    legend_str = "    \u00b7    ".join(legend_parts) if legend_parts else "Follow numbered red circles on screen"
    add_text(s, frame_left + Inches(0.20), leg_top, img_w - Inches(0.24), Inches(0.38),
             legend_str, 8.8, CALLOUT_RED, bold=True, anchor=MSO_ANCHOR.MIDDLE)

    # =========================================================================
    # RIGHT PANEL TOP: STEP-BY-STEP INSTRUCTIONS (Plain Language, Active Voice)
    # =========================================================================
    right_left = Inches(8.72)
    right_w = Inches(4.23)

    steps_top = Inches(1.26)
    steps_h = Inches(3.16)
    add_rect(s, right_left, steps_top, right_w, steps_h, CARD,
             border_color=BORDER, border_pt=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(s, right_left, steps_top, right_w, Inches(0.38), COPPER)
    add_text(s, right_left + Inches(0.16), steps_top, right_w - Inches(0.32), Inches(0.38),
             "STEP-BY-STEP INSTRUCTIONS", 10.5, TEXT_LIGHT, bold=True, anchor=MSO_ANCHOR.MIDDLE)

    sbox = s.shapes.add_textbox(right_left + Inches(0.16), steps_top + Inches(0.46),
                                right_w - Inches(0.32), steps_h - Inches(0.54))
    stf = sbox.text_frame
    stf.word_wrap = True
    stf.auto_size = MSO_AUTO_SIZE.NONE
    stf.margin_left = 0
    stf.margin_right = 0
    stf.margin_top = 0
    stf.margin_bottom = 0

    step_font_size = 9.8 if len(steps) <= 4 else 9.2
    for idx, step_md in enumerate(steps, 1):
        p = stf.paragraphs[0] if idx == 0 else stf.add_paragraph() if idx > 1 else stf.paragraphs[0]
        p.space_after = Pt(5)
        p.line_spacing = 1.12
        r_num = p.add_run()
        r_num.text = f"{idx}. "
        r_num.font.name = BODY_FONT
        r_num.font.size = Pt(step_font_size)
        r_num.font.bold = True
        r_num.font.color.rgb = COPPER
        add_rich_paragraph(p, step_md, step_font_size, TEXT_DARK, bold_color=DARK)

    # =========================================================================
    # RIGHT PANEL BOTTOM: VERIFICATION CRITERIA (Checkmarks + Warning Icon)
    # =========================================================================
    ver_top = Inches(4.54)
    ver_h = Inches(2.44)
    add_rect(s, right_left, ver_top, right_w, ver_h, PASS_GREEN_BG,
             border_color=PASS_GREEN, border_pt=1.1, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(s, right_left, ver_top, right_w, Inches(0.38), PASS_GREEN)
    add_text(s, right_left + Inches(0.16), ver_top, right_w - Inches(0.32), Inches(0.38),
             "\u2713  VERIFICATION CRITERIA (WHAT YOU SEE)", 10, TEXT_LIGHT,
             bold=True, anchor=MSO_ANCHOR.MIDDLE)

    vbox = s.shapes.add_textbox(right_left + Inches(0.16), ver_top + Inches(0.44),
                                right_w - Inches(0.32), Inches(1.42))
    vtf = vbox.text_frame
    vtf.word_wrap = True
    vtf.auto_size = MSO_AUTO_SIZE.NONE
    vtf.margin_left = 0
    vtf.margin_right = 0
    vtf.margin_top = 0
    vtf.margin_bottom = 0

    for idx, v_md in enumerate(verifications, 1):
        vp = vtf.paragraphs[0] if idx == 1 else vtf.add_paragraph()
        vp.space_after = Pt(3.5)
        vp.line_spacing = 1.08
        r_chk = vp.add_run()
        r_chk.text = "\u2713  "
        r_chk.font.name = BODY_FONT
        r_chk.font.size = Pt(9.4)
        r_chk.font.bold = True
        r_chk.font.color.rgb = PASS_GREEN
        add_rich_paragraph(vp, v_md, 9.4, TEXT_DARK, bold_color=DARK)

    # Scannable Warning Triangle Reminder Bar at bottom of verification box
    tip_top = ver_top + Inches(1.92)
    add_rect(s, right_left + Inches(0.10), tip_top, right_w - Inches(0.20), Inches(0.44),
             WARN_AMBER_BG, border_color=WARN_AMBER, border_pt=0.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, right_left + Inches(0.20), tip_top, right_w - Inches(0.36), Inches(0.44),
             f"\u26a0  {tip_text}", 8.3, WARN_AMBER, bold_color=TEXT_DARK, anchor=MSO_ANCHOR.MIDDLE)


# ---------------------------------------------------------------------------
# SPECIAL SLIDE END: TEST SIGN-OFF MATRIX TABLE
# ---------------------------------------------------------------------------
def add_signoff_matrix_slide(prs, slide_num: str, role_title: str, cases_slice: list[dict],
                             deck_footer: str, part_label: str = ""):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, LINEN)
    title_str = f"Test Sign-Off Matrix{f' ({part_label})' if part_label else ''}"
    add_header(s, slide_num, f"ACCEPTANCE & SIGN-OFF  \u00b7  {role_title}", title_str, deck_footer)

    add_text(s, Inches(0.38), Inches(1.22), Inches(12.55), Inches(0.30),
             "\u2713  Tick **Pass** or **Fail** for each test case below after checking the expected result on screen.",
             10.5, TEXT_DARK, bold_color=PASS_GREEN)

    rows = len(cases_slice) + 1
    cols = 6
    tbl_shape = s.shapes.add_table(rows, cols, Inches(0.38), Inches(1.56), Inches(12.56), Inches(4.52))
    table = tbl_shape.table

    col_widths = [Inches(0.85), Inches(3.05), Inches(4.66), Inches(0.85), Inches(0.85), Inches(2.30)]
    for idx, w in enumerate(col_widths):
        table.columns[idx].width = w

    headers = ["Test #", "Test Case Title", "Expected Visual Outcome", "Pass", "Fail", "Tester Notes"]
    for c_idx, h_text in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = DARK
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = cell.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER if c_idx in (0, 3, 4) else PP_ALIGN.LEFT
        r = p.add_run()
        r.text = h_text
        r.font.name = HEADING_FONT
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = COPPER_PALE

    row_font = 8.8 if len(cases_slice) <= 8 else 8.3
    for r_idx, tc in enumerate(cases_slice, 1):
        bg = CARD if r_idx % 2 == 1 else CARD_ALT
        vals = [
            tc["id"],
            tc["title"],
            re.sub(r"\*\*(.*?)\*\*", r"\1", tc["verifications"][0]),
            "\u2610",
            "\u2610",
            "",
        ]
        for c_idx, val in enumerate(vals):
            cell = table.cell(r_idx, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = bg
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER if c_idx in (0, 3, 4) else PP_ALIGN.LEFT
            r = p.add_run()
            r.text = val
            r.font.name = BODY_FONT
            r.font.size = Pt(11 if c_idx in (3, 4) else row_font)
            r.font.bold = c_idx in (0, 1)
            r.font.color.rgb = (
                COPPER if c_idx == 0 else
                PASS_GREEN if c_idx == 3 else
                CALLOUT_RED if c_idx == 4 else
                TEXT_DARK
            )

    # Bottom Reviewer Sign-Off Bar
    add_rect(s, Inches(0.38), Inches(6.22), Inches(12.56), Inches(0.76), CARD,
             border_color=COPPER, border_pt=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, Inches(0.58), Inches(6.30), Inches(5.8), Inches(0.28),
             "Tester Name: ___________________________     Signature: _______________________",
             9.8, TEXT_DARK, bold=True)
    add_text(s, Inches(0.58), Inches(6.62), Inches(5.8), Inches(0.28),
             f"Role Group: {role_title}     Date: _______________",
             9.2, MUTED)
    add_text(s, Inches(6.55), Inches(6.30), Inches(6.2), Inches(0.58),
             "Overall Outcome:    \u2610  APPROVED FOR LIVE USE      \u2610  UPDATES REQUESTED",
             10, COPPER, bold=True, align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)


# ---------------------------------------------------------------------------
# COMPLETE ROLE-BASED TEST CASE CATALOG (Plain Non-Technical Active Voice)
# ---------------------------------------------------------------------------
MASTER_CASES = [
    {
        "id": "M-01",
        "role": "Platform Master",
        "title": "Login as Platform Master",
        "snap": "01_login_master",
        "steps": [
            "Open your web browser and go to **http://localhost:5176/login**.",
            "Click the **Email** box (**1**) and enter **founder@herbeauty.co.za**.",
            "Click the **Password** box (**2**) and enter **ChangeMe123!**.",
            "Click **Log in** (**3**) to sign in.",
        ],
        "verifications": [
            "You sign in without any error message on screen.",
            "The top menu displays **Master Console**, **Simulator**, and **Audit**.",
            "Your name (**Mrs Monean N Jacobs**) appears in the top-right corner.",
        ],
        "tip": "Passwords are case-sensitive. Include the capital C, capital M, and exclamation mark in **ChangeMe123!**.",
    },
    {
        "id": "M-02",
        "role": "Platform Master",
        "title": "Review Master Console & HER Pathway",
        "snap": "02_master_console",
        "steps": [
            "Click **Master Console** in the top navigation bar (or go to **http://localhost:5176/master**).",
            "Locate the **+ Onboard Studio Hub** button (**1**) at the top right.",
            "Review **The HER Pathway** dark espresso impact banner (**2**) across all 5 stages.",
            "Check the four summary cards (**3**) showing active studios, team size, bookings, and revenue.",
        ],
        "verifications": [
            "You see **HER Beauty Master Control Center** under **Mrs Monean N Jacobs**.",
            "All 5 stages (**LEARN \u2192 PRACTISE \u2192 EARN \u2192 GROW \u2192 EMPOWER**) show fellow counts.",
            "**Active Businesses** displays **6 / 6** published Western Cape hubs.",
        ],
        "tip": "This executive screen gives leadership a single live view across every HER Beauty hub.",
    },
    {
        "id": "M-03",
        "role": "Platform Master",
        "title": "Create a New Studio Hub",
        "snap": "03_create_studio_modal",
        "steps": [
            "On the **Master Console**, click **+ Onboard Studio Hub**.",
            "Enter the new studio name in **Business Name** (**1**), such as **HER Beauty \u2014 Franschhoek Boutique**.",
            "Select **Salon**, enter the city and manager name, and type the manager email in **Admin Email** (**2**).",
            "Click **Onboard Business** (**3**) to create the studio (or **Cancel** if practising).",
        ],
        "verifications": [
            "The **Onboard New Business Tenant** window opens cleanly over the page.",
            "All studio and manager fields accept text clearly.",
            "When saved, the system displays a temporary login password for the new studio manager.",
        ],
        "tip": "Only **Platform Master** accounts can add new studio branches to the network.",
    },
    {
        "id": "M-04",
        "role": "Platform Master",
        "title": "Manage Studio Directory & Status",
        "snap": "04_master_impersonate_list",
        "steps": [
            "Scroll down to **Business Directory** on **http://localhost:5176/master**.",
            "Locate **HER Beauty \u2014 Flagship Studio** (**1**) in Jamestown under owner **Chloe Laurent**.",
            "Check the **Active** switch (**2**) next to the studio.",
            "Click **Impersonate** (**3**) to step directly into that studio's dashboard.",
        ],
        "verifications": [
            "All 6 HER Beauty hubs appear with green **Active** badges.",
            "Flagship Studio shows **21 services** and **5 professionals**.",
            "Clicking **Impersonate** opens the Flagship Studio dashboard immediately.",
        ],
        "tip": "Turning off **Active** pauses a studio's access immediately if governance action is ever needed.",
    },
    {
        "id": "M-05",
        "role": "Platform Master",
        "title": "Step Into a Studio & Return Safely",
        "snap": "05_impersonation_active",
        "steps": [
            "Look at the copper governance banner (**1**) across the very top of the screen.",
            "Review the studio's live appointment figures (**3**) on the dashboard.",
            "When finished reviewing, click **Return to Master Console** (**2**) at the top right.",
        ],
        "verifications": [
            "The top bar clearly reads **Impersonating: HER Beauty \u2014 Flagship Studio**.",
            "You can inspect studio bookings, services, and contracts without needing a separate password.",
            "Clicking **Return to Master Console** brings you straight back to **/master**.",
        ],
        "tip": "Every studio support visit is recorded automatically in the platform activity history.",
    },
    {
        "id": "M-06",
        "role": "Platform Master",
        "title": "Switch Roles in Platform Simulator",
        "snap": "06_platform_simulator",
        "steps": [
            "Click **Simulator** (**1**) in the top navigation bar (or open **http://localhost:5176/demo**).",
            "Browse the five pre-configured HER Beauty role cards, including **Chloe Laurent** (**2**).",
            "Click **Launch Persona** (**3**) on **Chloe Laurent** or **Thandiwe Ndlovu** to preview their exact screen.",
        ],
        "verifications": [
            "Five role cards appear covering Director, Studio Manager, Head Mentor, Campus Hub, and VIP Client.",
            "One click switches into the chosen role with a top simulator banner.",
            "Quick-switch demo accounts remain hidden from the public sign-in page for security.",
        ],
        "tip": "Use **Return to Master Console** in the top banner whenever you want to exit Simulator mode.",
    },
    {
        "id": "M-07",
        "role": "Platform Master",
        "title": "Inspect Activity History & Governance Log",
        "snap": "07_audit_trail",
        "steps": [
            "Click **Audit** (**1**) in the top navigation bar (or open **http://localhost:5176/audit**).",
            "Type an email such as **founder@herbeauty.co.za** or **thandiwe@herbeauty.co.za** in the search bar (**2**).",
            "Review the recorded activity cards (**3**) showing who performed each change and when.",
        ],
        "verifications": [
            "The **Immutable Audit Trail** lists bookings, role switches, and studio updates.",
            "Each entry displays the category badge, action type, user email, and timestamp.",
            "Personal network details remain privacy-protected in compliance with POPIA.",
        ],
        "tip": "Activity records cannot be deleted or altered, giving leadership full accountability.",
    },
    {
        "id": "M-08",
        "role": "Platform Master",
        "title": "Verify Platform Master Account & Profile (Mrs Monean N Jacobs)",
        "snap": "08_ricardo_master_profile",
        "steps": [
            "Click the **Sign out** icon at the top right, then open **http://localhost:5176/login**.",
            "Enter email **founder@herbeauty.co.za** and password **ChangeMe123!**, then click **Log in**.",
            "Click **Mrs Monean N Jacobs** in the top-right corner to open **Account & security** (**http://localhost:5176/profile**).",
            "Check the **MASTER** role badge (**1**), confirmed email (**founder@herbeauty.co.za**) (**2**), and **Save details** button (**3**).",
        ],
        "verifications": [
            "**founder@herbeauty.co.za** signs in with full **MASTER** executive privileges.",
            "No legacy **@smartpatel.tech** accounts exist anywhere in the system.",
            "The Master account maintains the standard **ChangeMe123!** governance password.",
        ],
        "tip": "You can update phone details or change your password anytime from this security screen.",
    },
]

DIRECTOR_CASES = [
    {
        "id": "D-01",
        "role": "Studio Director",
        "title": "Login as Flagship Studio Director",
        "snap": "09_login_director",
        "steps": [
            "Open your browser and go to **http://localhost:5176/login**.",
            "Enter **admin@herbeauty.co.za** in the **Email** field (**1**).",
            "Enter **Password123** in the **Password** field (**2**).",
            "Click **Log in** (**3**).",
        ],
        "verifications": [
            "You sign in smoothly as **Chloe Laurent** for **HER Beauty \u2014 Flagship Studio**.",
            "The top navigation displays **Studio Dashboard** and **Audit**.",
            "A green **Live** indicator appears in the top-right header.",
        ],
        "tip": "Campus Hub managers (such as **tygervalley@herbeauty.co.za**) also use **Password123**.",
    },
    {
        "id": "D-02",
        "role": "Studio Director",
        "title": "Review Studio Dashboard & Today's Schedule",
        "snap": "10_studio_dashboard_overview",
        "steps": [
            "Click **Studio Dashboard** in the top bar (or go to **http://localhost:5176/dashboard**).",
            "Confirm the **Overview** tab (**1**) is active across the 8 studio management tabs.",
            "Check the four daily summary cards (**2**): **Today**, **Upcoming**, **Awaiting confirmation**, and **Revenue**.",
            "Inspect **Today's schedule** (**3**) for client bookings such as **HER-84920** and **HER-84922**.",
        ],
        "verifications": [
            "You see **HER Beauty \u2014 Flagship Studio** and all four performance cards.",
            "Today's appointments show client name, time, assigned artisan, ZAR rate, and reference code.",
            "Action buttons (**Confirm**, **Complete**, **Cancel**) appear right on each appointment row.",
        ],
        "tip": "New client bookings appear on this screen automatically without refreshing the page.",
    },
    {
        "id": "D-03",
        "role": "Studio Director",
        "title": "Confirm & Manage Client Bookings",
        "snap": "11_studio_bookings",
        "steps": [
            "Click the **Bookings** tab (**1**) (or open **http://localhost:5176/dashboard/bookings**).",
            "Click status filters (**2**) such as **Upcoming**, **Pending**, **Completed**, or **All**.",
            "Locate a pending booking (**HER-84922**) and click **Confirm** (**3**) to approve the slot.",
        ],
        "verifications": [
            "Appointments filter cleanly by status pill.",
            "Each booking displays its **HER-** reference code, promo badge, and 20% deposit amount.",
            "Clicking **Confirm** updates the booking status badge to **confirmed** immediately.",
        ],
        "tip": "Cancelling a booking automatically frees that chair slot so another client can book it.",
    },
    {
        "id": "D-04",
        "role": "Studio Director",
        "title": "Manage Services & 5 Revenue Streams",
        "snap": "12_studio_services",
        "steps": [
            "Click the **Services & Streams** tab (**1**) (**http://localhost:5176/dashboard/services**).",
            "Filter across the 5 revenue streams (**Salon**, **Packages**, **Retail**, **Training**, **Events**).",
            "Click **+ Add service** (**2**) to inspect the service creation form.",
            "Verify ZAR rates and the **Bookable** switch on service cards (**3**).",
        ],
        "verifications": [
            "Flagship Studio lists **21 services** across hair, braids, wigs, gel nails, facials, kits, and events.",
            "Prices appear clearly in South African Rand (e.g., **R 320**, **R 540**, **R 850**).",
            "Each service can be toggled bookable or edited with one click.",
        ],
        "tip": "Complimentary consultations display as **R 0 / Complimentary** with no deposit required.",
    },
    {
        "id": "D-05",
        "role": "Studio Director",
        "title": "Manage Artisans & HER Pathway Stages",
        "snap": "13_studio_artisans_pathway",
        "steps": [
            "Click the **Artisans & Pathway** tab (**1**) (**http://localhost:5176/dashboard/team**).",
            "Review the 5-stage **HER Pathway** team directory.",
            "Click **+ Add professional** (**2**) to see how new stylists or fellows are added.",
            "Verify **Amahle Sithole** (**3**) and team cards for stage badges and commission rates.",
        ],
        "verifications": [
            "All 5 Flagship artisans appear across **EMPOWER (50%)**, **GROW (45%)**, **EARN (40%)**, **PRACTISE (35%)**, and **LEARN (30%)**.",
            "Each card shows specialties, availability switch, edit pencil, and password reset option.",
        ],
        "tip": "Updating an artisan's Pathway stage automatically updates their badge on the public booking page.",
    },
    {
        "id": "D-06",
        "role": "Studio Director",
        "title": "Open Studio Chair Time Slots",
        "snap": "14_studio_availability",
        "steps": [
            "Click the **Availability** tab (**1**) (**http://localhost:5176/dashboard/availability**).",
            "Select an artisan such as **Amahle Sithole** under **Professional** (**2**).",
            "Pick a date, start/end time, slot length (**30 minutes**), and click **Add slots** (**3**).",
        ],
        "verifications": [
            "The **Open up time slots** tool splits your chosen hours into bookable appointment slots.",
            "Open slots appear grouped by date across the 14-day calendar strip below.",
            "Booked slots are protected from accidental deletion.",
        ],
        "tip": "Use **Repeat** (1, 2, 4, or 8 weeks) to publish an entire month's chair roster in seconds.",
    },
    {
        "id": "D-07",
        "role": "Studio Director",
        "title": "Publish Specials & Send Broadcasts",
        "snap": "15_studio_specials_comms",
        "steps": [
            "Click the **Specials & Comms** tab (**1**) (**http://localhost:5176/dashboard/specials**).",
            "Click **+ New Campus Special** (**2**) to view how promotional codes are published.",
            "Verify active offers (**3**) including **CAMPUS20 (20% OFF)**, **WELCOME15**, and **GLOW25**.",
            "Scroll down to check the **Send Studio Broadcast** panel for client or stylist announcements.",
        ],
        "verifications": [
            "All active campus specials display discount percentages and validity dates.",
            "Sent announcements appear in the broadcast log and record in activity history.",
        ],
        "tip": "Any promo code created here works immediately during Step 4 of client checkout.",
    },
    {
        "id": "D-08",
        "role": "Studio Director",
        "title": "Verify Artisan Contracts, Cohort 2025 & POPIA",
        "snap": "16_studio_contracts_popia",
        "steps": [
            "Click the **Contracts & POPIA** tab (**1**) (**http://localhost:5176/dashboard/contracts**).",
            "Click **+ Issue Artisan Contract** (**2**) to inspect the learnership/stylist agreement form.",
            "Review the **HER Booking & POPIA Policy** card (**3**), **Cohort 2025**, and **Stylist Contracts**.",
        ],
        "verifications": [
            "Policy terms clearly show **20% deposit**, **24 hrs** cancellation, **50%** no-show fee, and **14 days** retail return.",
            "Cohort 2025 lists all 7 training modules and the **R 2 500** monthly fellow stipend.",
            "Signed contracts (**HER-CON-0001** to **HER-CON-0005**) and client POPIA consents are listed.",
        ],
        "tip": "This tab keeps employment governance and client privacy records audit-ready in one place.",
    },
    {
        "id": "D-09",
        "role": "Studio Director",
        "title": "Update Studio Profile & Public Visibility",
        "snap": "17_studio_brand_profile",
        "steps": [
            "Click the **Studio & Brand** tab (**1**) (**http://localhost:5176/dashboard/profile**).",
            "Verify the **Taking bookings** visibility switch (**2**) is turned on.",
            "Check the Jamestown address (**4 White Heart, Jamestown, 7600**) and opening hours.",
            "Click **Preview public page** (**3**) to view the studio exactly as clients see it.",
        ],
        "verifications": [
            "The studio shows **Taking bookings** so clients can discover it in search.",
            "Contact details (**081 047 0327**, **founder@herbeauty.co.za**) and Mon\u2013Sat hours match brand standards.",
        ],
        "tip": "Switching off **Taking bookings** hides a hub from public search during renovations or training days.",
    },
]

ARTISAN_CASES = [
    {
        "id": "A-01",
        "role": "Artisan & Mentor",
        "title": "Login as Head Mentor & Master Stylist",
        "snap": "18_login_artisan",
        "steps": [
            "Open your browser and go to **http://localhost:5176/login**.",
            "Enter **nomvula@herbeauty.co.za** in the **Email** box (**1**).",
            "Enter **Password123** in the **Password** box (**2**).",
            "Click **Log in** (**3**).",
        ],
        "verifications": [
            "You sign in as **Nomvula Dlamini** (Master Stylist & Senior Mentor).",
            "The header displays **Studio Dashboard**, **Audit**, and **Nomvula Dlamini**.",
        ],
        "tip": "Other Pathway artisans (**zanele@**, **keisha@**, **lindiwe@**, **amahle@herbeauty.co.za**) also use **Password123**.",
    },
    {
        "id": "A-02",
        "role": "Artisan & Mentor",
        "title": "Check Daily Chair Schedule & Live Updates",
        "snap": "19_artisan_schedule_view",
        "steps": [
            "Click **Studio Dashboard** (**http://localhost:5176/dashboard**).",
            "Confirm **Nomvula Dlamini** (**1**) and the green **Live** badge (**2**) in the top-right header.",
            "Review **Today's schedule** (**3**) for **HER-84920** (**Thandiwe Ndlovu \u00b7 Wash, Deep Moisture Treatment & Silk Blowout**).",
        ],
        "verifications": [
            "Your assigned client appointment shows exact time (**10:00 AM\u201311:15 AM**), service, and client notes.",
            "The green **Live** badge confirms instant chair alerts when clients book or cancel.",
        ],
        "tip": "Client texture and care notes appear right on the booking row so you can prepare products beforehand.",
    },
    {
        "id": "A-03",
        "role": "Artisan & Mentor",
        "title": "Confirm & Complete Chair Appointments",
        "snap": "11_studio_bookings",
        "steps": [
            "Click the **Bookings** tab (**1**) (**http://localhost:5176/dashboard/bookings**).",
            "Use **Upcoming** or **Pending** (**2**) to filter appointments waiting for attention.",
            "Click **Confirm** or **Complete** (**3**) once a client's hair, nail, or beauty session finishes.",
        ],
        "verifications": [
            "Pending appointments (**HER-84922**) show clear **Confirm** and **Cancel** buttons.",
            "Marking a session **Complete** adds its ZAR value into completed studio revenue.",
        ],
        "tip": "Completing sessions accurately ensures artisan commission and mentorship records stay exact.",
    },
    {
        "id": "A-04",
        "role": "Artisan & Mentor",
        "title": "Verify Pathway Stage & Commission Tier",
        "snap": "13_studio_artisans_pathway",
        "steps": [
            "Click the **Artisans & Pathway** tab (**1**) (**http://localhost:5176/dashboard/team**).",
            "Check the 5-stage **HER Pathway** bar from **LEARN** through **EMPOWER**.",
            "Inspect **Nomvula Dlamini** (**3**) and fellow cards (**Keisha**, **Lindiwe**, **Amahle**).",
        ],
        "verifications": [
            "**Nomvula Dlamini** displays **EMPOWER** stage at **50% comm.**",
            "**Zanele (GROW 45%)**, **Keisha (EARN 40%)**, **Lindiwe (PRACTISE 35%)**, and **Amahle (LEARN 30%)** appear clearly.",
        ],
        "tip": "Every stage reflects transparent progression from Cohort 2025 apprentice to Master Mentor.",
    },
    {
        "id": "A-05",
        "role": "Artisan & Mentor",
        "title": "Publish Open Chair Slots for Clients",
        "snap": "14_studio_availability",
        "steps": [
            "Click the **Availability** tab (**1**) (**http://localhost:5176/dashboard/availability**).",
            "Select your name under **Professional** (**2**) and pick your working date and hours.",
            "Click **Add slots** (**3**) to open chair times for student and community bookings.",
        ],
        "verifications": [
            "New 30-minute or 60-minute slots appear immediately in the open slots grid below.",
            "Clients can now select those exact times in Step 3 of online booking.",
        ],
        "tip": "Approved conference or study leave dates are respected so clients never double-book you.",
    },
    {
        "id": "A-06",
        "role": "Artisan & Mentor",
        "title": "Review Stylist Notices & Specials",
        "snap": "15_studio_specials_comms",
        "steps": [
            "Click the **Specials & Comms** tab (**1**) (**http://localhost:5176/dashboard/specials**).",
            "Check active student promotions (**3**) such as **CAMPUS20** so you can advise walk-in clients.",
            "Read the **Recent Broadcasts** feed on the right for Saturday roster and mentorship updates.",
        ],
        "verifications": [
            "Stylist notices (such as **Updated Young Stylist Mentorship & Saturday Shift Rosters**) are visible.",
            "Active promo codes and discount rates are clearly listed.",
        ],
        "tip": "Head Mentors (`manager` role) can also send team reminders directly from the Broadcasts panel.",
    },
    {
        "id": "A-07",
        "role": "Artisan & Mentor",
        "title": "Check Artisan Contract & Mentorship Hours",
        "snap": "16_studio_contracts_popia",
        "steps": [
            "Click the **Contracts & POPIA** tab (**1**) (**http://localhost:5176/dashboard/contracts**).",
            "Scroll to **Young Stylist Programme \u2014 Cohort 2025** and **Stylist Contracts**.",
            "Verify contract reference (**HER-CON-0001** to **HER-CON-0005**), commission %, and monthly mentorship hours.",
        ],
        "verifications": [
            "Cohort 2025 shows mentors (**Nomvula Dlamini**, **Zanele Khumalo**) and enrolled fellows.",
            "Each artisan's signed contract type, commission rate, and monthly mentorship hours are transparent.",
        ],
        "tip": "Learnership fellows receive 40\u201360 structured mentorship hours per month plus their R 2 500 stipend.",
    },
    {
        "id": "A-08",
        "role": "Artisan & Mentor",
        "title": "Verify Public Artisan Portfolio & Badge",
        "snap": "20_artisan_public_showcase",
        "steps": [
            "Click **Studios & Services** in the top menu, then open **HER Beauty \u2014 Flagship Studio**.",
            "Scroll down to the studio's **Artisans** showcase section.",
            "Check the public profile cards for **Nomvula** (**1**), **Zanele** (**2**), and **Keisha** (**3**).",
        ],
        "verifications": [
            "Each artisan's photo, bio, specialties, star rating (**4.9+**), and **HER Pathway** badge appear proudly.",
            "Clients can see whether they are booking a Master Mentor or supporting an emerging Young Stylist Fellow.",
        ],
        "tip": "Public Pathway badges celebrate youth progression and build strong client trust.",
    },
]

CLIENT_CASES = [
    {
        "id": "C-01",
        "role": "Client & Student",
        "title": "Browse Studios & Glow-Up Banner",
        "snap": "21_home_browse",
        "steps": [
            "Open your browser and go to **http://localhost:5176**.",
            "Check the top announcement bar (**1**) featuring promo code **GLOW20**.",
            "Type **Flagship** or **Braids** in the search box (**2**) or click **Salon** (**3**) to filter.",
        ],
        "verifications": [
            "The luxury **HER Beauty** home page loads with the **GLOW20** special privilege banner.",
            "All 6 published Western Cape HER Beauty studios appear with ratings and city locations.",
            "Footer displays **HER Beauty. HER Style. HER Identity.** and **Where beauty meets opportunity**.",
        ],
        "tip": "Anyone can browse studios, prices, and artisans freely before signing in.",
    },
    {
        "id": "C-02",
        "role": "Client & Student",
        "title": "Explore Flagship Studio & ZAR Menu",
        "snap": "22_studio_public_page",
        "steps": [
            "Click **HER Beauty \u2014 Flagship Studio** on the home page.",
            "Verify the studio title (**1**) and Jamestown address (**4 White Heart, Jamestown**) (**3**).",
            "Browse the 21 services and click **Book an appointment** (**2**).",
        ],
        "verifications": [
            "Opening hours (**Mon\u2013Fri 08:30\u201318:00, Sat 09:00\u201316:00**), phone (**081 047 0327**), and ZAR prices appear.",
            "Clicking **Book an appointment** launches the 4-step booking wizard.",
        ],
        "tip": "You can filter services by stream (Salon, Packages, Retail, Training, Events) on this page.",
    },
    {
        "id": "C-03",
        "role": "Client & Student",
        "title": "Login as VIP Student Client",
        "snap": "23_login_client",
        "steps": [
            "Click **Sign in** at the top right (or go to **http://localhost:5176/login**).",
            "Enter **thandiwe@herbeauty.co.za** in the **Email** box (**1**).",
            "Enter **Password123** in the **Password** box (**2**) and click **Log in** (**3**).",
        ],
        "verifications": [
            "You sign in as **Thandiwe Ndlovu**.",
            "**My bookings** and **Thandiwe Ndlovu** appear in the top navigation bar.",
        ],
        "tip": "Additional student test logins (**sipho@herbeauty.co.za** and **anke@herbeauty.co.za**) also use **Password123**.",
    },
    {
        "id": "C-04",
        "role": "Client & Student",
        "title": "Booking Step 1: Choose a Service",
        "snap": "24_book_step1_service",
        "steps": [
            "Inside **HER Beauty \u2014 Flagship Studio**, click **Book an appointment**.",
            "Click **Wash, Deep Moisture Treatment & Silk Blowout** (**1**) (**75 min \u00b7 R 320**).",
            "Compare other services (**2**) if desired, then click **Continue** (**3**).",
        ],
        "verifications": [
            "Your chosen service card highlights with a checkmark.",
            "Duration and ZAR price are clearly displayed on every service option.",
            "The **Continue** button activates as soon as a service is selected.",
        ],
        "tip": "You cannot accidentally skip Step 1 because **Continue** stays disabled until you choose a service.",
    },
    {
        "id": "C-05",
        "role": "Client & Student",
        "title": "Booking Step 2: Select Preferred Artisan",
        "snap": "25_book_step2_artisan",
        "steps": [
            "Review **Any available artisan** or pick a specific stylist.",
            "Click **Nomvula Dlamini** (**1**) to book with the Master Stylist & Senior Mentor.",
            "Notice the **HER Pathway** badges (**2**) on every artisan, then click **Continue** (**3**).",
        ],
        "verifications": [
            "**Nomvula Dlamini** shows a selected checkmark and her **EMPOWER** badge.",
            "Specialties (Natural Hair Care, Loc Maintenance, Silk Blowouts) are clearly listed.",
        ],
        "tip": "Choosing **Any available artisan** automatically assigns whoever is open at your chosen time.",
    },
    {
        "id": "C-06",
        "role": "Client & Student",
        "title": "Booking Step 3: Pick Date & Chair Slot",
        "snap": "26_book_step3_slot",
        "steps": [
            "Select your preferred date (**1**) across the 14-day calendar strip.",
            "Click an open time button (**2**) such as **9:00 AM**.",
            "Click **Continue** (**3**) to proceed to confirmation.",
        ],
        "verifications": [
            "Only genuinely open chair times appear — already-booked times are hidden.",
            "The selected date and time button highlight in rich espresso/copper.",
        ],
        "tip": "If all slots are taken on one day, click the next date in the 14-day strip.",
    },
    {
        "id": "C-07",
        "role": "Client & Student",
        "title": "Booking Step 4: Apply Promo & Accept POPIA",
        "snap": "27_book_step4_promo_popia",
        "steps": [
            "Type **CAMPUS20** (or **GLOW20**) in the promo box and click **Apply** (**1**).",
            "Add any optional hair texture, skin, or allergy notes for your artisan.",
            "Tick both the **HER Booking Policy** (20% deposit) and **POPIA** consent boxes (**2**).",
            "Click **Confirm booking** (**3**).",
        ],
        "verifications": [
            "Price updates automatically from **R 320** to **R 256 (20% off with CAMPUS20)**.",
            "The redeemable **20% Deposit: R 51.20** badge calculates automatically.",
            "**Confirm booking** unlocks only after both policy and POPIA boxes are ticked.",
        ],
        "tip": "Try codes **CAMPUS20**, **GLOW20**, **WELCOME15**, or **GLOW25** to verify instant discounts.",
    },
    {
        "id": "C-08",
        "role": "Client & Student",
        "title": "Verify Booking Receipt & Reference Code",
        "snap": "28_book_confirmed_receipt",
        "steps": [
            "Review the **You're booked in** confirmation screen.",
            "Check your unique **Booking Reference** badge (**1**) (for example, **HER-36518**).",
            "Verify the **Applied Promo** and **20% Booking Policy Deposit** summary (**2**).",
            "Click **View my bookings** (**3**).",
        ],
        "verifications": [
            "A unique **HER-** reference code is generated immediately.",
            "Date, time, artisan (**Nomvula Dlamini**), discounted rate (**R 256**), and deposit (**R 51.20**) match.",
        ],
        "tip": "Keep your **HER-** reference code handy when arriving at 4 White Heart, Jamestown.",
    },
    {
        "id": "C-09",
        "role": "Client & Student",
        "title": "Check My Bookings & HER Circle Loyalty",
        "snap": "30_client_loyalty_profile",
        "steps": [
            "Review your upcoming appointments and reminder banner on **My bookings** (**http://localhost:5176/my-bookings**).",
            "Click **Thandiwe Ndlovu** at the top right to open **http://localhost:5176/profile**.",
            "Check your **HER Circle** badge & **4,850 Beauty Pts** (**1**), update **Hair Texture** (**2**), and click **Save Care Preferences** (**3**).",
        ],
        "verifications": [
            "Thandiwe's **HER Circle** VIP tier (**4,850 Beauty Pts \u00b7 Code: HER-THANDI**) highlights as active.",
            "Saved texture, skin, and allergy preferences confirm with a green success message.",
        ],
        "tip": "Your care profile is protected under POPIA and shared only with your assigned HER Beauty artisan.",
    },
]

# Unified 12-case Stakeholder Master Test Pack (best end-to-end journey across all 4 roles)
UNIFIED_STAKEHOLDER_CASES = [
    CLIENT_CASES[0],   # 1. Browse Studios & Glow-Up Banner
    CLIENT_CASES[1],   # 2. Explore Flagship Studio & ZAR Menu
    MASTER_CASES[0],   # 3. Login as Platform Master (founder@herbeauty.co.za / ChangeMe123!)
    MASTER_CASES[1],   # 4. Review Master Console & HER Pathway
    MASTER_CASES[2],   # 5. Create a New Studio Hub
    MASTER_CASES[5],   # 6. Switch Roles in Platform Simulator
    MASTER_CASES[6],   # 7. Inspect Activity History & Governance Log
    DIRECTOR_CASES[1], # 8. Review Studio Dashboard & Today's Schedule (admin@herbeauty.co.za)
    DIRECTOR_CASES[4], # 9. Manage Artisans & HER Pathway Stages
    DIRECTOR_CASES[7], # 10. Verify Artisan Contracts, Cohort 2025 & POPIA
    CLIENT_CASES[6],   # 11. Apply CAMPUS20 Promo, 20% Deposit & Accept POPIA (thandiwe@herbeauty.co.za)
    CLIENT_CASES[8],   # 12. Check My Bookings & HER Circle VIP Loyalty
]


def build_test_pack_pptx(filename: str, deck_title: str, role_subtitle: str, role_label: str,
                         hero_snap: str, cred_summary: str,
                         accounts: list[tuple[str, str, str]], cases: list[dict],
                         footer_label: str):
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    # Slide 1: Cover Slide
    add_cover_slide(prs, deck_title, role_subtitle, hero_snap, cred_summary)

    # Slide 2: How-To-Use & Credentials Slide
    add_how_to_use_slide(prs, footer_label, role_label, accounts)

    # Test Case Slides (Slides 3 .. N)
    slide_idx = 3
    renumbered_cases = []
    for idx, raw_tc in enumerate(cases, 1):
        tc = dict(raw_tc)
        if footer_label.startswith("Complete"):
            tc["id"] = f"TC-{idx:02d}"
        renumbered_cases.append(tc)
        add_test_case_slide(
            prs,
            slide_num=f"{slide_idx:02d}",
            test_id=tc["id"],
            role_kicker=tc["role"],
            title=tc["title"],
            snap_id=tc["snap"],
            steps=tc["steps"],
            verifications=tc["verifications"],
            tip_text=tc["tip"],
            deck_footer=footer_label,
        )
        slide_idx += 1

    # Sign-Off Matrix Slide(s) (max 9 rows per slide so table stays super scannable!)
    if len(renumbered_cases) <= 9:
        add_signoff_matrix_slide(prs, f"{slide_idx:02d}", role_label, renumbered_cases, footer_label)
    else:
        mid = (len(renumbered_cases) + 1) // 2
        add_signoff_matrix_slide(prs, f"{slide_idx:02d}", role_label, renumbered_cases[:mid],
                                 footer_label, part_label="Part 1 of 2")
        add_signoff_matrix_slide(prs, f"{slide_idx + 1:02d}", role_label, renumbered_cases[mid:],
                                 footer_label, part_label="Part 2 of 2")

    out_path = os.path.join(OUTPUT_DIR, filename)
    try:
        prs.save(out_path)
        print(f"Saved: {out_path} ({len(list(prs.slides))} slides)")
        return True
    except PermissionError:
        print(f"[locked] {out_path} is currently open in PowerPoint — skipped direct overwrite.")
        return False


def build_look_and_feel_pptx():
    """Companion deck modeled on '1. CTP Now_Maths Feature_Look and Feel.pptx'."""
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    add_cover_slide(
        prs,
        "HER BEAUTY\nLOOK & FEEL SHOWCASE",
        "Visual Tour of Studios, 4-Step Booking, HER Pathway & Executive Governance",
        "21_home_browse",
        "Live Platform URL: **http://localhost:5176**  \u00b7  6 Western Cape Hubs  \u00b7  21 Services in ZAR",
    )

    showcases = [
        ("02", "PUBLIC DISCOVERY", "Contemporary Home Page & Campus Specials", "21_home_browse",
         ["Warm linen & copper luxury palette matching **HER_Business_Plan.pptx**.",
          "Top **GLOW20** privilege banner, instant search, and 6 Western Cape studio cards.",
          "Updated footer pairing **HER Beauty. HER Style. HER Identity.** and **Where beauty meets opportunity**."]),
        ("03", "FLAGSHIP STUDIO", "Jamestown Flagship Studio & 21-Service Menu", "22_studio_public_page",
         ["Located at **4 White Heart, Jamestown 7600** (**081 047 0327**).",
          "Transparent South African Rand (ZAR) pricing across 5 revenue streams.",
          "Meet-our-artisans showcase displaying verified **HER Pathway** badges."]),
        ("04", "ONLINE BOOKING", "4-Step Client Booking with Promo & 20% Deposit", "27_book_step4_promo_popia",
         ["Guided Service \u2192 Artisan \u2192 Date & Slot \u2192 Confirmation experience.",
          "Instant promo code validation (**CAMPUS20**, **GLOW20**, **WELCOME15**, **GLOW25**).",
          "Automated **20% redeemable deposit** calculation and **POPIA** consent checkboxes."]),
        ("05", "BOOKING RECEIPT", "Instant Reference Code & Appointment Summary", "28_book_confirmed_receipt",
         ["Generates a unique **HER-** booking reference badge on confirmation.",
          "Displays date, time, assigned artisan, promo savings, and 20% deposit clearly.",
          "Connects directly to **My bookings** with 24-hour appointment reminders."]),
        ("06", "CLIENT LOYALTY", "3-Tier HER Circle VIP & Personalised Care Profile", "30_client_loyalty_profile",
         ["Tracks **Community Member**, **Campus Member (2,500+)**, and **HER Circle VIP (4,000+)**.",
          "Stores hair texture, porosity, skin focus, and botanical allergy notes safely.",
          "Protected under **POPIA (Act 4 of 2013)** and visible only to the assigned artisan."]),
        ("07", "STUDIO OPERATIONS", "Flagship Studio Director Dashboard & Live Schedule", "10_studio_dashboard_overview",
         ["8 dedicated studio tabs: Overview, Bookings, Availability, Services, Artisans, Specials, Contracts, Brand.",
          "Four real-time KPI cards tracking daily bookings, pending approvals, and completed ZAR revenue.",
          "1-click **Confirm**, **Complete**, and **Cancel** controls on every appointment."]),
        ("08", "YOUTH EMPOWERMENT", "The HER Pathway & Artisan Commission Ladder", "13_studio_artisans_pathway",
         ["Visualises **LEARN (30%) \u2192 PRACTISE (35%) \u2192 EARN (40%) \u2192 GROW (45%) \u2192 EMPOWER (50%)**.",
          "Links Cohort 2025 apprentices directly with Master Mentors (**Nomvula Dlamini**).",
          "Backed by formal contracts (**HER-CON-0001\u20130005**) and R 2 500 fellow stipends."]),
        ("09", "MASTER GOVERNANCE", "Executive Master Control Center & Role Simulator", "02_master_console",
         ["Built for Director **Mrs Monean N Jacobs** (**founder@herbeauty.co.za**).",
          "Tracks cross-studio social impact metrics, 6 active hubs, and studio onboarding.",
          "Includes 1-click **Studio Impersonation**, **Platform Simulator**, and **Audit Trail**."]),
    ]

    for num, kicker, title, snap_id, highlights in showcases:
        s = prs.slides.add_slide(prs.slide_layouts[6])
        set_bg(s, LINEN)
        add_header(s, num, kicker, title, "Platform Look & Feel Showcase")

        # 63% width clean un-cluttered raw screenshot for Look & Feel beauty!
        raw_img = os.path.join(SCREENSHOT_DIR, "raw", f"{snap_id}.png")
        add_rect(s, Inches(0.38), Inches(1.28), Inches(8.42), Inches(5.55), CARD,
                 border_color=BORDER, border_pt=1.2, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s, Inches(0.38), Inches(1.28), Inches(8.42), Inches(0.32), DARK2)
        add_text(s, Inches(0.56), Inches(1.28), Inches(8.0), Inches(0.32),
                 f"HER Beauty Live Screen  \u00b7  {MANIFEST.get(snap_id, {}).get('url', 'http://localhost:5176')}",
                 8.5, COPPER_PALE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        if os.path.exists(raw_img):
            s.shapes.add_picture(raw_img, Inches(0.48), Inches(1.68), width=Inches(8.22), height=Inches(4.91))

        add_rect(s, Inches(8.96), Inches(1.28), Inches(3.98), Inches(5.55), CARD,
                 border_color=COPPER_LIGHT, border_pt=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s, Inches(8.96), Inches(1.28), Inches(3.98), Inches(0.40), COPPER)
        add_text(s, Inches(9.14), Inches(1.28), Inches(3.62), Inches(0.40),
                 "KEY EXPERIENCE HIGHLIGHTS", 10.5, TEXT_LIGHT, bold=True, anchor=MSO_ANCHOR.MIDDLE)

        hbox = s.shapes.add_textbox(Inches(9.14), Inches(1.84), Inches(3.62), Inches(4.80))
        htf = hbox.text_frame
        htf.word_wrap = True
        for i, hl in enumerate(highlights):
            hp = htf.paragraphs[0] if i == 0 else htf.add_paragraph()
            hp.space_after = Pt(12)
            hp.line_spacing = 1.2
            rk = hp.add_run()
            rk.text = "\u2713  "
            rk.font.name = BODY_FONT
            rk.font.size = Pt(10.5)
            rk.font.bold = True
            rk.font.color.rgb = COPPER
            add_rich_paragraph(hp, hl, 10.5, TEXT_DARK, bold_color=DARK)

    # Closing slide
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, DARK)
    add_rect(s, 0, 0, Inches(0.18), SLIDE_H, COPPER)
    add_rect(s, Inches(0.18), 0, Inches(0.06), SLIDE_H, COPPER_LIGHT)
    add_logo(s, Inches(5.95), Inches(1.25), Inches(1.65), on_card=True)
    add_text(s, Inches(1.0), Inches(3.35), Inches(11.33), Inches(0.65),
             "HER Beauty. HER Style. HER Identity.", 32, TEXT_LIGHT, bold=True, align=PP_ALIGN.CENTER)
    add_text(s, Inches(1.0), Inches(4.05), Inches(11.33), Inches(0.45),
             "Where beauty meets opportunity \u2014 proceed to Deck 2 for step-by-step stakeholder testing & sign-off.",
             14, COPPER_PALE, italic=True, align=PP_ALIGN.CENTER)
    add_pathway_strip(s, Inches(4.85), left=Inches(3.25), total_width=Inches(6.83))
    add_text(s, Inches(1.0), Inches(6.25), Inches(11.33), Inches(0.45),
             "Director: Mrs Monean N Jacobs  \u00b7  4 White Heart, Jamestown 7600  \u00b7  081 047 0327  \u00b7  founder@herbeauty.co.za",
             11, MUTED_LIGHT, align=PP_ALIGN.CENTER)

    out_lf = os.path.join(OUTPUT_DIR, "1. HER_Beauty_Platform_Look_and_Feel.pptx")
    prs.save(out_lf)
    print(f"Saved: {out_lf} ({len(list(prs.slides))} slides)")


def build_markdown_test_pack():
    """Generate complete Markdown test pack with bolded URLs/emails and local screenshot paths."""
    lines = [
        "# HER Beauty Studio & Social Enterprise — Non-Technical User Test Pack",
        "",
        f"**Project Name:** HER Beauty Studio & Social Enterprise  ",
        f"**Date:** {DATE_STR}  ",
        f"**Director & Founder:** Mrs Monean N Jacobs (`founder@herbeauty.co.za`)  ",
        f"**Flagship Studio:** 4 White Heart, Jamestown 7600 · Tel: `081 047 0327`  ",
        f"**Official Logo File:** `C:\\Users\\Ricardo Smart\\Desktop\\H E R\\presentation\\her-logo-deck.png`  ",
        f"**Design Reference:** `C:\\Users\\Ricardo Smart\\Desktop\\H E R\\HER_Business_Plan.pptx`  ",
        f"**Live System Link:** **http://localhost:5176**",
        "",
        "---",
        "",
        "## Quick Login Summary (All Test Roles)",
        "",
        "| Role Group | Name | Email Address | Password | Starting Screen |",
        "| :--- | :--- | :--- | :--- | :--- |",
        "| **Platform Master & Governance** | Mrs Monean N Jacobs | **founder@herbeauty.co.za** | **ChangeMe123!** | **http://localhost:5176/master** |",
        "| **Studio Director (Flagship)** | Chloe Laurent | **admin@herbeauty.co.za** | **Password123** | **http://localhost:5176/dashboard** |",
        "| **Campus Hub Manager** | Thabo Mokoena | **tygervalley@herbeauty.co.za** | **Password123** | **http://localhost:5176/dashboard** |",
        "| **Campus Hub Manager** | Ayesha Pillay | **rondebosch@herbeauty.co.za** | **Password123** | **http://localhost:5176/dashboard** |",
        "| **Wellness & Academy Admins** | Pieter / Naledi / Riaan | **coetzenburg@** / **academy@** / **events@herbeauty.co.za** | **Password123** | **http://localhost:5176/dashboard** |",
        "| **Head Mentor (EMPOWER · 50%)** | Nomvula Dlamini | **nomvula@herbeauty.co.za** | **Password123** | **http://localhost:5176/dashboard** |",
        "| **Pathway Artisans (30%–45%)** | Zanele / Keisha / Lindiwe / Amahle | **zanele@** / **keisha@** / **lindiwe@** / **amahle@herbeauty.co.za** | **Password123** | **http://localhost:5176/dashboard** |",
        "| **HER Circle VIP Student Client** | Thandiwe Ndlovu | **thandiwe@herbeauty.co.za** | **Password123** | **http://localhost:5176/my-bookings** |",
        "| **Student Clients** | Sipho Khuzwayo / Anke van der Merwe | **sipho@herbeauty.co.za** / **anke@herbeauty.co.za** | **Password123** | **http://localhost:5176/my-bookings** |",
        "",
        "> ⚠ **Before You Begin:** Open Microsoft Edge or Google Chrome and visit **http://localhost:5176**. Follow the numbered red circles (`1`, `2`, `3`) on each screenshot.",
        "",
        "---",
        "",
    ]

    sections = [
        ("Section 1: Platform Master & Executive Governance",
         "01_Platform_Master_and_Executive_Governance_Test_Pack.pptx", MASTER_CASES),
        ("Section 2: Studio Directors & Hub Admins",
         "02_Studio_Directors_and_Hub_Admins_Test_Pack.pptx", DIRECTOR_CASES),
        ("Section 3: Artisans & Mentors (The HER Pathway)",
         "03_Artisans_and_Mentors_HER_Pathway_Test_Pack.pptx", ARTISAN_CASES),
        ("Section 4: Client & Student Accounts",
         "04_Client_and_Student_Accounts_Test_Pack.pptx", CLIENT_CASES),
    ]

    all_for_matrix = []

    for sec_title, pptx_name, case_list in sections:
        lines.append(f"## {sec_title}")
        lines.append(f"**PowerPoint Pack:** `C:\\Users\\Ricardo Smart\\Desktop\\H E R\\test pack\\{pptx_name}`")
        lines.append("")
        for tc in case_list:
            all_for_matrix.append(tc)
            shot_abs = os.path.join(SCREENSHOT_DIR, f"{tc['snap']}.png")
            callouts = MANIFEST.get(tc["snap"], {}).get("callouts", [])
            callout_desc = " · ".join(f"**({c['num']})** {c['label']}" for c in callouts)

            lines.append(f"### {tc['id']}: {tc['title']}")
            lines.append("")
            lines.append("**Step-by-Step Instructions:**")
            for idx, st in enumerate(tc["steps"], 1):
                lines.append(f"{idx}. {st}")
            lines.append("")
            lines.append(f"**Annotated Screenshot (60%+ Slide Width Area):**  ")
            lines.append(f"- Local File Path: `{shot_abs}`  ")
            lines.append(f"- Red Callouts on Screenshot: {callout_desc}")
            lines.append(f"![{tc['id']} — {tc['title']}](screenshots/{tc['snap']}.png)")
            lines.append("")
            lines.append("**✓ Verification Criteria (What You Should See):**")
            for vc in tc["verifications"]:
                lines.append(f"- ✓ {vc}")
            lines.append(f"- ⚠ *Helpful Note:* {tc['tip']}")
            lines.append("")
            lines.append("---")
            lines.append("")

    # Master Sign-Off Matrix Table
    lines.append("## Master Test Sign-Off Matrix")
    lines.append("")
    lines.append("| Test # | Role Group | Test Case Title | Expected Visual Result | Pass | Fail | Tester Notes |")
    lines.append("| :--- | :--- | :--- | :--- | :---: | :---: | :--- |")
    for tc in all_for_matrix:
        clean_v = tc["verifications"][0]
        lines.append(f"| **{tc['id']}** | {tc['role']} | {tc['title']} | ✓ {clean_v} | ☐ | ☐ | |")

    lines.extend([
        "",
        "### Final Stakeholder Approval",
        "- **Tester Full Name:** ________________________________________",
        "- **Role / Department:** _______________________________________",
        "- **Signature:** _______________________________________________",
        f"- **Date Tested:** ____________________ *(Pack issued {DATE_STR})*",
        "- **Decision:** ☐ **APPROVED FOR LIVE USE**    ☐ **CHANGES NEEDED**",
        "",
    ])

    md_text = "\n".join(lines)
    assert_plain_language(md_text, "HER_Beauty_Non_Technical_Test_Pack.md")

    md_path = os.path.join(OUTPUT_DIR, "HER_Beauty_Non_Technical_Test_Pack.md")
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write(md_text)
    print(f"Saved Markdown: {md_path} ({len(all_for_matrix)} total test cases)")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Companion Look & Feel Deck (matching 1. CTP Now_Maths Feature_Look and Feel.pptx)
    build_look_and_feel_pptx()

    # 2. Complete Unified Non-Technical Stakeholder Test Pack (matching 2. CTP Now_Maths Feature_Test Pack.pptx)
    build_test_pack_pptx(
        filename="2. HER_Beauty_Stakeholder_Test_Pack.pptx",
        deck_title="HER BEAUTY\nSTAKEHOLDER TEST PACK",
        role_subtitle="Complete Non-Technical User Guide Across All 4 Roles",
        role_label="All Stakeholder Roles",
        hero_snap="02_master_console",
        cred_summary="Master: **founder@herbeauty.co.za** (**ChangeMe123!**)  \u00b7  Studio & Clients: **Password123**",
        accounts=[
            ("Mrs Monean N Jacobs (Master)", "founder@herbeauty.co.za", "ChangeMe123!"),
            ("Chloe Laurent (Studio Director)", "admin@herbeauty.co.za", "Password123"),
            ("Thandiwe Ndlovu (VIP Student Client)", "thandiwe@herbeauty.co.za", "Password123"),
        ],
        cases=UNIFIED_STAKEHOLDER_CASES,
        footer_label="Complete Non-Technical Stakeholder Test Pack",
    )

    # Also attempt updating HER_Beauty_Non_Technical_Test_Pack.pptx if not open/locked
    build_test_pack_pptx(
        filename="HER_Beauty_Non_Technical_Test_Pack.pptx",
        deck_title="HER BEAUTY\nSTAKEHOLDER TEST PACK",
        role_subtitle="Complete Non-Technical User Guide Across All 4 Roles",
        role_label="All Stakeholder Roles",
        hero_snap="02_master_console",
        cred_summary="Master: **founder@herbeauty.co.za** (**ChangeMe123!**)  \u00b7  Studio & Clients: **Password123**",
        accounts=[
            ("Mrs Monean N Jacobs (Master)", "founder@herbeauty.co.za", "ChangeMe123!"),
            ("Chloe Laurent (Studio Director)", "admin@herbeauty.co.za", "Password123"),
            ("Thandiwe Ndlovu (VIP Student Client)", "thandiwe@herbeauty.co.za", "Password123"),
        ],
        cases=UNIFIED_STAKEHOLDER_CASES,
        footer_label="Complete Non-Technical Stakeholder Test Pack",
    )

    # 3. Role Pack 01: Platform Master & Executive Governance (11 slides max)
    build_test_pack_pptx(
        filename="01_Platform_Master_and_Executive_Governance_Test_Pack.pptx",
        deck_title="PLATFORM MASTER &\nGOVERNANCE TEST PACK",
        role_subtitle="Executive Oversight, Studio Creation, Role Simulator & Activity History",
        role_label="Platform Master & Executive Governance",
        hero_snap="02_master_console",
        cred_summary="Email: **founder@herbeauty.co.za**   \u00b7   Password: **ChangeMe123!**",
        accounts=[
            ("Mrs Monean N Jacobs (Director & Master)", "founder@herbeauty.co.za", "ChangeMe123!"),
        ],
        cases=MASTER_CASES,
        footer_label="01 \u00b7 Platform Master & Executive Governance",
    )

    # 4. Role Pack 02: Studio Directors & Hub Admins (12 slides max)
    build_test_pack_pptx(
        filename="02_Studio_Directors_and_Hub_Admins_Test_Pack.pptx",
        deck_title="STUDIO DIRECTORS &\nHUB ADMINS TEST PACK",
        role_subtitle="Bookings, 21 Services, Artisans, Chair Slots, Specials & POPIA Contracts",
        role_label="Studio Directors & Hub Admins",
        hero_snap="10_studio_dashboard_overview",
        cred_summary="Flagship: **admin@herbeauty.co.za**  |  Hubs: **tygervalley@** / **rondebosch@herbeauty.co.za**  \u00b7  Password: **Password123**",
        accounts=[
            ("Chloe Laurent (Flagship Studio)", "admin@herbeauty.co.za", "Password123"),
            ("Thabo Mokoena (Tygervalley Hub)", "tygervalley@herbeauty.co.za", "Password123"),
            ("Ayesha Pillay (Rondebosch Hub)", "rondebosch@herbeauty.co.za", "Password123"),
            ("Naledi Khumalo (Stylist Academy)", "academy@herbeauty.co.za", "Password123"),
        ],
        cases=DIRECTOR_CASES,
        footer_label="02 \u00b7 Studio Directors & Hub Admins",
    )

    # 5. Role Pack 03: Artisans & Mentors — The HER Pathway (11 slides max)
    build_test_pack_pptx(
        filename="03_Artisans_and_Mentors_HER_Pathway_Test_Pack.pptx",
        deck_title="ARTISANS & MENTORS\nTHE HER PATHWAY PACK",
        role_subtitle="Daily Chair Schedule, Mentorship, Commission Stages & Public Showcase",
        role_label="Artisans & Mentors (The HER Pathway)",
        hero_snap="13_studio_artisans_pathway",
        cred_summary="Head Mentor: **nomvula@herbeauty.co.za**  |  Fellows: **keisha@** / **amahle@herbeauty.co.za**  \u00b7  Password: **Password123**",
        accounts=[
            ("Nomvula Dlamini (EMPOWER \u00b7 50%)", "nomvula@herbeauty.co.za", "Password123"),
            ("Zanele Khumalo (GROW \u00b7 45%)", "zanele@herbeauty.co.za", "Password123"),
            ("Keisha Adams (EARN Fellow \u00b7 40%)", "keisha@herbeauty.co.za", "Password123"),
            ("Amahle Sithole (LEARN Apprentice \u00b7 30%)", "amahle@herbeauty.co.za", "Password123"),
        ],
        cases=ARTISAN_CASES,
        footer_label="03 \u00b7 Artisans & Mentors (The HER Pathway)",
    )

    # 6. Role Pack 04: Client & Student Accounts (12 slides max)
    build_test_pack_pptx(
        filename="04_Client_and_Student_Accounts_Test_Pack.pptx",
        deck_title="CLIENT & STUDENT\nACCOUNTS TEST PACK",
        role_subtitle="Studio Discovery, 4-Step Booking, Promo Codes, 20% Deposit & HER Circle VIP",
        role_label="Client & Student Accounts",
        hero_snap="27_book_step4_promo_popia",
        cred_summary="VIP Client: **thandiwe@herbeauty.co.za**  |  Students: **sipho@** / **anke@herbeauty.co.za**  \u00b7  Password: **Password123**",
        accounts=[
            ("Thandiwe Ndlovu (HER Circle VIP)", "thandiwe@herbeauty.co.za", "Password123"),
            ("Sipho Khuzwayo (Campus Client)", "sipho@herbeauty.co.za", "Password123"),
            ("Anke van der Merwe (Campus Client)", "anke@herbeauty.co.za", "Password123"),
        ],
        cases=CLIENT_CASES,
        footer_label="04 \u00b7 Client & Student Accounts",
    )

    # 7. Full Markdown Version
    build_markdown_test_pack()


if __name__ == "__main__":
    main()
