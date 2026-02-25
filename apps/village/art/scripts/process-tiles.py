#!/usr/bin/env python3
"""
process-tiles.py — Process AI-generated tile textures into isometric diamond tiles.

1. Loads each 256x256 texture from ComfyUI output
2. Applies isometric diamond mask (128x64, 2x game resolution)
3. Generates 4 variants: 2 from AI generations, 2 from hue/brightness shifts
4. Saves to public/tiles/{zone-id}-{variant}.png
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent.parent
COMFYUI_OUTPUT = Path.home() / "ComfyUI" / "output"
OUTPUT_DIR = PROJECT_DIR / "public" / "tiles"

# Tile dimensions (2x game resolution for crispness)
TILE_W = 128  # game uses 64, we generate at 2x
TILE_H = 64   # game uses 32, we generate at 2x

ZONES = ["sanctum", "observatory", "town-square", "workshop", "library", "empty"]
SEEDS = [42, 123]


def create_diamond_mask(w: int, h: int) -> Image.Image:
    """Create an isometric diamond-shaped alpha mask."""
    mask = Image.new("L", (w, h), 0)
    pixels = mask.load()
    cx, cy = w / 2, h / 2
    for y in range(h):
        for x in range(w):
            # Diamond: |x - cx| / cx + |y - cy| / cy <= 1.0
            dx = abs(x - cx) / cx
            dy = abs(y - cy) / cy
            if dx + dy <= 1.0:
                # Feather the edges slightly
                dist = dx + dy
                if dist > 0.95:
                    alpha = int(255 * (1.0 - dist) / 0.05)
                else:
                    alpha = 255
                pixels[x, y] = alpha
    return mask


def find_generated_images(zone: str) -> list[Path]:
    """Find ComfyUI output images for a given zone."""
    images = []
    for seed in SEEDS:
        prefix = f"tile-{zone}-seed{seed}"
        # ComfyUI saves as prefix_00001_.png etc.
        matches = sorted(COMFYUI_OUTPUT.glob(f"{prefix}*"))
        if matches:
            images.append(matches[-1])  # Latest
        else:
            print(f"  ⚠️  No output found for {prefix}")
    return images


def crop_center(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Crop the center portion of an image."""
    w, h = img.size
    left = (w - target_w) // 2
    top = (h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def create_variant(img: Image.Image, variant_type: str) -> Image.Image:
    """Create a color/brightness variant of a tile."""
    if variant_type == "bright":
        enhancer = ImageEnhance.Brightness(img)
        return enhancer.enhance(1.15)
    elif variant_type == "warm":
        # Shift hue slightly warm
        arr = np.array(img)
        arr[:, :, 0] = np.clip(arr[:, :, 0].astype(int) + 8, 0, 255)  # Red +
        arr[:, :, 2] = np.clip(arr[:, :, 2].astype(int) - 5, 0, 255)  # Blue -
        return Image.fromarray(arr)
    elif variant_type == "cool":
        arr = np.array(img)
        arr[:, :, 0] = np.clip(arr[:, :, 0].astype(int) - 5, 0, 255)  # Red -
        arr[:, :, 2] = np.clip(arr[:, :, 2].astype(int) + 8, 0, 255)  # Blue +
        return Image.fromarray(arr)
    return img


def process_zone(zone: str, mask: Image.Image) -> int:
    """Process all tile variants for a zone. Returns count of tiles created."""
    images = find_generated_images(zone)
    if not images:
        print(f"  ⏭️  Skipping {zone} — no generated images found")
        return 0

    count = 0
    variants = []

    # Variant 0 & 1: From the two AI-generated seeds
    for img_path in images[:2]:
        img = Image.open(img_path).convert("RGB")
        # Crop center to tile dimensions
        tile = crop_center(img, TILE_W, TILE_H)
        variants.append(tile)

    # Variant 2: Brightness shift of first seed
    if variants:
        variants.append(create_variant(variants[0], "bright"))

    # Variant 3: Hue shift of second seed (or first if only one)
    base = variants[1] if len(variants) > 1 else variants[0]
    variants.append(create_variant(base, "warm"))

    # Ensure we have exactly 4
    while len(variants) < 4:
        variants.append(create_variant(variants[0], "cool"))

    # Apply diamond mask and save
    for i, tile in enumerate(variants[:4]):
        # Ensure tile is the right size
        if tile.size != (TILE_W, TILE_H):
            tile = tile.resize((TILE_W, TILE_H), Image.LANCZOS)

        # Apply diamond mask
        output = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        output.paste(tile, (0, 0))
        output.putalpha(mask)

        out_path = OUTPUT_DIR / f"{zone}-{i}.png"
        output.save(out_path, "PNG")
        count += 1
        print(f"  ✅ {out_path.name}")

    return count


def main():
    print("🔷 Processing tile textures into isometric diamonds\n")

    # Ensure output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Create the diamond mask (reused for all tiles)
    mask = create_diamond_mask(TILE_W, TILE_H)

    total = 0
    for zone in ZONES:
        print(f"📦 Zone: {zone}")
        total += process_zone(zone, mask)

    print(f"\n✅ Processed {total} tiles → {OUTPUT_DIR}")
    if total == 0:
        print("⚠️  No tiles processed. Run 'bun art/generate-tiles.ts' first.")
        sys.exit(1)


if __name__ == "__main__":
    main()
