"""
stitch-panorama.py — Stitch 6 workstation vignettes into a 1920x1080 panorama

Uses gradient blending at panel edges for seamless transitions.
Outputs to apps/terrarium/public/scenes/terrarium-scene.png
"""

from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np

ART_DIR = Path(__file__).parent
WORKSTATION_DIR = ART_DIR / "workstations"
OUTPUT_PATH = ART_DIR.parent / "apps" / "terrarium" / "public" / "scenes" / "terrarium-scene.png"

# Agent order left to right
AGENTS = ["percy", "scout", "forge", "pixel", "sage", "relay"]

# Target panorama size
PANO_W, PANO_H = 1920, 1080

# Panel width in the final panorama (with overlap)
PANEL_W = 380  # 6 * 380 = 2280, so ~360px of total overlap for blending
OVERLAP = 60   # px of gradient blend between adjacent panels


def load_and_resize(agent_id: str) -> Image.Image:
    """Load a workstation vignette and resize to panel dimensions."""
    path = WORKSTATION_DIR / f"{agent_id}.png"
    if not path.exists():
        raise FileNotFoundError(f"Missing workstation: {path}")
    img = Image.open(path)
    # Resize to panel dimensions maintaining aspect ratio, then crop to fill
    target_h = PANO_H
    target_w = PANEL_W
    # Scale to fill height
    scale = target_h / img.height
    new_w = int(img.width * scale)
    img = img.resize((new_w, target_h), Image.LANCZOS)
    # Center crop to panel width
    if new_w > target_w:
        left = (new_w - target_w) // 2
        img = img.crop((left, 0, left + target_w, target_h))
    return img


def create_gradient_mask(width: int, height: int, overlap: int) -> Image.Image:
    """Create a left-to-right gradient mask for blending."""
    mask = Image.new("L", (width, height), 255)
    pixels = np.array(mask)
    # Left fade-in
    for x in range(overlap):
        alpha = int(255 * (x / overlap))
        pixels[:, x] = alpha
    # Right fade-out
    for x in range(overlap):
        alpha = int(255 * ((overlap - x) / overlap))
        pixels[:, width - overlap + x] = alpha
    return Image.fromarray(pixels)


def stitch_panorama():
    print("Loading workstation vignettes...")
    panels = []
    for agent_id in AGENTS:
        panel = load_and_resize(agent_id)
        panels.append(panel)
        print(f"  {agent_id}: {panel.size}")

    # Create the panorama canvas
    pano = Image.new("RGB", (PANO_W, PANO_H), (10, 10, 15))

    # Calculate panel positions (evenly spaced with overlap)
    spacing = (PANO_W - PANEL_W) / (len(panels) - 1)

    print(f"\nStitching {len(panels)} panels (spacing: {spacing:.0f}px, overlap: {OVERLAP}px)...")

    for i, panel in enumerate(panels):
        x = int(i * spacing)

        if i == 0:
            # First panel: no left blend
            mask = Image.new("L", panel.size, 255)
            pixels = np.array(mask)
            # Right fade
            for rx in range(OVERLAP):
                alpha = int(255 * ((OVERLAP - rx) / OVERLAP))
                pixels[:, PANEL_W - OVERLAP + rx] = alpha
            mask = Image.fromarray(pixels)
        elif i == len(panels) - 1:
            # Last panel: no right blend
            mask = Image.new("L", panel.size, 255)
            pixels = np.array(mask)
            # Left fade
            for lx in range(OVERLAP):
                alpha = int(255 * (lx / OVERLAP))
                pixels[:, lx] = alpha
            mask = Image.fromarray(pixels)
        else:
            # Middle panels: both edges blend
            mask = create_gradient_mask(PANEL_W, PANO_H, OVERLAP)

        pano.paste(panel, (x, 0), mask)
        print(f"  Placed {AGENTS[i]} at x={x}")

    # Apply a subtle unified color grade to tie everything together
    print("\nApplying color grade...")
    # Slight blue tint for nighttime cohesion
    r, g, b = pano.split()
    r = ImageEnhance.Brightness(r).enhance(0.92)
    b = ImageEnhance.Brightness(b).enhance(1.08)
    pano = Image.merge("RGB", (r, g, b))

    # Slight contrast boost
    pano = ImageEnhance.Contrast(pano).enhance(1.05)

    # Save
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pano.save(OUTPUT_PATH, quality=95)
    print(f"\nPanorama saved to {OUTPUT_PATH}")
    print(f"Size: {pano.size}")


if __name__ == "__main__":
    stitch_panorama()
