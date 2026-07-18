#!/usr/bin/env python3
"""
Regenerate all app icons with official Whirlpool branding.
- Black "W" text on gold (#eeb111) background — matches whirlpool-bangladesh.com logo
- Glossy finish with subtle highlight (iOS-style)
- Maskable variant for Android PWA

Produces:
  - public/favicon-32.png       (32x32)
  - public/icon-192.png         (192x192, PWA)
  - public/icon-512.png         (512x512, PWA)
  - public/apple-touch-icon.png (180x180)
  - public/icon-512-maskable.png (512x512, full-bleed for Android)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Official Whirlpool brand colors
GOLD       = (238, 177, 17)         # #eeb111 — Whirlpool primary
GOLD_DARK  = (200, 145, 5)          # darker gold for edge
BLACK      = (15, 20, 35)           # near-black with slight navy
WHITE      = (255, 255, 255)

OUT_DIR = "/home/z/my-project/public"

def make_icon(size: int, maskable: bool = False) -> Image.Image:
    """Generate a glossy Whirlpool-branded icon with 'W' monogram."""
    # Use 4x supersampling for crisp downscale
    S = size * 4
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # Full-bleed gold background for Android maskable
        d.rectangle([0, 0, S, S], fill=GOLD)
    else:
        # Rounded square — gold background with darker gold border
        radius = int(S * 0.20)
        # Shadow/border ring
        d.rounded_rectangle([S*0.01, S*0.01, S*0.99, S*0.99], radius=radius, fill=GOLD_DARK)
        # Main gold face
        d.rounded_rectangle([S*0.04, S*0.04, S*0.96, S*0.96], radius=int(radius*0.88), fill=GOLD)

    # ═══ Glossy highlight (iOS-style) ═══
    # Top-half radial highlight — gives the glossy "wet" look
    highlight = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    # Large soft white gradient on top
    for r in range(int(S*0.55), 0, -4):
        alpha = int(70 * (1 - r / (S * 0.55)))
        hd.ellipse([S*0.25 - r, S*0.15 - r, S*0.75 + r, S*0.45 + r],
                   fill=(255, 255, 255, alpha))
    img = Image.alpha_composite(img, highlight)
    d = ImageDraw.Draw(img)

    # ═══ Bottom shadow for depth ═══
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for r in range(int(S*0.4), 0, -3):
        alpha = int(25 * (1 - r / (S * 0.4)))
        sd.ellipse([S*0.2 - r, S*0.85 - r*0.3, S*0.8 + r, S*0.95 + r*0.3],
                   fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img, shadow)
    d = ImageDraw.Draw(img)

    # ═══ "W" monogram (Whirlpool) ═══
    # Try to load a bold sans-serif font
    font = None
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, int(S * 0.58))
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    # Center the "W"
    text = "W"
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (S - tw) // 2 - bbox[0]
    y = (S - th) // 2 - bbox[1] - int(S * 0.03)

    # Subtle drop shadow under W (for depth)
    shadow_offset = max(3, int(S * 0.018))
    d.text((x + shadow_offset, y + shadow_offset), text,
           font=font, fill=(0, 0, 0, 50))
    # Main W — black (matches Whirlpool logo)
    d.text((x, y), text, font=font, fill=BLACK)

    # ═══ Glossy top reflection on W ═══
    # Add a thin white highlight on top half of W
    reflection = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = ImageDraw.Draw(reflection)
    # Clip to top half
    rd.rectangle([0, 0, S, S // 2], fill=(255, 255, 255, 40))
    img = Image.alpha_composite(img, reflection)

    # Downscale with LANCZOS for crisp output
    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    sizes = {
        "favicon-32.png":         (32, False),
        "icon-192.png":           (192, False),
        "icon-512.png":           (512, False),
        "apple-touch-icon.png":   (180, False),
        "icon-512-maskable.png":  (512, True),
    }
    for filename, (size, maskable) in sizes.items():
        img = make_icon(size, maskable=maskable)
        out = os.path.join(OUT_DIR, filename)
        img.save(out, "PNG", optimize=True)
        print(f"✓ {filename} ({size}x{size}{' maskable' if maskable else ''})")

    print("\n✅ All icons regenerated with Whirlpool branding (gold + black W)")
    print("   Glossy iOS-style finish with radial highlight + depth shadow")

if __name__ == "__main__":
    main()
