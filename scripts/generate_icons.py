"""Génère les icônes PWA et l'image Open Graph d'ObedGPT à partir du logo
(monogramme « G » blanc sur carré arrondi bleu cobalt, identique à
public/favicon.svg). Usage : python3 scripts/generate_icons.py"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
BLUE = (42, 79, 214)
SS = 4  # supersampling pour des bords nets


def draw_mark(size, scale=1.0, bg=True, radius=0.22, square=False):
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        if square:
            d.rectangle([0, 0, s, s], fill=BLUE)
        else:
            d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius), fill=BLUE)
    k = s / 100 * scale
    off = s * (1 - scale) / 2
    def P(x, y): return (off + x * k, off + y * k)
    cx, cy = P(50, 50)
    r = 21 * k
    w = max(1, int(8.5 * k))
    ro = r + w / 2  # PIL dessine le trait vers l'intérieur de la boîte
    d.arc([cx - ro, cy - ro, cx + ro, cy + ro], start=0, end=320, fill="white", width=w)
    # extrémités arrondies
    import math
    for ang in (0, 320):
        ex = cx + r * math.cos(math.radians(ang)); ey = cy + r * math.sin(math.radians(ang))
        d.ellipse([ex - w / 2, ey - w / 2, ex + w / 2, ey + w / 2], fill="white")
    x1, y1 = P(71, 50); x2, y2 = P(52, 50)
    d.line([x1, y1, x2, y2], fill="white", width=w)
    d.ellipse([x2 - w / 2, y2 - w / 2, x2 + w / 2, y2 + w / 2], fill="white")
    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    img.save(os.path.join(OUT, name)); print("✓", name, img.size)


save(draw_mark(192), "icon-192.png")
save(draw_mark(512), "icon-512.png")
save(draw_mark(192, scale=0.62, square=True), "icon-maskable-192.png")
save(draw_mark(512, scale=0.62, square=True), "icon-maskable-512.png")
save(draw_mark(180, square=True).convert("RGB"), "apple-touch-icon.png")

# Image Open Graph 1200x630
W, H = 1200, 630
og = Image.new("RGB", (W, H), (11, 11, 14))
d = ImageDraw.Draw(og)
for x in range(0, W, 48):
    d.line([x, 0, x, H], fill=(20, 20, 26))
for y in range(0, H, 48):
    d.line([0, y, W, y], fill=(20, 20, 26))
mark = draw_mark(168)
og.paste(mark, (96, 231), mark)
def font(name, size):
    for p in (f"/usr/share/fonts/opentype/inter/{name}.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()
d.text((300, 238), "ObedGPT", font=font("Inter-Bold", 92), fill=(237, 237, 240))
d.text((304, 352), "Assistant IA multimodal : chat, vision, audio, code.", font=font("Inter-Regular", 30), fill=(150, 150, 165))
d.text((304, 410), "obedgpt.vercel.app", font=font("Inter-Medium", 24), fill=(107, 140, 255))
og.save(os.path.join(OUT, "og-image.png")); print("✓ og-image.png")
