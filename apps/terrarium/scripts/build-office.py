"""
build-office.py — Blender headless script to generate the Percival Labs
terrarium office environment as a single GLB file.

Usage:
    blender --background --python apps/terrarium/scripts/build-office.py

All coordinates are specified in Three.js space and converted internally.
The glTF exporter with export_yup=True maps Blender (x, y, z) -> glTF (x, z, -y).
To get Three.js position (tx, ty, tz): set Blender to (tx, -tz, ty).
For Three.js dimensions (w, h, d): set Blender scale to (w, d, h).
"""

import bpy
import math
import random
import os
import sys

# Deterministic randomness for reproducible book layouts
random.seed(42)

# ============================================================
# CONFIGURATION
# ============================================================

AGENTS = [
    {"id": "percy", "name": "Percy", "color": "#3b82f6", "position": [0, 0, -5]},
    {"id": "scout", "name": "Scout", "color": "#10b981", "position": [6, 0, -4]},
    {"id": "pixel", "name": "Pixel", "color": "#ec4899", "position": [-7, 0, -1]},
    {"id": "sage", "name": "Sage", "color": "#8b5cf6", "position": [6, 0, 1]},
    {"id": "forge", "name": "Forge", "color": "#f59e0b", "position": [-4, 0, 4]},
    {"id": "relay", "name": "Relay", "color": "#06b6d4", "position": [3, 0, 4]},
]

# Output path — relative to the Blender working directory (project root)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(PROJECT_DIR, "public", "models")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "office.glb")

# ============================================================
# COORDINATE HELPERS
# ============================================================

def tj_pos(tx, ty, tz):
    """Convert Three.js position (tx, ty, tz) to Blender position."""
    return (tx, -tz, ty)

def tj_dims(w, h, d):
    """Convert Three.js dimensions (width, height, depth) to Blender dimensions."""
    return (w, d, h)

# ============================================================
# MATERIAL FACTORY
# ============================================================

def hex_to_linear(hex_str):
    """Convert sRGB hex color to linear RGB tuple for Blender."""
    hex_str = hex_str.lstrip("#")
    r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
    # sRGB to linear conversion
    def srgb_to_linear(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b))

def create_material(name, color_hex, roughness=0.5, metallic=0.0,
                    emissive_hex=None, emissive_strength=0.0,
                    alpha=1.0):
    """Create a Principled BSDF material."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")

    r, g, b = hex_to_linear(color_hex)
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic

    if emissive_hex and emissive_strength > 0:
        er, eg, eb = hex_to_linear(emissive_hex)
        bsdf.inputs["Emission Color"].default_value = (er, eg, eb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emissive_strength

    if alpha < 1.0:
        mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else None
        bsdf.inputs["Alpha"].default_value = alpha
        mat.use_backface_culling = False

    return mat

# ============================================================
# PRE-BUILT MATERIALS
# ============================================================

def build_materials():
    """Create all shared materials and return as dict."""
    mats = {}
    # --- Warm illustrated cartoon palette ---
    mats["floor"] = create_material("Floor", "#D4A060", roughness=0.85)          # warm honey wood
    mats["wall"] = create_material("Wall", "#C0CCD8", roughness=0.9)             # soft blue-grey
    mats["ceiling"] = create_material("Ceiling", "#D8D4CC", roughness=0.95)      # warm light grey
    mats["beam"] = create_material("Beam", "#7A5A30", roughness=0.8)             # rich dark wood
    mats["desk"] = create_material("Desk", "#C08848", roughness=0.7)             # warm golden wood
    mats["desk_leg"] = create_material("DeskLeg", "#505050", roughness=0.5, metallic=0.4)
    # (chairs removed)
    mats["beanbag"] = create_material("Beanbag", "#9B6EC6", roughness=0.95)      # vivid purple
    mats["bookshelf"] = create_material("Bookshelf", "#8B6B42", roughness=0.8)   # warm wood
    mats["whiteboard"] = create_material("Whiteboard", "#F0F0F0", roughness=0.3)
    mats["whiteboard_frame"] = create_material("WhiteboardFrame", "#888888", metallic=0.3)
    mats["rug"] = create_material("Rug", "#3A6098", roughness=0.95)              # saturated blue
    mats["pot"] = create_material("Pot", "#CC6B30", roughness=0.8)               # vivid terracotta
    mats["plant"] = create_material("Plant", "#3A9030", roughness=0.9)           # vivid green
    mats["window_glass"] = create_material("WindowGlass", "#E8D8B0", roughness=0.1, metallic=0.0,
                                            emissive_hex="#FFE8B0", emissive_strength=2.5, alpha=0.25)
    mats["window_frame"] = create_material("WindowFrame", "#8A7A60", metallic=0.2, roughness=0.5)
    mats["lamp_base"] = create_material("LampBase", "#606060", roughness=0.4, metallic=0.4)
    mats["mug"] = create_material("Mug", "#F0E8E0", roughness=0.3)              # warm white
    # (LED strips removed)
    mats["wire"] = create_material("Wire", "#888888", roughness=0.8)

    # --- Additional prop materials (warm cartoon palette) ---
    mats["fridge"] = create_material("Fridge", "#E8E8E8", roughness=0.3, metallic=0.3)
    mats["fridge_handle"] = create_material("FridgeHandle", "#D0D0D0", roughness=0.2, metallic=0.5)
    mats["coffee_machine"] = create_material("CoffeeMachine", "#4A3A30", roughness=0.4, metallic=0.2)
    mats["coffee_pot"] = create_material("CoffeePot", "#A0B8B8", roughness=0.1, metallic=0.1, alpha=0.5)
    mats["coffee_liquid"] = create_material("CoffeeLiquid", "#5A3018", roughness=0.5)
    mats["counter"] = create_material("Counter", "#D8C8A8", roughness=0.6)
    mats["filing_cabinet"] = create_material("FilingCabinet", "#90A0B0", roughness=0.4, metallic=0.4)
    mats["water_cooler"] = create_material("WaterCooler", "#E0E0F0", roughness=0.3, metallic=0.1)
    mats["water_jug"] = create_material("WaterJug", "#D0E8F8", roughness=0.1, alpha=0.4)
    mats["coat_rack"] = create_material("CoatRack", "#7A5230", roughness=0.7)
    mats["coat"] = create_material("Coat", "#3A5068", roughness=0.9)
    mats["trash_can"] = create_material("TrashCan", "#888888", roughness=0.5, metallic=0.2)
    mats["printer"] = create_material("Printer", "#F0F0F0", roughness=0.4, metallic=0.1)
    mats["paper_stack"] = create_material("PaperStack", "#FFF8E8", roughness=0.95)
    mats["pencil_cup"] = create_material("PencilCup", "#CC7030", roughness=0.6)
    mats["pencil"] = create_material("Pencil", "#EED844", roughness=0.5)
    mats["clock_face"] = create_material("ClockFace", "#FFFFF0", roughness=0.3)
    mats["clock_frame"] = create_material("ClockFrame", "#5A5040", roughness=0.4, metallic=0.3)
    mats["poster_frame"] = create_material("PosterFrame", "#4A3A2A", roughness=0.4)
    mats["poster_art"] = create_material("PosterArt", "#7B6AAE", roughness=0.8)  # PL brand purple
    mats["sticky_note"] = [
        create_material("StickyYellow", "#FFE855", roughness=0.9),
        create_material("StickyPink", "#FF99BB", roughness=0.9),
        create_material("StickyBlue", "#88CCFF", roughness=0.9),
        create_material("StickyGreen", "#99DD88", roughness=0.9),
    ]
    mats["cabinet_top"] = create_material("CabinetTop", "#B0A088", roughness=0.6)
    mats["paper_tray"] = create_material("PaperTray", "#3A3A3A", roughness=0.4, metallic=0.4)

    # Book colors — vibrant for visual pop
    book_colors = ["#DD4444", "#4477DD", "#44BB66", "#EEBB44", "#AA55CC"]
    mats["books"] = []
    for i, c in enumerate(book_colors):
        mats["books"].append(create_material(f"Book_{i}", c, roughness=0.7))

    # String light bulb colors — warm incandescent (softer in daytime)
    bulb_colors = ["#ffee88", "#ffcc66", "#ffeedd", "#ffddaa", "#fff4cc"]
    mats["bulbs"] = []
    for i, c in enumerate(bulb_colors):
        mats["bulbs"].append(create_material(f"Bulb_{i}", c,
                                              emissive_hex=c, emissive_strength=1.5))

    return mats

# ============================================================
# GEOMETRY HELPERS
# ============================================================

def add_box(name, tj_position, tj_size, material):
    """Add a box using Three.js coordinates and dimensions."""
    tx, ty, tz = tj_position
    w, h, d = tj_size
    bpy.ops.mesh.primitive_cube_add(size=1, location=tj_pos(tx, ty, tz))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = tj_dims(w, h, d)
    obj.data.materials.append(material)
    return obj

def add_plane(name, tj_position, tj_size_xz, material, rotation_x=0):
    """Add a plane. tj_size_xz is (width, depth) in Three.js XZ plane."""
    tx, ty, tz = tj_position
    w, d = tj_size_xz
    bpy.ops.mesh.primitive_plane_add(size=1, location=tj_pos(tx, ty, tz))
    obj = bpy.context.active_object
    obj.name = name
    # A Blender plane lies in XY. For a floor (Three.js XZ plane),
    # scale X by width, Y by depth. No rotation needed because the
    # coordinate swap handles the floor orientation.
    obj.scale = (w, d, 1)
    obj.data.materials.append(material)
    return obj

def add_cylinder(name, tj_position, radius_top, radius_bottom, height, segments, material):
    """Add a cylinder/cone using Three.js coordinates."""
    tx, ty, tz = tj_position
    # Blender cylinder Z axis = Three.js Y axis after coordinate conversion
    bpy.ops.mesh.primitive_cone_add(
        vertices=segments,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=height,
        location=tj_pos(tx, ty, tz),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj

def add_cone(name, tj_position, radius, height, segments, material):
    """Add a cone (radius_top=0)."""
    return add_cylinder(name, tj_position, 0, radius, height, segments, material)

def add_sphere(name, tj_position, radius, segments, material):
    """Add a UV sphere."""
    tx, ty, tz = tj_position
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=segments // 2,
        radius=radius,
        location=tj_pos(tx, ty, tz),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj

def add_ring(name, tj_position, inner_radius, outer_radius, segments, material):
    """Add a ring/torus shape approximated as a mesh circle with solidify."""
    tx, ty, tz = tj_position
    # Use a torus with minor radius = (outer - inner) / 2
    minor_r = (outer_radius - inner_radius) / 2
    major_r = inner_radius + minor_r
    bpy.ops.mesh.primitive_torus_add(
        major_segments=segments,
        minor_segments=8,
        major_radius=major_r,
        minor_radius=minor_r,
        location=tj_pos(tx, ty, tz),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj

def add_circle(name, tj_position, radius, segments, material):
    """Add a filled circle (disc)."""
    tx, ty, tz = tj_position
    bpy.ops.mesh.primitive_circle_add(
        vertices=segments,
        radius=radius,
        fill_type="NGON",
        location=tj_pos(tx, ty, tz),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj

# ============================================================
# SCENE BUILDERS
# ============================================================

def build_room(mats):
    """Build floor, walls, ceiling, and beams."""
    print("  Building room...")

    # Floor — PlaneGeometry(24, 20) at position (0, 0, -1), rotation.x = -PI/2
    add_plane("Floor", (0, 0, -1), (24, 20), mats["floor"])

    # Back wall — BoxGeometry(24, 12, 0.3) at (0, 6, -11)
    add_box("BackWall", (0, 6, -11), (24, 12, 0.3), mats["wall"])

    # Left wall — BoxGeometry(0.3, 12, 20) at (-12, 6, -1)
    add_box("LeftWall", (-12, 6, -1), (0.3, 12, 20), mats["wall"])

    # Right wall — BoxGeometry(0.3, 12, 20) at (12, 6, -1)
    add_box("RightWall", (12, 6, -1), (0.3, 12, 20), mats["wall"])

    # Ceiling — PlaneGeometry(24, 20) at (0, 12, -1), faces DOWN (visible from inside room)
    # In v0.4: rotation.x = PI/2 makes it face down. Camera at y=14 is ABOVE ceiling at y=12,
    # so ceiling must face down → backface-culled from above → camera sees through to room.
    # Blender normal (0,0,-1) → glTF (0,-1,0) → faces down in Three.js.
    ceiling = add_plane("Ceiling", (0, 12, -1), (24, 20), mats["ceiling"])
    ceiling.rotation_euler[0] = math.pi  # Flip to face down

    # Ceiling beams — BoxGeometry(24, 0.4, 0.6) at (0, 11.8, i-1) for i in -8..8 step 4
    beam_idx = 0
    for i in range(-8, 9, 4):
        z = i - 1
        add_box(f"Beam_{beam_idx}", (0, 11.8, z), (24, 0.4, 0.6), mats["beam"])
        beam_idx += 1

def build_window(mats):
    """Build circular window on back wall."""
    print("  Building window...")
    radius = 2.2

    # Window frame ring
    ring = add_ring("WindowFrame", (0, 7, -10.8), radius - 0.15, radius + 0.15, 32, mats["window_frame"])
    # Orient ring to face forward (toward +Z in Three.js = -Y in Blender)
    ring.rotation_euler[0] = math.pi / 2

    # Glass disc
    glass = add_circle("WindowGlass", (0, 7, -10.79), radius - 0.15, 32, mats["window_glass"])
    glass.rotation_euler[0] = math.pi / 2

    # Horizontal cross bar — BoxGeometry(radius*2, 0.08, 0.1) at (0, 7, -10.78)
    add_box("WindowBarH", (0, 7, -10.78), (radius * 2, 0.08, 0.1), mats["window_frame"])

    # Vertical cross bar — BoxGeometry(0.08, radius*2, 0.1) at (0, 7, -10.78)
    add_box("WindowBarV", (0, 7, -10.78), (0.08, radius * 2, 0.1), mats["window_frame"])

def build_desk(mats, agent):
    """Build a desk with monitor, stand, lamp for one agent."""
    ax, _, az = agent["position"]
    name = agent["name"]
    color = agent["color"]
    print(f"  Building desk for {name}...")

    # Desktop surface — BoxGeometry(2.4, 0.12, 1.2) at (ax, 1.5, az)
    add_box(f"Desk_{name}", (ax, 1.5, az), (2.4, 0.12, 1.2), mats["desk"])

    # Legs — BoxGeometry(0.08, 1.5, 0.08)
    leg_offsets = [(-1.1, -0.5), (-1.1, 0.5), (1.1, -0.5), (1.1, 0.5)]
    for i, (ox, oz) in enumerate(leg_offsets):
        add_box(f"DeskLeg_{name}_{i}", (ax + ox, 0.75, az + oz), (0.08, 1.5, 0.08), mats["desk_leg"])

    # Monitor — BoxGeometry(1.0, 0.7, 0.06) at (ax, 2.2, az-0.4)
    monitor_mat = create_material(f"Monitor_{name}", "#111111",
                                   emissive_hex=color, emissive_strength=2.0,
                                   roughness=0.2, metallic=0.5)
    add_box(f"Monitor_{name}", (ax, 2.2, az - 0.4), (1.0, 0.7, 0.06), monitor_mat)

    # Monitor glow plane — PlaneGeometry(0.9, 0.6) at (ax, 2.2, az-0.36)
    glow_mat = create_material(f"MonitorGlow_{name}", color,
                                emissive_hex=color, emissive_strength=3.0, alpha=0.4)
    glow = add_plane(f"MonitorGlow_{name}", (ax, 2.2, az - 0.36), (0.9, 0.6), glow_mat)
    # Orient to face forward (+Z in Three.js)
    glow.rotation_euler[0] = math.pi / 2

    # Monitor stand — BoxGeometry(0.06, 0.35, 0.06) at (ax, 1.73, az-0.4)
    add_box(f"MonitorStand_{name}", (ax, 1.73, az - 0.4), (0.06, 0.35, 0.06), mats["desk_leg"])

    # Monitor base — BoxGeometry(0.4, 0.04, 0.2) at (ax, 1.56, az-0.4)
    add_box(f"MonitorBase_{name}", (ax, 1.56, az - 0.4), (0.4, 0.04, 0.2), mats["desk_leg"])

    # Desk lamp arm — CylinderGeometry(0.03, 0.03, 0.6, 6) at (ax+0.9, 1.86, az+0.1)
    arm = add_cylinder(f"LampArm_{name}", (ax + 0.9, 1.86, az + 0.1), 0.03, 0.03, 0.6, 6, mats["lamp_base"])
    # rotation.z = -0.3 in Three.js -> rotation around Y in Blender
    arm.rotation_euler[2] = -0.3

    # Lamp shade — ConeGeometry(0.18, 0.2, 8) at (ax+1.0, 2.15, az+0.1), rotation.x = PI (inverted)
    shade_mat = create_material(f"LampShade_{name}", color,
                                 emissive_hex=color, emissive_strength=1.0)
    shade = add_cylinder(f"LampShade_{name}", (ax + 1.0, 2.15, az + 0.1), 0.18, 0.0, 0.2, 8, shade_mat)
    # Flip upside down (cone tip up -> open end down)
    shade.rotation_euler[0] += math.pi

    # Keyboard placeholder — small dark box on desk
    add_box(f"Keyboard_{name}", (ax - 0.2, 1.58, az + 0.2), (0.5, 0.03, 0.2), mats["desk_leg"])

## Chairs removed

def build_bookshelf(mats):
    """Build bookshelf on right wall."""
    print("  Building bookshelf...")
    bx, bz = 11.5, -3  # Group position

    # Upright panels — BoxGeometry(0.1, 5, 0.8) at offsets -1.2, 0, 1.2
    for i, ox in enumerate([-1.2, 0, 1.2]):
        add_box(f"Bookshelf_Panel_{i}", (bx + ox, 2.5, bz), (0.1, 5, 0.8), mats["bookshelf"])

    # Shelves — BoxGeometry(2.4, 0.08, 0.8) at y = 0.5 to 4.5 step 1.0
    shelf_idx = 0
    for y in [0.5, 1.5, 2.5, 3.5, 4.5]:
        add_box(f"Bookshelf_Shelf_{shelf_idx}", (bx, y, bz), (2.4, 0.08, 0.8), mats["bookshelf"])
        shelf_idx += 1

    # Books on shelves
    book_idx = 0
    for y in [0.5, 1.5, 2.5, 3.5, 4.5]:
        book_x = -1.0
        for b in range(7):
            bw = 0.08 + random.random() * 0.08
            bh = 0.5 + random.random() * 0.4
            book_mat = mats["books"][b % len(mats["books"])]
            add_box(f"Book_{book_idx}", (bx + book_x + bw / 2, y + 0.08 + bh / 2, bz),
                    (bw, bh, 0.55), book_mat)
            book_x += bw + 0.04
            book_idx += 1

def build_whiteboard(mats):
    """Build whiteboard on left wall."""
    print("  Building whiteboard...")

    # Frame — BoxGeometry(0.1, 2.5, 4) at (-11.8, 5, -2)
    add_box("Whiteboard_Frame", (-11.8, 5, -2), (0.1, 2.5, 4), mats["whiteboard_frame"])

    # Board surface — BoxGeometry(0.05, 2.2, 3.7) at (-11.74, 5, -2)
    add_box("Whiteboard_Board", (-11.74, 5, -2), (0.05, 2.2, 3.7), mats["whiteboard"])

def build_beanbag(mats):
    """Build beanbag in back-left corner."""
    print("  Building beanbag...")

    # SphereGeometry(1.0, 8, 6) scaled (1, 0.5, 0.9) at (-10, 0.5, -8)
    bb = add_sphere("Beanbag", (-10, 0.5, -8), 1.0, 8, mats["beanbag"])
    # Three.js scale (1, 0.5, 0.9) -> Blender scale adjustment
    # In Blender coords: X stays X, Y becomes -Z (depth), Z becomes Y (height)
    # Three.js (sx=1, sy=0.5, sz=0.9) -> Blender (sx=1, sy=0.9, sz=0.5)
    bb.scale = (1, 0.9, 0.5)

def build_rug(mats):
    """Build floor rug."""
    print("  Building rug...")

    # PlaneGeometry(8, 6) at (0, 0.02, 0), rotation.x = -PI/2
    add_plane("Rug", (0, 0.02, 0), (8, 6), mats["rug"])

def build_plants(mats):
    """Build potted plants in corners."""
    print("  Building plants...")

    positions = [
        (-11, 0, 5),
        (11, 0, 5),
        (-11, 0, -7),
        (9, 0, -9),
    ]

    for i, (px, _, pz) in enumerate(positions):
        # Pot — CylinderGeometry(0.35, 0.25, 0.6, 8) at (px, 0.3, pz)
        add_cylinder(f"Plant_{i}_Pot", (px, 0.3, pz), 0.35, 0.25, 0.6, 8, mats["pot"])

        # Foliage cone 1 — ConeGeometry(0.5, 1.2, 6) at (px, 1.4, pz)
        add_cone(f"Plant_{i}_Cone1", (px, 1.4, pz), 0.5, 1.2, 6, mats["plant"])

        # Foliage cone 2 — ConeGeometry(0.35, 0.8, 6) at (px, 2.2, pz)
        add_cone(f"Plant_{i}_Cone2", (px, 2.2, pz), 0.35, 0.8, 6, mats["plant"])

def build_string_lights(mats):
    """Build string lights along ceiling with wire segments and emissive bulbs."""
    print("  Building string lights...")

    # String 1 — across back wall, 18 points
    bulb_colors = mats["bulbs"]
    for i in range(18):
        t = i / 17
        x = -10 + t * 20
        sag = math.sin(t * math.pi) * 0.4
        y = 11.4 - sag
        z = -9.5

        # Wire segments (thin boxes connecting consecutive points)
        if i < 17:
            t_next = (i + 1) / 17
            x_next = -10 + t_next * 20
            sag_next = math.sin(t_next * math.pi) * 0.4
            y_next = 11.4 - sag_next

            # Midpoint and length
            mx = (x + x_next) / 2
            my = (y + y_next) / 2
            dx = x_next - x
            dy = y_next - y
            length = math.sqrt(dx * dx + dy * dy)
            angle = math.atan2(dy, dx)

            wire = add_box(f"StringLight1_Wire_{i}", (mx, my, z), (length, 0.02, 0.02), mats["wire"])
            # Rotate wire to follow the curve
            # In Blender coords, the angle is around the Y axis (which is -Z in Three.js)
            wire.rotation_euler[1] = angle

        # Bulbs every other point
        if i % 2 == 0:
            bulb_mat = bulb_colors[i % len(bulb_colors)]
            add_sphere(f"StringLight1_Bulb_{i}", (x, y - 0.15, z), 0.1, 6, bulb_mat)

    # String 2 — along left side, 14 points
    for i in range(14):
        t = i / 13
        x = -9
        sag = math.sin(t * math.pi) * 0.3
        y = 11.4 - sag
        z = -8 + t * 16

        # Wire segments
        if i < 13:
            t_next = (i + 1) / 13
            sag_next = math.sin(t_next * math.pi) * 0.3
            y_next = 11.4 - sag_next
            z_next = -8 + t_next * 16

            mz = (z + z_next) / 2
            my = (y + y_next) / 2
            dz = z_next - z
            dy = y_next - y
            length = math.sqrt(dz * dz + dy * dy)
            angle = math.atan2(dy, dz)

            wire = add_box(f"StringLight2_Wire_{i}", (x, my, mz), (0.02, 0.02, length), mats["wire"])
            # Rotate to follow curve — rotation around X axis in Blender
            wire.rotation_euler[0] = -angle

        # Bulbs every other point
        if i % 2 == 0:
            bulb_mat = bulb_colors[(i + 2) % len(bulb_colors)]
            add_sphere(f"StringLight2_Bulb_{i}", (x, y - 0.15, z), 0.1, 6, bulb_mat)

## LED strips removed

def build_mugs(mats):
    """Build coffee mugs on select desks."""
    print("  Building mugs...")

    # Mug positions (Three.js coords + 0.7 offset on X)
    mug_positions = [
        (0 + 0.7, 1.57, -4.7),     # Percy's desk
        (6 + 0.7, 1.57, 1.3),      # Sage's desk
        (-4 + 0.7, 1.57, 4.3),     # Forge's desk
    ]

    for i, (mx, my, mz) in enumerate(mug_positions):
        # CylinderGeometry(0.06, 0.05, 0.12, 8)
        add_cylinder(f"Mug_{i}", (mx, my, mz), 0.06, 0.05, 0.12, 8, mats["mug"])

# ============================================================
# OFFICE PROPS — make it feel lived-in
# ============================================================

def build_kitchenette(mats):
    """Build kitchen area: counter, coffee machine, mini fridge in back-left."""
    print("  Building kitchenette...")

    # --- Counter table at (-10, 0, -6), against left wall ---
    add_box("Counter", (-10.5, 1.2, -6), (2.0, 0.1, 0.8), mats["counter"])
    # Counter legs
    for ox, oz in [(-0.9, -0.3), (-0.9, 0.3), (0.9, -0.3), (0.9, 0.3)]:
        add_box(f"CounterLeg_{ox}_{oz}", (-10.5 + ox, 0.6, -6 + oz), (0.06, 1.2, 0.06), mats["desk_leg"])

    # --- Coffee machine on counter ---
    # Body
    add_box("CoffeeMachine_Body", (-10.8, 1.55, -6), (0.4, 0.6, 0.3), mats["coffee_machine"])
    # Drip area
    add_box("CoffeeMachine_Drip", (-10.8, 1.3, -5.85), (0.3, 0.05, 0.15), mats["desk_leg"])
    # Coffee pot (glass carafe)
    add_cylinder("CoffeePot", (-10.8, 1.38, -5.85), 0.1, 0.08, 0.15, 8, mats["coffee_pot"])
    # Coffee inside pot
    add_cylinder("CoffeeLiquid", (-10.8, 1.35, -5.85), 0.08, 0.07, 0.08, 8, mats["coffee_liquid"])

    # Extra mugs near coffee machine
    add_cylinder("KitchenMug_0", (-10.2, 1.32, -5.9), 0.06, 0.05, 0.12, 8, mats["mug"])
    add_cylinder("KitchenMug_1", (-10.1, 1.32, -6.1), 0.06, 0.05, 0.12, 8, mats["mug"])

    # --- Mini fridge against left wall ---
    add_box("Fridge_Body", (-11.4, 0.9, -5), (1.0, 1.8, 0.7), mats["fridge"])
    # Fridge handle
    add_box("Fridge_Handle", (-10.85, 1.1, -5), (0.04, 0.4, 0.06), mats["fridge_handle"])
    # Fridge top edge
    add_box("Fridge_Top", (-11.4, 1.82, -5), (1.02, 0.04, 0.72), mats["desk_leg"])

    # Something on top of fridge — a small plant
    add_cylinder("FridgePlant_Pot", (-11.4, 2.0, -5), 0.15, 0.12, 0.2, 8, mats["pot"])
    add_cone("FridgePlant_Leaf", (-11.4, 2.35, -5), 0.2, 0.5, 6, mats["plant"])


def build_water_cooler(mats):
    """Build water cooler on right wall near front."""
    print("  Building water cooler...")

    # Base/body
    add_box("WaterCooler_Body", (11, 0.7, 3), (0.5, 1.4, 0.4), mats["water_cooler"])
    # Water jug on top
    add_cylinder("WaterCooler_Jug", (11, 1.8, 3), 0.15, 0.18, 0.6, 12, mats["water_jug"])
    # Spigot area
    add_box("WaterCooler_Spigot", (10.7, 0.9, 3), (0.08, 0.06, 0.08), mats["desk_leg"])
    # Drip tray
    add_box("WaterCooler_Tray", (10.7, 0.5, 3), (0.2, 0.04, 0.15), mats["desk_leg"])
    # Paper cup stack nearby
    add_cylinder("PaperCups", (10.6, 0.55, 3.3), 0.05, 0.04, 0.1, 8, mats["paper_stack"])


def build_filing_cabinets(mats):
    """Build filing cabinets along walls."""
    print("  Building filing cabinets...")

    # All cabinets positioned against walls
    cabinets = [
        # (x, z, face_z_offset) — face_z_offset is which direction drawers face
        (11.3, -6, -0.26),    # Right wall, back area
        (11.3, -4.5, -0.26),  # Right wall, next to first
        (-11.3, 0, 0.26),     # Left wall, mid area
        (-11.3, 1.5, 0.26),   # Left wall, next to first
        (4, -10.5, 0.26),     # Back wall
    ]

    for i, (fx, fz, face_oz) in enumerate(cabinets):
        # Cabinet body — 2-drawer
        add_box(f"FilingCab_{i}_Body", (fx, 0.7, fz), (0.6, 1.4, 0.5), mats["filing_cabinet"])
        # Drawer lines (visual separation)
        add_box(f"FilingCab_{i}_Line", (fx, 0.7, fz + face_oz), (0.5, 0.02, 0.02), mats["desk_leg"])
        # Drawer handles
        add_box(f"FilingCab_{i}_Handle0", (fx, 1.05, fz + face_oz), (0.15, 0.03, 0.03), mats["fridge_handle"])
        add_box(f"FilingCab_{i}_Handle1", (fx, 0.4, fz + face_oz), (0.15, 0.03, 0.03), mats["fridge_handle"])
        # Items on top
        if i % 3 == 0:
            add_box(f"PaperTray_{i}", (fx, 1.45, fz), (0.5, 0.06, 0.35), mats["paper_tray"])
            add_box(f"PaperInTray_{i}", (fx, 1.52, fz), (0.45, 0.08, 0.3), mats["paper_stack"])
        elif i % 3 == 1:
            add_cylinder(f"CabPlant_{i}_Pot", (fx, 1.55, fz), 0.12, 0.1, 0.15, 8, mats["pot"])
            add_cone(f"CabPlant_{i}_Leaf", (fx, 1.85, fz), 0.15, 0.4, 6, mats["plant"])
        else:
            add_cylinder(f"CabMug_{i}", (fx, 1.47, fz), 0.06, 0.05, 0.12, 8, mats["mug"])


def build_second_bookshelf(mats):
    """Build a second bookshelf on the back wall."""
    print("  Building second bookshelf...")

    bx, bz = -5, -10.5  # Against back wall

    # Upright panels
    for i, ox in enumerate([-0.8, 0, 0.8]):
        add_box(f"Bookshelf2_Panel_{i}", (bx + ox, 2.0, bz), (0.1, 4, 0.6), mats["bookshelf"])

    # Shelves
    for si, y in enumerate([0.3, 1.2, 2.1, 3.0, 3.9]):
        add_box(f"Bookshelf2_Shelf_{si}", (bx, y, bz), (1.6, 0.08, 0.6), mats["bookshelf"])

    # Books — fewer per shelf, different arrangement
    book_idx = 0
    for y in [0.3, 1.2, 2.1, 3.0, 3.9]:
        book_x = -0.6
        count = random.randint(3, 6)
        for b in range(count):
            bw = 0.06 + random.random() * 0.1
            bh = 0.4 + random.random() * 0.5
            book_mat = mats["books"][(book_idx + 2) % len(mats["books"])]
            add_box(f"Book2_{book_idx}", (bx + book_x + bw / 2, y + 0.08 + bh / 2, bz),
                    (bw, bh, 0.4), book_mat)
            book_x += bw + 0.03
            book_idx += 1


def build_coat_rack(mats):
    """Build coat rack near the left wall."""
    print("  Building coat rack...")

    cx, cz = (-11, 7)

    # Pole
    add_cylinder("CoatRack_Pole", (cx, 2.5, cz), 0.04, 0.04, 5.0, 8, mats["coat_rack"])
    # Base
    add_cylinder("CoatRack_Base", (cx, 0.15, cz), 0.35, 0.35, 0.06, 8, mats["coat_rack"])
    # Hooks (small cylinders sticking out)
    for angle_i, rz in enumerate([0, 1.57, 3.14, 4.71]):
        hx = cx + math.cos(rz) * 0.2
        hz = cz + math.sin(rz) * 0.2
        add_cylinder(f"CoatRack_Hook_{angle_i}", (hx, 4.6, hz), 0.02, 0.02, 0.2, 6, mats["coat_rack"])

    # A coat hanging
    add_box("Coat_Hanging", (cx + 0.15, 3.5, cz), (0.5, 1.8, 0.15), mats["coat"])


def build_trash_cans(mats):
    """Build small trash cans near desks."""
    print("  Building trash cans...")

    positions = [
        (1.5, -4),    # Near Percy
        (-5.5, 4.5),  # Near Forge
        (4.5, 4.5),   # Near Relay
    ]

    for i, (tx, tz) in enumerate(positions):
        add_cylinder(f"TrashCan_{i}", (tx, 0.35, tz), 0.2, 0.18, 0.7, 8, mats["trash_can"])


def build_printer(mats):
    """Build a printer/copier on right wall."""
    print("  Building printer...")

    px, pz = 11, 6

    # Printer stand (small table)
    add_box("PrinterStand", (px, 0.6, pz), (1.0, 0.06, 0.6), mats["desk_leg"])
    for ox, oz in [(-0.4, -0.25), (-0.4, 0.25), (0.4, -0.25), (0.4, 0.25)]:
        add_box(f"PrinterStandLeg_{ox}_{oz}", (px + ox, 0.3, pz + oz), (0.05, 0.6, 0.05), mats["desk_leg"])

    # Printer body
    add_box("Printer_Body", (px, 0.95, pz), (0.8, 0.3, 0.5), mats["printer"])
    # Paper output tray
    add_box("Printer_Tray", (px - 0.1, 0.78, pz + 0.35), (0.5, 0.03, 0.15), mats["desk_leg"])
    # Paper in tray
    add_box("Printer_Paper", (px - 0.1, 0.82, pz + 0.35), (0.4, 0.04, 0.12), mats["paper_stack"])


def build_desk_clutter(mats):
    """Add paper stacks, pencil cups, small items on desks."""
    print("  Building desk clutter...")

    # Paper stacks on desks (Three.js desk surface y=1.56)
    paper_desks = [
        (6, 1.59, -3.7, "Scout"),       # Scout's desk
        (-7, 1.59, -0.7, "Pixel"),      # Pixel's desk
        (3, 1.59, 4.3, "Relay"),        # Relay's desk
    ]

    for i, (dx, dy, dz, name) in enumerate(paper_desks):
        # Stack of papers
        add_box(f"PaperStack_{name}", (dx - 0.7, dy + 0.04, dz), (0.3, 0.08, 0.22), mats["paper_stack"])

    # Pencil cups on desks
    pencil_desks = [
        (0, 1.57, -4.6, "Percy"),
        (-4, 1.57, 4.4, "Forge"),
    ]

    for i, (dx, dy, dz, name) in enumerate(pencil_desks):
        # Cup
        add_cylinder(f"PencilCup_{name}", (dx - 0.8, dy + 0.08, dz), 0.06, 0.05, 0.14, 8, mats["pencil_cup"])
        # Pencils sticking up
        for j in range(3):
            px = dx - 0.8 + (j - 1) * 0.025
            add_cylinder(f"Pencil_{name}_{j}", (px, dy + 0.22, dz + (j - 1) * 0.02),
                        0.01, 0.01, 0.18, 6, mats["pencil"])


def build_wall_clock(mats):
    """Build a wall clock on the back wall above the window."""
    print("  Building wall clock...")

    # Clock on back wall, above window
    cx, cy, cz = 5, 9, -10.8

    # Frame (ring approximated as flat cylinder)
    add_cylinder("Clock_Frame", (cx, cy, cz), 0.5, 0.5, 0.08, 24, mats["clock_frame"])
    # Face
    face = add_circle("Clock_Face", (cx, cy, cz + 0.05), 0.45, 24, mats["clock_face"])
    face.rotation_euler[0] = math.pi / 2  # Face toward camera


def build_wall_art(mats):
    """Build poster/frames on walls."""
    print("  Building wall art...")

    # Poster on left wall (PL brand art)
    add_box("Poster_Frame", (-11.74, 6, 3), (0.08, 2.0, 1.5), mats["poster_frame"])
    add_box("Poster_Art", (-11.70, 6, 3), (0.04, 1.8, 1.3), mats["poster_art"])

    # Second poster on left wall
    add_box("Poster2_Frame", (-11.74, 6, -7), (0.08, 1.5, 1.2), mats["poster_frame"])
    add_box("Poster2_Art", (-11.70, 6, -7), (0.04, 1.3, 1.0), mats["books"][1])  # Blue

    # Frame on right wall
    add_box("Poster3_Frame", (11.74, 5.5, -7), (0.08, 1.2, 1.6), mats["poster_frame"])
    add_box("Poster3_Art", (11.70, 5.5, -7), (0.04, 1.0, 1.4), mats["books"][2])  # Green


def build_whiteboard_notes(mats):
    """Add sticky notes to the whiteboard."""
    print("  Building whiteboard sticky notes...")

    # Whiteboard is at (-11.74, 5, -2), surface at x=-11.74
    # Sticky notes on the board surface
    notes = [
        (-11.68, 5.6, -2.5, 0),
        (-11.68, 5.2, -1.8, 1),
        (-11.68, 5.7, -1.4, 2),
        (-11.68, 4.8, -2.3, 3),
        (-11.68, 4.5, -1.6, 0),
        (-11.68, 5.3, -2.8, 1),
    ]

    for i, (nx, ny, nz, color_i) in enumerate(notes):
        add_box(f"StickyNote_{i}", (nx, ny, nz), (0.04, 0.2, 0.2),
                mats["sticky_note"][color_i % len(mats["sticky_note"])])


def build_extra_bookshelf_right(mats):
    """Build another small shelf on the right wall further forward."""
    print("  Building right wall shelf...")

    bx, bz = 11.5, 4

    # Wall-mounted shelf brackets + shelf
    add_box("WallShelf_R_0", (bx, 3.5, bz), (0.8, 0.08, 0.5), mats["bookshelf"])
    add_box("WallShelf_R_1", (bx, 4.5, bz), (0.8, 0.08, 0.5), mats["bookshelf"])

    # Items on shelves
    # Lower: a few books
    for b in range(3):
        bw = 0.06 + random.random() * 0.06
        bh = 0.35 + random.random() * 0.3
        add_box(f"ShelfBook_R_{b}", (bx - 0.25 + b * 0.15, 3.54 + bh / 2, bz),
                (bw, bh, 0.35), mats["books"][b % len(mats["books"])])

    # Upper: small plant + mug
    add_cylinder("ShelfPlant_R_Pot", (bx - 0.1, 4.64, bz), 0.1, 0.08, 0.15, 8, mats["pot"])
    add_cone("ShelfPlant_R_Leaf", (bx - 0.1, 4.92, bz), 0.12, 0.35, 6, mats["plant"])
    add_cylinder("ShelfMug_R", (bx + 0.2, 4.6, bz), 0.06, 0.05, 0.12, 8, mats["mug"])


# ============================================================
# EXPORT
# ============================================================

def apply_all_transforms():
    """Apply all transforms so GLB positions are baked."""
    print("  Applying transforms...")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")

def export_glb(path):
    """Export scene as GLB with correct settings."""
    print(f"  Exporting to {path}...")
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Select only mesh objects (no lights, cameras)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_lights=False,
        export_cameras=False,
        export_materials="EXPORT",
        export_normals=True,
    )
    print(f"  GLB exported: {path}")

    # Print file size
    size = os.path.getsize(path)
    print(f"  File size: {size / 1024:.1f} KB")

# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("Percival Labs — Terrarium Office Builder")
    print("=" * 60)

    # Clear default scene
    print("\n[1/16] Clearing scene...")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    # Remove default collections/materials
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)

    # Build materials
    print("[2/16] Creating materials...")
    mats = build_materials()

    # Build room
    print("[3/16] Building room geometry...")
    build_room(mats)

    # Build window
    print("[4/16] Building window...")
    build_window(mats)

    # Build desks
    print("[5/16] Building desks...")
    for agent in AGENTS:
        build_desk(mats, agent)

    # Build shared furniture
    print("[7/16] Building shared furniture...")
    build_bookshelf(mats)
    build_second_bookshelf(mats)
    build_whiteboard(mats)
    build_whiteboard_notes(mats)
    build_beanbag(mats)
    build_rug(mats)

    # Build plants
    print("[8/16] Building plants...")
    build_plants(mats)

    # Build string lights
    print("[9/16] Building string lights...")
    build_string_lights(mats)

    # Build mugs
    print("[11/16] Building mugs...")
    build_mugs(mats)

    # Build office props — kitchenette, water cooler, filing, printer
    print("[12/16] Building kitchenette...")
    build_kitchenette(mats)

    print("[13/16] Building office furniture...")
    build_water_cooler(mats)
    build_filing_cabinets(mats)
    build_coat_rack(mats)
    build_trash_cans(mats)
    build_printer(mats)

    print("[14/16] Building desk clutter...")
    build_desk_clutter(mats)

    print("[15/16] Building wall decor...")
    build_wall_clock(mats)
    build_wall_art(mats)
    build_extra_bookshelf_right(mats)

    # Apply transforms and export
    print("[16/16] Exporting GLB...")
    apply_all_transforms()
    export_glb(OUTPUT_PATH)

    # Summary
    obj_count = len([o for o in bpy.data.objects if o.type == "MESH"])
    mat_count = len(bpy.data.materials)
    print(f"\n{'=' * 60}")
    print(f"Done! {obj_count} mesh objects, {mat_count} materials")
    print(f"Output: {OUTPUT_PATH}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
