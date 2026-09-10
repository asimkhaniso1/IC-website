"""Gate A preview: each picked keyframe composited the way the live hero shows it
(Home.tsx HeroSlider: image at opacity 60% over slate-900, then a left→right
gradient from-slate-900 via-slate-900/60 to-transparent), with the mobile crop
window (object-position 72%, x ≈ 53–79%) outlined.
"""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__)
KEYS = os.path.normpath(os.path.join(HERE, "..", "keyframes"))
PICKS = [
    ("K0b", "K0 · shot 1 start · Quality Material Selection"),
    ("K1b", "K1 · shot 1→2 · Jacquard Weaving"),
    ("K2d", "K2 · shot 2→3 · Precision Weaving"),
    ("K3b", "K3 · shot 3 end (match cut)"),
    ("K4a", "K4 · shot 4 start=end · High-Tech Narrow Textiles"),
    ("K5a", "K5 · shot 5→6 · Advanced Knitting"),
    ("K6b", "K6 · shot 6 end · Premium Tapes & Braids"),
]
W, H = 960, 536                  # 16:9 tile
SLATE_900 = (15, 23, 42)
MOBILE_L, MOBILE_R = 0.53, 0.79  # visible window on a 375×812 phone


def hero_treatment(img: Image.Image) -> Image.Image:
    img = img.convert("RGB").resize((W, H), Image.LANCZOS)
    base = Image.new("RGB", (W, H), SLATE_900)
    out = Image.blend(base, img, 0.6)             # opacity-60 over slate-900
    grad = Image.new("L", (W, 1))
    for x in range(W):                            # 1.0 → 0.6 → 0.0 alpha
        t = x / (W - 1)
        a = 1.0 - 0.8 * t if t <= 0.5 else 0.6 * (1 - (t - 0.5) / 0.5)
        grad.putpixel((x, 0), int(255 * a))
    mask = grad.resize((W, H))
    return Image.composite(Image.new("RGB", (W, H), SLATE_900), out, mask)


try:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
except OSError:
    font = ImageFont.load_default()

cols, rows = 2, 4
pad, label_h = 16, 34
sheet = Image.new("RGB", (cols * W + (cols + 1) * pad, rows * (H + label_h) + (rows + 1) * pad), (8, 12, 24))
draw = ImageDraw.Draw(sheet)

for n, (key, label) in enumerate(PICKS):
    c, r = n % cols, n // cols
    x0 = pad + c * (W + pad)
    y0 = pad + r * (H + label_h + pad)
    tile = hero_treatment(Image.open(os.path.join(KEYS, f"{key}.png")))
    sheet.paste(tile, (x0, y0 + label_h))
    draw.text((x0, y0 + 4), f"{key}  —  {label}", fill=(208, 226, 246), font=font)
    ml, mr = x0 + int(MOBILE_L * W), x0 + int(MOBILE_R * W)
    for yy in range(y0 + label_h, y0 + label_h + H, 12):   # dashed mobile window
        draw.line([(ml, yy), (ml, yy + 6)], fill=(245, 158, 11), width=2)
        draw.line([(mr, yy), (mr, yy + 6)], fill=(245, 158, 11), width=2)

# legend in the empty 8th cell
lx, ly = pad + 1 * (W + pad), pad + 3 * (H + label_h + pad) + label_h
draw.rectangle([lx, ly, lx + W, ly + H], outline=(40, 52, 80), width=2)
legend = [
    "Gate A — keyframe picks, shown with the live hero treatment",
    "(60% opacity over slate-900 + left→right gradient from Home.tsx)",
    "",
    "Amber dashes = mobile crop window (x 53–79%)",
    "Left ~45% stays dark behind the headline copy",
    "",
    "Chain: shot n animates K(n-1) → K(n)",
    "Shot 3→4 is a match cut; shot 4 runs K4a → K4a",
]
for i, line in enumerate(legend):
    draw.text((lx + 24, ly + 24 + i * 34), line, fill=(208, 226, 246), font=font)

out = os.path.join(KEYS, "gate-a-contact-sheet.jpg")
sheet.save(out, quality=88)
print("wrote", out, sheet.size)
