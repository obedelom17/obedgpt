"""Génère les icônes PWA et l'image Open Graph d'ObedGPT à partir du logo :
une bulle de dialogue en « O » avec un point jaune, sur tuile verte
(même dessin que public/favicon.svg et src/components/Logo.jsx).
Usage : python3 scripts/generate_icons.py"""
import os, math
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
GREEN, YELLOW = (14, 122, 92), (242, 176, 8)
SS = 4


def bubble_points():
    cx, cy, r = 50, 48, 25
    pts = [(cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a))) for a in range(135, 461, 2)]
    pts += [(26, 80), pts[0]]
    return pts


def mark(size, scale=1.0, bg=True, square=False, radius=0.23):
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    if bg:
        mask = Image.new("L", (s, s), 0)
        md = ImageDraw.Draw(mask)
        if square: md.rectangle([0, 0, s, s], fill=255)
        else: md.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius), fill=255)
        img.paste(Image.new("RGBA", (s, s), GREEN + (255,)), (0, 0), mask)
    d = ImageDraw.Draw(img)
    k = s / 100 * scale; off = s * (1 - scale) / 2
    P = lambda p: (off + p[0] * k, off + p[1] * k)
    w = 9 * k
    pts = [P(p) for p in bubble_points()]
    d.line(pts, fill="white", width=int(w), joint="curve")
    for x, y in pts:
        d.ellipse([x - w/2, y - w/2, x + w/2, y + w/2], fill="white")
    cx, cy = P((50, 48)); rr = 7 * k
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=YELLOW)
    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    img.save(os.path.join(OUT, name)); print("✓", name, img.size)


save(mark(192), "icon-192.png")
save(mark(512), "icon-512.png")
save(mark(192, scale=0.62, square=True), "icon-maskable-192.png")
save(mark(512, scale=0.62, square=True), "icon-maskable-512.png")
save(mark(180, square=True).convert("RGB"), "apple-touch-icon.png")

# Open Graph 1200x630
W, H = 1200, 630
og = Image.new("RGB", (W, H), (11, 15, 13))
d = ImageDraw.Draw(og)
for x in range(0, W, 48): d.line([x, 0, x, H], fill=(18, 24, 21))
for y in range(0, H, 48): d.line([0, y, W, y], fill=(18, 24, 21))
m = mark(168); og.paste(m, (96, 231), m)
def font(name, size):
    for p in (f"/usr/share/fonts/opentype/inter/{name}.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()
d.text((300, 238), "ObedGPT", font=font("Inter-Bold", 92), fill=(233, 239, 235))
d.text((304, 352), "Assistant IA : chat, code et synthèse vocale.", font=font("Inter-Regular", 30), fill=(162, 173, 166))
d.text((304, 410), "obedgpt.vercel.app", font=font("Inter-Medium", 24), fill=(56, 211, 159))
og.save(os.path.join(OUT, "og-image.png")); print("✓ og-image.png")
