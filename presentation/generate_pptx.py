"""
HER - Business Plan Presentation Generator
Generates a 10-slide PowerPoint presentation (16:9) with a design that
respects the HER logo: warm copper / rose-gold metallic accents on
soft linen-ivory and deep espresso backgrounds, with clean modern type.
Output: presentation/HER_Business_Plan.pptx
"""

import os
import struct

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE

# ---------------------------------------------------------------------------
# DESIGN TOKENS  (derived from her-logo.png)
# ---------------------------------------------------------------------------
DARK = RGBColor(0x1F, 0x16, 0x14)        # deep espresso (dark slides / bands)
DARK2 = RGBColor(0x2C, 0x1E, 0x1B)       # lighter espresso (dark cards)
COPPER = RGBColor(0x9E, 0x55, 0x40)      # rose-gold / copper (primary accent)
COPPER_LIGHT = RGBColor(0xD4, 0x9B, 0x88)  # light copper
COPPER_PALE = RGBColor(0xE2, 0xB8, 0xAB)   # pale champagne copper
LINEN = RGBColor(0xFA, 0xF6, 0xF0)       # warm linen / ivory background
CARD = RGBColor(0xFF, 0xFF, 0xFF)        # white card
TEXT_DARK = RGBColor(0x24, 0x1B, 0x18)   # dark text
TEXT_LIGHT = RGBColor(0xFA, 0xF6, 0xF0)  # light text
MUTED = RGBColor(0x7D, 0x6F, 0x6A)       # muted taupe
MUTED_LIGHT = RGBColor(0xB5, 0xA5, 0x9E)  # muted light taupe

HEADING_FONT = "Segoe UI"
BODY_FONT = "Segoe UI"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Prefer the slimmed deck asset (the master artwork is a ~2MB source image and
# would be embedded on every slide, bloating the .pptx by an order of magnitude).
_DECK_LOGO = os.path.join(BASE_DIR, "her-logo-deck.png")
_MASTER_LOGO = os.path.join(BASE_DIR, "..", "her-logo-master.jpg")
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
LOGO_ASPECT = _LOGO_W / float(_LOGO_H)  # width / height (measured, not assumed)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

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
             title, 26, TEXT_LIGHT, bold=True, font=HEADING_FONT)
    if subtitle:
        add_text(slide, Inches(1.35), Inches(0.72), Inches(9.6), Inches(0.35),
                 subtitle, 12, COPPER_PALE, italic=True)
    # logo chip on the right of the header band
    add_logo(slide, Inches(11.85), Inches(0.2), Inches(0.75))
    # footer
    add_text(slide, Inches(11.9), Inches(7.05), Inches(1.1), Inches(0.3),
             number, 11, MUTED, align=PP_ALIGN.RIGHT)
    add_text(slide, Inches(0.55), Inches(7.05), Inches(9.5), Inches(0.3),
             "HER  |  BUSINESS PLAN 2026\u20132030  |  https://her-beauty-production.up.railway.app/",
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


# ---------------------------------------------------------------------------
# PRESENTATION
# ---------------------------------------------------------------------------
prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H
blank = prs.slide_layouts[6]

# ===========================================================================
# SLIDE 1 - TITLE
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, DARK)
# decorative side band
add_rect(s, 0, 0, Inches(0.18), SLIDE_H, COPPER)
add_rect(s, Inches(0.18), 0, Inches(0.06), SLIDE_H, COPPER_LIGHT)
# top label
add_text(s, Inches(1.0), Inches(0.82), Inches(7.5), Inches(0.4),
         "BUSINESS PLAN  2026\u20132030  \u00b7  UPDATED SYSTEM EDITION", 14, COPPER_LIGHT, bold=True)
add_rect(s, Inches(1.0), Inches(1.28), Inches(2.5), Inches(0.045), COPPER)
# main title
add_text(s, Inches(1.0), Inches(1.62), Inches(7.5), Inches(1.25),
         "HER", 72, TEXT_LIGHT, bold=True, font=HEADING_FONT)
add_text(s, Inches(1.0), Inches(2.88), Inches(7.6), Inches(0.65),
         "BEAUTY STUDIO & SOCIAL ENTERPRISE", 23, COPPER_LIGHT, bold=True, font=HEADING_FONT)
# tagline & identity line
add_text(s, Inches(1.0), Inches(3.58), Inches(7.6), Inches(0.42),
         "Hair  \u2022  Nails  \u2022  Beauty   |   HER Beauty. HER Style. HER Identity.",
         15, COPPER_PALE, italic=True)
add_text(s, Inches(1.0), Inches(4.02), Inches(7.6), Inches(0.38),
         "Where beauty meets opportunity \u2014 and where young talent is given the space to grow.",
         12, MUTED_LIGHT)
# logo on a linen card, right side
add_logo(s, Inches(8.95), Inches(1.55), Inches(2.7))
# pathway strip
add_text(s, Inches(1.0), Inches(4.72), Inches(11), Inches(0.35),
         "THE HER PATHWAY  (SA HIGHER EDUCATION & SERVICES SETA ALIGNED #HER-7600)", 11, MUTED_LIGHT, bold=True)
add_pathway(s, Inches(5.08), left=Inches(1.0), total_width=Inches(11.33), dark_bg=True)
# bottom info bar
add_rect(s, Inches(1.0), Inches(6.12), Inches(11.33), Inches(0.03), COPPER)
add_text(s, Inches(1.0), Inches(6.30), Inches(6.2), Inches(0.38),
         "Founder & Director: Mrs Monean N Jacobs", 13.5, TEXT_LIGHT, bold=True)
add_text(s, Inches(1.0), Inches(6.68), Inches(6.8), Inches(0.38),
         "Flagship Studio: 4 White Heart, Jamestown 7600  \u00b7  081 047 0327",
         11.5, MUTED_LIGHT)
add_text(s, Inches(7.4), Inches(6.30), Inches(4.93), Inches(0.75),
         "6 Western Cape Hubs  \u00b7  21 Services  \u00b7  5 Revenue Streams\nOnline Booking  \u00b7  HER Circle Loyalty  \u00b7  POPIA Governance",
         11, COPPER_PALE, align=PP_ALIGN.RIGHT, spacing=1.15)

# ===========================================================================
# SLIDE 2 - EXECUTIVE SUMMARY
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "01", "EXECUTIVE SUMMARY",
           "Where beauty meets opportunity \u2014 commercial excellence paired with youth empowerment")
add_bullets(s, Inches(0.55), Inches(1.50), Inches(6.95), Inches(3.65), [
    ("Contemporary hair, nails & beauty enterprise",
     "headquartered at 4 White Heart, Jamestown 7600 with 6 active Western Cape hubs."),
    ("21 culturally responsive services (R220\u2013R2,400)",
     "spanning natural hair, knotless braiding, wigs, gel nails, glow facials, packages, retail & events."),
    ("Live digital booking & studio platform:",
     "4-step online appointment scheduling, 20% redeemable deposit protection, promo codes & live alerts."),
    ("Three-tier HER Circle loyalty ecosystem:",
     "Community Member, Campus Member (2,500+ pts) and HER Circle VIP (4,000+ pts) with care profiles."),
    ("Cohort 2025 Young Stylist Programme:",
     "structured mentorship, R2,500 fellow stipends and 30%\u201350% progressive artisan commissions."),
], size=12.5, spacing=8)
# right column: dual outcome cards
add_card(s, Inches(7.75), Inches(1.50), Inches(5.03), Inches(1.70),
         "COMMERCIAL SUSTAINABILITY", [
             "6 specialised hubs across Jamestown, Winelands & Cape Town",
             "5 diversified revenue streams + upfront 20% deposits",
             "High repeat frequency via HER Circle & campus specials",
         ], accent=COPPER, body_size=11)
add_card(s, Inches(7.75), Inches(3.38), Inches(5.03), Inches(1.72),
         "MEASURABLE SOCIAL IMPACT", [
             "Accredited #HER-7600 youth pathway & formal contracts",
             "Paid client work, mentorship hours & portfolio building",
             "Skills become income; talent becomes entrepreneurship",
         ], accent=COPPER_LIGHT, body_size=11)
# pathway
add_text(s, Inches(0.55), Inches(5.32), Inches(12), Inches(0.35),
         "THE HER PATHWAY: MOVING YOUNG ARTISANS FROM FOUNDATIONAL LEARNING TO STUDIO LEADERSHIP",
         11.5, MUTED, bold=True)
add_pathway(s, Inches(5.68))
add_text(s, Inches(0.55), Inches(6.38), Inches(12.23), Inches(0.45),
         "HER unites luxury, texture-inclusive care with enterprise governance, skills development and lasting community value.",
         12, TEXT_DARK, italic=True, align=PP_ALIGN.CENTER)

# ===========================================================================
# SLIDE 3 - PROBLEM & SOLUTION
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "02", "BUSINESS CONCEPT", "The market gap we solve \u2014 and our integrated studio + academy solution")
add_card(s, Inches(0.55), Inches(1.55), Inches(6.0), Inches(4.65),
         "THE MARKET PROBLEM", [
             "Students, clinical trainees & young professionals struggle to find reliable, transparent hair, nail and skin care under one roof.",
             "Conventional salons frequently lack technical mastery across coiled, natural, loc and protective hair textures.",
             "No-shows, manual WhatsApp scheduling and unclear pricing create friction for both clients and stylists.",
             "Talented emerging stylists lack structured salon chairs, formal contracts, mentorship and business training to build careers.",
         ], accent=COPPER, title_size=15.5, body_size=12, body_spacing=9)
add_card(s, Inches(6.78), Inches(1.55), Inches(6.0), Inches(4.65),
         "THE HER BEAUTY SOLUTION", [
             "Full-service Hair, Nails & Beauty studios anchored in Jamestown, Tygervalley, Rondebosch & Coetzenburg.",
             "Expert care across silk blowouts, loc rebalancing, knotless braids, lace wigs, gel overlays and botanical facials.",
             "Seamless online booking with real-time chair slots, promo validation (GLOW20 / CAMPUS20) and 20% deposit security.",
             "Embedded Young Stylist Academy & Cohort 2025 fellowship turning apprentices into 50%-commission senior mentors.",
             "Enterprise POPIA consent protection, formal artisan contracts and multi-studio executive oversight.",
         ], accent=COPPER_LIGHT, title_size=15.5, body_size=12, body_spacing=7)
add_text(s, Inches(0.55), Inches(6.42), Inches(12.23), Inches(0.45),
         "HER is where beauty meets opportunity \u2014 and where young talent is given the space to grow.",
         13, COPPER, bold=True, align=PP_ALIGN.CENTER)

# ===========================================================================
# SLIDE 4 - BRAND, VISION & MISSION
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "03", "THE HER BRAND",
           "HER Beauty. HER Style. HER Identity.  \u2014  Hair \u00b7 Nails \u00b7 Beauty")
pillars = [
    ("BEAUTY", "Professional hair, nail & skin treatments that help every client look and feel confident.", COPPER),
    ("CULTURE", "A contemporary identity celebrating diverse hair textures, heritage and self-expression.", COPPER_LIGHT),
    ("OPPORTUNITY", "A structured 5-stage pathway where emerging artisans gain paid chair time and business mastery.", COPPER),
    ("COMMUNITY", "Connecting Jamestown, Winelands campuses, Southern Suburbs students and local families.", COPPER_LIGHT),
]
pw = Inches(2.95)
gap = Inches(0.14)
for i, (title, desc, accent) in enumerate(pillars):
    x = Inches(0.55) + i * (pw + gap)
    add_card(s, x, Inches(1.55), pw, Inches(2.5), title, [desc],
             accent=accent, title_size=15, body_size=11.5, body_spacing=4)
# Vision & Mission band
add_rect(s, Inches(0.55), Inches(4.35), Inches(6.0), Inches(2.0), DARK)
add_rect(s, Inches(0.55), Inches(4.35), Inches(0.08), Inches(2.0), COPPER)
add_text(s, Inches(0.85), Inches(4.55), Inches(5.5), Inches(0.4),
         "VISION", 15, COPPER_LIGHT, bold=True)
add_text(s, Inches(0.85), Inches(4.95), Inches(5.5), Inches(1.3),
         "To be South Africa\u2019s leading student- and community-centred hair, nails and beauty brand that celebrates diversity, develops young talent and delivers exceptional studio experiences.",
         12, TEXT_LIGHT, spacing=1.05)
add_rect(s, Inches(6.78), Inches(4.35), Inches(6.0), Inches(2.0), DARK2)
add_rect(s, Inches(6.78), Inches(4.35), Inches(0.08), Inches(2.0), COPPER_LIGHT)
add_text(s, Inches(7.08), Inches(4.55), Inches(5.5), Inches(0.4),
         "MISSION", 15, COPPER_PALE, bold=True)
add_text(s, Inches(7.08), Inches(4.95), Inches(5.5), Inches(1.3),
         "To provide accessible, culturally responsive beauty services across physical hubs and digital booking channels while creating sustainable pathways into employment and entrepreneurship.",
         12, TEXT_LIGHT, spacing=1.05)
add_text(s, Inches(0.55), Inches(6.55), Inches(12.23), Inches(0.4),
         "Brand Associations:  Quality  \u00b7  Inclusion  \u00b7  Confidence  \u00b7  Skills  \u00b7  Opportunity",
         12, MUTED, italic=True, align=PP_ALIGN.CENTER)

# ===========================================================================
# SLIDE 5 - MARKET OPPORTUNITY & POSITIONING
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "04", "MARKET OPPORTUNITY & POSITIONING",
           "Strategic Western Cape footprint anchored in high-frequency student & community precincts")
add_card(s, Inches(0.55), Inches(1.55), Inches(3.9), Inches(3.05),
         "PRIMARY MARKET", [
             "Jamestown & Winelands student community",
             "Tygerberg health-science & clinical students",
             "Rondebosch Southern Suburbs university cohort",
             "Postgraduate & international students",
             "Young women & men seeking texture care",
         ], accent=COPPER, body_size=11, body_spacing=5)
add_card(s, Inches(4.6), Inches(1.55), Inches(3.9), Inches(3.05),
         "SECONDARY MARKET", [
             "Academic faculty & professional staff",
             "Jamestown, Winelands & Cape Town residents",
             "Graduation families, matric dances & bridal groups",
             "Aspiring stylists joining Saturday masterclasses",
             "Residences & societies booking event beauty bars",
         ], accent=COPPER_LIGHT, body_size=11, body_spacing=5)
add_card(s, Inches(8.65), Inches(1.55), Inches(4.13), Inches(3.05),
         "COMPETITIVE ADVANTAGES", [
             "6 tailored hubs matching academic & lifestyle routines",
             "Mastery across natural hair, braids, nails & skin",
             "Instant 24/7 online slot booking & transparent ZAR rates",
             "POPIA-protected texture & allergy client profiles",
             "Authentic youth-empowerment brand story",
         ], accent=COPPER, body_size=11, body_spacing=5)
# positioning formula band
add_rect(s, Inches(0.55), Inches(4.85), Inches(12.23), Inches(1.5), DARK)
add_text(s, Inches(0.85), Inches(5.05), Inches(11.6), Inches(0.4),
         "DIFFERENTIATION FORMULA", 13, COPPER_LIGHT, bold=True)
formula = ["6-HUB ACCESS", "CULTURAL MASTERY", "DIGITAL BOOKING", "YOUTH PATHWAY", "HER CIRCLE LOYALTY"]
fw = Inches(2.28)
fgap = Inches(0.09)
for i, f in enumerate(formula):
    x = Inches(0.85) + i * (fw + fgap)
    sp = add_rect(s, x, Inches(5.5), fw, Inches(0.55),
                  COPPER if i % 2 == 0 else COPPER_LIGHT)
    tf = sp.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = f
    r.font.size = Pt(10.5)
    r.font.bold = True
    r.font.color.rgb = TEXT_LIGHT if i % 2 == 0 else TEXT_DARK
    r.font.name = HEADING_FONT
    if i < len(formula) - 1:
        add_text(s, x + fw + Emu(int(fgap / 2)) - Inches(0.065),
                 Inches(5.5), Inches(0.13), Inches(0.55),
                 "+", 16, COPPER_PALE, bold=True, align=PP_ALIGN.CENTER,
                 anchor=MSO_ANCHOR.MIDDLE)
add_text(s, Inches(0.55), Inches(6.55), Inches(12.23), Inches(0.4),
         "High-frequency student demand anchors weekday utilisation while packages, training and events expand weekend margins.",
         11.5, MUTED, italic=True, align=PP_ALIGN.CENTER)

# ===========================================================================
# SLIDE 6 - SERVICES & REVENUE MODEL
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "05", "21-SERVICE CATALOG & FIVE REVENUE STREAMS",
           "Full Hair, Nails & Beauty menu in ZAR paired with diversified non-chair income")
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

# revenue band
add_rect(s, Inches(0.55), Inches(5.18), Inches(12.23), Inches(1.62), DARK)
add_text(s, Inches(0.85), Inches(5.32), Inches(11.6), Inches(0.38),
         "FIVE COMPLEMENTARY REVENUE STREAMS", 13, COPPER_LIGHT, bold=True)
rev = [
    ("1. SALON", "Core hair, nail & skin appointments (R220\u2013R650)"),
    ("2. PACKAGES", "Back-to-Campus & Graduation 4-guest bundles"),
    ("3. RETAIL", "Sulphate-free hair kits & protective care bundles"),
    ("4. TRAINING", "Saturday braiding masterclasses & youth workshops"),
    ("5. EVENTS", "Graduation pop-up bars & residence activations"),
]
rw = Inches(2.28)
rgap = Inches(0.09)
for i, (t, d) in enumerate(rev):
    x = Inches(0.85) + i * (rw + rgap)
    add_rect(s, x, Inches(5.76), rw, Inches(0.92), DARK2)
    add_rect(s, x, Inches(5.76), rw, Inches(0.05), COPPER if i % 2 == 0 else COPPER_LIGHT)
    add_text(s, x + Inches(0.1), Inches(5.84), rw - Inches(0.2), Inches(0.3),
             t, 11, COPPER_PALE, bold=True)
    add_text(s, x + Inches(0.1), Inches(6.13), rw - Inches(0.2), Inches(0.52),
             d, 9, TEXT_LIGHT, spacing=0.95)

# ===========================================================================
# SLIDE 7 - MARKETING, CAMPAIGNS & HER CIRCLE LOYALTY
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "06", "MARKETING, PROMO CAMPAIGNS & LOYALTY",
           "Live promotional codes, multi-channel broadcasts and the 3-tier HER Circle engine")
journey = ["DISCOVER", "BOOK ONLINE", "EXPERIENCE", "EARN POINTS", "REFER"]
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
    r.font.size = Pt(11.5)
    r.font.bold = True
    r.font.color.rgb = TEXT_LIGHT if i % 2 == 0 else TEXT_DARK
    r.font.name = HEADING_FONT
add_text(s, Inches(0.55), Inches(2.05), Inches(12.23), Inches(0.32),
         "Every online checkout validates live promo codes and automatically builds long-term client retention.",
         11, MUTED, italic=True, align=PP_ALIGN.CENTER)
add_card(s, Inches(0.55), Inches(2.48), Inches(6.0), Inches(3.82),
         "ACTIVE CAMPUS PROMO CAMPAIGNS", [
             ("GLOW20 (20% Off)", "\u2014 Headline Glow-Up privilege across studio services"),
             ("CAMPUS20 (20% Off)", "\u2014 Back-to-Campus hair treatment + manicure combo"),
             ("WELCOME15 (15% Off)", "\u2014 Orientation & first-visit studio welcome offer"),
             ("GLOW25 (25% Off)", "\u2014 Monthly Student Beauty Days (nails, brows & glow)"),
             ("STUDY15 & CULTURE10", "\u2014 Exam study-break & cultural celebration specials"),
         ], accent=COPPER, body_size=11, body_spacing=7)
add_card(s, Inches(6.78), Inches(2.48), Inches(6.0), Inches(1.75),
         "DIGITAL & STUDIO BROADCAST CHANNELS", [
             "Instagram, TikTok, Facebook & WhatsApp Business",
             "Built-in Studio Broadcast tool for instant email, SMS & in-app alerts to clients and artisans",
         ], accent=COPPER_LIGHT, body_size=11, body_spacing=5)
add_card(s, Inches(6.78), Inches(4.40), Inches(6.0), Inches(1.90),
         "3-TIER HER CIRCLE LOYALTY ECOSYSTEM", [
             ("Community Member (0+ pts):", "Birthday offer & member rates"),
             ("Campus Member (2,500+ pts):", "Referral rewards & priority slots"),
             ("HER Circle VIP (4,000+ pts):", "Bundle perks, concierge & saved texture/allergy care profile"),
         ], accent=COPPER, body_size=10.5, body_spacing=4)
add_text(s, Inches(0.55), Inches(6.48), Inches(12.23), Inches(0.4),
         "Goal: maximise repeat bookings, referral velocity, campus utilisation and client lifetime value.",
         12, COPPER, bold=True, align=PP_ALIGN.CENTER)

# ===========================================================================
# SLIDE 8 - YOUNG STYLIST PROGRAMME & SOCIAL IMPACT
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "07", "YOUNG STYLIST PROGRAMME & SOCIAL IMPACT",
           "Cohort 2025 (#HER-7600) \u2014 structured curriculum, stipends & progressive commissions")
add_card(s, Inches(0.55), Inches(1.50), Inches(6.0), Inches(3.55),
         "COHORT 2025 CURRICULUM & FELLOWSHIP", [
             "7 accredited modules: craft, hygiene, client care & finance",
             "R2,500 monthly fellow stipend during learnership phase",
             "10\u201360 structured monthly mentorship hours under Master Mentors",
             "Supervised chair progression from consultations to full styling",
             "Formal learnership, fixed-term & permanent artisan contracts",
             "Portfolio creation & Saturday academy masterclass leadership",
         ], accent=COPPER, body_size=11, body_spacing=5)
add_card(s, Inches(6.78), Inches(1.50), Inches(6.0), Inches(3.55),
         "PROGRESSIVE PATHWAY & COMMISSION TIERS", [
             ("LEARN (30% commission):", "Cohort 2025 Apprentice \u2014 60h/mo mentorship"),
             ("PRACTISE (35% commission):", "Supervised Chair Artisan \u2014 45h/mo mentorship"),
             ("EARN (40% commission):", "Young Stylist Fellow \u2014 paid client chair"),
             ("GROW (45% commission):", "Senior Specialist \u2014 braiding, skin & events lead"),
             ("EMPOWER (50% commission):", "Master Stylist, Educator & Studio Mentor"),
         ], accent=COPPER_LIGHT, body_size=11, body_spacing=6)
add_text(s, Inches(0.55), Inches(5.22), Inches(12), Inches(0.35),
         "THE HER PATHWAY \u2014 TRACKED LIVE IN THE MASTER GOVERNANCE CONSOLE",
         11.5, MUTED, bold=True)
add_pathway(s, Inches(5.58))
add_text(s, Inches(0.55), Inches(6.32), Inches(12.23), Inches(0.5),
         "Social impact is embedded directly into daily chair scheduling, contracts and remuneration \u2014 never an afterthought.",
         12, TEXT_DARK, italic=True, align=PP_ALIGN.CENTER)

# ===========================================================================
# SLIDE 9 - DIGITAL PLATFORM, GOVERNANCE & 6-HUB NETWORK
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "08", "DIGITAL PLATFORM, GOVERNANCE & STUDIO NETWORK",
           "Enterprise multi-studio booking, POPIA compliance and 6 active Western Cape hubs")
add_card(s, Inches(0.55), Inches(1.48), Inches(6.0), Inches(3.05),
         "DIGITAL BOOKING & STUDIO OPERATIONS", [
             "4-Step Client Booking: Service \u2192 Artisan \u2192 Time Slot \u2192 Confirm",
             "Booking Policy: 20% redeemable deposit, free 24h cancellation, 50% late/no-show protection & 10-min grace window",
             "Bulk Availability Generator with 14-day live open-slot calendars",
             "Studio Director Dashboards across Bookings, Services, Team, Specials & Brand visibility",
         ], accent=COPPER, body_size=10.8, body_spacing=5)
add_card(s, Inches(6.78), Inches(1.48), Inches(6.0), Inches(3.05),
         "EXECUTIVE GOVERNANCE & POPIA COMPLIANCE", [
             "Master Control Center for Director Mrs Monean N Jacobs & Co-Master",
             "1-click Studio Onboarding, Active/Suspended controls & Role Simulator",
             "POPIA (Act 4 of 2013) consent capture for hair, skin & allergy notes",
             "Digital Artisan Contract Register (HER-CON-0001\u20130005) & immutable activity history across every studio",
         ], accent=COPPER_LIGHT, body_size=10.8, body_spacing=5)

# 6-Hub Western Cape Network Band
add_rect(s, Inches(0.55), Inches(4.75), Inches(12.23), Inches(2.02), DARK)
add_text(s, Inches(0.82), Inches(4.88), Inches(11.6), Inches(0.35),
         "SIX PUBLISHED WESTERN CAPE STUDIO & CAMPUS HUBS", 12.5, COPPER_LIGHT, bold=True)
hubs = [
    ("1. FLAGSHIP STUDIO", "4 White Heart, Jamestown\n21 Services \u00b7 5 Pathway Artisans"),
    ("2. TYGERVALLEY HUB", "Bellville Medical Precinct\nClinical-Shift Hair & Gel Care"),
    ("3. RONDEBOSCH HUB", "Main Rd Student Quarter\nCurl Steam & Campus Bundles"),
    ("4. COETZENBURG BAR", "Jamestown Wellness Sanctuary\nGlow Facials & Rooibos Scalp"),
    ("5. STYLIST ACADEMY", "Bird St Creative Precinct\nCohort 2025 & Masterclasses"),
    ("6. BRIDAL & EVENTS", "18 Dorp St Heritage Quarter\nGraduation & Activation Bars"),
]
hw = Inches(1.89)
hgap = Inches(0.08)
for i, (htitle, hdesc) in enumerate(hubs):
    x = Inches(0.78) + i * (hw + hgap)
    add_rect(s, x, Inches(5.30), hw, Inches(1.28), DARK2)
    add_rect(s, x, Inches(5.30), hw, Inches(0.05), COPPER if i % 2 == 0 else COPPER_LIGHT)
    add_text(s, x + Inches(0.08), Inches(5.40), hw - Inches(0.16), Inches(0.32),
             htitle, 9.5, COPPER_PALE, bold=True)
    add_text(s, x + Inches(0.08), Inches(5.74), hw - Inches(0.16), Inches(0.76),
             hdesc, 8.5, TEXT_LIGHT, spacing=1.05)

# ===========================================================================
# SLIDE 10 - FINANCIAL STRATEGY & COMMERCIAL KPIS
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, LINEN)
add_header(s, "09", "FINANCIAL STRATEGY & PERFORMANCE FRAMEWORK",
           "Disciplined unit economics, deposit-backed cash flow and multi-tier KPI tracking")
add_card(s, Inches(0.55), Inches(1.50), Inches(6.0), Inches(3.25),
         "COST & REVENUE ARCHITECTURE", [
             ("Capital Setup:", "studio fit-out, styling stations, steam & nail tech, initial retail inventory and digital platform"),
             ("Operating Base:", "precinct lease, base stipends (R2,500/fellow), progressive commissions (30%\u201350%), botanical stock"),
             ("Cash-Flow Shield:", "automated 20% booking deposits + 50% late/no-show policy protect daily chair utilisation"),
             ("High-Margin Boosters:", "retail kits (R260\u2013R420), group packages (R1,600) and campus event bars (R2,400)"),
         ], accent=COPPER, body_size=10.8, body_spacing=5)
add_card(s, Inches(6.78), Inches(1.50), Inches(6.0), Inches(3.25),
         "GOVERNANCE & GROWTH KPIS", [
             ("Commercial KPIs:", "completed revenue per chair, average basket size, deposit collection & hub profitability"),
             ("Client KPIs:", "HER Circle tier upgrades, promo conversion (GLOW20 / CAMPUS20), rebooking rate & studio ratings (4.9+)"),
             ("Pathway KPIs:", "fellows in training, monthly mentorship hours delivered & stylists progressing into EARN/GROW/EMPOWER"),
             ("Compliance KPIs:", "100% POPIA consent coverage & signed artisan contracts"),
         ], accent=COPPER_LIGHT, body_size=10.8, body_spacing=5)

add_rect(s, Inches(0.55), Inches(5.00), Inches(12.23), Inches(1.55), DARK)
add_text(s, Inches(0.85), Inches(5.15), Inches(11.6), Inches(0.35),
         "ILLUSTRATIVE PRICING & DEPOSIT ECONOMICS ACROSS REVENUE TIERS", 12, COPPER_LIGHT, bold=True)
econ = [
    ("EXPRESS & NAILS", "R220 \u2013 R295  |  20% Deposit: R44\u2013R59"),
    ("CORE HAIR & GLAM", "R320 \u2013 R550  |  20% Deposit: R64\u2013R110"),
    ("PROTECTIVE & LABS", "R620 \u2013 R850  |  20% Deposit: R124\u2013R170"),
    ("GROUPS & EVENTS", "R950 \u2013 R2,400  |  20% Deposit: R190\u2013R480"),
]
ew = Inches(2.86)
egap = Inches(0.09)
for i, (et, ed) in enumerate(econ):
    x = Inches(0.85) + i * (ew + egap)
    add_rect(s, x, Inches(5.58), ew, Inches(0.78), DARK2)
    add_rect(s, x, Inches(5.58), ew, Inches(0.05), COPPER if i % 2 == 0 else COPPER_LIGHT)
    add_text(s, x + Inches(0.12), Inches(5.68), ew - Inches(0.24), Inches(0.28),
             et, 10.5, COPPER_PALE, bold=True)
    add_text(s, x + Inches(0.12), Inches(5.98), ew - Inches(0.24), Inches(0.32),
             ed, 9.2, TEXT_LIGHT)
add_text(s, Inches(0.55), Inches(6.66), Inches(12.23), Inches(0.32),
         "Trading Hours:  Mon\u2013Fri 08:30\u201318:00  |  Saturday 09:00\u201316:00  |  24/7 Online Self-Service Booking",
         10.5, MUTED, italic=True, align=PP_ALIGN.CENTER)

# ===========================================================================
# SLIDE 11 - WHY HER WILL WIN / CONCLUSION
# ===========================================================================
s = prs.slides.add_slide(blank)
set_bg(s, DARK)
add_rect(s, 0, 0, Inches(0.18), SLIDE_H, COPPER)
add_rect(s, Inches(0.18), 0, Inches(0.06), SLIDE_H, COPPER_LIGHT)
add_text(s, Inches(1.0), Inches(0.55), Inches(8), Inches(0.4),
         "CONCLUSION  \u00b7  2026\u20132030", 14, COPPER_LIGHT, bold=True)
add_text(s, Inches(1.0), Inches(0.95), Inches(8.5), Inches(0.7),
         "WHY HER WILL WIN", 34, TEXT_LIGHT, bold=True, font=HEADING_FONT)
add_rect(s, Inches(1.0), Inches(1.75), Inches(2.2), Inches(0.045), COPPER)
# logo chip top-right
add_logo(s, Inches(11.3), Inches(0.45), Inches(1.1))
wins = [
    ("1", "COMPLETE BEAUTY & TEXTURE CARE", "21 Hair, Nails & Beauty services tailored to diverse South African hair textures and lifestyles."),
    ("2", "STRATEGIC 6-HUB FOOTPRINT", "Jamestown Flagship plus Tygervalley, Rondebosch, Coetzenburg, Academy & Events hubs."),
    ("3", "ENTERPRISE DIGITAL PLATFORM", "Live 4-step booking, 20% deposit shield, promo campaigns, loyalty tiers & POPIA governance."),
    ("4", "AUTHENTIC YOUTH PATHWAY", "Cohort 2025 stipends, mentorship & 30%\u201350% commissions build real careers."),
    ("5", "BUILT FOR MULTI-CITY SCALE", "5 revenue streams and centralized Master Console ready for regional expansion."),
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
             title, 11, TEXT_LIGHT, bold=True, spacing=0.95)
    add_text(s, x + Inches(0.15), Inches(3.34), yw - Inches(0.3), Inches(1.05),
             desc, 9.3, MUTED_LIGHT, spacing=0.98)
# long-term vision line
add_text(s, Inches(1.0), Inches(4.70), Inches(11.33), Inches(0.4),
         "THE LONG-TERM GROWTH ROADMAP", 12, COPPER_LIGHT, bold=True)
vision_steps = ["SALON HUBS", "ACADEMY", "RETAIL", "EVENTS", "DIGITAL SCALE", "NATIONAL BRAND"]
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
    r.font.size = Pt(9.5)
    r.font.bold = True
    r.font.color.rgb = TEXT_LIGHT if i % 2 == 0 else TEXT_DARK
    r.font.name = HEADING_FONT
# closing statement
add_rect(s, Inches(1.0), Inches(5.92), Inches(11.33), Inches(0.03), COPPER)
add_text(s, Inches(1.0), Inches(6.10), Inches(11.33), Inches(0.48),
         "A business built to create beauty, build careers and empower futures.",
         17, COPPER_PALE, bold=True, italic=True, align=PP_ALIGN.CENTER)
add_text(s, Inches(1.0), Inches(6.62), Inches(11.33), Inches(0.42),
         "HER Beauty Studio & Social Enterprise  \u00b7  Mrs Monean N Jacobs  \u00b7  4 White Heart, Jamestown 7600  \u00b7  founder@herbeauty.co.za",
         10.5, MUTED_LIGHT, align=PP_ALIGN.CENTER)

# ---------------------------------------------------------------------------
# SAVE (both presentation/ and repository root)
# ---------------------------------------------------------------------------
out = os.path.join(BASE_DIR, "HER_Business_Plan.pptx")
root_out = os.path.abspath(os.path.join(BASE_DIR, "..", "HER_Business_Plan.pptx"))
prs.save(out)
prs.save(root_out)
print(f"Saved: {out}")
print(f"Saved: {root_out}")
print(f"Slides: {len(list(prs.slides))}")