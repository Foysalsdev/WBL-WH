#!/usr/bin/env python3
"""
Regenerate all app icons with the gold/amber brand theme (#eeb111).
Replaces the old blue Whirlpool icons (#0c389f) with gold-yellow ones
matching the application's themeColor.

Produces:
  - public/favicon-32.png       (32x32)
  - public/icon-192.png         (192x192, PWA)
  - public/icon-512.png         (512x512, PWA)
  - public/apple-touch-icon.png (180x180)
"""
from PIL import Image, ImageDraw, ImageFont
import os
import math

# Brand palette
GOLD       = (238, 177, 17)        # #eeb111  primary brand
GOLD_DARK  = (200, 145, 5)         # darker gold for border
WHITE      = (255, 255, 255)
DARK_TEXT  = (28, 25, 23)          # stone-900 for "W" letter
BG_RADIAL  = (250, 215, 95)        # lighter gold for radial gradient center

OUT_DIR = "/home/z/my-project/public"

def make_icon(size: int, with_letter: bool = True, maskable: bool = False) -> Image.Image:
    """Generate a gold-themed icon with a 'W' monogram."""
    # Higher-res canvas for crisp downscale
    S = size * 4 if size <= 256 else size * 2
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Maskable icons need full bleed (no transparency) — use solid gold bg
    # Standard icons get a rounded square with subtle radial gradient
    if maskable:
        # Full-bleed gold background for maskable
        d.rectangle([0, 0, S, S], fill=GOLD)
        # Subtle radial highlight (lighter center)
        for r in range(S, 0, -8):
            t = r / S
            alpha = int(40 * (1 - t))
            overlay = Image.new("RGBA", (S, S), (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            od.ellipse([S//2 - r, S//2 - r, S//2 + r, S//2 + r],
                       fill=(255, 255, 255, alpha))
            img = Image.alpha_composite(img, overlay)
        d = ImageDraw.Draw(img)
    else:
        # Rounded square background with gold
        radius = int(S * 0.18)
        # Outer shadow ring (darker gold)
        d.rounded_rectangle([S*0.02, S*0.02, S*0.98, S*0.98], radius=radius, fill=GOLD_DARK)
        # Main face
        d.rounded_rectangle([S*0.05, S*0.05, S*0.95, S*0.95], radius=int(radius*0.85), fill=GOLD)
        # Radial highlight (top-left)
        for r in range(int(S*0.7), 0, -6):
            t = r / (S * 0.7)
            alpha = int(50 * (1 - t))
            overlay = Image.new("RGBA", (S, S), (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            od.ellipse([S*0.3 - r, S*0.25 - r, S*0.3 + r, S*0.25 + r],
                       fill=(255, 255, 255, alpha))
            img = Image.alpha_composite(img, overlay)
        d = ImageDraw.Draw(img)

    if with_letter:
        # Draw a stylized "W" — bold, slightly arched
        # Try system fonts; fall back to default
        font = None
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        ]
        for fp in font_paths:
            if os.path.exists(fp):
                try:
                    font = ImageFont.truetype(fp, int(S * 0.6))
                    break
                except Exception:
                    pass
        if font is None:
            font = ImageFont.load_default()

        # Compute centered position using textbbox
        text = "W"
        bbox = d.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = (S - tw) // 2 - bbox[0]
        y = (S - th) // 2 - bbox[1] - int(S * 0.02)

        # Subtle shadow under text
        shadow_offset = max(2, int(S * 0.015))
        d.text((x + shadow_offset, y + shadow_offset), text,
               font=font, fill=(0, 0, 0, 60))
        # Main text — dark stone color
        d.text((x, y), text, font=font, fill=DARK_TEXT)

        # Add a small underline accent under the W (gold bar like the brand)
        bar_w = int(S * 0.45)
        bar_h = max(3, int(S * 0.018))
        bar_x = (S - bar_w) // 2
        bar_y = y + th + int(S * 0.04)
        d.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h],
                            radius=bar_h // 2, fill=DARK_TEXT)

    # Downscale with LANCZOS for crisp output
    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Standard icons (rounded square, with W)
    sizes = {
        "favicon-32.png": (32, False, False),
        "icon-192.png":   (192, True, False),
        "icon-512.png":   (512, True, False),
        "apple-touch-icon.png": (180, True, False),
    }
    for filename, (size, with_letter, maskable) in sizes.items():
        img = make_icon(size, with_letter=with_letter, maskable=maskable)
        out = os.path.join(OUT_DIR, filename)
        img.save(out, "PNG", optimize=True)
        print(f"✓ {filename} ({size}x{size})")

    # Also produce a maskable variant for PWA install
    img = make_icon(512, with_letter=True, maskable=True)
    out = os.path.join(OUT_DIR, "icon-512-maskable.png")
    img.save(out, "PNG", optimize=True)
    print(f"✓ icon-512-maskable.png (512x512, full-bleed)")

    print("\nAll icons regenerated with gold theme (#eeb111).")

if __name__ == "__main__":
    main()
