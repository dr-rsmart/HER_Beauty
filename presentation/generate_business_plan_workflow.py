"""
HER Beauty — Strategic Business Plan Generator (2026–2030)
Generates "C:\\Users\\Ricardo Smart\\Desktop\\H E R\\HER Beauty_Business_Plan.pptx"
using the warm copper / rose-gold / deep espresso / linen brand identity.

Follows the strategic progression:
1. High-Impact Core Priorities (vital few services, segments & deposit levers)
2. Core Studio Delivery & Operational Architecture
3. Continuous Client Demand & Artisan Talent Inflow
4. Capacity, Retention & Margin Accelerators
5. Multi-Hub Regional Expansion & Scalable Governance
6. Unit Economics, Financial Targets & Measurable Outcomes (2026–2030)

Guardrail: Strictly verifies that none of the forbidden meta-framework terms
appear anywhere in the presentation text.
"""

import os
import re
import struct

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE

# ---------------------------------------------------------------------------
# DESIGN TOKENS  (derived from her-logo.png)
# ---------------------------------------------------------------------------
DARK = RGBColor(0x1F, 0x16, 0x14)          # deep espresso (dark slides / bands)
DARK2 = RGBColor(0x2C, 0x1E, 0x1B)         # lighter espresso (dark cards)
COPPER = RGBColor(0x9E, 0x55, 0x40)        # rose-gold / copper (primary accent)
COPPER_LIGHT = RGBColor(0xD4, 0x9B, 0x88)  # light copper
COPPER_PALE = RGBColor(0xE2, 0xB8, 0xAB)   # pale champagne copper
LINEN = RGBColor(0xFA, 0xF6, 0xF0)         # warm linen / ivory background
CARD = RGBColor(0xFF, 0xFF, 0xFF)          # white card
TEXT_DARK = RGBColor(0x24, 0x1B, 0x18)     # dark text
TEXT_LIGHT = RGBColor(0xFA, 0xF6, 0xF0)    # light text
MUTED = RGBColor(0x7D, 0x6F, 0x6A)         # muted taupe
MUTED_LIGHT = RGBColor(0xB5, 0xA5, 0x9E)   # muted light taupe

HEADING_FONT = "Segoe UI"
BODY_FONT = "Segoe UI"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

_DECK_LOGO = os.path.join(BASE_DIR, "her-logo-deck.png")
_MASTER_LOGO = os.path.join(REPO_DIR, "her-logo-master.jpg")
LOGO_PATH = _DECK_LOGO if os.path.exists(_DECK_LOGO) else _MASTER_LOGO


def _png_size(path):
    """Read (width, height) from a PNG IHDR chunk - stdlib only."""
    with open(path, "rb") as fh:
        header = fh.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG file: {path}")
    width, height = struct.unpack(">II", header[16:24])
    return width, height


_LOGO_W, _LOGO_H = _png_size(LOGO_PATH)
LOGO_ASPECT = _LOGO_W / float(_LOGO_H)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

# Forbidden meta-framework terms guardrail
FORBIDDEN_PATTERNS = [
    r"80\s*[/\-]\s*20",
    r"\bpareto\b",
    r"\bengine(?:s)?\b",
    r"\bfuel(?:s|ed|ing|ling)?\b",
    r"\bmultiplier(?:s)?\b",
    r"\befficient\b",
    r"\bgrowth\b",
    r"\bperformance\b",
    r"\bresult(?:s)?\b",
]


def assert_no_forbidden_terms(prs: Presentation):
    for s_idx, slide in enumerate(prs.slides, start=1):
        for shape in slide.shapes:
            if shape.has_text_frame:
                txt = shape.text
                for pat in FORBIDDEN_PATTERNS:
                    m = re.search(pat, txt, flags=re.IGNORECASE)
                    if m:
                        raise ValueError(
                            f"Forbidden term {m.group(0)!r} (pattern {pat}) found on Slide {s_idx}: {txt!r}"
                        )


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, left, top, width, height, color, shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, left, top, width, height)
    sp.fill.solid()
    sp.fill.fore_color.rgb = color
    sp.line.fill.background()
    sp.shadow.inherit = False
    return sp


def add_text(slide, left, top, width, height, text, size, color,
             bold=False, font=BODY_FONT, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, spacing=None, italic=False):
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
    if spacing:
        p.line_spacing = spacing
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic
    run.font.name = font
    return box


def add_bullets(slide, left, top, width, height, items, size=12,
                color=TEXT_DARK, spacing=5, line_spacing=1.0, font=BODY_FONT,
                bullet_char="\u2022"):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(spacing)
        p.line_spacing = line_spacing
        if isinstance(item, tuple):
            bold_part, rest = item
            r1 = p.add_run()
            r1.text = f"{bullet_char}  {bold_part}"
            r1.font.size = Pt(size)
            r1.font.color.rgb = color
            r1.font.bold = True
            r1.font.name = font
            if rest:
                r2 = p.add_run()
                r2.text = f" {rest}"
                r2.font.size = Pt(size)
                r2.font.color.rgb = color
                r2.font.bold = False
                r2.font.name = font
        else:
            r = p.add_run()
            r.text = f"{bullet_char}  {item}"
            r.font.size = Pt(size)
            r.font.color.rgb = color
            r.font.name = font
    return box


def add_logo(slide, left, top, height, on_card=True):
    """Place the HER logo, optionally on a rounded linen card."""
    w = height * LOGO_ASPECT
    if on_card:
        pad = Inches(0.08)
        card = add_rect(slide, left - pad, top - pad, w + pad * 2,
                        height + pad * 2, LINEN,
                        shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        try:
            card.adjustments[0] = 0.06
        except Exception:
            pass
    slide.shapes.add_picture(LOGO_PATH, left, top, width=w, height=height)
    return w


def add_header(slide, number, title, subtitle=None):
    """Standard content-slide header: espresso band, copper accent, logo chip."""
    add_rect(slide, 0, 0, SLIDE_W, Inches(1.15), DARK)
    add_rect(slide, 0, Inches(1.15), SLIDE_W, Inches(0.06), COPPER)
    # slide number chip
    add_rect(slide, Inches(0.55), Inches(0.32), Inches(0.55), Inches(0.55), COPPER)
    add_text(slide, Inches(0.55), Inches(0.32), Inches(0.55), Inches(0.55),
             number, 20, TEXT_LIGHT, bold=True, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE)
    # title
    add_text(slide, Inches(1.35), Inches(0.22), Inches(9.6), Inches(0.55),
             title, 25, TEXT_LIGHT, bold=True, font=HEADING_FONT)
    if subtitle:
        add_text(slide, Inches(1.35), Inches(0.72), Inches(9.6), Inches(0.35),
                 subtitle, 12, COPPER_PALE, italic=True)
    # logo chip on the right of the header band
    add_logo(slide, Inches(11.85), Inches(0.2), Inches(0.75))
    # footer
    add_text(slide, Inches(11.9), Inches(7.05), Inches(1.1), Inches(0.3),
             number, 11, MUTED, align=PP_ALIGN.RIGHT)
    add_text(slide, Inches(0.55), Inches(7.05), Inches(9.5), Inches(0.3),
             "HER BEAUTY STUDIO & SOCIAL ENTERPRISE  |  BUSINESS PLAN 2026\u20132030  |  https://her-beauty-production.up.railway.app/",
             9, MUTED)


def add_card(slide, left, top, width, height, title, body_items,
             accent=COPPER, title_size=14, body_size=11, title_color=None,
             body_color=TEXT_DARK, body_spacing=4):
    """White rounded card with coloured top accent bar, title and bullets."""
    card = add_rect(slide, left, top, width, height, CARD,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    try:
        card.adjustments[0] = 0.045
    except Exception:
        pass
    add_rect(slide, left + Inches(0.0), top, width, Inches(0.07), accent)
    add_text(slide, left + Inches(0.25), top + Inches(0.18),
             width - Inches(0.5), Inches(0.4), title, title_size,
             title_color if title_color else accent, bold=True,
             font=HEADING_FONT)
    if body_items:
        add_bullets(slide, left + Inches(0.25), top + Inches(0.62),
                    width - Inches(0.5), height - Inches(0.8), body_items,
                    size=body_size, color=body_color, spacing=body_spacing)
    return card


def add_pathway(slide, top, left=Inches(0.55), total_width=Inches(12.23),
                dark_bg=False):
    """LEARN > PRACTISE > EARN > GROW > EMPOWER chevron strip."""
    steps = ["LEARN", "PRACTISE", "EARN", "GROW", "EMPOWER"]
    n = len(steps)
    gap = Inches(0.08)
    w = Emu(int((total_width - gap * (n - 1)) / n))
    h = Inches(0.5)
    colors = [COPPER, COPPER_LIGHT, COPPER_PALE, COPPER_LIGHT,
              DARK if not dark_bg else COPPER]
    text_colors = [TEXT_LIGHT, TEXT_DARK, TEXT_DARK, TEXT_DARK,
                   TEXT_LIGHT if not dark_bg else TEXT_LIGHT]
    for i, step in enumerate(steps):
        x = left + i * (w + gap)
        shape_type = MSO_SHAPE.PENTAGON if i == 0 else MSO_SHAPE.CHEVRON
        sp = add_rect(slide, x, top, w, h, colors[i], shape=shape_type)
        tf = sp.text_frame
        tf.word_wrap = False
        tf.margin_left = Inches(0.05)
        tf.margin_right = Inches(0.05)
        tf.margin_top = 0
        tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = step
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.name = HEADING_FONT
        r.font.color.rgb = text_colors[i]
    return top + h


def build_presentation():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]

    # =========================================================================
    # SLIDE 1 - TITLE / COVER
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, DARK)
    add_rect(s, 0, 0, Inches(0.18), SLIDE_H, COPPER)
    add_rect(s, Inches(0.18), 0, Inches(0.06), SLIDE_H, COPPER_LIGHT)
    add_text(s, Inches(1.0), Inches(0.82), Inches(7.5), Inches(0.4),
             "BUSINESS PLAN  2026\u20132030  \u00b7  PRODUCTION EDITION", 14, COPPER_LIGHT, bold=True)
    add_rect(s, Inches(1.0), Inches(1.28), Inches(2.5), Inches(0.045), COPPER)
    add_text(s, Inches(1.0), Inches(1.62), Inches(7.5), Inches(1.25),
             "HER", 72, TEXT_LIGHT, bold=True, font=HEADING_FONT)
    add_text(s, Inches(1.0), Inches(2.88), Inches(7.6), Inches(0.65),
             "BEAUTY STUDIO & SOCIAL ENTERPRISE", 23, COPPER_LIGHT, bold=True, font=HEADING_FONT)
    add_text(s, Inches(1.0), Inches(3.58), Inches(7.6), Inches(0.42),
             "Hair  \u2022  Nails  \u2022  Beauty   |   HER Beauty. HER Style. HER Identity.",
             15, COPPER_PALE, italic=True)
    add_text(s, Inches(1.0), Inches(4.02), Inches(7.6), Inches(0.38),
             "Where beauty meets opportunity \u2014 and where young talent is given the space to grow.",
             12, MUTED_LIGHT)
    add_logo(s, Inches(8.95), Inches(1.55), Inches(2.7))
    add_text(s, Inches(1.0), Inches(4.72), Inches(11), Inches(0.35),
             "THE HER PATHWAY  (SA HIGHER EDUCATION & SERVICES SETA ALIGNED #HER-7600)", 11, MUTED_LIGHT, bold=True)
    add_pathway(s, Inches(5.08), left=Inches(1.0), total_width=Inches(11.33), dark_bg=True)
    add_rect(s, Inches(1.0), Inches(6.12), Inches(11.33), Inches(0.03), COPPER)
    add_text(s, Inches(1.0), Inches(6.30), Inches(6.2), Inches(0.38),
             "Founder & Director: Mrs Monean N Jacobs  (founder@herbeauty.co.za)", 13, TEXT_LIGHT, bold=True)
    add_text(s, Inches(1.0), Inches(6.68), Inches(6.8), Inches(0.38),
             "Flagship Studio: 4 White Heart, Jamestown 7600  \u00b7  081 047 0327",
             11.5, MUTED_LIGHT)
    add_text(s, Inches(7.2), Inches(6.30), Inches(5.13), Inches(0.75),
             "Live Platform: https://her-beauty-production.up.railway.app/\n6 Western Cape Hubs  \u00b7  21 Services  \u00b7  5 Revenue Streams",
             11, COPPER_PALE, align=PP_ALIGN.RIGHT, spacing=1.15)

    # =========================================================================
    # SLIDE 2 (01) - VITAL PRIORITIES & CORE VALUE CONCENTRATION
    # (Embodies 80/20 focus: concentrating resources on the core drivers)
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "01", "EXECUTIVE SUMMARY & CORE VALUE DRIVERS",
               "Concentrating studio chairs, talent and capital on the vital priorities that drive the majority of value")
    add_bullets(s, Inches(0.55), Inches(1.50), Inches(6.95), Inches(3.65), [
        ("Signature High-Demand Treatments:",
         "Four core service pillars \u2014 silk blowouts (R320), knotless braids & wigs (R550\u2013R650), student gel nails (R220\u2013R240) and glow facials (R280) \u2014 anchor ~78% of repeat chair bookings."),
        ("Primary Anchor Client Segments:",
         "Western Cape university & clinical students (Jamestown, Tygervalley, Rondebosch) plus habitual 4-week protective-care clients deliver steady weekday and weekend occupancy."),
        ("Upfront 20% Deposit Protection:",
         "Every online booking collects a 20% redeemable deposit with a 24h cancellation window, eliminating uncompensated no-shows and locking in daily cash flow."),
        ("Mentor-Paired Station Model:",
         "One Master Mentor (50% commission) guiding four rising Cohort 2025 artisans (30%\u201345% commission) maximises studio output per chair while maintaining 4.9\u2605 quality."),
        ("Five Complementary Income Streams:",
         "Core salon chairs are reinforced by high-margin campus bundles (R540\u2013R1,600), retail care kits (R260\u2013R420), Saturday braiding labs (R850) and event styling bars (R2,400)."),
    ], size=12, spacing=7)
    add_card(s, Inches(7.75), Inches(1.50), Inches(5.03), Inches(1.70),
             "COMMERCIAL CONCENTRATION", [
                 "Weekday capacity anchored by recurring student hair & nail care",
                 "Peak Friday\u2013Saturday slots reserved for braids, bundles & events",
                 "Upfront 20% deposits secure working capital before service delivery",
             ], accent=COPPER, body_size=10.8)
    add_card(s, Inches(7.75), Inches(3.38), Inches(5.03), Inches(1.72),
             "FOCUSED TALENT DEPLOYMENT", [
                 "Accredited #HER-7600 fellowship focused on top-demand textures",
                 "Apprentices master lucrative protective & natural styling first",
                 "Skills convert rapidly into paid client chairs and enterprise value",
             ], accent=COPPER_LIGHT, body_size=10.8)
    add_text(s, Inches(0.55), Inches(5.32), Inches(12), Inches(0.35),
             "THE HER PATHWAY: STRUCTURED PROGRESSION FROM APPRENTICE CHAIR TO STUDIO LEADERSHIP",
             11.5, MUTED, bold=True)
    add_pathway(s, Inches(5.68))
    add_text(s, Inches(0.55), Inches(6.38), Inches(12.23), Inches(0.45),
             "By focusing on high-frequency texture care and disciplined chair economics, HER achieves commercial strength and deep community impact.",
             12, TEXT_DARK, italic=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 3 (02) - CRITICAL MARKET FRICTION & FOCUSED SOLUTION
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "02", "MARKET GAP & THE HER BEAUTY SOLUTION",
               "Resolving the core client and stylist bottlenecks in South African campus and community beauty")
    add_card(s, Inches(0.55), Inches(1.55), Inches(6.0), Inches(4.65),
             "CRITICAL MARKET BOTTLENECKS", [
                 "Students, clinical trainees & young professionals struggle to find reliable hair, nail and skin care under one trusted roof.",
                 "Conventional salons frequently lack technical mastery across coiled, natural, loc and protective hair textures.",
                 "Manual WhatsApp scheduling, last-minute cancellations and unclear pricing waste up to 30% of daily stylist chair hours.",
                 "Talented emerging stylists lack structured salon chairs, formal contracts, mentorship and business training to build careers.",
             ], accent=COPPER, title_size=15.5, body_size=12, body_spacing=9)
    add_card(s, Inches(6.78), Inches(1.55), Inches(6.0), Inches(4.65),
             "THE FOCUSED HER BEAUTY SOLUTION", [
                 "Full-service Hair, Nails & Beauty studios anchored in Jamestown, Tygervalley, Rondebosch & Coetzenburg.",
                 "Concentrated mastery across silk blowouts, loc rebalancing, knotless braids, lace wigs, gel overlays and botanical facials.",
                 "Instant 4-step online booking with live chair slots, promo validation (GLOW20 / CAMPUS20) and 20% deposit security.",
                 "Embedded Young Stylist Academy & Cohort 2025 fellowship turning apprentices into 50%-commission senior mentors.",
                 "Enterprise POPIA consent protection, formal artisan contracts (HER-CON-0001\u20130005) and multi-studio executive oversight.",
             ], accent=COPPER_LIGHT, title_size=15.5, body_size=12, body_spacing=7)
    add_text(s, Inches(0.55), Inches(6.42), Inches(12.23), Inches(0.45),
             "HER is where beauty meets opportunity \u2014 and where young talent is given the space to flourish.",
             13, COPPER, bold=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 4 (03) - CORE STUDIO OPERATIONS & DELIVERY ARCHITECTURE
    # (Embodies the operational "Engine": how chairs, services & bookings work)
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "03", "CORE STUDIO OPERATIONS & SERVICE ARCHITECTURE",
               "Standardised 21-service catalog, conflict-free chair scheduling and five diversified revenue streams")
    svc_cards = [
        ("NATURAL HAIR & CARE", [
            "Silk Blowout & Moisture (R320)",
            "Loc Rebalancing (R380)",
            "Curl Steam Therapy (R340)",
            "Rooibos Scalp Detox (R310)",
            "Free Texture Consultation (R0)",
        ], COPPER),
        ("BRAIDS, WIGS & CUTS", [
            "Knotless Braids (from R620\u2013R650)",
            "Cornrows & Twists (R350)",
            "Wig Install & Styling (R550)",
            "Colour & Bond Care (R520)",
            "Precision Cut & Refresh (R250)",
        ], COPPER_LIGHT),
        ("NAILS, SKIN & GLAM", [
            "Student Gel Manicure (R240)",
            "Clinical Short Gel Nails (R220)",
            "Express Glow Facial & Brow (R280)",
            "Soft Glam Makeup (R350)",
            "Special-Event Styling (R395)",
        ], COPPER),
        ("BUNDLES, RETAIL & LABS", [
            "Back-to-Campus Bundle (R540)",
            "Graduation Group x4 (R1,600)",
            "Signature Retail Kits (R260\u2013R420)",
            "Braiding Masterclass (R850)",
            "Pop-Up & Campus Bars (R950\u2013R2,400)",
        ], COPPER_LIGHT),
    ]
    sc_w = Inches(2.95)
    sc_gap = Inches(0.14)
    for i, (title, items, acc) in enumerate(svc_cards):
        x = Inches(0.55) + i * (sc_w + sc_gap)
        add_card(s, x, Inches(1.50), sc_w, Inches(3.45), title, items,
                 accent=acc, title_size=13, body_size=10.5, body_spacing=5)

    add_rect(s, Inches(0.55), Inches(5.18), Inches(12.23), Inches(1.62), DARK)
    add_text(s, Inches(0.85), Inches(5.32), Inches(11.6), Inches(0.38),
             "FIVE COMPLEMENTARY REVENUE STREAMS OPERATING IN UNISON", 13, COPPER_LIGHT, bold=True)
    rev = [
        ("1. SALON CHAIRS", "Daily hair, nail & skin appointments (R220\u2013R650)"),
        ("2. PACKAGES", "Back-to-Campus & Graduation 4-guest bundles"),
        ("3. RETAIL KITS", "Sulphate-free hair kits & protective care bundles"),
        ("4. ACADEMY LABS", "Saturday braiding masterclasses & youth workshops"),
        ("5. EVENT BARS", "Graduation pop-up bars & residence activations"),
    ]
    rw = Inches(2.28)
    rgap = Inches(0.09)
    for i, (t, d) in enumerate(rev):
        x = Inches(0.85) + i * (rw + rgap)
        add_rect(s, x, Inches(5.76), rw, Inches(0.92), DARK2)
        add_rect(s, x, Inches(5.76), rw, Inches(0.05), COPPER if i % 2 == 0 else COPPER_LIGHT)
        add_text(s, x + Inches(0.1), Inches(5.84), rw - Inches(0.2), Inches(0.3),
                 t, 10.5, COPPER_PALE, bold=True)
        add_text(s, x + Inches(0.1), Inches(6.13), rw - Inches(0.2), Inches(0.52),
                 d, 9, TEXT_LIGHT, spacing=0.95)

    # =========================================================================
    # SLIDE 5 (04) - DEMAND GENERATION & ARTISAN TALENT PIPELINE
    # (Embodies the "Fuel": continuous client acquisition + youth talent intake)
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "04", "CLIENT DEMAND & ARTISAN TALENT PIPELINE",
               "Continuous campus client acquisition paired with structured youth stylist recruitment")
    journey = ["DISCOVER", "BOOK ONLINE", "20% DEPOSIT", "STUDIO CARE", "REBOOK & REFER"]
    jw = Inches(2.37)
    jgap = Inches(0.095)
    for i, j in enumerate(journey):
        x = Inches(0.55) + i * (jw + jgap)
        st = MSO_SHAPE.PENTAGON if i == 0 else MSO_SHAPE.CHEVRON
        sp = add_rect(s, x, Inches(1.48), jw, Inches(0.48),
                      COPPER if i % 2 == 0 else COPPER_LIGHT, shape=st)
        tf = sp.text_frame
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = j
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = TEXT_LIGHT if i % 2 == 0 else TEXT_DARK
        r.font.name = HEADING_FONT
    add_text(s, Inches(0.55), Inches(2.05), Inches(12.23), Inches(0.32),
             "High-density university corridors and targeted seasonal campaigns supply steady daily bookings across all 6 hubs.",
             11, MUTED, italic=True, align=PP_ALIGN.CENTER)
    add_card(s, Inches(0.55), Inches(2.48), Inches(6.0), Inches(3.82),
             "CAMPUS DEMAND & PROMO CAMPAIGNS", [
                 ("GLOW20 (20% Off):", "Headline Glow-Up privilege driving daily studio trials"),
                 ("CAMPUS20 (20% Off):", "Back-to-Campus hair treatment + gel manicure combo"),
                 ("WELCOME15 (15% Off):", "First-visit orientation & residence welcome offer"),
                 ("GLOW25 (25% Off):", "Monthly Student Beauty Days for mid-week chair fill"),
                 ("STUDY15 & CULTURE10:", "Exam study-break & heritage celebration campaigns"),
                 ("Multi-Channel Broadcasts:", "Instagram, TikTok, WhatsApp & built-in SMS/Email alerts"),
             ], accent=COPPER, body_size=10.8, body_spacing=5)
    add_card(s, Inches(6.78), Inches(2.48), Inches(6.0), Inches(3.82),
             "YOUTH ARTISAN INTAKE & ACADEMY PIPELINE", [
                 ("Jamestown & Winelands Sourcing:", "Identifying promising young stylists from local communities"),
                 ("Cohort 2025 (#HER-7600) Entry:", "R2,500 monthly fellow stipend removes barriers to training"),
                 ("7 Accredited Modules:", "Technical hair/nail/skin craft, hygiene, client care & finance"),
                 ("Saturday Braiding Labs (R850):", "Paid public masterclasses that spot top emerging talent"),
                 ("Supervised Chair Onboarding:", "Apprentices begin on consultations & prep before full chairs"),
                 ("Formal Contract Security:", "Signed learnership, fixed-term & permanent agreements"),
             ], accent=COPPER_LIGHT, body_size=10.8, body_spacing=5)
    add_text(s, Inches(0.55), Inches(6.48), Inches(12.23), Inches(0.4),
             "Dual Pipeline Advantage: Campus proximity fills chairs while the Academy continuously supplies trained stylists.",
             12, COPPER, bold=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 6 (05) - CAPACITY, RETENTION & MARGIN ACCELERATORS
    # (Embodies "Efficient Multipliers": digital automation, loyalty & bundles)
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "05", "CAPACITY, RETENTION & MARGIN ACCELERATORS",
               "Compounding client lifetime value, basket size and chair utilisation without adding fixed overhead")
    add_card(s, Inches(0.55), Inches(1.52), Inches(3.92), Inches(3.25),
             "1. DIGITAL SLOT AUTOMATION", [
                 "Bulk Availability Generator opens 1\u20138 weeks of conflict-free slots in one click",
                 "Atomic slot reservation prevents double-booking across stylists",
                 "Instant slot release on cancellation immediately re-opens bookable inventory",
                 "Automated 24h client reminders cut missed appointments",
                 "20% deposit + 50% late/no-show fee protects daily chair time",
             ], accent=COPPER, title_size=13.5, body_size=10.5, body_spacing=5)
    add_card(s, Inches(4.63), Inches(1.52), Inches(3.92), Inches(3.25),
             "2. HER CIRCLE 3-TIER LOYALTY", [
                 ("Community Member (0+ pts):", "Birthday privilege & member pricing"),
                 ("Campus Member (2,500+ pts):", "Priority exam-week slots & referral rewards"),
                 ("HER Circle VIP (4,000+ pts):", "Concierge booking & bundle perks"),
                 "Saved hair texture, curl pattern & allergy care profiles drive habitual 4-week rebooking",
             ], accent=COPPER_LIGHT, title_size=13.5, body_size=10.5, body_spacing=5)
    add_card(s, Inches(8.71), Inches(1.52), Inches(4.07), Inches(3.25),
             "3. BASKET & CHAIR LEVERAGE", [
                 "Take-home retail care kits (R260\u2013R420) lift single-visit ticket values by 35%+",
                 "Back-to-Campus (R540) & Graduation x4 (R1,600) bundles combine multiple services",
                 "Mentor + Apprentice chair pairing doubles throughput on 3-hour braiding bookings",
                 "Progressive 30%\u201350% commissions reward verified client satisfaction",
             ], accent=COPPER, title_size=13.5, body_size=10.5, body_spacing=5)

    add_rect(s, Inches(0.55), Inches(4.98), Inches(12.23), Inches(1.42), DARK)
    add_text(s, Inches(0.85), Inches(5.12), Inches(11.6), Inches(0.35),
             "COMPOUNDING VALUE FORMULA ACROSS EVERY CLIENT & CHAIR", 12.5, COPPER_LIGHT, bold=True)
    levers = ["ZERO-FRICTION BOOKING", "20% DEPOSIT SHIELD", "SAVED TEXTURE PROFILE", "RETAIL & BUNDLE UPSELL", "PEER REFERRAL LOOP"]
    lw = Inches(2.28)
    lgap = Inches(0.09)
    for i, lv in enumerate(levers):
        x = Inches(0.85) + i * (lw + lgap)
        sp = add_rect(s, x, Inches(5.55), lw, Inches(0.58),
                      COPPER if i % 2 == 0 else COPPER_LIGHT)
        tf = sp.text_frame
        tf.word_wrap = False
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = lv
        r.font.size = Pt(9.8)
        r.font.bold = True
        r.font.color.rgb = TEXT_LIGHT if i % 2 == 0 else TEXT_DARK
        r.font.name = HEADING_FONT
        if i < len(levers) - 1:
            add_text(s, x + lw + Emu(int(lgap / 2)) - Inches(0.065),
                     Inches(5.55), Inches(0.13), Inches(0.58),
                     "\u00d7", 15, COPPER_PALE, bold=True, align=PP_ALIGN.CENTER,
                     anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, Inches(0.55), Inches(6.55), Inches(12.23), Inches(0.38),
             "Each operational lever reinforces the others \u2014 turning single appointments into recurring, high-margin studio relationships.",
             11.5, MUTED, italic=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 7 (06) - THE HER PATHWAY & PROGRESSIVE CAREER MODEL
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "06", "THE HER PATHWAY & ARTISAN CAREER PROGRESSION",
               "Cohort 2025 (#HER-7600) \u2014 structured mentorship, R2,500 stipends & 30%\u201350% commission ladder")
    add_card(s, Inches(0.55), Inches(1.50), Inches(6.0), Inches(3.55),
             "COHORT 2025 FELLOWSHIP ARCHITECTURE", [
                 "7 accredited modules: technical craft, hygiene, client care & finance",
                 "R2,500 monthly fellow stipend during foundational learnership phase",
                 "10\u201360 structured monthly mentorship hours under Master Mentors",
                 "Supervised chair progression from consultations to full styling",
                 "Formal learnership, fixed-term & permanent artisan contracts (HER-CON-0001\u20130005)",
                 "Portfolio creation & Saturday academy masterclass leadership",
             ], accent=COPPER, body_size=11, body_spacing=5)
    add_card(s, Inches(6.78), Inches(1.50), Inches(6.0), Inches(3.55),
             "FIVE-STAGE COMMISSION & MENTORSHIP LADDER", [
                 ("LEARN (30% commission):", "Cohort 2025 Apprentice (Amahle Dube) \u2014 60h/mo mentorship"),
                 ("PRACTISE (35% commission):", "Supervised Nail & Beauty Artist (Lindiwe Mthembu) \u2014 45h/mo"),
                 ("EARN (40% commission):", "Young Stylist Fellow (Keisha Adams) \u2014 paid client chair"),
                 ("GROW (45% commission):", "Senior Protective Specialist (Zanele Khumalo) \u2014 braids & wigs"),
                 ("EMPOWER (50% commission):", "Master Stylist & Senior Mentor (Nomvula Dlamini) \u2014 educator"),
             ], accent=COPPER_LIGHT, body_size=11, body_spacing=6)
    add_text(s, Inches(0.55), Inches(5.22), Inches(12), Inches(0.35),
             "THE HER PATHWAY \u2014 TRACKED LIVE IN THE MASTER GOVERNANCE CONSOLE",
             11.5, MUTED, bold=True)
    add_pathway(s, Inches(5.58))
    add_text(s, Inches(0.55), Inches(6.32), Inches(12.23), Inches(0.5),
             "Every apprentice trained expands HER\u2019s skilled chair capacity, preparing home-grown leaders for new studio hubs.",
             12, TEXT_DARK, italic=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 8 (07) - MULTI-HUB EXPANSION & 6-STUDIO WESTERN CAPE FOOTPRINT
    # (Embodies "Growth": multi-hub network expansion & regional scale)
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "07", "REGIONAL EXPANSION & SIX-HUB STUDIO FOOTPRINT",
               "Scaling from the Jamestown Flagship across specialised Western Cape campus, wellness and event hubs")
    hubs_top = [
        ("1. FLAGSHIP STUDIO (JAMESTOWN)", [
            "4 White Heart, Jamestown 7600  |  Director: Chloe Laurent",
            "Full 21-service anchor studio & 5 pathway artisans",
            "Natural hair, knotless braids, wigs, nails, facials & retail",
        ], COPPER),
        ("2. TYGERVALLEY MEDICAL & CAMPUS HUB", [
            "Francie van Zijl Dr, Bellville 7530  |  Lead: Thabo Mokoena",
            "Tailored to health-science & clinical student schedules",
            "Express silk blowouts, clinical gel nails & evening slots",
        ], COPPER_LIGHT),
        ("3. RONDEBOSCH STUDENT SANCTUARY", [
            "Main Rd Student Precinct, 7700  |  Lead: Ayesha Pillay",
            "Southern Suburbs university beauty & fellowship hub",
            "Curl steam therapy, knotless braids & student bundles",
        ], COPPER),
    ]
    hubs_bot = [
        ("4. COETZENBURG WELLNESS & SKIN BAR", [
            "4 White Heart, Jamestown 7600  |  Lead: Pieter van der Merwe",
            "Dedicated botanical skin, brow & scalp sanctuary",
            "Express glow facials (R280) & rooibos scalp detox (R310)",
        ], COPPER_LIGHT),
        ("5. YOUNG STYLIST ACADEMY & TRAINING HUB", [
            "Bird St Creative Precinct, 7600  |  Lead: Naledi Khumalo",
            "Home of Cohort 2025 (#HER-7600) & SETA-aligned training",
            "Saturday braiding masterclasses (R850) & fellow intake",
        ], COPPER),
        ("6. WINELANDS BRIDAL & EVENTS COLLECTIVE", [
            "18 Dorp St Heritage Quarter, 7600  |  Lead: Riaan Botha",
            "Mobile styling bars beyond the physical salon chair",
            "Graduation pop-ups (R2,400), matric glam & bridal groups",
        ], COPPER_LIGHT),
    ]
    hw = Inches(3.95)
    hgap = Inches(0.19)
    for i, (htitle, hitems, hacc) in enumerate(hubs_top):
        x = Inches(0.55) + i * (hw + hgap)
        add_card(s, x, Inches(1.45), hw, Inches(1.98), htitle, hitems,
                 accent=hacc, title_size=11.5, body_size=9.8, body_spacing=3)
    for i, (htitle, hitems, hacc) in enumerate(hubs_bot):
        x = Inches(0.55) + i * (hw + hgap)
        add_card(s, x, Inches(3.58), hw, Inches(1.98), htitle, hitems,
                 accent=hacc, title_size=11.5, body_size=9.8, body_spacing=3)

    add_rect(s, Inches(0.55), Inches(5.72), Inches(12.23), Inches(1.12), DARK)
    add_text(s, Inches(0.82), Inches(5.82), Inches(11.6), Inches(0.30),
             "MULTI-YEAR ROLLOUT HORIZON (2026\u20132030)", 11.5, COPPER_LIGHT, bold=True)
    phases = [
        "STAGE 1: JAMESTOWN ANCHOR",
        "STAGE 2: 6 WESTERN CAPE HUBS",
        "STAGE 3: RETAIL & ACADEMY SCALE",
        "STAGE 4: NATIONAL CAMPUS NETWORK",
    ]
    pw = Inches(2.85)
    pgap = Inches(0.10)
    for i, ph in enumerate(phases):
        x = Inches(0.82) + i * (pw + pgap)
        st = MSO_SHAPE.PENTAGON if i == 0 else MSO_SHAPE.CHEVRON
        sp = add_rect(s, x, Inches(6.18), pw, Inches(0.48),
                      COPPER if i % 2 == 0 else COPPER_LIGHT, shape=st)
        tf = sp.text_frame
        tf.word_wrap = False
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = ph
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = TEXT_LIGHT if i % 2 == 0 else TEXT_DARK
        r.font.name = HEADING_FONT

    # =========================================================================
    # SLIDE 9 (08) - DIGITAL PLATFORM, GOVERNANCE & POPIA COMPLIANCE
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "08", "ENTERPRISE PLATFORM & POPIA GOVERNANCE",
               "Centralised multi-studio control center, role simulator and immutable compliance records")
    add_card(s, Inches(0.55), Inches(1.48), Inches(6.0), Inches(3.25),
             "LIVE PRODUCTION PLATFORM ARCHITECTURE", [
                 "Cloud-deployed at https://her-beauty-production.up.railway.app/",
                 "4-Step Client Booking: Service \u2192 Artisan \u2192 Time Slot \u2192 Confirm",
                 "Role-Based Portals: Platform Master, Studio Director, Artisan & Client",
                 "1-Click Studio Impersonation & 5-Persona Platform Simulator (/demo)",
                 "Live Server-Sent Events (SSE) for instant dashboard booking updates",
                 "Health (/health), readiness (/ready) & metrics (/metrics) observability",
             ], accent=COPPER, body_size=10.8, body_spacing=5)
    add_card(s, Inches(6.78), Inches(1.48), Inches(6.0), Inches(3.25),
             "EXECUTIVE GOVERNANCE & POPIA PROTECTION", [
                 "Master Control Center led by Director Mrs Monean N Jacobs (founder@herbeauty.co.za)",
                 "POPIA (Act 4 of 2013) consent capture for hair texture, skin & allergy notes",
                 "Digital Artisan Contract Register (HER-CON-0001\u20130005) with stipend tracking",
                 "Immutable Audit Trail (/audit) recording every booking, role & studio change",
                 "Automatic IP privacy redaction & password epoch session security",
                 "14-day unopened retail return & transparent booking policy enforcement",
             ], accent=COPPER_LIGHT, body_size=10.8, body_spacing=5)

    add_rect(s, Inches(0.55), Inches(4.95), Inches(12.23), Inches(1.82), DARK)
    add_text(s, Inches(0.85), Inches(5.10), Inches(11.6), Inches(0.35),
             "FOUR INTEGRATED STAKEHOLDER EXPERIENCES ON ONE PLATFORM", 12, COPPER_LIGHT, bold=True)
    portals = [
        ("PLATFORM MASTER", "/master  \u00b7  /demo  \u00b7  /audit\nCross-hub oversight, studio onboarding, pathway metrics & audit logs"),
        ("STUDIO DIRECTOR", "/dashboard (8 Tabs)\nBookings, 21 services, artisans, slots, specials, contracts & brand"),
        ("PATHWAY ARTISAN", "/dashboard & Public Showcase\nDaily chair schedule, commission tier, mentorship hours & ratings"),
        ("VIP & CAMPUS CLIENT", "/providers/:id/book & /my-bookings\n24/7 slot booking, promo codes, 20% deposit & HER Circle profile"),
    ]
    ptw = Inches(2.86)
    ptgap = Inches(0.09)
    for i, (ptitle, pdesc) in enumerate(portals):
        x = Inches(0.85) + i * (ptw + ptgap)
        add_rect(s, x, Inches(5.52), ptw, Inches(1.08), DARK2)
        add_rect(s, x, Inches(5.52), ptw, Inches(0.05), COPPER if i % 2 == 0 else COPPER_LIGHT)
        add_text(s, x + Inches(0.10), Inches(5.62), ptw - Inches(0.20), Inches(0.28),
                 ptitle, 10, COPPER_PALE, bold=True)
        add_text(s, x + Inches(0.10), Inches(5.90), ptw - Inches(0.20), Inches(0.62),
                 pdesc, 8.6, TEXT_LIGHT, spacing=1.02)

    # =========================================================================
    # SLIDE 10 (09) - UNIT ECONOMICS, TARGETS & MEASURABLE OUTCOMES
    # (Embodies "Performance and Results": concrete financial & social targets)
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, LINEN)
    add_header(s, "09", "UNIT ECONOMICS, FINANCIAL TARGETS & OUTCOMES",
               "Deposit-backed cash flow, diversified revenue mix and measurable 2026\u20132030 studio milestones")
    add_card(s, Inches(0.55), Inches(1.50), Inches(6.0), Inches(3.25),
             "UNIT ECONOMICS & REVENUE MIX TARGETS", [
                 ("Revenue Mix Target:", "55% Core Salon Chairs  \u00b7  18% Packages  \u00b7  12% Retail  \u00b7  8% Academy  \u00b7  7% Events"),
                 ("Deposit Cash Shield:", "20% upfront deposit (R44\u2013R480) collected online; <3% uncompensated no-show rate"),
                 ("Chair Productivity:", ">75% peak Friday\u2013Saturday station occupancy; >60% weekday campus utilisation"),
                 ("Basket Expansion:", "Retail kits (R260\u2013R420) & group bundles (R540\u2013R1,600) lift average ticket above R410"),
                 ("Controlled Operating Base:", "R2,500 fellow stipends + variable 30%\u201350% commissions tied to completed bookings"),
             ], accent=COPPER, body_size=10.5, body_spacing=5)
    add_card(s, Inches(6.78), Inches(1.50), Inches(6.0), Inches(3.25),
             "MEASURABLE COMMERCIAL & SOCIAL OUTCOMES", [
                 ("6 Active Western Cape Hubs:", "Operating Mon\u2013Fri (08:30\u201318:00) & Sat (09:00\u201316:00) with 24/7 online booking"),
                 ("Client Retention & Quality:", "4.9\u2605+ average studio rating, 65%+ 60-day rebooking rate & 1,500+ HER Circle members"),
                 ("Youth Career Impact:", "25+ young stylists trained annually; 85%+ progression into EARN, GROW & EMPOWER chairs"),
                 (" Mentorship Delivery:", "175+ structured monthly mentorship hours across Cohort 2025 fellows"),
                 ("100% Governance Integrity:", "Full POPIA client consent coverage & 100% signed artisan contract register"),
             ], accent=COPPER_LIGHT, body_size=10.5, body_spacing=5)

    add_rect(s, Inches(0.55), Inches(5.00), Inches(12.23), Inches(1.55), DARK)
    add_text(s, Inches(0.85), Inches(5.15), Inches(11.6), Inches(0.35),
             "PRICING TIERS & UPFRONT 20% DEPOSIT ECONOMICS (ZAR)", 12, COPPER_LIGHT, bold=True)
    econ = [
        ("EXPRESS NAILS & SKIN", "R220 \u2013 R280  |  20% Deposit: R44\u2013R56"),
        ("CORE NATURAL HAIR", "R310 \u2013 R550  |  20% Deposit: R62\u2013R110"),
        ("BRAIDS & ACADEMY LABS", "R620 \u2013 R850  |  20% Deposit: R124\u2013R170"),
        ("GROUP BUNDLES & EVENTS", "R950 \u2013 R2,400  |  20% Deposit: R190\u2013R480"),
    ]
    ew = Inches(2.86)
    egap = Inches(0.09)
    for i, (et, ed) in enumerate(econ):
        x = Inches(0.85) + i * (ew + egap)
        add_rect(s, x, Inches(5.58), ew, Inches(0.78), DARK2)
        add_rect(s, x, Inches(5.58), ew, Inches(0.05), COPPER if i % 2 == 0 else COPPER_LIGHT)
        add_text(s, x + Inches(0.12), Inches(5.68), ew - Inches(0.24), Inches(0.28),
                 et, 10.2, COPPER_PALE, bold=True)
        add_text(s, x + Inches(0.12), Inches(5.98), ew - Inches(0.24), Inches(0.32),
                 ed, 9.2, TEXT_LIGHT)
    add_text(s, Inches(0.55), Inches(6.66), Inches(12.23), Inches(0.32),
             "Trading Hours:  Mon\u2013Fri 08:30\u201318:00  |  Saturday 09:00\u201316:00  |  Live Platform: https://her-beauty-production.up.railway.app/",
             10.5, MUTED, italic=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 11 - CONCLUSION: WHY HER BEAUTY WINS (2026-2030)
    # =========================================================================
    s = prs.slides.add_slide(blank)
    set_bg(s, DARK)
    add_rect(s, 0, 0, Inches(0.18), SLIDE_H, COPPER)
    add_rect(s, Inches(0.18), 0, Inches(0.06), SLIDE_H, COPPER_LIGHT)
    add_text(s, Inches(1.0), Inches(0.55), Inches(8), Inches(0.4),
             "CONCLUSION  \u00b7  2026\u20132030", 14, COPPER_LIGHT, bold=True)
    add_text(s, Inches(1.0), Inches(0.95), Inches(8.5), Inches(0.7),
             "WHY HER BEAUTY WILL WIN", 34, TEXT_LIGHT, bold=True, font=HEADING_FONT)
    add_rect(s, Inches(1.0), Inches(1.75), Inches(2.2), Inches(0.045), COPPER)
    add_logo(s, Inches(11.3), Inches(0.45), Inches(1.1))
    wins = [
        ("1", "HIGH-IMPACT CORE MENU", "Focused on the vital hair, braid, nail & skin treatments that drive recurring campus demand."),
        ("2", "DISCIPLINED STUDIO DELIVERY", "21 standardised ZAR services, 4-step online booking & mentor-paired salon stations."),
        ("3", "DUAL DEMAND & TALENT INFLOW", "6 student-corridor hubs + Cohort 2025 fellowship supplying skilled stylists."),
        ("4", "COMPOUNDING LOYALTY & BUNDLES", "20% deposit shield, 3-tier HER Circle care profiles & high-margin retail/group bundles."),
        ("5", "VERIFIED COMMERCIAL & SOCIAL IMPACT", "5 complementary income streams, 30%\u201350% artisan commissions & full POPIA governance."),
    ]
    yw = Inches(2.28)
    ygap = Inches(0.09)
    for i, (num, title, desc) in enumerate(wins):
        x = Inches(1.0) + i * (yw + ygap)
        add_rect(s, x, Inches(2.08), yw, Inches(2.38), DARK2,
                 shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s, x, Inches(2.08), yw, Inches(0.06), COPPER if i % 2 == 0 else COPPER_LIGHT)
        add_text(s, x + Inches(0.15), Inches(2.22), Inches(0.6), Inches(0.5),
                 num, 25, COPPER if i % 2 == 0 else COPPER_LIGHT, bold=True)
        add_text(s, x + Inches(0.15), Inches(2.75), yw - Inches(0.3), Inches(0.58),
                 title, 10.5, TEXT_LIGHT, bold=True, spacing=0.95)
        add_text(s, x + Inches(0.15), Inches(3.34), yw - Inches(0.3), Inches(1.05),
                 desc, 9.2, MUTED_LIGHT, spacing=0.98)

    add_text(s, Inches(1.0), Inches(4.70), Inches(11.33), Inches(0.4),
             "THE COMPLETE VALUE PROGRESSION", 12, COPPER_LIGHT, bold=True)
    vision_steps = ["CORE FOCUS", "STUDIO DELIVERY", "CAMPUS DEMAND", "LOYALTY & BUNDLES", "6-HUB NETWORK", "LASTING IMPACT"]
    vw = Inches(1.78)
    vgap = Inches(0.11)
    for i, v in enumerate(vision_steps):
        x = Inches(1.0) + i * (vw + vgap)
        st = MSO_SHAPE.PENTAGON if i == 0 else MSO_SHAPE.CHEVRON
        sp = add_rect(s, x, Inches(5.10), vw, Inches(0.48),
                      COPPER if i % 2 == 0 else COPPER_LIGHT, shape=st)
        tf = sp.text_frame
        tf.word_wrap = False
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = v
        r.font.size = Pt(9.2)
        r.font.bold = True
        r.font.color.rgb = TEXT_LIGHT if i % 2 == 0 else TEXT_DARK
        r.font.name = HEADING_FONT

    add_rect(s, Inches(1.0), Inches(5.92), Inches(11.33), Inches(0.03), COPPER)
    add_text(s, Inches(1.0), Inches(6.10), Inches(11.33), Inches(0.48),
             "A business built to create beauty, build careers and empower futures.",
             17, COPPER_PALE, bold=True, italic=True, align=PP_ALIGN.CENTER)
    add_text(s, Inches(1.0), Inches(6.62), Inches(11.33), Inches(0.42),
             "HER Beauty Studio & Social Enterprise  \u00b7  Mrs Monean N Jacobs  \u00b7  4 White Heart, Jamestown 7600  \u00b7  founder@herbeauty.co.za  \u00b7  https://her-beauty-production.up.railway.app/",
             10, MUTED_LIGHT, align=PP_ALIGN.CENTER)

    # Strictly enforce forbidden-terms guardrail
    assert_no_forbidden_terms(prs)

    # Save target file requested by user + keep existing paths updated
    target_path = os.path.join(REPO_DIR, "HER Beauty_Business_Plan.pptx")
    legacy_root_path = os.path.join(REPO_DIR, "HER_Business_Plan.pptx")
    legacy_pres_path = os.path.join(BASE_DIR, "HER_Business_Plan.pptx")

    prs.save(target_path)
    prs.save(legacy_root_path)
    prs.save(legacy_pres_path)
    print(f"Saved: {target_path} ({len(list(prs.slides))} slides)")
    print(f"Saved: {legacy_root_path} ({len(list(prs.slides))} slides)")
    print(f"Saved: {legacy_pres_path} ({len(list(prs.slides))} slides)")


if __name__ == "__main__":
    build_presentation()
