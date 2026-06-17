"""Génère les icônes PWA d'ObedGPT (logo éclair sur dégradé orange),
à partir du même design que public/favicon.svg, en plusieurs résolutions
pour l'installation sur ordinateur, iOS et Android."""
from PIL import Image, ImageDraw
import math

OUT = "/home/claude/obedgpt/public"

C1 = (249, 115, 22)   # #F97316 (haut-gauche)
C2 = (234, 88, 12)    # #EA580C (bas-droite)

def gradient_bg(size, supersample=4):
    s = size * supersample
    img = Image.new("RGB", (s, s))
    px = img.load()
    for y in range(s):
        for x in range(s):
            t = (x + y) / (2 * s)
            r = int(C1[0] + (C2[0] - C1[0]) * t)
            g = int(C1[1] + (C2[1] - C1[1]) * t)
            b = int(C1[2] + (C2[2] - C1[2]) * t)
            px[x, y] = (r, g, b)
    return img.resize((size, size), Image.LANCZOS)

def bolt_path(size, scale=1.0, offset=(0, 0)):
    # Reprend exactement la forme du favicon.svg (viewBox 100x100):
    # M50 25 L65 45 L55 45 L55 75 L45 75 L45 45 L35 45 Z
    pts = [(50, 25), (65, 45), (55, 45), (55, 75), (45, 75), (45, 45), (35, 45)]
    ox, oy = offset
    return [((x / 100 * size) * scale + ox, (y / 100 * size) * scale + oy) for x, y in pts]

def rounded_mask(size, radius_ratio):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    return mask

def make_icon(size, rounded=True, radius_ratio=0.20, maskable=False, filename=None):
    bg = gradient_bg(size)
    draw = ImageDraw.Draw(bg)
    if maskable:
        # Zone de sécurité Android adaptive icons : contenu réduit et centré.
        scale = 0.6
        cx = size * (1 - scale) / 2
        cy = size * (1 - scale) / 2
        pts = bolt_path(size, scale=scale, offset=(cx, cy))
    else:
        pts = bolt_path(size)
    draw.polygon(pts, fill=(255, 255, 255))

    if rounded and not maskable:
        mask = rounded_mask(size, radius_ratio)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(bg, (0, 0), mask)
    else:
        out = bg.convert("RGBA")

    out.save(f"{OUT}/{filename}")
    print("✓", filename, out.size)

# Android / desktop PWA
make_icon(192, rounded=True, radius_ratio=0.20, filename="icon-192.png")
make_icon(512, rounded=True, radius_ratio=0.20, filename="icon-512.png")
# Maskable (Android adaptive icons) — plein cadre, l'OS applique son masque
make_icon(192, maskable=True, filename="icon-maskable-192.png")
make_icon(512, maskable=True, filename="icon-maskable-512.png")
# iOS — coins carrés (iOS applique lui-même l'arrondi), pas de transparence
make_icon(180, rounded=False, filename="apple-touch-icon.png")
