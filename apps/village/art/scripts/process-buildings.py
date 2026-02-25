#!/usr/bin/env python3
"""
process-buildings.py — Process AI-generated building sprites.

1. Load 512x512 PNG from ComfyUI output
2. Chroma-key green background → transparent alpha (HSV threshold)
3. Edge feather: dilate mask 1px, gaussian blur alpha
4. Auto-crop to bounding box + 4px padding
5. Scale to ~256px wide
6. Save to public/sprites/building-{id}.png

Also processes decoration assets (trees, bushes, lantern) with the same pipeline.
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent.parent
COMFYUI_OUTPUT = Path.home() / "ComfyUI" / "output"
SPRITE_DIR = PROJECT_DIR / "public" / "sprites"

# Buildings to process (pick best seed per building)
BUILDINGS = ["sanctum", "observatory", "workshop", "library", "fountain"]

# Decorations use the same pipeline
DECORATIONS = ["tree-1", "tree-2", "tree-3", "bush-1", "bush-2", "lantern"]

# Green screen HSV thresholds
GREEN_H_MIN, GREEN_H_MAX = 80, 160  # Hue range for green
GREEN_S_MIN = 80   # Minimum saturation
GREEN_V_MIN = 80   # Minimum value/brightness


def rgb_to_hsv(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB (0-255) to HSV (H: 0-360, S: 0-255, V: 0-255)."""
    r_f, g_f, b_f = r / 255.0, g / 255.0, b / 255.0
    mx = max(r_f, g_f, b_f)
    mn = min(r_f, g_f, b_f)
    diff = mx - mn

    # Hue
    if diff == 0:
        h = 0
    elif mx == r_f:
        h = (60 * ((g_f - b_f) / diff) + 360) % 360
    elif mx == g_f:
        h = (60 * ((b_f - r_f) / diff) + 120) % 360
    else:
        h = (60 * ((r_f - g_f) / diff) + 240) % 360

    # Saturation
    s = 0 if mx == 0 else (diff / mx) * 255

    # Value
    v = mx * 255

    return h, s, v


def chroma_key_green(img: Image.Image) -> Image.Image:
    """Remove green background using chroma-key with HSV thresholds."""
    img_rgba = img.convert("RGBA")
    pixels = np.array(img_rgba)
    r, g, b, a = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2], pixels[:,:,3]

    # Vectorized HSV conversion for green detection
    r_f = r.astype(float) / 255.0
    g_f = g.astype(float) / 255.0
    b_f = b.astype(float) / 255.0

    mx = np.maximum(np.maximum(r_f, g_f), b_f)
    mn = np.minimum(np.minimum(r_f, g_f), b_f)
    diff = mx - mn

    # Hue calculation (simplified — only need green range)
    hue = np.zeros_like(r_f)
    mask_g = (mx == g_f) & (diff > 0)
    hue[mask_g] = (60 * ((b_f[mask_g] - r_f[mask_g]) / diff[mask_g]) + 120) % 360
    mask_r = (mx == r_f) & (diff > 0) & ~mask_g
    hue[mask_r] = (60 * ((g_f[mask_r] - b_f[mask_r]) / diff[mask_r]) + 360) % 360
    mask_b = (mx == b_f) & (diff > 0) & ~mask_g & ~mask_r
    hue[mask_b] = (60 * ((r_f[mask_b] - g_f[mask_b]) / diff[mask_b]) + 240) % 360

    sat = np.where(mx > 0, (diff / mx) * 255, 0)
    val = mx * 255

    # Green detection mask
    is_green = (
        (hue >= GREEN_H_MIN) & (hue <= GREEN_H_MAX) &
        (sat >= GREEN_S_MIN) &
        (val >= GREEN_V_MIN)
    )

    # Set green pixels to transparent
    new_alpha = np.where(is_green, 0, 255).astype(np.uint8)
    pixels[:,:,3] = new_alpha

    return Image.fromarray(pixels)


def feather_edges(img: Image.Image, radius: int = 1) -> Image.Image:
    """Feather the alpha edges for smoother blending."""
    alpha = img.split()[3]
    # Slight gaussian blur on alpha channel
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius))
    img.putalpha(alpha)
    return img


def auto_crop(img: Image.Image, padding: int = 4) -> Image.Image:
    """Crop to bounding box of non-transparent pixels + padding."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    return img.crop((left, top, right, bottom))


def scale_to_width(img: Image.Image, target_width: int = 256) -> Image.Image:
    """Scale image to target width, preserving aspect ratio."""
    if img.width == 0:
        return img
    ratio = target_width / img.width
    new_height = int(img.height * ratio)
    return img.resize((target_width, new_height), Image.LANCZOS)


def find_best_image(prefix: str) -> Path | None:
    """Find the best (latest) ComfyUI output for a given prefix."""
    matches = sorted(COMFYUI_OUTPUT.glob(f"{prefix}*"))
    return matches[-1] if matches else None


def process_sprite(name: str, prefix_pattern: str, output_name: str) -> bool:
    """Process a single sprite through the chroma-key pipeline."""
    img_path = find_best_image(prefix_pattern)
    if img_path is None:
        print(f"  ⚠️  No image found for {prefix_pattern}")
        return False

    print(f"  📸 Processing {img_path.name}...")

    img = Image.open(img_path).convert("RGBA")
    img = chroma_key_green(img)
    img = feather_edges(img, radius=1)
    img = auto_crop(img, padding=4)
    img = scale_to_width(img, 256)

    out_path = SPRITE_DIR / f"{output_name}.png"
    img.save(out_path, "PNG")
    print(f"  ✅ {out_path.name} ({img.width}x{img.height})")
    return True


def main():
    print("🏗️  Processing building & decoration sprites\n")

    SPRITE_DIR.mkdir(parents=True, exist_ok=True)

    total = 0

    # Process buildings
    print("Buildings:")
    for building_id in BUILDINGS:
        # Try seed 42 first (best default)
        prefix = f"building-{building_id}-seed42"
        if process_sprite(building_id, prefix, f"building-{building_id}"):
            total += 1

    # Process decorations
    print("\nDecorations:")
    for deco_id in DECORATIONS:
        prefix = f"deco-{deco_id}-seed42"
        if process_sprite(deco_id, prefix, deco_id):
            total += 1

    print(f"\n✅ Processed {total} sprites → {SPRITE_DIR}")
    if total == 0:
        print("⚠️  No sprites processed. Run generation scripts first.")
        sys.exit(1)


if __name__ == "__main__":
    main()
