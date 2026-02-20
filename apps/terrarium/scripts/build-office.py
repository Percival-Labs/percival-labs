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
    # Percy: solo station, back wall
    {"id": "percy", "name": "Percy", "color": "#3b82f6", "position": [-4, 0, -9], "facing": 0},
    # Scout + Sage pod: right side of room, facing each other
    {"id": "scout", "name": "Scout", "color": "#10b981", "position": [7, 0, -5], "facing": math.pi},
    {"id": "sage", "name": "Sage", "color": "#8b5cf6", "position": [7, 0, -2], "facing": 0},
    # Pixel: solo station, left wall
    {"id": "pixel", "name": "Pixel", "color": "#ec4899", "position": [-10, 0, -3], "facing": math.pi / 2},
    # Forge + Relay pod: left-front area, facing each other
    {"id": "forge", "name": "Forge", "color": "#f59e0b", "position": [-6, 0, 1], "facing": math.pi},
    {"id": "relay", "name": "Relay", "color": "#06b6d4", "position": [-6, 0, 4], "facing": 0},
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

def rotate_offset(ox, oz, facing):
    """Rotate an (x, z) offset by the facing angle."""
    cos_f = math.cos(facing)
    sin_f = math.sin(facing)
    return (ox * cos_f - oz * sin_f, ox * sin_f + oz * cos_f)

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

    # --- Enhancement 10: New materials ---
    mats["baseboard"] = create_material("Baseboard", "#A09080", roughness=0.7)
    mats["floor_plank_line"] = create_material("PlankLine", "#B89050", roughness=0.85)
    mats["cable"] = create_material("Cable", "#3A3A3A", roughness=0.8)
    mats["nameplate_base"] = create_material("NameplateBase", "#2A2A2A", roughness=0.4, metallic=0.3)
    mats["tool_metal"] = create_material("ToolMetal", "#808890", roughness=0.4, metallic=0.5)
    mats["napkin"] = create_material("Napkin", "#FFF8F0", roughness=0.95)
    mats["snack_box"] = create_material("SnackBox", "#DD8844", roughness=0.7)
    mats["plant_dark"] = create_material("PlantDark", "#2D7828", roughness=0.9)
    mats["plant_light"] = create_material("PlantLight", "#4CAF40", roughness=0.9)
    mats["trunk"] = create_material("Trunk", "#6B4226", roughness=0.85)
    mats["hanging_wire"] = create_material("HangingWire", "#5A5A5A", roughness=0.6, metallic=0.3)
    mats["palette"] = create_material("Palette", "#C8A870", roughness=0.7)
    mats["binocular"] = create_material("Binocular", "#2A2A2A", roughness=0.5, metallic=0.2)
    mats["kanban_board"] = create_material("KanbanBoard", "#E8E8E0", roughness=0.4)
    mats["kanban_frame"] = create_material("KanbanFrame", "#606060", roughness=0.5, metallic=0.3)

    # --- Round table materials ---
    mats["round_table"] = create_material("RoundTable", "#6B4226", roughness=0.6)
    mats["round_table_leg"] = create_material("RoundTableLeg", "#5A3A1E", roughness=0.5, metallic=0.2)
    mats["blueprint"] = create_material("Blueprint", "#D8E8F8", roughness=0.8, emissive_hex="#A0C0E0", emissive_strength=0.3)
    mats["pen"] = create_material("Pen", "#2A2A2A", roughness=0.4, metallic=0.3)
    mats["laptop_body"] = create_material("LaptopBody", "#C0C0C8", roughness=0.3, metallic=0.4)
    mats["laptop_screen"] = create_material("LaptopScreen", "#111111", emissive_hex="#88AACC", emissive_strength=1.5, roughness=0.2)

    # --- Cat materials ---
    mats["cat_fur"] = create_material("CatFur", "#D4863E", roughness=0.95)
    mats["cat_dark"] = create_material("CatDark", "#8B5E2B", roughness=0.95)
    mats["cat_nose"] = create_material("CatNose", "#CC6688", roughness=0.7)

    # --- Agent scene prop materials ---
    mats["easel_wood"] = create_material("EaselWood", "#C8A870", roughness=0.75)        # light natural wood
    mats["canvas"] = create_material("Canvas", "#F5F0E8", roughness=0.9)                # off-white
    mats["corkboard"] = create_material("Corkboard", "#B08050", roughness=0.85)         # cork brown
    mats["server_rack"] = create_material("ServerRack", "#2A2A30", roughness=0.3, metallic=0.5)  # dark charcoal metallic
    mats["led_green"] = create_material("LEDGreen", "#00FF44", roughness=0.2,
                                         emissive_hex="#00FF44", emissive_strength=3.0)
    mats["led_yellow"] = create_material("LEDYellow", "#FFCC00", roughness=0.2,
                                          emissive_hex="#FFCC00", emissive_strength=3.0)
    mats["workbench"] = create_material("Workbench", "#A08050", roughness=0.85)         # rough wood
    mats["pegboard"] = create_material("Pegboard", "#D0C8B8", roughness=0.8)            # light grey/beige

    # Per-agent materials for nameplates
    for agent in AGENTS:
        mats[f"nameplate_{agent['id']}"] = create_material(
            f"Nameplate_{agent['name']}", agent["color"], roughness=0.4, metallic=0.3)

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

def add_ico_sphere(name, tj_position, radius, subdivisions, material):
    """Add an icosphere for organic plant foliage."""
    tx, ty, tz = tj_position
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
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
# ENHANCEMENT 1: BEVEL MODIFIER HELPER
# ============================================================

def add_bevel(obj, width=0.02, segments=2):
    """Apply a bevel modifier to an object for better toon-shading edge catch."""
    mod = obj.modifiers.new(name="Bevel", type='BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(60)
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
    """Build a desk with monitor, stand, lamp for one agent, rotated by facing angle."""
    ax, _, az = agent["position"]
    facing = agent.get("facing", 0)
    name = agent["name"]
    color = agent["color"]
    print(f"  Building desk for {name} (facing={facing:.2f})...")

    def rot(ox, oz):
        """Shorthand: rotate offset by facing angle."""
        return rotate_offset(ox, oz, facing)

    # Desktop surface — BoxGeometry(2.4, 0.12, 1.2) at (ax, 1.5, az)
    # Desk center stays at agent position, but the box itself rotates
    desk_top = add_box(f"Desk_{name}", (ax, 1.5, az), (2.4, 0.12, 1.2), mats["desk"])
    desk_top.rotation_euler[2] = -facing  # Rotate around Blender Z (Three.js Y)
    add_bevel(desk_top, width=0.02, segments=2)

    # Legs — BoxGeometry(0.08, 1.5, 0.08)
    leg_offsets = [(-1.1, -0.5), (-1.1, 0.5), (1.1, -0.5), (1.1, 0.5)]
    for i, (ox, oz) in enumerate(leg_offsets):
        rx, rz = rot(ox, oz)
        add_box(f"DeskLeg_{name}_{i}", (ax + rx, 0.75, az + rz), (0.08, 1.5, 0.08), mats["desk_leg"])

    # Monitor — BoxGeometry(1.0, 0.7, 0.06) at offset (0, +0.7, -0.4)
    mon_ox, mon_oz = rot(0, -0.4)
    monitor_mat = create_material(f"Monitor_{name}", "#111111",
                                   emissive_hex=color, emissive_strength=2.0,
                                   roughness=0.2, metallic=0.5)
    mon = add_box(f"Monitor_{name}", (ax + mon_ox, 2.2, az + mon_oz), (1.0, 0.7, 0.06), monitor_mat)
    mon.rotation_euler[2] = -facing

    # Monitor glow plane — PlaneGeometry(0.9, 0.6) at offset (0, +0.7, -0.36)
    glow_ox, glow_oz = rot(0, -0.36)
    glow_mat = create_material(f"MonitorGlow_{name}", color,
                                emissive_hex=color, emissive_strength=3.0, alpha=0.4)
    glow = add_plane(f"MonitorGlow_{name}", (ax + glow_ox, 2.2, az + glow_oz), (0.9, 0.6), glow_mat)
    # Orient to face the direction the monitor faces
    glow.rotation_euler[0] = math.pi / 2
    glow.rotation_euler[2] = -facing

    # Monitor stand — BoxGeometry(0.06, 0.35, 0.06) at offset (0, -, -0.4)
    stand_ox, stand_oz = rot(0, -0.4)
    add_box(f"MonitorStand_{name}", (ax + stand_ox, 1.73, az + stand_oz), (0.06, 0.35, 0.06), mats["desk_leg"])

    # Monitor base — BoxGeometry(0.4, 0.04, 0.2) at offset (0, -, -0.4)
    base_ox, base_oz = rot(0, -0.4)
    base = add_box(f"MonitorBase_{name}", (ax + base_ox, 1.56, az + base_oz), (0.4, 0.04, 0.2), mats["desk_leg"])
    base.rotation_euler[2] = -facing

    # Desk lamp arm — CylinderGeometry(0.03, 0.03, 0.6, 6) at offset (+0.9, -, +0.1)
    lamp_ox, lamp_oz = rot(0.9, 0.1)
    arm = add_cylinder(f"LampArm_{name}", (ax + lamp_ox, 1.86, az + lamp_oz), 0.03, 0.03, 0.6, 6, mats["lamp_base"])
    arm.rotation_euler[2] = -0.3 - facing

    # Lamp shade — ConeGeometry(0.18, 0.2, 8) at offset (+1.0, -, +0.1)
    shade_ox, shade_oz = rot(1.0, 0.1)
    shade_mat = create_material(f"LampShade_{name}", color,
                                 emissive_hex=color, emissive_strength=1.0)
    shade = add_cylinder(f"LampShade_{name}", (ax + shade_ox, 2.15, az + shade_oz), 0.18, 0.0, 0.2, 8, shade_mat)
    shade.rotation_euler[0] += math.pi

    # Keyboard placeholder — small dark box on desk at offset (-0.2, -, +0.2)
    kb_ox, kb_oz = rot(-0.2, 0.2)
    kb = add_box(f"Keyboard_{name}", (ax + kb_ox, 1.58, az + kb_oz), (0.5, 0.03, 0.2), mats["desk_leg"])
    kb.rotation_euler[2] = -facing

## Chairs removed

def build_bookshelf(mats):
    """Build bookshelf on right wall — moved to avoid Sage's desk at (10, 0, -4)."""
    print("  Building bookshelf...")
    bx, bz = 11.5, -7  # Moved from -3 to -7 to clear Sage's desk

    # Upright panels — BoxGeometry(0.1, 5, 0.8) at offsets -1.2, 0, 1.2
    for i, ox in enumerate([-1.2, 0, 1.2]):
        panel = add_box(f"Bookshelf_Panel_{i}", (bx + ox, 2.5, bz), (0.1, 5, 0.8), mats["bookshelf"])
        add_bevel(panel, width=0.015, segments=2)  # Enhancement 1

    # Shelves — BoxGeometry(2.4, 0.08, 0.8) at y = 0.5 to 4.5 step 1.0
    shelf_idx = 0
    for y in [0.5, 1.5, 2.5, 3.5, 4.5]:
        shelf = add_box(f"Bookshelf_Shelf_{shelf_idx}", (bx, y, bz), (2.4, 0.08, 0.8), mats["bookshelf"])
        add_bevel(shelf, width=0.01, segments=1)  # Enhancement 1
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
    frame = add_box("Whiteboard_Frame", (-11.8, 5, -2), (0.1, 2.5, 4), mats["whiteboard_frame"])
    add_bevel(frame, width=0.015, segments=2)  # Enhancement 1

    # Board surface — BoxGeometry(0.05, 2.2, 3.7) at (-11.74, 5, -2)
    add_box("Whiteboard_Board", (-11.74, 5, -2), (0.05, 2.2, 3.7), mats["whiteboard"])

def build_beanbag(mats):
    """Build beanbag in back-left corner."""
    print("  Building beanbag...")

    # SphereGeometry(1.0, 8, 6) scaled (1, 0.5, 0.9) at (-10, 0.5, -8)
    bb = add_sphere("Beanbag", (-10, 0.5, -8), 1.0, 8, mats["beanbag"])
    bb.scale = (1, 0.9, 0.5)

def build_rug(mats):
    """Build floor rug."""
    print("  Building rug...")

    # PlaneGeometry(8, 6) at (0, 0.02, 0), rotation.x = -PI/2
    add_plane("Rug", (0, 0.02, 0), (8, 6), mats["rug"])

def build_plants(mats):
    """Build potted plants in corners with organic ico-sphere foliage."""
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

        # Enhancement 2: Trunk cylinder between pot and foliage
        add_cylinder(f"Plant_{i}_Trunk", (px, 0.8, pz), 0.06, 0.08, 0.4, 6, mats["trunk"])

        # Enhancement 2: Ico sphere foliage (2-3 overlapping spheres)
        add_ico_sphere(f"Plant_{i}_Foliage_0", (px, 1.4, pz), 0.5, 2, mats["plant"])
        add_ico_sphere(f"Plant_{i}_Foliage_1", (px - 0.15, 1.7, pz + 0.1), 0.38, 2, mats["plant_dark"])
        add_ico_sphere(f"Plant_{i}_Foliage_2", (px + 0.12, 1.85, pz - 0.08), 0.3, 2, mats["plant_light"])


def build_hanging_plants(mats):
    """Enhancement 2: Build hanging plants from ceiling beam and wall shelf bracket."""
    print("  Building hanging plants...")

    # Hanging plant 1: From a ceiling beam (beam at z=-5, y=11.8)
    hp1_x, hp1_z = -3, -5
    # Hanging wire
    add_cylinder("HangingPlant_0_Wire", (hp1_x, 10.8, hp1_z), 0.015, 0.015, 2.0, 6, mats["hanging_wire"])
    # Pot (smaller, hanging)
    add_cylinder("HangingPlant_0_Pot", (hp1_x, 9.6, hp1_z), 0.25, 0.18, 0.4, 8, mats["pot"])
    # Foliage — drooping ico spheres
    add_ico_sphere("HangingPlant_0_Foliage_0", (hp1_x, 9.7, hp1_z), 0.35, 2, mats["plant"])
    add_ico_sphere("HangingPlant_0_Foliage_1", (hp1_x - 0.2, 9.4, hp1_z + 0.15), 0.25, 2, mats["plant_light"])
    add_ico_sphere("HangingPlant_0_Foliage_2", (hp1_x + 0.18, 9.35, hp1_z - 0.1), 0.22, 2, mats["plant_dark"])

    # Hanging plant 2: From the right wall shelf bracket area (bx=11.5, bz=4)
    hp2_x, hp2_z = 11.0, 4.5
    # Small wall bracket
    add_box("HangingPlant_1_Bracket", (11.7, 4.8, hp2_z), (0.4, 0.06, 0.15), mats["desk_leg"])
    # Hanging wire
    add_cylinder("HangingPlant_1_Wire", (hp2_x + 0.3, 4.3, hp2_z), 0.015, 0.015, 1.0, 6, mats["hanging_wire"])
    # Pot
    add_cylinder("HangingPlant_1_Pot", (hp2_x + 0.3, 3.6, hp2_z), 0.2, 0.15, 0.35, 8, mats["pot"])
    # Foliage
    add_ico_sphere("HangingPlant_1_Foliage_0", (hp2_x + 0.3, 3.7, hp2_z), 0.3, 2, mats["plant"])
    add_ico_sphere("HangingPlant_1_Foliage_1", (hp2_x + 0.15, 3.45, hp2_z + 0.12), 0.2, 2, mats["plant_light"])


def build_floor_planks(mats):
    """Enhancement 3: Add subtle plank lines across the floor."""
    print("  Building floor plank lines...")

    # Floor is at y=0, spans x=-12..12, z=-11..9
    # Plank lines run across the width (x-axis), spaced ~1.5 units along z
    plank_idx = 0
    z_start = -10.0
    while z_start < 9.0:
        add_box(f"PlankLine_{plank_idx}", (0, 0.005, z_start), (24, 0.02, 0.04), mats["floor_plank_line"])
        z_start += 1.5
        plank_idx += 1


def build_baseboards(mats):
    """Enhancement 4: Add baseboard trim along all three walls."""
    print("  Building baseboards...")

    # Back wall baseboard
    add_box("Baseboard_Back", (0, 0.15, -10.85), (24, 0.3, 0.1), mats["baseboard"])
    # Left wall baseboard
    add_box("Baseboard_Left", (-11.85, 0.15, -1), (0.1, 0.3, 20), mats["baseboard"])
    # Right wall baseboard
    add_box("Baseboard_Right", (11.85, 0.15, -1), (0.1, 0.3, 20), mats["baseboard"])


def build_agent_nameplates(mats):
    """Enhancement 5: Add agent-colored nameplates on each desk, rotated by facing."""
    print("  Building agent nameplates...")

    for agent in AGENTS:
        ax, _, az = agent["position"]
        facing = agent.get("facing", 0)
        name = agent["name"]
        aid = agent["id"]

        # Nameplate offset: front-right of desk surface
        np_ox, np_oz = rotate_offset(0.5, 0.4, facing)
        # Nameplate base (dark plate)
        np_base = add_box(f"Nameplate_{name}_Base", (ax + np_ox, 1.57, az + np_oz), (0.35, 0.03, 0.12), mats["nameplate_base"])
        np_base.rotation_euler[2] = -facing
        # Agent-colored strip on top
        np_color = add_box(f"Nameplate_{name}_Color", (ax + np_ox, 1.59, az + np_oz), (0.3, 0.015, 0.08), mats[f"nameplate_{aid}"])
        np_color.rotation_euler[2] = -facing


def build_desk_cables(mats):
    """Enhancement 6: Add under-desk cable bundles, rotated by facing."""
    print("  Building desk cables...")

    for agent in AGENTS:
        ax, _, az = agent["position"]
        facing = agent.get("facing", 0)
        name = agent["name"]

        # 2-3 thin cables from back of desk down to floor
        cable_offsets = [(-0.15, -0.5), (0.0, -0.5), (0.12, -0.48)]
        for ci, (cox, coz) in enumerate(cable_offsets):
            rx, rz = rotate_offset(cox, coz, facing)
            cx = ax + rx
            cz = az + rz
            cable_y = 0.72  # midpoint
            cable_h = 1.44  # full height
            cable = add_cylinder(f"Cable_{name}_{ci}", (cx, cable_y, cz),
                                 0.012, 0.012, cable_h, 6, mats["cable"])
            # Slight angle variation for visual interest
            angle = (ci - 1) * 0.06
            cable.rotation_euler[0] += angle


def build_personal_kanbans(mats):
    """Enhancement 7: Small personal kanban boards near Percy and Forge."""
    print("  Building personal kanban boards...")

    # --- Percy's kanban ---
    # Percy at (-3, 0, -9), facing=0 (toward +Z)
    percy = AGENTS[0]
    px, _, pz = percy["position"]
    pf = percy.get("facing", 0)

    # Put kanban to Percy's right, slightly behind
    kb_ox, kb_oz = rotate_offset(1.8, -0.8, pf)
    kb_x, kb_z = px + kb_ox, pz + kb_oz

    # Stand legs
    leg_l_ox, leg_l_oz = rotate_offset(-0.3, 0, pf)
    leg_r_ox, leg_r_oz = rotate_offset(0.3, 0, pf)
    add_cylinder("Kanban_Percy_Leg_L", (kb_x + leg_l_ox, 1.0, kb_z + leg_l_oz), 0.025, 0.025, 2.0, 6, mats["kanban_frame"])
    add_cylinder("Kanban_Percy_Leg_R", (kb_x + leg_r_ox, 1.0, kb_z + leg_r_oz), 0.025, 0.025, 2.0, 6, mats["kanban_frame"])
    # Cross bar
    bar = add_box("Kanban_Percy_Bar", (kb_x, 0.3, kb_z), (0.6, 0.04, 0.04), mats["kanban_frame"])
    bar.rotation_euler[2] = -pf
    # Board
    kanban_frame = add_box("Kanban_Percy_Frame", (kb_x, 2.2, kb_z), (0.7, 0.9, 0.04), mats["kanban_frame"])
    kanban_frame.rotation_euler[2] = -pf
    add_bevel(kanban_frame, width=0.01, segments=1)
    board = add_box("Kanban_Percy_Board", (kb_x, 2.2, kb_z), (0.65, 0.85, 0.02), mats["kanban_board"])
    board.rotation_euler[2] = -pf
    # Sticky notes on kanban
    for ki, (nox, noy) in enumerate([(-0.2, 0.2), (0.0, -0.1), (0.2, 0.15)]):
        note_rx, note_rz = rotate_offset(nox, 0, pf)
        add_box(f"Kanban_Percy_Note_{ki}", (kb_x + note_rx, 2.2 + noy, kb_z + note_rz), (0.12, 0.12, 0.01),
                mats["sticky_note"][ki % len(mats["sticky_note"])])

    # --- Forge's kanban ---
    # Forge at (-6, 0, 1), facing=pi. Behind = toward -Z (outer side of pod).
    forge = None
    for a in AGENTS:
        if a["id"] == "forge":
            forge = a
            break
    fx, _, fz = forge["position"]
    ff_kb = forge.get("facing", 0)
    # Place kanban to Forge's right side (outer side of pod)
    fk_ox, fk_oz = rotate_offset(1.8, -0.8, ff_kb)
    fk_x, fk_z = fx + fk_ox, fz + fk_oz
    # Stand legs
    fk_ll_ox, fk_ll_oz = rotate_offset(-0.3, 0, ff_kb)
    fk_lr_ox, fk_lr_oz = rotate_offset(0.3, 0, ff_kb)
    add_cylinder("Kanban_Forge_Leg_L", (fk_x + fk_ll_ox, 1.0, fk_z + fk_ll_oz), 0.025, 0.025, 2.0, 6, mats["kanban_frame"])
    add_cylinder("Kanban_Forge_Leg_R", (fk_x + fk_lr_ox, 1.0, fk_z + fk_lr_oz), 0.025, 0.025, 2.0, 6, mats["kanban_frame"])
    # Cross bar
    fk_bar = add_box("Kanban_Forge_Bar", (fk_x, 0.3, fk_z), (0.6, 0.04, 0.04), mats["kanban_frame"])
    fk_bar.rotation_euler[2] = -ff_kb
    # Board
    kanban_f = add_box("Kanban_Forge_Board", (fk_x, 2.2, fk_z), (0.7, 0.9, 0.04), mats["kanban_frame"])
    kanban_f.rotation_euler[2] = -ff_kb
    add_bevel(kanban_f, width=0.01, segments=1)
    add_box("Kanban_Forge_Surface", (fk_x, 2.2, fk_z), (0.65, 0.85, 0.02), mats["kanban_board"])
    # Sticky notes on kanban
    for ki, (nox, noy) in enumerate([(-0.2, 0.2), (0.0, -0.1), (0.2, 0.15)]):
        note_rx, note_rz = rotate_offset(nox, 0, ff_kb)
        add_box(f"Kanban_Forge_Note_{ki}", (fk_x + note_rx, 2.2 + noy, fk_z + note_rz), (0.12, 0.12, 0.01),
                mats["sticky_note"][(ki + 1) % len(mats["sticky_note"])])


def build_agent_desk_clutter(mats):
    """Enhancement 8: Agent-specific desk items, using facing-aware offsets."""
    print("  Building agent-specific desk clutter...")

    # Helper to get agent by id
    def get_agent(aid):
        for a in AGENTS:
            if a["id"] == aid:
                return a
        return None

    # --- Forge: Small wrench/tool shapes on desk ---
    forge = get_agent("forge")
    fx, _, fz = forge["position"]
    ff = forge.get("facing", 0)

    def frot(ox, oz):
        return rotate_offset(ox, oz, ff)

    # Wrench handle (flat box)
    th_ox, th_oz = frot(-0.6, 0.3)
    tool_h = add_box("Forge_Tool_Handle", (fx + th_ox, 1.58, fz + th_oz), (0.25, 0.02, 0.06), mats["tool_metal"])
    tool_h.rotation_euler[2] = -ff
    # Wrench head (wider flat box)
    wh_ox, wh_oz = frot(-0.42, 0.3)
    tool_w = add_box("Forge_Tool_Head", (fx + wh_ox, 1.58, fz + wh_oz), (0.08, 0.02, 0.12), mats["tool_metal"])
    tool_w.rotation_euler[2] = -ff
    # Screwdriver
    sh_ox, sh_oz = frot(-0.5, 0.15)
    sd_h = add_box("Forge_Tool_Screw_Handle", (fx + sh_ox, 1.58, fz + sh_oz), (0.2, 0.025, 0.04), mats["snack_box"])
    sd_h.rotation_euler[2] = -ff
    st_ox, st_oz = frot(-0.35, 0.15)
    sd_t = add_box("Forge_Tool_Screw_Tip", (fx + st_ox, 1.58, fz + st_oz), (0.12, 0.015, 0.02), mats["tool_metal"])
    sd_t.rotation_euler[2] = -ff

    # --- Sage: Stack of books on desk ---
    sage = get_agent("sage")
    sx, _, sz = sage["position"]
    sf = sage.get("facing", 0)

    for bi in range(3):
        bh = 0.04
        by = 1.58 + bi * bh
        b_ox, b_oz = rotate_offset(-0.7, 0.3, sf)
        book = add_box(f"Sage_Book_{bi}", (sx + b_ox, by, sz + b_oz),
                (0.3, bh, 0.22), mats["books"][(bi + 1) % len(mats["books"])])
        book.rotation_euler[2] = -sf

    # --- Pixel: Paint palette on desk ---
    pixel = get_agent("pixel")
    px_x, _, px_z = pixel["position"]
    pf = pixel.get("facing", 0)

    pal_ox, pal_oz = rotate_offset(0.6, 0.3, pf)
    palette = add_circle("Pixel_Palette", (px_x + pal_ox, 1.58, px_z + pal_oz), 0.15, 16, mats["palette"])
    # Color dots on palette
    palette_colors = ["#DD4444", "#4477DD", "#44BB66", "#EEBB44", "#ec4899"]
    for di, dc in enumerate(palette_colors):
        angle = di * (2 * math.pi / len(palette_colors))
        dot_ox = math.cos(angle) * 0.09
        dot_oz = math.sin(angle) * 0.09
        dot_x = px_x + pal_ox + dot_ox
        dot_z = px_z + pal_oz + dot_oz
        dot_mat = create_material(f"PaletteDot_{di}", dc, roughness=0.5)
        add_circle(f"Pixel_PaletteDot_{di}", (dot_x, 1.585, dot_z), 0.025, 8, dot_mat)

    # --- Scout: Binoculars on desk ---
    scout = get_agent("scout")
    sc_x, _, sc_z = scout["position"]
    scf = scout.get("facing", 0)

    bl_ox, bl_oz = rotate_offset(-0.65, 0.35, scf)
    br_ox, br_oz = rotate_offset(-0.55, 0.35, scf)
    bb_ox, bb_oz = rotate_offset(-0.6, 0.35, scf)
    add_cylinder("Scout_Bino_L", (sc_x + bl_ox, 1.60, sc_z + bl_oz), 0.04, 0.05, 0.12, 8, mats["binocular"])
    add_cylinder("Scout_Bino_R", (sc_x + br_ox, 1.60, sc_z + br_oz), 0.04, 0.05, 0.12, 8, mats["binocular"])
    bridge = add_box("Scout_Bino_Bridge", (sc_x + bb_ox, 1.60, sc_z + bb_oz), (0.06, 0.03, 0.04), mats["binocular"])
    bridge.rotation_euler[2] = -scf

    # --- Relay: Extra monitor on desk ---
    relay = get_agent("relay")
    rx, _, rz = relay["position"]
    rf = relay.get("facing", 0)

    mon2_ox, mon2_oz = rotate_offset(-0.8, -0.35, rf)
    relay_mon_mat = create_material("Monitor2_Relay", "#111111",
                                     emissive_hex="#06b6d4", emissive_strength=1.5,
                                     roughness=0.2, metallic=0.5)
    mon2 = add_box("Monitor2_Relay", (rx + mon2_ox, 2.05, rz + mon2_oz), (0.6, 0.45, 0.05), relay_mon_mat)
    mon2.rotation_euler[2] = -rf
    # Stand for second monitor
    ms_ox, ms_oz = rotate_offset(-0.8, -0.35, rf)
    add_box("Monitor2Stand_Relay", (rx + ms_ox, 1.73, rz + ms_oz), (0.04, 0.25, 0.04), mats["desk_leg"])
    mb_ox, mb_oz = rotate_offset(-0.8, -0.35, rf)
    mb = add_box("Monitor2Base_Relay", (rx + mb_ox, 1.58, rz + mb_oz), (0.25, 0.03, 0.15), mats["desk_leg"])
    mb.rotation_euler[2] = -rf


def build_agent_scene_props(mats):
    """Build large context-specific floor props next to each agent's workstation."""
    print("  Building agent scene props...")

    # Helper to get agent by id
    def get_agent(aid):
        for a in AGENTS:
            if a["id"] == aid:
                return a
        return None

    # ---------------------------------------------------------------
    # PERCY (Commander) — Free-standing Whiteboard / Strategy Board
    # Percy at (-4, 0, -9) facing 0 (+Z). Kanban is to his RIGHT (+1.8).
    # Put whiteboard to his LEFT side.
    # ---------------------------------------------------------------
    percy = get_agent("percy")
    px, _, pz = percy["position"]
    pf = percy.get("facing", 0)

    def prot(ox, oz):
        return rotate_offset(ox, oz, pf)

    # Whiteboard stand — to Percy's LEFT (negative X when facing 0)
    wb_ox, wb_oz = prot(-2.0, -0.3)
    wb_x, wb_z = px + wb_ox, pz + wb_oz

    # Rolling stand legs (two vertical poles)
    leg_l_ox, leg_l_oz = prot(-0.35, 0)
    leg_r_ox, leg_r_oz = prot(0.35, 0)
    add_cylinder("Percy_WB_Leg_L", (wb_x + leg_l_ox, 1.2, wb_z + leg_l_oz),
                 0.025, 0.025, 2.4, 6, mats["desk_leg"])
    add_cylinder("Percy_WB_Leg_R", (wb_x + leg_r_ox, 1.2, wb_z + leg_r_oz),
                 0.025, 0.025, 2.4, 6, mats["desk_leg"])
    # Cross bar at bottom
    bar = add_box("Percy_WB_CrossBar", (wb_x, 0.15, wb_z), (0.8, 0.04, 0.04), mats["desk_leg"])
    bar.rotation_euler[2] = -pf
    # Caster wheels (4 small spheres)
    for wi, (wox, woz) in enumerate([(-0.35, -0.06), (-0.35, 0.06), (0.35, -0.06), (0.35, 0.06)]):
        rwox, rwoz = prot(wox, woz)
        add_sphere(f"Percy_WB_Wheel_{wi}", (wb_x + rwox, 0.04, wb_z + rwoz), 0.04, 6, mats["desk_leg"])
    # Whiteboard frame
    wb_frame = add_box("Percy_WB_Frame", (wb_x, 2.0, wb_z), (1.3, 1.0, 0.06), mats["whiteboard_frame"])
    wb_frame.rotation_euler[2] = -pf
    add_bevel(wb_frame, width=0.01, segments=1)
    # Whiteboard surface — offset slightly in front of frame so white surface is visible
    surf_ox, surf_oz = prot(0, -0.02)
    wb_board = add_box("Percy_WB_Surface", (wb_x + surf_ox, 2.0, wb_z + surf_oz), (1.2, 0.9, 0.02), mats["whiteboard"])
    wb_board.rotation_euler[2] = -pf
    # Tray at bottom of whiteboard
    tray_ox, tray_oz = prot(0, 0.04)
    tray = add_box("Percy_WB_Tray", (wb_x + tray_ox, 1.5, wb_z + tray_oz), (1.0, 0.04, 0.08), mats["desk_leg"])
    tray.rotation_euler[2] = -pf
    # Markers on the tray
    marker_colors = ["#DD4444", "#3377DD", "#44AA44"]
    for mi, mc in enumerate(marker_colors):
        m_ox, m_oz = prot(-0.3 + mi * 0.15, 0.04)
        marker_mat = create_material(f"Percy_WB_Marker_{mi}", mc, roughness=0.5)
        marker = add_cylinder(f"Percy_WB_Marker_{mi}", (wb_x + m_ox, 1.55, wb_z + m_oz),
                              0.012, 0.012, 0.1, 6, marker_mat)
        marker.rotation_euler[0] += math.pi / 2
    # Strategy diagram — colored strips on the whiteboard surface
    diagram_items = [
        # (ox_from_center, oy_from_center, width, height, color)
        (-0.25, 0.2, 0.3, 0.06, "#3b82f6"),   # blue box
        (0.2, 0.2, 0.3, 0.06, "#10b981"),      # green box
        (-0.05, -0.1, 0.25, 0.06, "#f59e0b"),  # yellow box
        (0.3, -0.1, 0.2, 0.06, "#8b5cf6"),     # purple box
        # connecting lines (thin)
        (0.0, 0.12, 0.5, 0.015, "#DD4444"),    # red line
        (-0.1, 0.0, 0.015, 0.3, "#3377DD"),    # blue vertical line
    ]
    for di, (dox, doy, dw, dh, dc) in enumerate(diagram_items):
        d_mat = create_material(f"Percy_WB_Diag_{di}", dc, roughness=0.4)
        d_rx, d_rz = prot(dox, -0.025)  # slightly in front of board surface
        add_box(f"Percy_WB_Diag_{di}", (wb_x + d_rx, 2.0 + doy, wb_z + d_rz), (dw, dh, 0.005), d_mat)

    # ---------------------------------------------------------------
    # SCOUT (Researcher) — Corkboard + Telescope on Tripod
    # Scout at (7, 0, -5) facing pi (-Z). Props go on outer side (-Z).
    # ---------------------------------------------------------------
    scout = get_agent("scout")
    sc_x, _, sc_z = scout["position"]
    scf = scout.get("facing", 0)

    def srot(ox, oz):
        return rotate_offset(ox, oz, scf)

    # --- Corkboard on stand --- (outer side of pod, to Scout's right toward -Z)
    cb_ox, cb_oz = srot(2.0, 0.5)
    cb_x, cb_z = sc_x + cb_ox, sc_z + cb_oz

    # Stand legs
    cb_ll_ox, cb_ll_oz = srot(-0.25, 0)
    cb_lr_ox, cb_lr_oz = srot(0.25, 0)
    add_cylinder("Scout_CB_Leg_L", (cb_x + cb_ll_ox, 1.0, cb_z + cb_ll_oz),
                 0.02, 0.02, 2.0, 6, mats["desk_leg"])
    add_cylinder("Scout_CB_Leg_R", (cb_x + cb_lr_ox, 1.0, cb_z + cb_lr_oz),
                 0.02, 0.02, 2.0, 6, mats["desk_leg"])
    # Corkboard
    cork_frame = add_box("Scout_CB_Frame", (cb_x, 2.2, cb_z), (0.9, 0.7, 0.06), mats["desk_leg"])
    cork_frame.rotation_euler[2] = -scf
    add_bevel(cork_frame, width=0.01, segments=1)
    cork_board = add_box("Scout_CB_Surface", (cb_x, 2.2, cb_z), (0.8, 0.6, 0.04), mats["corkboard"])
    cork_board.rotation_euler[2] = -scf
    # Pinned items — small colored rectangles at various angles
    pin_items = [
        (-0.2, 0.15, 0.12, 0.08, "#FFE855", 0.2),
        (0.15, 0.1, 0.1, 0.14, "#FF99BB", -0.3),
        (-0.1, -0.12, 0.14, 0.06, "#88CCFF", 0.1),
        (0.25, -0.1, 0.08, 0.1, "#99DD88", -0.15),
        (-0.25, -0.05, 0.06, 0.08, "#FFE855", 0.4),
    ]
    for pi_idx, (pox, poy, pw, ph, pc, pa) in enumerate(pin_items):
        pin_mat = create_material(f"Scout_Pin_{pi_idx}", pc, roughness=0.8)
        p_rx, p_rz = srot(pox, -0.035)
        pin = add_box(f"Scout_Pin_{pi_idx}", (cb_x + p_rx, 2.2 + poy, cb_z + p_rz),
                      (pw, ph, 0.003), pin_mat)
        pin.rotation_euler[2] = -scf + pa
    # Push pins (tiny colored spheres)
    for pi_idx, (pox, poy, pc) in enumerate([(-0.2, 0.22, "#DD4444"), (0.15, 0.2, "#DD4444"),
                                              (-0.1, -0.05, "#EEBB44"), (0.25, -0.03, "#EEBB44")]):
        pin_head_mat = create_material(f"Scout_PinHead_{pi_idx}", pc, roughness=0.3, metallic=0.2)
        ph_rx, ph_rz = srot(pox, -0.06)
        add_sphere(f"Scout_PinHead_{pi_idx}", (cb_x + ph_rx, 2.2 + poy, cb_z + ph_rz), 0.02, 6, pin_head_mat)

    # --- Telescope on tripod ---
    ts_ox, ts_oz = srot(-2.0, 0.5)
    ts_x, ts_z = sc_x + ts_ox, sc_z + ts_oz

    # Tripod legs (3 cylinders angled outward)
    tripod_angles = [0, 2 * math.pi / 3, 4 * math.pi / 3]
    for ti, ta in enumerate(tripod_angles):
        tl_ox = math.cos(ta + scf) * 0.3
        tl_oz = math.sin(ta + scf) * 0.3
        leg = add_cylinder(f"Scout_Tripod_Leg_{ti}", (ts_x + tl_ox, 0.8, ts_z + tl_oz),
                           0.015, 0.015, 1.8, 6, mats["desk_leg"])
        # Angle outward
        leg.rotation_euler[0] += math.sin(ta + scf) * 0.2
        leg.rotation_euler[1] += -math.cos(ta + scf) * 0.2
    # Telescope tube (main cylinder, angled upward)
    tube = add_cylinder("Scout_Telescope_Tube", (ts_x, 1.8, ts_z),
                        0.04, 0.06, 0.8, 10, mats["binocular"])
    tube.rotation_euler[0] += 0.4  # tilt upward
    tube.rotation_euler[2] = -scf + 0.3
    # Objective lens (wider end)
    lens_ox, lens_oz = srot(0, -0.3)
    add_cylinder("Scout_Telescope_Lens", (ts_x + lens_ox, 2.1, ts_z + lens_oz),
                 0.07, 0.07, 0.04, 12, mats["window_glass"])
    # Eyepiece (small cylinder at back)
    ep_ox, ep_oz = srot(0, 0.25)
    add_cylinder("Scout_Telescope_Eyepiece", (ts_x + ep_ox, 1.6, ts_z + ep_oz),
                 0.02, 0.03, 0.1, 8, mats["binocular"])

    # ---------------------------------------------------------------
    # PIXEL (Art Director) — Painting Easel + Canvas + Palette
    # Pixel at (-10, 0, -3) facing pi/2 (+X).
    # ---------------------------------------------------------------
    pixel = get_agent("pixel")
    px_x, _, px_z = pixel["position"]
    pxf = pixel.get("facing", 0)

    def xrot(ox, oz):
        return rotate_offset(ox, oz, pxf)

    # --- Easel (floor-standing, ~3.0 units tall) ---
    # Place to Pixel's left side (which is toward back wall when facing +X)
    ea_ox, ea_oz = xrot(-1.8, 0.8)
    ea_x, ea_z = px_x + ea_ox, px_z + ea_oz

    # A-frame legs (two front, one back) — 3.0 units tall, base at y=0
    front_l_ox, front_l_oz = xrot(-0.3, -0.25)
    front_r_ox, front_r_oz = xrot(0.3, -0.25)
    back_ox, back_oz = xrot(0, 0.5)
    fl = add_cylinder("Pixel_Easel_FrontL", (ea_x + front_l_ox, 1.5, ea_z + front_l_oz),
                      0.03, 0.03, 3.0, 6, mats["easel_wood"])
    fl.rotation_euler[0] += math.sin(pxf) * 0.06
    fl.rotation_euler[1] += -math.cos(pxf) * 0.06
    fr = add_cylinder("Pixel_Easel_FrontR", (ea_x + front_r_ox, 1.5, ea_z + front_r_oz),
                      0.03, 0.03, 3.0, 6, mats["easel_wood"])
    fr.rotation_euler[0] += math.sin(pxf) * 0.06
    fr.rotation_euler[1] += -math.cos(pxf) * 0.06
    bl = add_cylinder("Pixel_Easel_Back", (ea_x + back_ox, 1.4, ea_z + back_oz),
                      0.03, 0.03, 2.8, 6, mats["easel_wood"])
    bl.rotation_euler[0] += -math.sin(pxf) * 0.18
    bl.rotation_euler[1] += math.cos(pxf) * 0.18
    # Cross brace between front legs (mid-height)
    brace_ox, brace_oz = xrot(0, -0.25)
    brace = add_box("Pixel_Easel_Brace", (ea_x + brace_ox, 1.0, ea_z + brace_oz),
                    (0.7, 0.04, 0.04), mats["easel_wood"])
    brace.rotation_euler[2] = -pxf
    # Canvas rest ledge — matches new height
    rest_ox, rest_oz = xrot(0, -0.15)
    rest = add_box("Pixel_Easel_Rest", (ea_x + rest_ox, 1.85, ea_z + rest_oz),
                   (1.0, 0.05, 0.08), mats["easel_wood"])
    rest.rotation_euler[2] = -pxf
    # Canvas on the easel — 0.9 wide x 0.7 tall, centered at y=2.2
    canvas_ox, canvas_oz = xrot(0, -0.18)
    canvas = add_box("Pixel_Easel_Canvas", (ea_x + canvas_ox, 2.2, ea_z + canvas_oz),
                     (0.9, 0.7, 0.03), mats["canvas"])
    canvas.rotation_euler[2] = -pxf
    add_bevel(canvas, width=0.01, segments=1)
    # Paint splotches on canvas — large and colorful
    splotch_colors = ["#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#DD4444", "#EEBB44"]
    splotch_positions = [(-0.25, 0.18), (0.2, -0.1), (-0.05, 0.0), (0.3, 0.22), (-0.3, -0.18), (0.1, 0.25), (-0.15, -0.08)]
    for si, ((sox, soy), sc) in enumerate(zip(splotch_positions, splotch_colors)):
        sp_mat = create_material(f"Pixel_Splotch_{si}", sc, roughness=0.6)
        sp_rx, sp_rz = xrot(sox, -0.21)
        add_sphere(f"Pixel_Splotch_{si}", (ea_x + sp_rx, 2.2 + soy, ea_z + sp_rz),
                   0.08 + si * 0.01, 6, sp_mat)

    # --- Large freestanding palette on a small stool ---
    stool_ox, stool_oz = xrot(-1.5, -0.5)
    stool_x, stool_z = px_x + stool_ox, px_z + stool_oz
    # Stool (small cylinder seat + legs)
    add_cylinder("Pixel_Stool_Seat", (stool_x, 0.9, stool_z), 0.25, 0.25, 0.04, 8, mats["easel_wood"])
    for sli in range(3):
        sa = sli * (2 * math.pi / 3)
        sl_x = stool_x + math.cos(sa) * 0.18
        sl_z = stool_z + math.sin(sa) * 0.18
        add_cylinder(f"Pixel_Stool_Leg_{sli}", (sl_x, 0.44, sl_z), 0.02, 0.02, 0.88, 6, mats["easel_wood"])
    # Palette on stool
    add_circle("Pixel_BigPalette", (stool_x, 0.94, stool_z), 0.2, 16, mats["palette"])
    # Color blobs on palette
    for di, dc in enumerate(["#DD4444", "#4477DD", "#44BB66", "#EEBB44", "#ec4899", "#FFFFFF"]):
        a = di * (2 * math.pi / 6)
        dx = math.cos(a) * 0.12
        dz = math.sin(a) * 0.12
        blob_mat = create_material(f"Pixel_BigPalDot_{di}", dc, roughness=0.5)
        add_circle(f"Pixel_BigPalDot_{di}", (stool_x + dx, 0.95, stool_z + dz), 0.03, 8, blob_mat)

    # --- Paint brushes in a cup on the floor ---
    cup_ox, cup_oz = xrot(-2.2, 0.3)
    cup_x, cup_z = px_x + cup_ox, px_z + cup_oz
    add_cylinder("Pixel_BrushCup", (cup_x, 0.12, cup_z), 0.06, 0.05, 0.24, 8, mats["pencil_cup"])
    # Brushes sticking up
    brush_colors = ["#ec4899", "#3b82f6", "#f59e0b"]
    for bi, bc in enumerate(brush_colors):
        bx_off = (bi - 1) * 0.025
        brush_mat = create_material(f"Pixel_Brush_{bi}", bc, roughness=0.6)
        add_cylinder(f"Pixel_Brush_{bi}", (cup_x + bx_off, 0.35, cup_z),
                     0.008, 0.008, 0.22, 6, mats["easel_wood"])
        # Brush tip
        add_sphere(f"Pixel_BrushTip_{bi}", (cup_x + bx_off, 0.47, cup_z), 0.012, 6, brush_mat)

    # ---------------------------------------------------------------
    # FORGE (Engineer) — Workbench with 3D Printer + Pegboard
    # Forge at (-6, 0, 1) facing pi (-Z). Props go on outer side (-Z).
    # ---------------------------------------------------------------
    forge = get_agent("forge")
    fg_x, _, fg_z = forge["position"]
    fgf = forge.get("facing", 0)

    def fgrot(ox, oz):
        return rotate_offset(ox, oz, fgf)

    # --- Side workbench ---
    bench_ox, bench_oz = fgrot(-2.0, 0.5)
    bench_x, bench_z = fg_x + bench_ox, fg_z + bench_oz

    # Workbench top (lower than desk — 1.0 height)
    bench_top = add_box("Forge_Bench_Top", (bench_x, 1.0, bench_z), (1.4, 0.08, 0.7), mats["workbench"])
    bench_top.rotation_euler[2] = -fgf
    add_bevel(bench_top, width=0.015, segments=1)
    # Bench legs
    bench_legs = [(-0.6, -0.3), (-0.6, 0.3), (0.6, -0.3), (0.6, 0.3)]
    for bli, (blox, bloz) in enumerate(bench_legs):
        bl_rx, bl_rz = fgrot(blox, bloz)
        add_box(f"Forge_Bench_Leg_{bli}", (bench_x + bl_rx, 0.5, bench_z + bl_rz),
                (0.06, 1.0, 0.06), mats["workbench"])

    # --- 3D Printer on workbench ---
    pr_ox, pr_oz = fgrot(0.2, 0)
    pr_x, pr_z = bench_x + pr_ox, bench_z + pr_oz
    # Printer frame (wireframe box — use 4 vertical posts + top frame)
    printer_w, printer_d, printer_h = 0.5, 0.4, 0.5
    # Corner posts
    corners_3dp = [(-0.25, -0.2), (-0.25, 0.2), (0.25, -0.2), (0.25, 0.2)]
    for ci, (cox, coz) in enumerate(corners_3dp):
        c_rx, c_rz = fgrot(cox, coz)
        add_box(f"Forge_3DP_Post_{ci}", (pr_x + c_rx, 1.3, pr_z + c_rz),
                (0.03, 0.5, 0.03), mats["desk_leg"])
    # Top frame bars
    top_bars = [
        (0, -0.2, 0.5, 0.03, 0.03),    # front
        (0, 0.2, 0.5, 0.03, 0.03),      # back
        (-0.25, 0, 0.03, 0.03, 0.4),    # left
        (0.25, 0, 0.03, 0.03, 0.4),     # right
    ]
    for tbi, (tbox, tboz, tbw, tbh, tbd) in enumerate(top_bars):
        tb_rx, tb_rz = fgrot(tbox, tboz)
        tb = add_box(f"Forge_3DP_TopBar_{tbi}", (pr_x + tb_rx, 1.56, pr_z + tb_rz),
                     (tbw, tbh, tbd), mats["desk_leg"])
        tb.rotation_euler[2] = -fgf
    # Print bed (flat plate)
    bed_ox, bed_oz = fgrot(0, 0)
    bed = add_box("Forge_3DP_Bed", (pr_x + bed_ox, 1.1, pr_z + bed_oz),
                  (0.4, 0.02, 0.3), mats["desk_leg"])
    bed.rotation_euler[2] = -fgf
    # Extruder nozzle (small cylinder above bed)
    add_cylinder("Forge_3DP_Nozzle", (pr_x, 1.35, pr_z), 0.02, 0.015, 0.08, 6, mats["tool_metal"])

    # --- Pegboard near workbench (outer side of Forge's pod, toward -Z) ---
    peg_ox, peg_oz = fgrot(-1.5, 1.5)
    peg_x, peg_z = fg_x + peg_ox, fg_z + peg_oz
    pegboard = add_box("Forge_Pegboard", (peg_x, 2.5, peg_z), (1.2, 1.5, 0.08), mats["pegboard"])
    pegboard.rotation_euler[2] = -fgf
    add_bevel(pegboard, width=0.01, segments=1)
    # Small hooks/tool silhouettes on pegboard
    hook_positions = [(0.3, 0.4), (0.3, 0.0), (0.3, -0.3), (-0.2, 0.3), (-0.2, -0.2)]
    for hi, (hoy, hox) in enumerate(hook_positions):
        h_rx, h_rz = fgrot(hox, -0.06)
        add_box(f"Forge_PegHook_{hi}", (peg_x + h_rx, 2.5 + hoy, peg_z + h_rz),
                (0.06, 0.03, 0.03), mats["tool_metal"])

    # --- Scattered nuts/bolts on workbench ---
    bolt_positions = [(-0.4, 0.1), (-0.3, -0.15), (0.5, 0.2), (0.4, -0.1)]
    for ni, (nox, noz) in enumerate(bolt_positions):
        n_rx, n_rz = fgrot(nox, noz)
        add_cylinder(f"Forge_Bolt_{ni}", (bench_x + n_rx, 1.06, bench_z + n_rz),
                     0.015, 0.015, 0.025, 6, mats["tool_metal"])

    # ---------------------------------------------------------------
    # SAGE (Critic) — Tall Bookcase + Standing Lamp + Magnifying Glass
    # Sage at (7, 0, -2) facing 0 (+Z). Props go on outer side (+Z).
    # ---------------------------------------------------------------
    sage = get_agent("sage")
    sg_x, _, sg_z = sage["position"]
    sgf = sage.get("facing", 0)

    def sgrot(ox, oz):
        return rotate_offset(ox, oz, sgf)

    # --- Tall narrow bookcase --- (outer side of Sage's pod, toward +Z)
    bc_ox, bc_oz = sgrot(-2.0, 0.8)
    bc_x, bc_z = sg_x + bc_ox, sg_z + bc_oz

    # Bookcase frame (two side panels)
    for side_ox in [-0.3, 0.3]:
        s_rx, s_rz = sgrot(side_ox, 0)
        panel = add_box(f"Sage_Bookcase_Panel_{side_ox}", (bc_x + s_rx, 2.0, bc_z + s_rz),
                        (0.06, 4.0, 0.5), mats["bookshelf"])
        panel.rotation_euler[2] = -sgf
        add_bevel(panel, width=0.01, segments=1)
    # Back panel
    back_rx, back_rz = sgrot(0, 0.22)
    back_p = add_box("Sage_Bookcase_Back", (bc_x + back_rx, 2.0, bc_z + back_rz),
                     (0.6, 3.8, 0.04), mats["bookshelf"])
    back_p.rotation_euler[2] = -sgf
    # Shelves
    for si, sy in enumerate([0.2, 1.0, 1.8, 2.6, 3.4]):
        shelf = add_box(f"Sage_Bookcase_Shelf_{si}", (bc_x, sy, bc_z),
                        (0.6, 0.06, 0.5), mats["bookshelf"])
        shelf.rotation_euler[2] = -sgf
    # Books on shelves
    sage_book_idx = 0
    for sy in [0.2, 1.0, 1.8, 2.6, 3.4]:
        bk_x_start = -0.22
        count = random.randint(3, 5)
        for b in range(count):
            bw = 0.05 + random.random() * 0.06
            bh = 0.3 + random.random() * 0.45
            bk_ox = bk_x_start + bw / 2
            bk_rx, bk_rz = sgrot(bk_ox, 0)
            bk_mat = mats["books"][(sage_book_idx + 3) % len(mats["books"])]
            add_box(f"Sage_Book_{sage_book_idx}", (bc_x + bk_rx, sy + 0.06 + bh / 2, bc_z + bk_rz),
                    (bw, bh, 0.35), bk_mat)
            bk_x_start += bw + 0.02
            sage_book_idx += 1

    # --- Standing reading lamp ---
    lamp_ox, lamp_oz = sgrot(2.0, 0.5)
    lamp_x, lamp_z = sg_x + lamp_ox, sg_z + lamp_oz
    # Tall pole
    add_cylinder("Sage_FloorLamp_Pole", (lamp_x, 2.2, lamp_z), 0.02, 0.02, 4.4, 8, mats["lamp_base"])
    # Base disc
    add_cylinder("Sage_FloorLamp_Base", (lamp_x, 0.03, lamp_z), 0.25, 0.25, 0.06, 12, mats["lamp_base"])
    # Shade (cone at top)
    shade_mat = create_material("Sage_LampShade", "#E8D8C0", roughness=0.85)
    add_cylinder("Sage_FloorLamp_Shade", (lamp_x, 4.3, lamp_z), 0.2, 0.0, 0.3, 10, shade_mat)

    # --- Side table with magnifying glass + review papers ---
    st_ox, st_oz = sgrot(-1.2, 0.8)
    st_x, st_z = sg_x + st_ox, sg_z + st_oz
    # Small side table
    st_top = add_box("Sage_SideTable_Top", (st_x, 1.0, st_z), (0.5, 0.04, 0.4), mats["desk"])
    st_top.rotation_euler[2] = -sgf
    for stli in range(4):
        stl_ox = (-0.2 if stli % 2 == 0 else 0.2)
        stl_oz = (-0.15 if stli < 2 else 0.15)
        stl_rx, stl_rz = sgrot(stl_ox, stl_oz)
        add_box(f"Sage_SideTable_Leg_{stli}", (st_x + stl_rx, 0.5, st_z + stl_rz),
                (0.04, 1.0, 0.04), mats["desk_leg"])
    # Stack of review papers
    for pi in range(4):
        p_rx, p_rz = sgrot(0.05, 0)
        paper = add_box(f"Sage_Paper_{pi}", (st_x + p_rx, 1.04 + pi * 0.02, st_z + p_rz),
                        (0.3, 0.015, 0.22), mats["paper_stack"])
        paper.rotation_euler[2] = -sgf + (pi * 0.08)
    # Magnifying glass on side table
    mg_ox, mg_oz = sgrot(-0.12, 0.05)
    # Handle
    mg_handle = add_cylinder("Sage_MagGlass_Handle", (st_x + mg_ox, 1.12, st_z + mg_oz),
                             0.015, 0.015, 0.15, 6, mats["desk_leg"])
    mg_handle.rotation_euler[0] += math.pi / 2
    mg_handle.rotation_euler[2] = -sgf
    # Lens ring
    lens_rx, lens_rz = sgrot(-0.12, -0.08)
    add_ring("Sage_MagGlass_Ring", (st_x + lens_rx, 1.12, st_z + lens_rz),
             0.04, 0.055, 16, mats["lamp_base"])

    # ---------------------------------------------------------------
    # RELAY (Ops) — Server Rack + UPS
    # Relay at (-6, 0, 4) facing 0 (+Z). Props go on outer side (+Z).
    # ---------------------------------------------------------------
    relay = get_agent("relay")
    rl_x, _, rl_z = relay["position"]
    rlf = relay.get("facing", 0)

    def rlrot(ox, oz):
        return rotate_offset(ox, oz, rlf)

    # --- Server rack --- (outer side of Relay's pod, toward +Z)
    rack_ox, rack_oz = rlrot(-2.0, 0.8)
    rack_x, rack_z = rl_x + rack_ox, rl_z + rack_oz

    # Main rack body (tall dark box)
    rack = add_box("Relay_Rack_Body", (rack_x, 1.25, rack_z), (0.6, 2.5, 0.4), mats["server_rack"])
    rack.rotation_euler[2] = -rlf
    add_bevel(rack, width=0.015, segments=1)
    # Rack rails (thin vertical lines on front)
    for rail_ox in [-0.25, 0.25]:
        r_rx, r_rz = rlrot(rail_ox, -0.21)
        add_box(f"Relay_Rack_Rail_{rail_ox}", (rack_x + r_rx, 1.25, rack_z + r_rz),
                (0.02, 2.3, 0.02), mats["desk_leg"])
    # Server units (horizontal bars representing rack-mounted equipment)
    for ui in range(5):
        u_y = 0.4 + ui * 0.45
        u_rx, u_rz = rlrot(0, -0.15)
        unit = add_box(f"Relay_Rack_Unit_{ui}", (rack_x + u_rx, u_y, rack_z + u_rz),
                       (0.5, 0.08, 0.3), mats["desk_leg"])
        unit.rotation_euler[2] = -rlf
    # LED indicators on the front face
    led_positions = [
        (-0.15, 0.5, "green"), (0.0, 0.5, "green"), (0.15, 0.5, "yellow"),
        (-0.15, 0.95, "green"), (0.0, 0.95, "green"), (0.15, 0.95, "green"),
        (-0.15, 1.4, "green"), (0.0, 1.4, "yellow"), (0.15, 1.4, "green"),
        (-0.15, 1.85, "green"), (0.0, 1.85, "green"), (0.15, 1.85, "green"),
        (-0.15, 2.3, "yellow"), (0.0, 2.3, "green"), (0.15, 2.3, "green"),
    ]
    for li, (lox, loy, lcolor) in enumerate(led_positions):
        led_rx, led_rz = rlrot(lox, -0.21)
        led_mat = mats["led_green"] if lcolor == "green" else mats["led_yellow"]
        add_sphere(f"Relay_LED_{li}", (rack_x + led_rx, loy, rack_z + led_rz),
                   0.012, 6, led_mat)

    # --- Cables coming out the back ---
    for ci in range(4):
        cable_rox, cable_roz = rlrot((ci - 1.5) * 0.1, 0.22)
        cable = add_cylinder(f"Relay_Cable_{ci}",
                             (rack_x + cable_rox, 0.8 + ci * 0.3, rack_z + cable_roz),
                             0.012, 0.012, 0.5, 6, mats["cable"])
        # Angle cables downward and outward
        cable.rotation_euler[0] += math.sin(rlf) * 0.4
        cable.rotation_euler[1] += -math.cos(rlf) * 0.4

    # --- UPS unit on floor next to rack (outer side) ---
    ups_ox, ups_oz = rlrot(-0.6, 0.3)
    ups_x, ups_z = rack_x + ups_ox, rack_z + ups_oz
    ups = add_box("Relay_UPS", (ups_x, 0.4, ups_z), (0.35, 0.8, 0.3), mats["server_rack"])
    ups.rotation_euler[2] = -rlf
    add_bevel(ups, width=0.01, segments=1)
    # UPS status LED
    ups_led_rx, ups_led_rz = rlrot(0, -0.16)
    add_sphere("Relay_UPS_LED", (ups_x + ups_led_rx, 0.6, ups_z + ups_led_rz), 0.015, 6, mats["led_green"])
    # UPS label (small colored strip)
    ups_label_rx, ups_label_rz = rlrot(0, -0.16)
    ups_label = add_box("Relay_UPS_Label", (ups_x + ups_label_rx, 0.4, ups_z + ups_label_rz),
                        (0.15, 0.04, 0.01), mats["whiteboard"])
    ups_label.rotation_euler[2] = -rlf


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
            wire.rotation_euler[0] = -angle

        # Bulbs every other point
        if i % 2 == 0:
            bulb_mat = bulb_colors[(i + 2) % len(bulb_colors)]
            add_sphere(f"StringLight2_Bulb_{i}", (x, y - 0.15, z), 0.1, 6, bulb_mat)

## LED strips removed

def build_mugs(mats):
    """Build coffee mugs on select desks, using facing-aware offsets."""
    print("  Building mugs...")

    # Mug agents and their desk offsets
    mug_agents = [
        ("percy", 0.7, 0.3),     # Percy's desk — right side, front
        ("sage", 0.7, 0.3),      # Sage's desk
        ("forge", 0.7, 0.3),     # Forge's desk
    ]

    for i, (aid, mox, moz) in enumerate(mug_agents):
        agent = None
        for a in AGENTS:
            if a["id"] == aid:
                agent = a
                break
        if not agent:
            continue
        ax, _, az = agent["position"]
        facing = agent.get("facing", 0)
        rx, rz = rotate_offset(mox, moz, facing)
        add_cylinder(f"Mug_{i}", (ax + rx, 1.57, az + rz), 0.06, 0.05, 0.12, 8, mats["mug"])

# ============================================================
# OFFICE PROPS — make it feel lived-in
# ============================================================

def build_kitchenette(mats):
    """Build kitchen area: counter, coffee machine, mini fridge — moved to back wall area."""
    print("  Building kitchenette...")

    # Moved kitchenette further along back wall to avoid Pixel's desk at (-10, 0, -4)
    # Counter along back-left wall area at z=-9 region
    counter = add_box("Counter", (-10.5, 1.2, -9), (2.0, 0.1, 0.8), mats["counter"])
    add_bevel(counter, width=0.015, segments=2)
    # Counter legs
    for ox, oz in [(-0.9, -0.3), (-0.9, 0.3), (0.9, -0.3), (0.9, 0.3)]:
        add_box(f"CounterLeg_{ox}_{oz}", (-10.5 + ox, 0.6, -9 + oz), (0.06, 1.2, 0.06), mats["desk_leg"])

    # --- Coffee machine on counter ---
    add_box("CoffeeMachine_Body", (-10.8, 1.55, -9), (0.4, 0.6, 0.3), mats["coffee_machine"])
    add_box("CoffeeMachine_Drip", (-10.8, 1.3, -8.85), (0.3, 0.05, 0.15), mats["desk_leg"])
    add_cylinder("CoffeePot", (-10.8, 1.38, -8.85), 0.1, 0.08, 0.15, 8, mats["coffee_pot"])
    add_cylinder("CoffeeLiquid", (-10.8, 1.35, -8.85), 0.08, 0.07, 0.08, 8, mats["coffee_liquid"])

    # Extra mugs near coffee machine
    add_cylinder("KitchenMug_0", (-10.2, 1.32, -8.9), 0.06, 0.05, 0.12, 8, mats["mug"])
    add_cylinder("KitchenMug_1", (-10.1, 1.32, -9.1), 0.06, 0.05, 0.12, 8, mats["mug"])

    # --- Mini fridge against left wall, further back ---
    fridge = add_box("Fridge_Body", (-11.4, 0.9, -8), (1.0, 1.8, 0.7), mats["fridge"])
    add_bevel(fridge, width=0.02, segments=2)
    add_box("Fridge_Handle", (-10.85, 1.1, -8), (0.04, 0.4, 0.06), mats["fridge_handle"])
    add_box("Fridge_Top", (-11.4, 1.82, -8), (1.02, 0.04, 0.72), mats["desk_leg"])

    # Small plant on top of fridge
    add_cylinder("FridgePlant_Pot", (-11.4, 2.0, -8), 0.15, 0.12, 0.2, 8, mats["pot"])
    add_cylinder("FridgePlant_Trunk", (-11.4, 2.2, -8), 0.03, 0.04, 0.15, 6, mats["trunk"])
    add_ico_sphere("FridgePlant_Leaf", (-11.4, 2.4, -8), 0.2, 2, mats["plant"])

    # --- Additional kitchenette details ---
    add_box("Napkin_Holder", (-9.8, 1.3, -8.8), (0.08, 0.15, 0.12), mats["napkin"])
    add_box("Snack_Box", (-9.7, 1.35, -9.2), (0.25, 0.18, 0.15), mats["snack_box"])
    add_box("Snack_Label", (-9.7, 1.35, -9.11), (0.2, 0.12, 0.01), mats["paper_stack"])

    towel = add_cylinder("PaperTowel_Roll", (-10.0, 1.38, -9.3), 0.08, 0.08, 0.25, 10, mats["napkin"])
    towel.rotation_euler[0] = math.pi / 2


def build_water_cooler(mats):
    """Build water cooler on right wall near front — moved to z=6 to clear Relay's desk at z=3."""
    print("  Building water cooler...")

    # Base/body — moved forward to z=6 to avoid Relay desk overlap
    add_box("WaterCooler_Body", (11, 0.7, 6), (0.5, 1.4, 0.4), mats["water_cooler"])
    # Water jug on top
    add_cylinder("WaterCooler_Jug", (11, 1.8, 6), 0.15, 0.18, 0.6, 12, mats["water_jug"])
    # Spigot area
    add_box("WaterCooler_Spigot", (10.7, 0.9, 6), (0.08, 0.06, 0.08), mats["desk_leg"])
    # Drip tray
    add_box("WaterCooler_Tray", (10.7, 0.5, 6), (0.2, 0.04, 0.15), mats["desk_leg"])
    # Paper cup stack nearby
    add_cylinder("PaperCups", (10.6, 0.55, 6.3), 0.05, 0.04, 0.1, 8, mats["paper_stack"])


def build_filing_cabinets(mats):
    """Build filing cabinets along walls."""
    print("  Building filing cabinets...")

    # Adjusted positions to avoid new desk locations
    cabinets = [
        (11.3, -9, -0.26),     # Right wall, back area (moved from -6)
        (11.3, -7.5, -0.26),   # Right wall, next to first (moved from -4.5)
        (-11.3, 0, 0.26),      # Left wall, mid area (between Pixel z=-4 and Forge z=3)
        (-11.3, 7, 0.26),      # Left wall, front area (moved from 1.5 to clear Forge)
        (4, -10.5, 0.26),      # Back wall
    ]

    for i, (fx, fz, face_oz) in enumerate(cabinets):
        # Cabinet body — 2-drawer
        cab = add_box(f"FilingCab_{i}_Body", (fx, 0.7, fz), (0.6, 1.4, 0.5), mats["filing_cabinet"])
        add_bevel(cab, width=0.015, segments=1)
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
            add_ico_sphere(f"CabPlant_{i}_Leaf", (fx, 1.85, fz), 0.15, 2, mats["plant"])
        else:
            add_cylinder(f"CabMug_{i}", (fx, 1.47, fz), 0.06, 0.05, 0.12, 8, mats["mug"])


def build_second_bookshelf(mats):
    """Build a second bookshelf on the back wall."""
    print("  Building second bookshelf...")

    bx, bz = -5, -10.5  # Against back wall

    # Upright panels
    for i, ox in enumerate([-0.8, 0, 0.8]):
        panel = add_box(f"Bookshelf2_Panel_{i}", (bx + ox, 2.0, bz), (0.1, 4, 0.6), mats["bookshelf"])
        add_bevel(panel, width=0.015, segments=2)

    # Shelves
    for si, y in enumerate([0.3, 1.2, 2.1, 3.0, 3.9]):
        shelf = add_box(f"Bookshelf2_Shelf_{si}", (bx, y, bz), (1.6, 0.08, 0.6), mats["bookshelf"])
        add_bevel(shelf, width=0.01, segments=1)

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
    """Build small trash cans near desks, using agent positions."""
    print("  Building trash cans...")

    # Place trash cans near Percy, Forge, and Relay using their facing-aware positions
    trash_agents = ["percy", "forge", "relay"]
    for i, aid in enumerate(trash_agents):
        agent = None
        for a in AGENTS:
            if a["id"] == aid:
                agent = a
                break
        if not agent:
            continue
        ax, _, az = agent["position"]
        facing = agent.get("facing", 0)
        # Place trash can to the side of the desk
        tc_ox, tc_oz = rotate_offset(1.5, 0.5, facing)
        add_cylinder(f"TrashCan_{i}", (ax + tc_ox, 0.35, az + tc_oz), 0.2, 0.18, 0.7, 8, mats["trash_can"])


def build_printer(mats):
    """Build a printer/copier on right wall."""
    print("  Building printer...")

    px, pz = 11, 6

    # Printer stand (small table)
    add_box("PrinterStand", (px, 0.6, pz), (1.0, 0.06, 0.6), mats["desk_leg"])
    for ox, oz in [(-0.4, -0.25), (-0.4, 0.25), (0.4, -0.25), (0.4, 0.25)]:
        add_box(f"PrinterStandLeg_{ox}_{oz}", (px + ox, 0.3, pz + oz), (0.05, 0.6, 0.05), mats["desk_leg"])

    # Printer body
    printer = add_box("Printer_Body", (px, 0.95, pz), (0.8, 0.3, 0.5), mats["printer"])
    add_bevel(printer, width=0.015, segments=1)
    # Paper output tray
    add_box("Printer_Tray", (px - 0.1, 0.78, pz + 0.35), (0.5, 0.03, 0.15), mats["desk_leg"])
    # Paper in tray
    add_box("Printer_Paper", (px - 0.1, 0.82, pz + 0.35), (0.4, 0.04, 0.12), mats["paper_stack"])


def build_desk_clutter(mats):
    """Add paper stacks, pencil cups, small items on desks using facing-aware offsets."""
    print("  Building desk clutter...")

    # Helper
    def get_agent(aid):
        for a in AGENTS:
            if a["id"] == aid:
                return a
        return None

    # Paper stacks on desks
    paper_agents = ["scout", "pixel", "relay"]
    for i, aid in enumerate(paper_agents):
        agent = get_agent(aid)
        if not agent:
            continue
        ax, _, az = agent["position"]
        facing = agent.get("facing", 0)
        # Paper stack at front-left of desk
        ps_ox, ps_oz = rotate_offset(-0.7, 0.3, facing)
        ps = add_box(f"PaperStack_{agent['name']}", (ax + ps_ox, 1.63, az + ps_oz), (0.3, 0.08, 0.22), mats["paper_stack"])
        ps.rotation_euler[2] = -facing

    # Pencil cups on desks
    pencil_agents = ["percy", "forge"]
    for i, aid in enumerate(pencil_agents):
        agent = get_agent(aid)
        if not agent:
            continue
        ax, _, az = agent["position"]
        facing = agent.get("facing", 0)
        # Pencil cup at front-left of desk
        pc_ox, pc_oz = rotate_offset(-0.8, 0.4, facing)
        add_cylinder(f"PencilCup_{agent['name']}", (ax + pc_ox, 1.65, az + pc_oz), 0.06, 0.05, 0.14, 8, mats["pencil_cup"])
        # Pencils sticking up
        for j in range(3):
            p_jx = (j - 1) * 0.025
            p_jz = (j - 1) * 0.02
            pj_ox, pj_oz = rotate_offset(p_jx, p_jz, facing)
            add_cylinder(f"Pencil_{agent['name']}_{j}", (ax + pc_ox + pj_ox, 1.79, az + pc_oz + pj_oz),
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
    add_box("Poster3_Frame", (11.74, 5.5, -1), (0.08, 1.2, 1.6), mats["poster_frame"])
    add_box("Poster3_Art", (11.70, 5.5, -1), (0.04, 1.0, 1.4), mats["books"][2])  # Green


def build_whiteboard_notes(mats):
    """Add sticky notes to the whiteboard."""
    print("  Building whiteboard sticky notes...")

    # Whiteboard is at (-11.74, 5, -2), surface at x=-11.74
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

    bx, bz = 11.5, 6.5  # Moved from 4 to 6.5 to avoid Relay and Sage desks

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
    add_ico_sphere("ShelfPlant_R_Leaf", (bx - 0.1, 4.92, bz), 0.12, 2, mats["plant"])
    add_cylinder("ShelfMug_R", (bx + 0.2, 4.6, bz), 0.06, 0.05, 0.12, 8, mats["mug"])


# ============================================================
# NEW: ROUND TABLE IN CENTER
# ============================================================

def build_round_table(mats):
    """Build a large round table in the center of the room with props on it."""
    print("  Building round table...")

    # Table top: cylinder at center (0, 1.2, 0)
    table_top = add_cylinder("RoundTable_Top", (0, 1.2, 0), 2.5, 2.5, 0.08, 32, mats["round_table"])
    add_bevel(table_top, width=0.02, segments=2)

    # Central pedestal leg: thick cylinder from floor to table bottom
    add_cylinder("RoundTable_Pedestal", (0, 0.58, 0), 0.3, 0.3, 1.16, 12, mats["round_table_leg"])

    # Four outward legs for stability
    leg_angles = [0, math.pi / 2, math.pi, 3 * math.pi / 2]
    for li, la in enumerate(leg_angles):
        lx = math.cos(la) * 1.2
        lz = math.sin(la) * 1.2
        leg = add_cylinder(f"RoundTable_Leg_{li}", (lx, 0.4, lz), 0.08, 0.12, 0.8, 8, mats["round_table_leg"])
        # Angle legs slightly outward
        if abs(math.cos(la)) > 0.5:
            leg.rotation_euler[1] = math.cos(la) * 0.15
        if abs(math.sin(la)) > 0.5:
            leg.rotation_euler[0] = -math.sin(la) * 0.15

    # --- Props ON the round table (y = 1.24, slightly above surface) ---
    table_y = 1.24

    # Blueprint rectangles (thin flat planes, blue-tinted)
    bp_positions = [
        (0.5, table_y + 0.005, 0.3, 0.3),      # (x, y, z, rotation)
        (-0.4, table_y + 0.003, -0.5, -0.5),
        (0.1, table_y + 0.007, 0.8, 0.8),
    ]
    for bi, (bx, by, bz, brot) in enumerate(bp_positions):
        bp = add_box(f"Blueprint_{bi}", (bx, by, bz), (0.6, 0.005, 0.4), mats["blueprint"])
        bp.rotation_euler[2] = brot  # Scattered at various angles

    # Coffee mugs on the round table
    add_cylinder("RoundTable_Mug_0", (1.0, table_y + 0.06, 0.2), 0.06, 0.05, 0.12, 8, mats["mug"])
    mug1 = add_cylinder("RoundTable_Mug_1", (-0.8, table_y + 0.06, -0.9), 0.06, 0.05, 0.12, 8, mats["mug"])
    # Slight tilt on second mug (not too much — it should look casually placed)

    # Small stack of papers
    add_box("RoundTable_Papers", (-1.0, table_y + 0.04, 0.6), (0.3, 0.06, 0.22), mats["paper_stack"])

    # Scattered pens/pencils (thin cylinders laying flat)
    pen_positions = [
        (0.3, table_y + 0.01, -0.3, 0.7),
        (-0.6, table_y + 0.01, 0.1, -0.4),
        (0.7, table_y + 0.01, -0.7, 1.2),
    ]
    for pi, (ppx, ppy, ppz, prot) in enumerate(pen_positions):
        pen = add_cylinder(f"RoundTable_Pen_{pi}", (ppx, ppy, ppz), 0.008, 0.008, 0.15, 6, mats["pen"])
        # Lay flat — rotate 90 degrees around Blender X (Three.js Z)
        pen.rotation_euler[0] += math.pi / 2
        pen.rotation_euler[2] = prot

    # Laptop (partially open)
    # Base (flat box)
    laptop_base = add_box("RoundTable_Laptop_Base", (-0.2, table_y + 0.015, -0.2), (0.4, 0.02, 0.3), mats["laptop_body"])
    laptop_base.rotation_euler[2] = 0.3  # Slightly angled

    # Screen (angled box — tilted open ~110 degrees from base)
    # Position the screen at the back edge of the laptop base, angled
    screen_ox, screen_oz = rotate_offset(0, -0.15, 0.3)  # back edge of laptop
    screen = add_box("RoundTable_Laptop_Screen", (-0.2 + screen_ox, table_y + 0.18, -0.2 + screen_oz), (0.38, 0.25, 0.01), mats["laptop_screen"])
    screen.rotation_euler[2] = 0.3  # Same angle as base
    # Tilt screen backwards (open position) — in Blender, rotate around local X
    screen.rotation_euler[0] += 0.35  # ~20 degrees lean back


# ============================================================
# NEW: OFFICE CAT
# ============================================================

def build_office_cat(mats):
    """Build a low-poly orange tabby cat sleeping on the beanbag."""
    print("  Building office cat...")

    # Beanbag is at (-10, 0.5, -8), cat sits on top at roughly y=1.4
    cat_x, cat_y, cat_z = -10, 1.3, -8

    # Body: elongated sphere (curled up / sleeping position)
    body = add_sphere("Cat_Body", (cat_x, cat_y, cat_z), 0.18, 8, mats["cat_fur"])
    # Scale to ellipsoid for sleeping cat shape
    # Three.js scale (1.8, 0.6, 1.0) -> Blender (1.8, 1.0, 0.6)
    body.scale = (1.8, 1.0, 0.6)

    # Head: smaller sphere tucked at one end
    head = add_sphere("Cat_Head", (cat_x + 0.25, cat_y + 0.08, cat_z), 0.1, 8, mats["cat_fur"])
    head.scale = (1.1, 1.0, 0.9)

    # Ears: two small cones
    add_cone("Cat_Ear_L", (cat_x + 0.28, cat_y + 0.22, cat_z - 0.06), 0.035, 0.07, 4, mats["cat_dark"])
    add_cone("Cat_Ear_R", (cat_x + 0.28, cat_y + 0.22, cat_z + 0.06), 0.035, 0.07, 4, mats["cat_dark"])

    # Nose: tiny sphere
    add_sphere("Cat_Nose", (cat_x + 0.35, cat_y + 0.06, cat_z), 0.015, 6, mats["cat_nose"])

    # Tail: a couple of small cylinders at angles, curving from the back
    tail1 = add_cylinder("Cat_Tail_1", (cat_x - 0.3, cat_y - 0.02, cat_z + 0.05), 0.025, 0.03, 0.2, 6, mats["cat_dark"])
    tail1.rotation_euler[0] += 0.3
    tail1.rotation_euler[2] = 0.5

    tail2 = add_cylinder("Cat_Tail_2", (cat_x - 0.38, cat_y + 0.02, cat_z + 0.12), 0.02, 0.025, 0.15, 6, mats["cat_fur"])
    tail2.rotation_euler[0] += 0.5
    tail2.rotation_euler[2] = 0.8

    # Dark stripes on back (subtle markings — small flat boxes)
    for si in range(3):
        stripe_x = cat_x - 0.05 + si * 0.1
        stripe = add_box(f"Cat_Stripe_{si}", (stripe_x, cat_y + 0.11, cat_z), (0.06, 0.005, 0.08), mats["cat_dark"])


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
    print("Percival Labs — Terrarium Office Builder v2")
    print("  Perimeter desks + Round Table layout")
    print("=" * 60)

    # Clear default scene
    print("\n[1/29] Clearing scene...")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    # Remove default collections/materials
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)

    # Build materials
    print("[2/29] Creating materials...")
    mats = build_materials()

    # Build room
    print("[3/29] Building room geometry...")
    build_room(mats)

    # Build window
    print("[4/29] Building window...")
    build_window(mats)

    # Build desks (with facing-aware rotation)
    print("[5/29] Building desks...")
    for agent in AGENTS:
        build_desk(mats, agent)

    # Build round table in center
    print("[6/29] Building round table...")
    build_round_table(mats)

    # Build agent nameplates
    print("[7/29] Building agent nameplates...")
    build_agent_nameplates(mats)

    # Build shared furniture
    print("[8/29] Building shared furniture...")
    build_bookshelf(mats)
    build_second_bookshelf(mats)
    build_whiteboard(mats)
    build_whiteboard_notes(mats)
    build_beanbag(mats)
    build_rug(mats)

    # Build plants (Enhanced with ico spheres)
    print("[9/29] Building plants...")
    build_plants(mats)

    # Build hanging plants
    print("[10/29] Building hanging plants...")
    build_hanging_plants(mats)

    # Build string lights
    print("[11/29] Building string lights...")
    build_string_lights(mats)

    # Build mugs
    print("[12/29] Building mugs...")
    build_mugs(mats)

    # Build office props
    print("[13/29] Building kitchenette...")
    build_kitchenette(mats)

    print("[14/29] Building office furniture...")
    build_water_cooler(mats)
    build_filing_cabinets(mats)
    build_coat_rack(mats)
    build_trash_cans(mats)
    build_printer(mats)

    print("[15/29] Building desk clutter...")
    build_desk_clutter(mats)

    print("[16/29] Building wall decor...")
    build_wall_clock(mats)
    build_wall_art(mats)
    build_extra_bookshelf_right(mats)

    # Floor plank lines
    print("[17/29] Building floor plank lines...")
    build_floor_planks(mats)

    # Baseboards
    print("[18/29] Building baseboards...")
    build_baseboards(mats)

    # Under-desk cables
    print("[19/29] Building desk cables...")
    build_desk_cables(mats)

    # Personal kanban boards
    print("[20/29] Building personal kanban boards...")
    build_personal_kanbans(mats)

    # Agent-specific desk clutter
    print("[21/29] Building agent-specific desk items...")
    build_agent_desk_clutter(mats)

    # Agent scene props (large floor-standing props per agent)
    print("[22/29] Building agent scene props...")
    build_agent_scene_props(mats)

    # Office cat
    print("[23/29] Building office cat...")
    build_office_cat(mats)

    # Apply transforms and export
    print("[24/29] Exporting GLB...")
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
