"""Génère les icônes PWA et l'image Open Graph d'ObedGPT à partir du logo :
une bulle de dialogue blanche renfermant une étincelle, sur tuile cobalt
(même dessin que public/favicon.svg et src/components/Logo.jsx).
Usage : python3 scripts/generate_icons.py"""
import os, math
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
TOP, BOT = (90, 125, 255), (28, 59, 184)
SS = 4


def bezier(p0, p1, p2, p3, n=24):
    pts = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        pts.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0],
                    u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    return pts


def bubble_points():
    cx, cy, r = 50, 48, 25
    pts = [(cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a))) for a in range(135, 461, 2)]
    pts += [(26, 80), pts[0]]
    return pts


def spark_points():
    segs = [((50,35.5),(51.4,42.6),(54.4,45.6),(61.5,48)), ((61.5,48),(54.4,50.4),(51.4,53.4),(50,60.5)),
            ((50,60.5),(48.6,53.4),(45.6,50.4),(38.5,48)), ((38.5,48),(45.6,45.6),(48.6,42.6),(50,35.5))]
    pts = []
    for s in segs: pts += bezier(*s)
    return pts


def mark(size, scale=1.0, bg=True, square=False, radius=0.23):
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    if bg:
        grad = Image.new("RGBA", (s, s))
        gd = ImageDraw.Draw(grad)
        for y in range(s):
            t = y / (s - 1)
            gd.line([(0, y), (s, y)], fill=tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3)) + (255,))
        hl = Image.new("RGBA", (s, s), (0, 0, 0, 0)); hd = ImageDraw.Draw(hl)
        for y in range(int(s * 0.55)):
            hd.line([(0, y), (s, y)], fill=(255, 255, 255, int(56 * (1 - y / (s * 0.55)))))
        grad = Image.alpha_composite(grad, hl)
        mask = Image.new("L", (s, s), 0)
        md = ImageDraw.Draw(mask)
        if square: md.rectangle([0, 0, s, s], fill=255)
        else: md.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius), fill=255)
        img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    k = s / 100 * scale; off = s * (1 - scale) / 2
    P = lambda p: (off + p[0] * k, off + p[1] * k)
    w = 6.5 * k
    pts = [P(p) for p in bubble_points()]
    d.line(pts, fill="white", width=int(w), joint="curve")
    for x, y in pts:
        d.ellipse([x - w/2, y - w/2, x + w/2, y + w/2], fill="white")
    d.polygon([P(p) for p in spark_points()], fill="white")
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
og = Image.new("RGB", (W, H), (8, 8, 12))
d = ImageDraw.Draw(og)
for x in range(0, W, 48): d.line([x, 0, x, H], fill=(16, 16, 22))
for y in range(0, H, 48): d.line([0, y, W, y], fill=(16, 16, 22))
m = mark(168); og.paste(m, (96, 231), m)
def font(name, size):
    for p in (f"/usr/share/fonts/opentype/inter/{name}.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()
d.text((300, 238), "ObedGPT", font=font("Inter-Bold", 92), fill=(237, 237, 240))
d.text((304, 352), "Assistant IA : chat, code et synthèse vocale.", font=font("Inter-Regular", 30), fill=(150, 150, 165))
d.text((304, 410), "obedgpt.vercel.app", font=font("Inter-Medium", 24), fill=(107, 140, 255))
og.save(os.path.join(OUT, "og-image.png")); print("✓ og-image.png")
