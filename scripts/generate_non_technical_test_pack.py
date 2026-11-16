"""
Generate Non-Technical PowerPoint Test Pack for HER Beauty (on BookingTrack Foundation)
Matches exact layout and look-and-feel of reference:
"2. CTP Now_Maths Feature_Test Pack.pptx"
- 16:9 widescreen format
- Screenshot card taking >= 60% of slide width with browser chrome frame and red circular attention callout
- Actionable steps in plain active voice
- High-contrast copper/linen "WHAT YOU SHOULD SEE" verification box
- Sign-off matrix table at the end
Output: "C:\\Users\\Ricardo Smart\\Desktop\\H E R\\test pack\\HER_Beauty_Non_Technical_Test_Pack.pptx"
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE

OUTPUT_DIR = r"C:\Users\Ricardo Smart\Desktop\H E R\test pack"
SCREENSHOT_DIR = os.path.join(OUTPUT_DIR, "screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Brand Color Palette (HER Beauty)
DARK = RGBColor(0x1F, 0x16, 0x14)          # Deep Espresso
DARK2 = RGBColor(0x2C, 0x1E, 0x1B)         # Lighter Espresso
COPPER = RGBColor(0x9E, 0x55, 0x40)        # Warm Copper Accent
COPPER_LIGHT = RGBColor(0xD4, 0x9B, 0x88)  # Light Copper
COPPER_PALE = RGBColor(0xE2, 0xB8, 0xAB)   # Champagne Copper
LINEN = RGBColor(0xFA, 0xF6, 0xF0)         # Soft Linen Background
CARD = RGBColor(0xFF, 0xFF, 0xFF)          # White Card
TEXT_DARK = RGBColor(0x24, 0x1B, 0x18)     # Dark Charcoal Text
TEXT_LIGHT = RGBColor(0xFA, 0xF6, 0xF0)    # Light Off-White Text
MUTED = RGBColor(0x7D, 0x6F, 0x6A)         # Muted Taupe
MUTED_LIGHT = RGBColor(0xB5, 0xA5, 0x9E)   # Muted Light Taupe
BORDER = RGBColor(0xE8, 0xDE, 0xD4)        # Soft border
RED_CALLOUT = RGBColor(0xD3, 0x2F, 0x2F)   # Red circle attention callout
GREEN_SUCCESS = RGBColor(0x2E, 0x7D, 0x32) # Verification Green
GOLD_BOX = RGBColor(0x8C, 0x4B, 0x37)      # Rich Copper-Gold Header

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
FONT_NAME = "Segoe UI"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DECK_LOGO = os.path.join(BASE_DIR, "..", "presentation", "her-logo-deck.png")
_MASTER_LOGO = os.path.join(BASE_DIR, "..", "her-logo-master.jpg")
LOGO_PATH = _DECK_LOGO if os.path.exists(_DECK_LOGO) else _MASTER_LOGO

def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_rect(slide, left, top, width, height, color, border_color=None, shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, left, top, width, height)
    sp.fill.solid()
    sp.fill.fore_color.rgb = color
    if border_color:
        sp.line.color.rgb = border_color
        sp.line.width = Pt(1)
    else:
        sp.line.fill.background()
    sp.shadow.inherit = False
    return sp

def add_text(slide, left, top, width, height, text, size, color,
             bold=False, font=FONT_NAME, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, italic=False):
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
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic
    run.font.name = font
    return box

def add_header(slide, number_str, category_kicker, title):
    # Top Espresso Bar
    add_rect(slide, 0, 0, SLIDE_W, Inches(1.15), DARK)
    add_rect(slide, 0, Inches(1.15), SLIDE_W, Inches(0.06), COPPER)
    
    # Left slide number badge
    add_rect(slide, Inches(0.55), Inches(0.28), Inches(0.58), Inches(0.58), COPPER)
    add_text(slide, Inches(0.55), Inches(0.28), Inches(0.58), Inches(0.58),
             number_str, 18, TEXT_LIGHT, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    
    # Title & Kicker
    add_text(slide, Inches(1.35), Inches(0.20), Inches(9.5), Inches(0.48),
             title, 24, TEXT_LIGHT, bold=True)
    add_text(slide, Inches(1.35), Inches(0.70), Inches(9.5), Inches(0.35),
             category_kicker.upper(), 11, COPPER_PALE, bold=True)
    
    # Right Logo
    if os.path.exists(LOGO_PATH):
        slide.shapes.add_picture(LOGO_PATH, Inches(11.85), Inches(0.20), width=Inches(0.85))

    # Standard Footer
    add_text(slide, Inches(0.55), Inches(7.12), Inches(9.0), Inches(0.3),
             "HER Beauty (on BookingTrack Enterprise Foundation)  |  Stakeholder Test Pack", 10, MUTED)
    add_text(slide, Inches(11.8), Inches(7.12), Inches(1.0), Inches(0.3),
             f"Page {number_str}", 10, MUTED, align=PP_ALIGN.RIGHT)

def add_test_slide(prs, num_str, kicker, title, screenshot_file, steps, what_you_see, highlight_rect=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, LINEN)
    add_header(slide, num_str, kicker, title)

    # -------------------------------------------------------------------------
    # LEFT / MAIN AREA: Screenshot (>= 60% of slide width = ~8.0 Inches)
    # -------------------------------------------------------------------------
    img_card_x = Inches(0.55)
    img_card_y = Inches(1.35)
    img_card_w = Inches(7.95)
    img_card_h = Inches(5.60)

    # Browser card background
    add_rect(slide, img_card_x, img_card_y, img_card_w, img_card_h, CARD, border_color=BORDER, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    # Browser top bar
    add_rect(slide, img_card_x, img_card_y, img_card_w, Inches(0.38), DARK2)
    # Browser window indicator dots
    add_rect(slide, img_card_x + Inches(0.2), img_card_y + Inches(0.13), Inches(0.12), Inches(0.12), RGBColor(0xEF, 0x53, 0x50), shape=MSO_SHAPE.OVAL)
    add_rect(slide, img_card_x + Inches(0.4), img_card_y + Inches(0.13), Inches(0.12), Inches(0.12), RGBColor(0xFF, 0xCA, 0x28), shape=MSO_SHAPE.OVAL)
    add_rect(slide, img_card_x + Inches(0.6), img_card_y + Inches(0.13), Inches(0.12), Inches(0.12), RGBColor(0x66, 0xBB, 0x6A), shape=MSO_SHAPE.OVAL)
    # Browser address bar mockup
    add_rect(slide, img_card_x + Inches(0.9), img_card_y + Inches(0.08), img_card_w - Inches(1.1), Inches(0.22), DARK, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(slide, img_card_x + Inches(1.0), img_card_y + Inches(0.10), img_card_w - Inches(1.3), Inches(0.20),
             "https://her-beauty-production.up.railway.app  [Live Production]", 9, COPPER_PALE)

    # Insert Screenshot inside the card
    screenshot_path = os.path.join(SCREENSHOT_DIR, screenshot_file)
    if os.path.exists(screenshot_path):
        slide.shapes.add_picture(
            screenshot_path,
            img_card_x + Inches(0.08),
            img_card_y + Inches(0.38),
            width=img_card_w - Inches(0.16),
            height=img_card_h - Inches(0.46)
        )
    else:
        add_text(slide, img_card_x + Inches(0.5), img_card_y + Inches(2.5), img_card_w - Inches(1.0), Inches(1.0),
                 f"[Screenshot Placeholder: {screenshot_file}]", 14, MUTED, align=PP_ALIGN.CENTER)

    # Optional Red Circle Attention Callout
    if highlight_rect:
        hx, hy, hw, hh = highlight_rect
        # convert relative coordinates inside screenshot card
        actual_x = img_card_x + Inches(hx)
        actual_y = img_card_y + Inches(hy)
        circ = slide.shapes.add_shape(MSO_SHAPE.OVAL, actual_x, actual_y, Inches(hw), Inches(hh))
        circ.fill.background()
        circ.line.color.rgb = RED_CALLOUT
        circ.line.width = Pt(2.5)
        circ.shadow.inherit = False

    # -------------------------------------------------------------------------
    # RIGHT AREA: Instructions & Verification (~4.1 Inches wide)
    # -------------------------------------------------------------------------
    right_x = Inches(8.65)
    right_w = Inches(4.15)

    # "What To Check" Card
    steps_card_y = Inches(1.35)
    steps_card_h = Inches(3.35)
    add_rect(slide, right_x, steps_card_y, right_w, steps_card_h, CARD, border_color=BORDER, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(slide, right_x, steps_card_y, right_w, Inches(0.42), COPPER)
    add_text(slide, right_x + Inches(0.2), steps_card_y + Inches(0.10), right_w - Inches(0.4), Inches(0.25),
             "WHAT TO CHECK (STEP-BY-STEP)", 11, TEXT_LIGHT, bold=True)

    y_step = steps_card_y + Inches(0.55)
    for idx, (action, detail) in enumerate(steps, 1):
        # Step number badge
        add_rect(slide, right_x + Inches(0.2), y_step, Inches(0.30), Inches(0.30), DARK2, shape=MSO_SHAPE.OVAL)
        add_text(slide, right_x + Inches(0.2), y_step, Inches(0.30), Inches(0.30),
                 str(idx), 10, TEXT_LIGHT, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        # Action title
        add_text(slide, right_x + Inches(0.60), y_step - Inches(0.02), right_w - Inches(0.8), Inches(0.22),
                 action, 10.5, TEXT_DARK, bold=True)
        # Detail
        add_text(slide, right_x + Inches(0.60), y_step + Inches(0.18), right_w - Inches(0.8), Inches(0.38),
                 detail, 9.5, MUTED)
        y_step += Inches(0.65)

    # "What You Should See" Box (Gold / Copper Highlight)
    see_card_y = Inches(4.85)
    see_card_h = Inches(2.10)
    add_rect(slide, right_x, see_card_y, right_w, see_card_h, LINEN, border_color=COPPER, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(slide, right_x, see_card_y, right_w, Inches(0.38), GOLD_BOX)
    add_text(slide, right_x + Inches(0.2), see_card_y + Inches(0.08), right_w - Inches(0.4), Inches(0.25),
             "WHAT YOU SHOULD SEE", 11, TEXT_LIGHT, bold=True)

    add_text(slide, right_x + Inches(0.2), see_card_y + Inches(0.48), right_w - Inches(0.4), Inches(1.50),
             what_you_see, 10, TEXT_DARK)

    return slide

def build_presentation():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    # =========================================================================
    # SLIDE 1: Cover Slide
    # =========================================================================
    s1 = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s1, DARK)
    add_rect(s1, 0, Inches(7.15), SLIDE_W, Inches(0.35), COPPER)
    if os.path.exists(LOGO_PATH):
        s1.shapes.add_picture(LOGO_PATH, Inches(0.98), Inches(1.2), width=Inches(1.8))
    add_text(s1, Inches(0.98), Inches(2.50), Inches(11.0), Inches(0.35),
             "HER BEAUTY . HER STYLE . HER IDENTITY", 13, COPPER_LIGHT, bold=True)
    add_text(s1, Inches(0.98), Inches(2.95), Inches(11.0), Inches(1.10),
             "HER Beauty Platform Test Pack", 36, TEXT_LIGHT, bold=True)
    add_text(s1, Inches(0.98), Inches(4.15), Inches(11.0), Inches(0.45),
             "Stakeholder & Non-Technical Testing Guide", 20, COPPER_PALE)
    add_text(s1, Inches(0.98), Inches(4.70), Inches(11.0), Inches(0.40),
             "Your guide to validating appointments, studio branches, youth artisan pathways, and director governance.", 13, TEXT_LIGHT)
    add_text(s1, Inches(0.98), Inches(5.15), Inches(11.0), Inches(0.40),
             "What to check  |  What to expect  |  How to verify on the live system", 12, COPPER_LIGHT, bold=True)
    add_text(s1, Inches(0.98), Inches(6.10), Inches(11.0), Inches(0.35),
             "CONFIDENTIAL  |  Mrs Monean N Jacobs, Director  |  November 2026", 11, MUTED_LIGHT)

    # =========================================================================
    # SLIDE 2: How To Use Your Testing Guide
    # =========================================================================
    s2 = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s2, LINEN)
    add_header(s2, "02", "HOW TO USE", "Your Testing Guide")
    add_text(s2, Inches(0.98), Inches(1.40), Inches(11.3), Inches(0.40),
             "This pack shows you exactly what to test on the live platform. For each feature:", 14, TEXT_DARK)

    col_w = Inches(3.60)
    gap = Inches(0.35)

    # 3 Instruction Cards
    cards_data = [
        ("LOOK at the screen",
         "Each slide shows you what the screen should look like. Open your browser and compare what you see on screen with the screenshot provided.",
         COPPER),
        ("CHECK each item",
         "Follow the checklist of numbered steps. Click buttons, enter text, and navigate through the pages exactly as described.",
         COPPER_LIGHT),
        ("CONFIRM expectation",
         "The copper box tells you what should happen. If your screen matches the description, mark the test as passed. If not, note what went wrong.",
         DARK2)
    ]
    for i, (title, desc, accent) in enumerate(cards_data):
        cx = Inches(0.98) + i * (col_w + gap)
        add_rect(s2, cx, Inches(2.0), col_w, Inches(2.5), CARD, border_color=BORDER, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s2, cx, Inches(2.0), col_w, Inches(0.38), accent)
        add_text(s2, cx + Inches(0.2), Inches(2.08), col_w - Inches(0.4), Inches(0.25), title.upper(), 11, TEXT_LIGHT, bold=True)
        add_text(s2, cx + Inches(0.2), Inches(2.60), col_w - Inches(0.4), Inches(1.70), desc, 11, TEXT_DARK)

    # Access Card
    add_rect(s2, Inches(0.98), Inches(4.85), Inches(11.4), Inches(1.60), DARK, border_color=COPPER, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s2, Inches(1.3), Inches(5.05), Inches(10.8), Inches(0.30),
             "OPEN THE LIVE SYSTEM IN YOUR BROWSER:", 12, COPPER_LIGHT, bold=True)
    add_text(s2, Inches(1.3), Inches(5.40), Inches(10.8), Inches(0.40),
             "https://her-beauty-production.up.railway.app", 20, TEXT_LIGHT, bold=True)
    add_text(s2, Inches(1.3), Inches(5.90), Inches(10.8), Inches(0.30),
             "Supported Browsers: Microsoft Edge, Google Chrome, Safari, Firefox. No installation required.", 10, MUTED_LIGHT)

    # =========================================================================
    # SLIDE 3: [TEST 1] Public Studio Discovery & Search
    # =========================================================================
    add_test_slide(
        prs, "03", "STUDIO DISCOVERY", "Find a HER Beauty Studio",
        "01_home_browse.png",
        [
            ("Open Homepage", "Type https://her-beauty-production.up.railway.app in your browser."),
            ("Type Search Keyword", "Type 'Flagship' into the main search box."),
            ("Filter by Category", "Click the 'Skin, Facials & Scalp' filter button."),
            ("Inspect Studio Card", "Check the photo, address, and rating shown on the card.")
        ],
        "• The page displays 'HER Beauty — Flagship Studio' at 4 White Heart, Jamestown.\n"
        "• You see service categories, operating hours, and active 'Glow-Up' promotions.\n"
        "• Clicking any category instantly updates the list without reloading the page.",
        highlight_rect=(0.5, 1.2, 3.5, 1.2)
    )

    # =========================================================================
    # SLIDE 4: [TEST 2] Studio Profile & Service Menu
    # =========================================================================
    add_test_slide(
        prs, "04", "STUDIO PROFILE", "Explore Services, Rates & Artisans",
        "02_studio_profile.png",
        [
            ("Select Studio Card", "Click on the 'HER Beauty — Flagship Studio' card."),
            ("Review Services Menu", "Browse the 21 services across Hair, Nails, and Beauty."),
            ("Meet The Artisans", "Scroll down to 'Meet Our Artisans' (Nomvula, Zanele, Keisha)."),
            ("Click Book Button", "Click the brown 'Book an appointment' button.")
        ],
        "• You see clear pricing in South African Rand (e.g., Wash & Silk Blowout: R320).\n"
        "• Each artisan has a photo, biography, and HER Pathway tier badge.\n"
        "• The studio phone number (081 047 0327) and location map are clearly visible.",
        highlight_rect=(5.2, 1.5, 2.2, 0.8)
    )

    # =========================================================================
    # SLIDE 5: [TEST 3] Booking Appointment: Service & Artisan
    # =========================================================================
    add_test_slide(
        prs, "05", "BOOKING WIZARD", "Select Your Service & Stylist",
        "03_booking_service.png",
        [
            ("Choose Your Service", "Click on 'Wash, Deep Moisture Treatment & Silk Blowout'."),
            ("Continue to Stylist", "Click the 'Continue to Professional' button at bottom right."),
            ("Pick Preferred Stylist", "Choose 'Nomvula Dlamini' (Master Stylist & Senior Mentor)."),
            ("Continue to Date", "Click 'Continue to Date & Time' to open the calendar.")
        ],
        "• A blue tick appears on your selected service and price updates in the summary.\n"
        "• The breadcrumb bar at the top advances from 'Service' to 'Professional'.\n"
        "• The summary box on the right shows your selected service, duration, and price.",
        highlight_rect=(1.5, 1.8, 4.8, 1.1)
    )

    # =========================================================================
    # SLIDE 6: [TEST 4] Booking Confirmation: Promo Code & 20% Deposit
    # =========================================================================
    add_test_slide(
        prs, "06", "CONFIRMATION", "Promo Code, 20% Deposit & Consent",
        "05_booking_deposit.png",
        [
            ("Pick Date & Time Slot", "Choose an upcoming weekday and click '10:00 - 10:30'."),
            ("Enter Promo Code", "Type CAMPUS20 into the promo code box and click Apply."),
            ("Check 20% Deposit", "Verify that the 20% commitment deposit is calculated in Rand."),
            ("Tick Privacy Consent", "Tick the POPIA consent box and click 'Confirm & Reserve'.")
        ],
        "• A 20% discount is applied to your appointment total immediately.\n"
        "• The screen clearly shows the 20% deposit due and 80% balance due at the studio.\n"
        "• You receive an instant confirmation message with a unique booking reference.",
        highlight_rect=(4.5, 2.2, 3.2, 1.8)
    )

    # =========================================================================
    # SLIDE 7: [TEST 5] Executive Sign-In: Platform Master
    # =========================================================================
    add_test_slide(
        prs, "07", "SIGN IN", "Executive Sign-In as Platform Director",
        "06_login_screen.png",
        [
            ("Go to Sign In Page", "Click 'Sign in' in top navigation or go to /login."),
            ("Enter Director Email", "Type founder@herbeauty.co.za in the email box."),
            ("Enter Master Password", "Type ChangeMe123! in the password box."),
            ("Click Sign In Button", "Click the brown 'Sign in' button to submit.")
        ],
        "• You are signed in securely without any technical error messages.\n"
        "• A 'Master Control Center' button appears in the main navigation menu.\n"
        "• Your account name 'Mrs Monean N Jacobs' appears on the top bar.",
        highlight_rect=(2.2, 2.0, 3.5, 2.0)
    )

    # =========================================================================
    # SLIDE 8: [TEST 6] Master Control Center: Multi-Studio Health
    # =========================================================================
    add_test_slide(
        prs, "08", "MASTER CONTROL", "Oversee All 6 Studio Branches",
        "07_master_console.png",
        [
            ("Open Master Console", "Click 'Master Console' or go to /master."),
            ("Check 4 KPI Counters", "Confirm 'Active Businesses' = 6 and 'Total Bookings' >= 4."),
            ("Inspect Studio Branches", "Review the 6 branch cards (Flagship, Tygervalley, etc.)."),
            ("Verify Revenue Total", "Check that total platform revenue is formatted in Rand (R).")
        ],
        "• All 6 studio branches display green 'Active' badges.\n"
        "• You can see student fellow counts, bookings, and studio directors at a glance.\n"
        "• Clicking any studio card opens detailed management options for that branch.",
        highlight_rect=(0.8, 1.4, 6.5, 1.5)
    )

    # =========================================================================
    # SLIDE 9: [TEST 7] The HER Pathway: Artisan Progression Spine
    # =========================================================================
    add_test_slide(
        prs, "09", "YOUTH PATHWAY", "The HER Pathway: Learn to Empower",
        "07_master_console.png",
        [
            ("Scroll to Pathway Spine", "Locate 'The HER Pathway Progression' section."),
            ("Review the 5 Tiers", "Check LEARN, PRACTISE, EARN, GROW, and EMPOWER."),
            ("Check Artisan Names", "Verify Nomvula (EMPOWER), Zanele (GROW), Keisha (EARN)."),
            ("Inspect Apprentices", "Confirm Lindiwe (PRACTISE) and Amahle (LEARN).")
        ],
        "• The 5 progressive development stages are laid out from beginner to master mentor.\n"
        "• Each stylist shows their active tier badge, years of experience, and review rating.\n"
        "• Demonstrates the youth empowerment model in action across all studios.",
        highlight_rect=(0.8, 3.2, 6.5, 2.1)
    )

    # =========================================================================
    # SLIDE 10: [TEST 8] Platform Simulator: 1-Click Persona Testing
    # =========================================================================
    add_test_slide(
        prs, "10", "SIMULATOR", "Switch Roles with 1 Click",
        "09_platform_simulator.png",
        [
            ("Open Platform Simulator", "Navigate to /demo in your browser."),
            ("Choose Studio Manager", "Click 'Launch Simulator' next to Chloe Laurent."),
            ("Inspect Switched View", "Verify you are now viewing the Studio Director dashboard."),
            ("Return to Master Role", "Click the orange 'Stop Impersonating' banner at the top.")
        ],
        "• You can test what salon managers and student clients see without needing passwords.\n"
        "• An amber warning bar shows who you are currently previewing.\n"
        "• Clicking 'Stop Impersonating' returns you immediately to your Master Director role.",
        highlight_rect=(1.2, 1.8, 5.5, 2.2)
    )

    # =========================================================================
    # SLIDE 11: [TEST 9] Studio Operations: Flagship Daily Dashboard
    # =========================================================================
    add_test_slide(
        prs, "11", "STUDIO OPERATIONS", "Daily Appointments & Client Dispatch",
        "08_studio_dashboard.png",
        [
            ("Open Studio Dashboard", "Navigate to /dashboard as Studio Admin."),
            ("View Today's Calendar", "Inspect 'Today's Schedule' for upcoming client bookings."),
            ("Filter by Hair Stylist", "Select 'Nomvula Dlamini' from the staff dropdown filter."),
            ("Update Booking Status", "Click on an appointment to mark it as 'Completed'.")
        ],
        "• The dashboard displays real-time appointment bookings for today and this week.\n"
        "• The staff filter lets the manager view one stylist's chair schedule at a time.\n"
        "• Marking a booking as completed updates studio earnings immediately.",
        highlight_rect=(0.5, 1.4, 7.0, 3.5)
    )

    # =========================================================================
    # SLIDE 12: [TEST 10] Studio Governance: Stylist Contracts & POPIA
    # =========================================================================
    add_test_slide(
        prs, "12", "LEGAL & CONTRACTS", "Stylist Agreements & Youth Cohort Charter",
        "12_studio_contracts.png",
        [
            ("Go to Contracts Tab", "Click the 'Contracts & POPIA' tab on the dashboard."),
            ("Review Stylist Contracts", "Inspect agreements for Nomvula, Zanele, Keisha, etc."),
            ("Check Commission Rate", "Confirm 50% for Master Mentor, 40% for Fellows."),
            ("Open Cohort Agreement", "Review the Young Stylist Programme (Cohort 2025) agreement.")
        ],
        "• Legal agreements with commission splits and duties are securely stored.\n"
        "• Signed POPIA privacy consents are recorded for every staff member and apprentice.\n"
        "• All agreements show sign-off dates and Director Mrs Monean Jacobs' approval.",
        highlight_rect=(0.5, 1.5, 7.0, 3.5)
    )

    # =========================================================================
    # SLIDE 13: [TEST 11] Privacy & Immutable Audit Trail
    # =========================================================================
    add_test_slide(
        prs, "13", "AUDIT & PRIVACY", "POPIA Compliance & Protected Audit Trail",
        "10_audit_trail.png",
        [
            ("Open Audit Log", "Click 'Audit Trail' in the menu or navigate to /audit."),
            ("Filter by Activity", "Select 'Booking' from the event filter dropdown."),
            ("Check IP Address Privacy", "Verify that user IP addresses are masked (e.g. 196...)."),
            ("Inspect Audit Changes", "Click an event to view what changed before and after.")
        ],
        "• Every appointment, login, and contract change is permanently recorded.\n"
        "• Customer privacy is fully protected in compliance with South African POPIA law.\n"
        "• No user or employee can erase or tamper with past activity logs.",
        highlight_rect=(0.8, 1.8, 6.5, 3.2)
    )

    # =========================================================================
    # SLIDE 14: [TEST 12] Client Portal: My Bookings & HER Circle Loyalty
    # =========================================================================
    add_test_slide(
        prs, "14", "CLIENT PORTAL", "My Bookings & HER Circle Loyalty (4,850 Pts)",
        "11_client_bookings.png",
        [
            ("Open My Bookings", "Click your profile name and select 'My Bookings'."),
            ("View Upcoming Booking", "Confirm your scheduled appointment is shown with date & time."),
            ("Inspect Loyalty Card", "Check the 'HER Circle VIP' card showing 4,850 points."),
            ("Review VIP Benefits", "Confirm birthday gift, concierge support, and package perks.")
        ],
        "• Clients see their confirmed bookings with option to cancel if needed.\n"
        "• Cancelling an appointment automatically frees up the slot for other clients.\n"
        "• Loyalty points balance and VIP membership status are clearly shown.",
        highlight_rect=(0.8, 1.5, 6.5, 3.5)
    )

    # =========================================================================
    # SLIDE 15: Business Sign-Off Checklist & Acceptance Matrix
    # =========================================================================
    s15 = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s15, LINEN)
    add_header(s15, "15", "SIGN OFF", "Business Acceptance & Launch Checklist")
    add_text(s15, Inches(0.98), Inches(1.35), Inches(11.3), Inches(0.35),
             "Have you completed and verified all test cases? Tick each box below to confirm business sign-off.", 13, TEXT_DARK)

    # Table for Test Sign-Off
    table_shape = s15.shapes.add_table(11, 4, Inches(0.98), Inches(1.80), Inches(11.37), Inches(4.20))
    table = table_shape.table
    table.columns[0].width = Inches(1.20)
    table.columns[1].width = Inches(3.60)
    table.columns[2].width = Inches(4.77)
    table.columns[3].width = Inches(1.80)

    headers = ["TEST ID", "TEST CASE DESCRIPTION", "EXPECTED OUTCOME", "SIGN-OFF"]
    for c_idx, h in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = DARK
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT

    rows_data = [
        ("TEST 01", "Studio Directory & Search", "Search works, studios filter, Glow-Up specials shown", "[ ] PASS   [ ] FAIL"),
        ("TEST 02", "Studio Profile & 21 Services", "21 services in ZAR, operating hours, Meet Our Artisans", "[ ] PASS   [ ] FAIL"),
        ("TEST 03", "Booking Wizard (Service & Stylist)", "Service selected, breadcrumbs advance, summary updates", "[ ] PASS   [ ] FAIL"),
        ("TEST 04", "Booking Confirm & 20% Deposit", "CAMPUS20 gives 20% off, 20% deposit in Rand, POPIA consent", "[ ] PASS   [ ] FAIL"),
        ("TEST 05", "Platform Master Login", "founder@herbeauty.co.za logs in with ChangeMe123!", "[ ] PASS   [ ] FAIL"),
        ("TEST 06", "Master Control Center (6 Studios)", "6 active branches, total bookings, platform revenue in ZAR", "[ ] PASS   [ ] FAIL"),
        ("TEST 07", "The HER Pathway Spine", "5 progression tiers (LEARN -> EMPOWER) visible with fellows", "[ ] PASS   [ ] FAIL"),
        ("TEST 08", "Platform Simulator (1-Click)", "1-click launch as studio manager; safe return banner works", "[ ] PASS   [ ] FAIL"),
        ("TEST 09", "Studio Daily Schedule & Dispatch", "Flagship appointments visible; status updates to Completed", "[ ] PASS   [ ] FAIL"),
        ("TEST 10", "Artisan Contracts & POPIA", "Signed agreements, commission splits (30-50%), Cohort charter", "[ ] PASS   [ ] FAIL"),
    ]

    for r_idx, row in enumerate(rows_data, 1):
        for c_idx, val in enumerate(row):
            cell = table.cell(r_idx, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = CARD if r_idx % 2 == 0 else LINEN
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.size = Pt(9.5)
            p.font.color.rgb = TEXT_DARK
            if c_idx == 0:
                p.font.bold = True
                p.font.color.rgb = COPPER
            elif c_idx == 3:
                p.font.bold = True
                p.alignment = PP_ALIGN.CENTER

    # Sign-Off Banner
    add_rect(s15, Inches(0.98), Inches(6.15), Inches(11.37), Inches(0.85), DARK2, border_color=COPPER, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s15, Inches(1.2), Inches(6.25), Inches(10.9), Inches(0.28),
             "EXECUTIVE SIGN-OFF: All 10 key functional areas verified and approved for launch.", 11, TEXT_LIGHT, bold=True)
    add_text(s15, Inches(1.2), Inches(6.55), Inches(10.9), Inches(0.35),
             "Signed by: __________________________   Date: ____________________   Role: Platform Director", 10, COPPER_PALE)

    # Save
    out_path = os.path.join(OUTPUT_DIR, "HER_Beauty_Non_Technical_Test_Pack.pptx")
    prs.save(out_path)
    print(f"Non-technical Test Pack generated successfully: {out_path}")
    print(f"Total Slides: {len(prs.slides)}")

if __name__ == "__main__":
    build_presentation()
