"""
build-robots.py -- Blender headless script to generate 7 PL agent robot GLBs.

Each robot is a chunky, humanoid, cute toon robot (~2-5K polys) with per-agent
accessories. Output: individual GLB files in public/models/agents/{agent_id}.glb.

All coordinates are specified in Three.js space and converted internally.
The glTF exporter with export_yup=True maps Blender (x, y, z) -> glTF (x, z, -y).
To get Three.js position (tx, ty, tz): set Blender to (tx, -tz, ty).

Usage:
    blender --background --python apps/terrarium/scripts/build-robots.py
"""

import bpy
import bmesh
import math
import os
import sys
import time

# ============================================================
# CONFIGURATION
# ============================================================

AGENTS = [
    {"id": "percy", "name": "Percy", "color": "#3b82f6",
     "accessories": ["scarf", "goggles_on_head"]},
    {"id": "scout", "name": "Scout", "color": "#10b981",
     "accessories": ["cap", "backpack"]},
    {"id": "pixel", "name": "Pixel", "color": "#ec4899",
     "accessories": ["beret", "tablet"]},
    {"id": "sage", "name": "Sage", "color": "#8b5cf6",
     "accessories": ["coat_tails", "monocle"]},
    {"id": "forge", "name": "Forge", "color": "#f59e0b",
     "accessories": ["hard_hat", "apron"], "stocky": True},
    {"id": "relay", "name": "Relay", "color": "#06b6d4",
     "accessories": ["chest_panel_leds", "bulky_arms"]},
    {"id": "clawdbot", "name": "Clawdbot", "color": "#dc2626",
     "accessories": ["lobster_claws", "bent_antenna", "glitch_panel"], "chaos": True},
]

# Output paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_DIR = os.path.join(PROJECT_DIR, "public", "models", "agents")

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

    def srgb_to_linear(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b))


def darken_hex(hex_str, factor=0.6):
    """Darken a hex color by multiplying each channel."""
    hex_str = hex_str.lstrip("#")
    r = int(int(hex_str[0:2], 16) * factor)
    g = int(int(hex_str[2:4], 16) * factor)
    b = int(int(hex_str[4:6], 16) * factor)
    return f"#{r:02x}{g:02x}{b:02x}"


def create_material(name, color_hex, roughness=0.5, metallic=0.0,
                    emissive_hex=None, emissive_strength=0.0, alpha=1.0):
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
        if hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
        bsdf.inputs["Alpha"].default_value = alpha
        mat.use_backface_culling = False

    return mat


# ============================================================
# GEOMETRY HELPERS
# ============================================================

def clear_scene():
    """Remove all objects, materials, and meshes from the scene."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    for block in [bpy.data.meshes, bpy.data.materials, bpy.data.curves]:
        for item in block:
            block.remove(item)


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


def add_rounded_box(name, tj_position, tj_size, material, bevel_width=0.03,
                    bevel_segments=2, subdiv=0):
    """Add a box with bevel modifier for rounded edges, optionally subdivided."""
    obj = add_box(name, tj_position, tj_size, material)

    # Bevel modifier for rounded edges
    bevel = obj.modifiers.new(name="Bevel", type="BEVEL")
    bevel.width = bevel_width
    bevel.segments = bevel_segments
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(60)

    # Optional subdivision surface
    if subdiv > 0:
        sub = obj.modifiers.new(name="Subsurf", type="SUBSURF")
        sub.levels = subdiv
        sub.render_levels = subdiv

    return obj


def add_cylinder(name, tj_position, radius_top, radius_bottom, height, segments,
                 material):
    """Add a cylinder/cone using Three.js coordinates."""
    tx, ty, tz = tj_position
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


def add_sphere(name, tj_position, radius, segments, material):
    """Add a UV sphere."""
    tx, ty, tz = tj_position
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=max(segments // 2, 4),
        radius=radius,
        location=tj_pos(tx, ty, tz),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def add_torus(name, tj_position, major_radius, minor_radius, major_segments,
              minor_segments, material):
    """Add a torus using Three.js coordinates."""
    tx, ty, tz = tj_position
    bpy.ops.mesh.primitive_torus_add(
        major_segments=major_segments,
        minor_segments=minor_segments,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=tj_pos(tx, ty, tz),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def add_half_torus(name, tj_position, major_radius, minor_radius, segments,
                   material):
    """Add a half-torus (smile shape) using bmesh for controlled arc."""
    tx, ty, tz = tj_position
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()

    # Generate half-torus vertices (PI arc)
    rings = max(segments, 6)
    ring_verts = 6  # cross-section resolution

    for i in range(rings + 1):
        angle = math.pi * i / rings  # 0 to PI
        cx = major_radius * math.cos(angle)
        cy = major_radius * math.sin(angle)

        ring = []
        for j in range(ring_verts):
            theta = 2 * math.pi * j / ring_verts
            # Cross-section circle offset from the major circle path
            dx = minor_radius * math.cos(theta)
            dz = minor_radius * math.sin(theta)
            # Direction from center to ring center
            dir_x = math.cos(angle)
            dir_y = math.sin(angle)
            vx = cx + dx * dir_x
            vy = cy + dx * dir_y
            vz = dz
            ring.append(bm.verts.new((vx, vy, vz)))

        bm.verts.ensure_lookup_table()

        if i > 0:
            prev_start = (i - 1) * ring_verts
            curr_start = i * ring_verts
            for j in range(ring_verts):
                j_next = (j + 1) % ring_verts
                v1 = bm.verts[prev_start + j]
                v2 = bm.verts[prev_start + j_next]
                v3 = bm.verts[curr_start + j_next]
                v4 = bm.verts[curr_start + j]
                bm.faces.new([v1, v2, v3, v4])

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    obj.location = tj_pos(tx, ty, tz)
    obj.data.materials.append(material)
    return obj


# ============================================================
# ROBOT MATERIALS
# ============================================================

def build_robot_materials(agent_id, color_hex):
    """Create all materials for a single robot and return as dict."""
    mats = {}
    prefix = agent_id

    # Body material (agent color)
    mats["body"] = create_material(f"{prefix}_body", color_hex, roughness=0.6)

    # Joint/limb material (dark grey)
    mats["joint"] = create_material(f"{prefix}_joint", "#555555", roughness=0.6,
                                    metallic=0.3)

    # Shoe material (darker)
    mats["shoe"] = create_material(f"{prefix}_shoe", "#444444", roughness=0.7)

    # Face plate (dark blue-black)
    mats["face_plate"] = create_material(f"{prefix}_face_plate", "#1a1a2e",
                                         roughness=0.4)

    # Eye white (sclera)
    mats["sclera"] = create_material(f"{prefix}_sclera", "#ffffff", roughness=0.3)

    # Eye iris (agent color, emissive for bloom)
    mats["iris"] = create_material(f"{prefix}_iris", color_hex, roughness=0.3,
                                   emissive_hex=color_hex, emissive_strength=0.6)

    # Pupil (black)
    mats["pupil"] = create_material(f"{prefix}_pupil", "#000000", roughness=0.5)

    # Eyebrow (dark)
    mats["brow"] = create_material(f"{prefix}_brow", "#333333", roughness=0.6)

    # Mouth (dark)
    mats["mouth"] = create_material(f"{prefix}_mouth", "#222222", roughness=0.5)

    # Antenna tip (agent color, strong emissive)
    mats["antenna_tip"] = create_material(f"{prefix}_antenna_tip", color_hex,
                                          roughness=0.3,
                                          emissive_hex=color_hex,
                                          emissive_strength=1.5)

    # Antenna stalk (dark)
    mats["antenna_stalk"] = create_material(f"{prefix}_antenna_stalk", "#444444",
                                            roughness=0.5, metallic=0.3)

    return mats


# ============================================================
# BASE ROBOT BUILDER
# ============================================================

def build_base_robot(agent):
    """Build the base robot body at origin, facing +Z in Three.js.

    Returns a list of all created objects and the materials dict.
    """
    agent_id = agent["id"]
    color_hex = agent["color"]
    is_stocky = agent.get("stocky", False)
    is_chaos = agent.get("chaos", False)
    accessories = agent.get("accessories", [])
    has_bulky_arms = "bulky_arms" in accessories

    mats = build_robot_materials(agent_id, color_hex)
    objects = []

    # --- Height scale factor (makes robots ~30% taller) ---
    S = 1.3

    # --- Dimension parameters ---
    shoulder_w = 0.85 if is_stocky else 0.72
    waist_w = 0.70 if is_stocky else 0.55
    arm_thick = 0.065 if has_bulky_arms else 0.05
    shoulder_x = shoulder_w / 2 + 0.04

    # ==============================================================
    # TORSO
    # ==============================================================

    # Upper torso (chest/shoulders) -- rounded box with bevel + subdiv
    chest = add_rounded_box(
        f"{agent_id}_chest", (0, 1.02 * S, 0), (shoulder_w, 0.35 * S, 0.38),
        mats["body"], bevel_width=0.02, bevel_segments=3, subdiv=1
    )
    objects.append(chest)

    # Lower torso (waist) -- rounded box with bevel + subdiv
    waist = add_rounded_box(
        f"{agent_id}_waist", (0, 0.72 * S, 0), (waist_w, 0.25 * S, 0.34),
        mats["body"], bevel_width=0.02, bevel_segments=3, subdiv=1
    )
    objects.append(waist)

    # ==============================================================
    # NECK
    # ==============================================================

    neck = add_cylinder(
        f"{agent_id}_neck", (0, 1.26 * S, 0), 0.08, 0.10, 0.12 * S, 12,
        mats["joint"]
    )
    objects.append(neck)

    # ==============================================================
    # HEAD -- rounded box with bevel + subdiv, custom property is_head
    # ==============================================================

    # Chaos robots are slightly squatter with a wider head
    head_w = 0.58 if is_chaos else 0.55
    head_h = (0.42 if is_chaos else 0.48) * S
    head_d = 0.52 if is_chaos else 0.5
    head_y = (1.55 if is_chaos else 1.58) * S

    head = add_rounded_box(
        f"{agent_id}_head", (0, head_y, 0), (head_w, head_h, head_d),
        mats["body"], bevel_width=0.03, bevel_segments=3, subdiv=1
    )
    head["is_head"] = True  # Custom property for Three.js head-finding
    objects.append(head)

    # ==============================================================
    # FACE PLATE (darker inset on front of head)
    # ==============================================================

    face_plate_y = head_y - 0.03 * S
    face_plate = add_rounded_box(
        f"{agent_id}_face_plate", (0, face_plate_y, 0.24),
        (0.44, 0.32 * S, 0.06),
        mats["face_plate"], bevel_width=0.015, bevel_segments=3
    )
    objects.append(face_plate)

    # ==============================================================
    # EYES (sclera + iris + pupil)
    # ==============================================================

    eye_spacing = 0.12
    eye_y = head_y
    eye_z = 0.28

    # Chaos robots have asymmetric eyes: left eye slightly larger and higher
    l_eye_scale = 1.15 if is_chaos else 1.0
    l_eye_y_off = (0.02 if is_chaos else 0.0) * S
    r_eye_scale = 0.9 if is_chaos else 1.0
    r_eye_y_off = (-0.015 if is_chaos else 0.0) * S

    # Left sclera
    l_sclera = add_rounded_box(
        f"{agent_id}_l_sclera",
        (-eye_spacing, eye_y + l_eye_y_off, eye_z),
        (0.14 * l_eye_scale, 0.16 * l_eye_scale, 0.06),
        mats["sclera"], bevel_width=0.015, bevel_segments=2
    )
    objects.append(l_sclera)

    # Right sclera
    r_sclera = add_rounded_box(
        f"{agent_id}_r_sclera",
        (eye_spacing, eye_y + r_eye_y_off, eye_z),
        (0.14 * r_eye_scale, 0.16 * r_eye_scale, 0.06),
        mats["sclera"], bevel_width=0.015, bevel_segments=2
    )
    objects.append(r_sclera)

    # Left iris (emissive)
    l_iris = add_sphere(
        f"{agent_id}_l_iris",
        (-eye_spacing, eye_y + l_eye_y_off, eye_z + 0.03),
        0.05 * l_eye_scale, 8, mats["iris"]
    )
    objects.append(l_iris)

    # Right iris (emissive)
    r_iris = add_sphere(
        f"{agent_id}_r_iris",
        (eye_spacing, eye_y + r_eye_y_off, eye_z + 0.03),
        0.05 * r_eye_scale, 8, mats["iris"]
    )
    objects.append(r_iris)

    # Left pupil
    l_pupil = add_sphere(
        f"{agent_id}_l_pupil",
        (-eye_spacing, eye_y + l_eye_y_off, eye_z + 0.06),
        0.025 * l_eye_scale, 6, mats["pupil"]
    )
    objects.append(l_pupil)

    # Right pupil
    r_pupil = add_sphere(
        f"{agent_id}_r_pupil",
        (eye_spacing, eye_y + r_eye_y_off, eye_z + 0.06),
        0.025 * r_eye_scale, 6, mats["pupil"]
    )
    objects.append(r_pupil)

    # ==============================================================
    # EYEBROWS (small tilted boxes)
    # ==============================================================

    # Chaos robots get more expressive brow angles (one raised, one lowered)
    l_brow_tilt = 0.25 if is_chaos else 0.12
    r_brow_tilt = -0.05 if is_chaos else -0.12

    l_brow = add_box(
        f"{agent_id}_l_brow",
        (-eye_spacing, eye_y + 0.12 * S + l_eye_y_off, eye_z + 0.01),
        (0.12, 0.03, 0.02), mats["brow"]
    )
    l_brow.rotation_euler[1] = l_brow_tilt
    objects.append(l_brow)

    r_brow = add_box(
        f"{agent_id}_r_brow",
        (eye_spacing, eye_y + 0.12 * S + r_eye_y_off, eye_z + 0.01),
        (0.12, 0.03, 0.02), mats["brow"]
    )
    r_brow.rotation_euler[1] = r_brow_tilt
    objects.append(r_brow)

    # ==============================================================
    # MOUTH (half-torus smile)
    # ==============================================================

    mouth_y = head_y - 0.14 * S if is_chaos else 1.44 * S
    mouth = add_half_torus(
        f"{agent_id}_mouth", (0, mouth_y, eye_z + 0.01),
        major_radius=0.05, minor_radius=0.012, segments=8, material=mats["mouth"]
    )
    # Rotate so the smile arc faces forward (+Z in Three.js = -Y in Blender)
    # The half-torus is generated in XY plane; we need it facing -Y in Blender
    # and opening downward to look like a smile from the front.
    mouth.rotation_euler[0] = math.pi  # Flip to face -Y (forward in Three.js)
    objects.append(mouth)

    # ==============================================================
    # ANTENNA (skipped for chaos robots -- they get a bent one via accessories)
    # ==============================================================

    if not is_chaos:
        # Stalk
        antenna_stalk = add_cylinder(
            f"{agent_id}_antenna_stalk", (0, 1.92 * S, 0), 0.02, 0.02,
            0.18 * S, 6, mats["antenna_stalk"]
        )
        objects.append(antenna_stalk)

        # Tip (glowing sphere)
        antenna_tip = add_sphere(
            f"{agent_id}_antenna_tip", (0, 2.04 * S, 0), 0.05, 8,
            mats["antenna_tip"]
        )
        objects.append(antenna_tip)

    # ==============================================================
    # ARMS (shoulder sphere -> upper arm -> elbow sphere -> forearm -> hand)
    # ==============================================================

    for side, sign in [("l", -1), ("r", 1)]:
        sx = sign * shoulder_x

        # Chaos robots: right arm is slightly longer/droopier
        arm_length_mod = (0.04 if (is_chaos and side == "r") else 0.0) * S

        # Shoulder joint
        shoulder_joint = add_sphere(
            f"{agent_id}_{side}_shoulder", (sx, 1.1 * S, 0),
            arm_thick + 0.02, 12, mats["joint"]
        )
        objects.append(shoulder_joint)

        # Upper arm
        upper_arm = add_cylinder(
            f"{agent_id}_{side}_upper_arm",
            (sx, 0.92 * S - arm_length_mod * 0.5, 0),
            arm_thick, arm_thick, (0.28 + arm_length_mod) * S, 12, mats["joint"]
        )
        # Slight outward tilt
        upper_arm.rotation_euler[1] = sign * 0.08
        objects.append(upper_arm)

        # Elbow joint
        elbow = add_sphere(
            f"{agent_id}_{side}_elbow",
            (sx + sign * 0.02, 0.76 * S - arm_length_mod, 0),
            arm_thick + 0.01, 10, mats["joint"]
        )
        objects.append(elbow)

        # Forearm
        forearm = add_cylinder(
            f"{agent_id}_{side}_forearm",
            (sx + sign * 0.03, 0.62 * S - arm_length_mod, 0.02),
            arm_thick * 0.9, arm_thick * 0.85,
            (0.22 + arm_length_mod * 0.5) * S, 12, mats["joint"]
        )
        objects.append(forearm)

        # Hand — lobster claws for chaos agents, spheres for others
        hand_y = 0.48 * S - arm_length_mod * 1.2
        hand_x = sx + sign * 0.03
        hand_z = 0.02

        if is_chaos:
            # Lobster claw! Two tapered pincers forming a V shape
            claw_mat = create_material(f"{agent_id}_{side}_claw",
                                       darken_hex(color_hex, 0.8), roughness=0.4, metallic=0.2)
            # Claw base (wider flat palm)
            claw_base = add_rounded_box(
                f"{agent_id}_{side}_claw_base",
                (hand_x, hand_y, hand_z),
                (0.10, 0.06 * S, 0.08), claw_mat,
                bevel_width=0.01, bevel_segments=2
            )
            objects.append(claw_base)

            # Upper pincer (tapered, angled up)
            upper_pincer = add_cylinder(
                f"{agent_id}_{side}_claw_upper",
                (hand_x, hand_y - 0.06 * S, hand_z + 0.06),
                0.01, 0.035, 0.14, 6, mats["body"]
            )
            upper_pincer.rotation_euler[0] = -0.5  # Angle outward
            upper_pincer.rotation_euler[1] = sign * 0.1
            objects.append(upper_pincer)

            # Lower pincer (tapered, angled down)
            lower_pincer = add_cylinder(
                f"{agent_id}_{side}_claw_lower",
                (hand_x, hand_y - 0.06 * S, hand_z - 0.04),
                0.01, 0.035, 0.14, 6, mats["body"]
            )
            lower_pincer.rotation_euler[0] = 0.5  # Angle other way
            lower_pincer.rotation_euler[1] = sign * 0.1
            objects.append(lower_pincer)
        else:
            hand = add_sphere(
                f"{agent_id}_{side}_hand",
                (hand_x, hand_y, hand_z),
                arm_thick + 0.005, 8, mats["body"]
            )
            objects.append(hand)

    # ==============================================================
    # HIPS
    # ==============================================================

    hips = add_rounded_box(
        f"{agent_id}_hips", (0, 0.56 * S, 0), (waist_w * 0.9, 0.1 * S, 0.3),
        mats["joint"], bevel_width=0.01, bevel_segments=2
    )
    objects.append(hips)

    # ==============================================================
    # LEGS (thigh -> knee -> calf -> foot)
    # Legs are manually positioned to bridge from scaled hips to ground.
    # Hips at ~0.73, feet at 0.08-0.10 (ground level).
    # ==============================================================

    leg_spacing = 0.14
    leg_thick = 0.06

    for side, sign in [("l", -1), ("r", 1)]:
        lx = sign * leg_spacing

        # Thigh (center at ~0.58, length ~0.28 to bridge hips-to-knee)
        thigh = add_cylinder(
            f"{agent_id}_{side}_thigh", (lx, 0.58, 0),
            leg_thick, leg_thick * 0.95, 0.28, 12, mats["joint"]
        )
        objects.append(thigh)

        # Knee (at ~0.42)
        knee = add_sphere(
            f"{agent_id}_{side}_knee", (lx, 0.42, 0),
            leg_thick, 10, mats["joint"]
        )
        objects.append(knee)

        # Calf (center at ~0.28, length ~0.24 to bridge knee-to-foot)
        calf = add_cylinder(
            f"{agent_id}_{side}_calf", (lx, 0.28, 0),
            leg_thick * 0.9, leg_thick * 0.85, 0.24, 12, mats["joint"]
        )
        objects.append(calf)

        # Foot (rounded box shoe) -- stays at ground level
        foot = add_rounded_box(
            f"{agent_id}_{side}_foot", (lx, 0.09, 0.03), (0.12, 0.06, 0.18),
            mats["shoe"], bevel_width=0.01, bevel_segments=2, subdiv=1
        )
        objects.append(foot)

    return objects, mats


# ============================================================
# PER-AGENT ACCESSORY BUILDERS
# ============================================================

def add_percy_accessories(agent, mats, objects):
    """Percy: scarf around neck + goggles pushed up on forehead."""
    agent_id = agent["id"]
    color_hex = agent["color"]
    S = 1.3  # Match height scale factor from build_base_robot

    # --- Scarf (torus around neck + hanging tail) ---
    scarf_mat = create_material(f"{agent_id}_scarf", color_hex, roughness=0.7)

    scarf_ring = add_torus(
        f"{agent_id}_scarf_ring", (0, 1.26 * S, 0),
        major_radius=0.12, minor_radius=0.04,
        major_segments=12, minor_segments=8, material=scarf_mat
    )
    objects.append(scarf_ring)

    # Scarf hanging tail
    tail = add_rounded_box(
        f"{agent_id}_scarf_tail", (0.1, 1.15 * S, 0.12), (0.08, 0.2 * S, 0.03),
        scarf_mat, bevel_width=0.005, bevel_segments=1
    )
    tail.rotation_euler[1] = -0.3
    objects.append(tail)

    # --- Goggles pushed up on forehead ---
    goggle_mat = create_material(f"{agent_id}_goggle_frame", "#555555",
                                 roughness=0.4, metallic=0.4)
    goggle_lens_mat = create_material(f"{agent_id}_goggle_lens", "#88ccff",
                                      roughness=0.1, metallic=0.2,
                                      emissive_hex="#88ccff",
                                      emissive_strength=0.3)

    goggle_y = 1.76 * S

    # Goggle strap (thin band across top of head)
    strap = add_torus(
        f"{agent_id}_goggle_strap", (0, goggle_y, 0.05),
        major_radius=0.24, minor_radius=0.015,
        major_segments=16, minor_segments=6, material=goggle_mat
    )
    objects.append(strap)

    # Left lens (small cylinder, pushed up on forehead)
    l_lens = add_cylinder(
        f"{agent_id}_goggle_l_lens", (-0.1, goggle_y, 0.22),
        0.06, 0.06, 0.04, 10, goggle_lens_mat
    )
    # Tilt to face forward
    l_lens.rotation_euler[0] = math.pi / 2
    objects.append(l_lens)

    # Right lens
    r_lens = add_cylinder(
        f"{agent_id}_goggle_r_lens", (0.1, goggle_y, 0.22),
        0.06, 0.06, 0.04, 10, goggle_lens_mat
    )
    r_lens.rotation_euler[0] = math.pi / 2
    objects.append(r_lens)

    # Lens rims
    for side_name, sx in [("l", -0.1), ("r", 0.1)]:
        rim = add_torus(
            f"{agent_id}_goggle_{side_name}_rim", (sx, goggle_y, 0.23),
            major_radius=0.055, minor_radius=0.012,
            major_segments=12, minor_segments=6, material=goggle_mat
        )
        rim.rotation_euler[0] = math.pi / 2
        objects.append(rim)

    # Bridge between lenses
    bridge = add_cylinder(
        f"{agent_id}_goggle_bridge", (0, goggle_y, 0.20),
        0.012, 0.012, 0.1, 6, goggle_mat
    )
    # Horizontal bridge connecting the two lenses
    bridge.rotation_euler[1] = math.pi / 2
    objects.append(bridge)


def add_scout_accessories(agent, mats, objects):
    """Scout: baseball cap + backpack."""
    agent_id = agent["id"]
    color_hex = agent["color"]
    S = 1.3  # Match height scale factor from build_base_robot
    cap_mat = create_material(f"{agent_id}_cap", color_hex, roughness=0.7)

    # --- Baseball cap ---
    # Cap crown (rounded box sitting on top of head)
    cap_crown = add_rounded_box(
        f"{agent_id}_cap_crown", (0, 1.86 * S, 0), (0.56, 0.10, 0.50),
        cap_mat, bevel_width=0.02, bevel_segments=2
    )
    objects.append(cap_crown)

    # Cap brim (extends forward)
    brim = add_rounded_box(
        f"{agent_id}_cap_brim", (0, 1.82 * S, 0.28), (0.30, 0.03, 0.16),
        cap_mat, bevel_width=0.008, bevel_segments=1
    )
    brim.rotation_euler[0] = 0.1  # Slight downward tilt (in Blender coords)
    objects.append(brim)

    # --- Backpack ---
    darker_color = darken_hex(color_hex, 0.7)
    bp_mat = create_material(f"{agent_id}_backpack", darker_color, roughness=0.7)

    backpack = add_rounded_box(
        f"{agent_id}_backpack", (0, 0.9 * S, -0.28), (0.35, 0.40 * S, 0.18),
        bp_mat, bevel_width=0.015, bevel_segments=2
    )
    objects.append(backpack)

    # Backpack straps (thin boxes from top of pack over shoulders)
    strap_mat = create_material(f"{agent_id}_bp_strap", darken_hex(color_hex, 0.5),
                                roughness=0.7)
    for sx in [-0.1, 0.1]:
        strap = add_box(
            f"{agent_id}_bp_strap_{sx}", (sx, 1.02 * S, -0.12),
            (0.04, 0.30 * S, 0.03), strap_mat
        )
        objects.append(strap)


def add_pixel_accessories(agent, mats, objects):
    """Pixel: tilted beret + tablet in left hand."""
    agent_id = agent["id"]
    color_hex = agent["color"]
    S = 1.3  # Match height scale factor from build_base_robot

    # --- Beret ---
    beret_mat = create_material(f"{agent_id}_beret", color_hex, roughness=0.8)

    beret = add_cylinder(
        f"{agent_id}_beret", (0.05, 1.86 * S, 0),
        0.28, 0.26, 0.08, 10, beret_mat
    )
    # Tilt the beret -- rotation.z in Three.js maps to Blender Y rotation
    beret.rotation_euler[1] = 0.2
    objects.append(beret)

    # Beret nub on top
    nub = add_sphere(
        f"{agent_id}_beret_nub", (0.05, 1.92 * S, 0),
        0.03, 6, beret_mat
    )
    objects.append(nub)

    # --- Tablet ---
    # Held in left hand position
    shoulder_x = 0.72 / 2 + 0.04  # Default (non-stocky)
    tablet_mat = create_material(f"{agent_id}_tablet_body", "#222222",
                                 roughness=0.3, metallic=0.3)
    screen_mat = create_material(f"{agent_id}_tablet_screen", color_hex,
                                 roughness=0.2,
                                 emissive_hex=color_hex, emissive_strength=1.0)

    # Tablet body
    tablet = add_rounded_box(
        f"{agent_id}_tablet", (-(shoulder_x + 0.12), 0.55 * S, 0.10),
        (0.16, 0.24 * S, 0.02), tablet_mat,
        bevel_width=0.005, bevel_segments=1
    )
    tablet.rotation_euler[1] = 0.3  # Tilted in hand
    objects.append(tablet)

    # Tablet screen (emissive face)
    screen = add_box(
        f"{agent_id}_tablet_screen", (-(shoulder_x + 0.11), 0.55 * S, 0.12),
        (0.13, 0.20 * S, 0.005), screen_mat
    )
    screen.rotation_euler[1] = 0.3
    objects.append(screen)


def add_sage_accessories(agent, mats, objects):
    """Sage: coat tails below waist + monocle on right eye."""
    agent_id = agent["id"]
    color_hex = agent["color"]
    S = 1.3  # Match height scale factor from build_base_robot
    waist_w = 0.55  # Default (non-stocky)

    # --- Coat tails ---
    darker_color = darken_hex(color_hex, 0.6)
    coat_mat = create_material(f"{agent_id}_coat", darker_color, roughness=0.7)

    coat_tails = add_rounded_box(
        f"{agent_id}_coat_tails", (0, 0.50 * S, -0.02),
        (waist_w * 1.05, 0.20 * S, 0.32),
        coat_mat, bevel_width=0.01, bevel_segments=1
    )
    objects.append(coat_tails)

    # Coat collar (small raised edge at back of waist)
    collar = add_box(
        f"{agent_id}_coat_collar", (0, 1.22 * S, -0.16),
        (0.40, 0.08 * S, 0.04), coat_mat
    )
    objects.append(collar)

    # --- Monocle (ring on right eye) ---
    monocle_mat = create_material(f"{agent_id}_monocle", "#ddddaa",
                                  roughness=0.2, metallic=0.5,
                                  emissive_hex="#ddddaa",
                                  emissive_strength=0.5)

    eye_spacing = 0.12
    eye_y = 1.58 * S
    eye_z = 0.28

    monocle = add_torus(
        f"{agent_id}_monocle", (eye_spacing + 0.01, eye_y, eye_z + 0.02),
        major_radius=0.065, minor_radius=0.01,
        major_segments=12, minor_segments=8, material=monocle_mat
    )
    # Rotate to face forward (-Y in Blender = +Z in Three.js)
    monocle.rotation_euler[0] = math.pi / 2
    objects.append(monocle)

    # Monocle chain (thin cylinder dangling down)
    chain_mat = create_material(f"{agent_id}_monocle_chain", "#bbbb88",
                                roughness=0.3, metallic=0.4)
    chain = add_cylinder(
        f"{agent_id}_monocle_chain", (eye_spacing + 0.06, 1.40 * S, eye_z - 0.02),
        0.008, 0.008, 0.30 * S, 6, chain_mat
    )
    chain.rotation_euler[1] = 0.2  # Slight angle
    objects.append(chain)


def add_forge_accessories(agent, mats, objects):
    """Forge: hard hat + work apron. Stocky proportions handled in base builder."""
    agent_id = agent["id"]
    color_hex = agent["color"]
    S = 1.3  # Match height scale factor from build_base_robot
    shoulder_w = 0.85  # Stocky

    # --- Hard hat ---
    hat_mat = create_material(f"{agent_id}_hard_hat", color_hex, roughness=0.5)

    # Hat dome (rounded box sitting on head)
    hat_dome = add_rounded_box(
        f"{agent_id}_hat_dome", (0, 1.86 * S, 0), (0.58, 0.14, 0.52),
        hat_mat, bevel_width=0.03, bevel_segments=2
    )
    objects.append(hat_dome)

    # Hat brim (wider flat piece)
    hat_brim = add_rounded_box(
        f"{agent_id}_hat_brim", (0, 1.80 * S, 0), (0.62, 0.03, 0.56),
        hat_mat, bevel_width=0.008, bevel_segments=1
    )
    objects.append(hat_brim)

    # --- Work apron ---
    apron_mat = create_material(f"{agent_id}_apron", "#8B6914", roughness=0.8)

    apron = add_rounded_box(
        f"{agent_id}_apron", (0, 0.82 * S, 0.20),
        (shoulder_w * 0.70, 0.45 * S, 0.04),
        apron_mat, bevel_width=0.008, bevel_segments=1
    )
    objects.append(apron)

    # Apron pocket
    pocket_mat = create_material(f"{agent_id}_apron_pocket", "#7A5A10",
                                 roughness=0.8)
    pocket = add_box(
        f"{agent_id}_apron_pocket", (0, 0.72 * S, 0.23),
        (0.20, 0.12 * S, 0.02), pocket_mat
    )
    objects.append(pocket)

    # Apron strap (neck loop)
    strap_mat = create_material(f"{agent_id}_apron_strap", "#7A5A10",
                                roughness=0.8)
    for sx in [-0.15, 0.15]:
        strap = add_box(
            f"{agent_id}_apron_strap_{sx}", (sx, 1.08 * S, 0.18),
            (0.03, 0.10 * S, 0.02), strap_mat
        )
        objects.append(strap)


def add_relay_accessories(agent, mats, objects):
    """Relay: chest panel with 3 LED dots. Bulky arms handled in base builder."""
    agent_id = agent["id"]
    S = 1.3  # Match height scale factor from build_base_robot

    # --- Chest panel ---
    panel_mat = create_material(f"{agent_id}_chest_panel", "#222233",
                                roughness=0.4, metallic=0.3)
    panel = add_rounded_box(
        f"{agent_id}_chest_panel", (0, 0.98 * S, 0.20),
        (0.30, 0.22 * S, 0.04),
        panel_mat, bevel_width=0.01, bevel_segments=1
    )
    objects.append(panel)

    # 3 LED dots (green emissive)
    led_mat = create_material(f"{agent_id}_led", "#10b981",
                              roughness=0.2,
                              emissive_hex="#10b981", emissive_strength=2.0)
    for i in range(3):
        led = add_sphere(
            f"{agent_id}_led_{i}", (-0.08 + i * 0.08, 0.98 * S, 0.23),
            0.025, 6, led_mat
        )
        objects.append(led)

    # Panel border detail
    border_mat = create_material(f"{agent_id}_panel_border", "#334455",
                                 roughness=0.4, metallic=0.4)
    # Top edge
    add_box(f"{agent_id}_panel_edge_top", (0, 1.10 * S, 0.22),
            (0.30, 0.015, 0.02), border_mat)
    # Bottom edge
    add_box(f"{agent_id}_panel_edge_bot", (0, 0.86 * S, 0.22),
            (0.30, 0.015, 0.02), border_mat)


def add_clawdbot_accessories(agent, mats, objects):
    """Clawdbot: lobster claws (built in base) + bent antenna + glitch chest panel.

    The chaos/trickster agent. Mischievous, slightly unhinged look.
    Lobster claws are built directly in build_base_robot() when is_chaos=True.
    """
    agent_id = agent["id"]
    color_hex = agent["color"]
    S = 1.3  # Match height scale factor from build_base_robot
    head_y = 1.55 * S  # Matches chaos head_y from build_base_robot (scaled)

    # --- Bent antenna (crooked, two-segment stalk) ---
    # Lower stalk segment -- slightly off-center, tilted
    lower_stalk = add_cylinder(
        f"{agent_id}_antenna_stalk_lower", (0.04, head_y + 0.30 * S, -0.02),
        0.02, 0.025, 0.12 * S, 6, mats["antenna_stalk"]
    )
    lower_stalk.rotation_euler[1] = -0.3  # Lean to the right
    lower_stalk.rotation_euler[0] = 0.15  # Slight backward tilt
    objects.append(lower_stalk)

    # Upper stalk segment -- kinked at a different angle
    upper_stalk = add_cylinder(
        f"{agent_id}_antenna_stalk_upper", (0.10, head_y + 0.42 * S, -0.04),
        0.015, 0.02, 0.10 * S, 6, mats["antenna_stalk"]
    )
    upper_stalk.rotation_euler[1] = 0.4  # Kink back the other way
    upper_stalk.rotation_euler[0] = -0.2
    objects.append(upper_stalk)

    # Antenna tip (glowing, slightly off-kilter)
    antenna_tip = add_sphere(
        f"{agent_id}_antenna_tip", (0.08, head_y + 0.50 * S, -0.05),
        0.045, 8, mats["antenna_tip"]
    )
    objects.append(antenna_tip)

    # --- Glitch chest panel (split red/yellow emissive) ---
    panel_mat = create_material(f"{agent_id}_glitch_panel", "#1a1a1a",
                                roughness=0.4, metallic=0.3)
    panel = add_rounded_box(
        f"{agent_id}_glitch_panel", (0, 0.98 * S, 0.20),
        (0.28, 0.18 * S, 0.04),
        panel_mat, bevel_width=0.01, bevel_segments=1
    )
    objects.append(panel)

    # Left half -- red emissive
    red_glow_mat = create_material(f"{agent_id}_glitch_red", "#ff2222",
                                   roughness=0.2,
                                   emissive_hex="#ff2222",
                                   emissive_strength=2.5)
    red_half = add_box(
        f"{agent_id}_glitch_red", (-0.055, 0.98 * S, 0.23),
        (0.10, 0.14 * S, 0.015), red_glow_mat
    )
    objects.append(red_half)

    # Right half -- yellow emissive
    yellow_glow_mat = create_material(f"{agent_id}_glitch_yellow", "#ffaa00",
                                      roughness=0.2,
                                      emissive_hex="#ffaa00",
                                      emissive_strength=2.5)
    yellow_half = add_box(
        f"{agent_id}_glitch_yellow", (0.055, 0.98 * S, 0.23),
        (0.10, 0.14 * S, 0.015), yellow_glow_mat
    )
    objects.append(yellow_half)

    # Divider line between panel halves
    divider_mat = create_material(f"{agent_id}_glitch_divider", "#000000",
                                  roughness=0.5)
    divider = add_box(
        f"{agent_id}_glitch_divider", (0, 0.98 * S, 0.235),
        (0.01, 0.14 * S, 0.01), divider_mat
    )
    objects.append(divider)

    # Panel border -- jagged/offset edges for glitch feel
    border_mat = create_material(f"{agent_id}_glitch_border", "#333333",
                                 roughness=0.4, metallic=0.4)
    # Top edge (slightly offset for glitchy look)
    add_box(f"{agent_id}_glitch_edge_top", (0.01, 1.08 * S, 0.22),
            (0.28, 0.015, 0.02), border_mat)
    # Bottom edge (offset the other way)
    add_box(f"{agent_id}_glitch_edge_bot", (-0.01, 0.88 * S, 0.22),
            (0.28, 0.015, 0.02), border_mat)


# Map accessory sets to builder functions
ACCESSORY_BUILDERS = {
    "percy": add_percy_accessories,
    "scout": add_scout_accessories,
    "pixel": add_pixel_accessories,
    "sage": add_sage_accessories,
    "forge": add_forge_accessories,
    "relay": add_relay_accessories,
    "clawdbot": add_clawdbot_accessories,
}


# ============================================================
# EXPORT
# ============================================================

def apply_all_modifiers():
    """Apply all modifiers on all mesh objects."""
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
        for mod in obj.modifiers:
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except RuntimeError as e:
                print(f"    Warning: Could not apply modifier {mod.name} "
                      f"on {obj.name}: {e}")


def apply_transforms():
    """Apply all transforms so GLB positions are baked."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")


def count_triangles():
    """Count total triangles across all mesh objects."""
    total = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        # Ensure mesh data is up to date
        depsgraph = bpy.context.evaluated_depsgraph_get()
        eval_obj = obj.evaluated_get(depsgraph)
        mesh = eval_obj.to_mesh()
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        eval_obj.to_mesh_clear()
    return total


def export_agent_glb(agent_id, output_dir):
    """Export all objects in scene as a single GLB for this agent."""
    filepath = os.path.join(output_dir, f"{agent_id}.glb")
    os.makedirs(output_dir, exist_ok=True)

    # Select all mesh objects
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_lights=False,
        export_cameras=False,
        export_materials="EXPORT",
        export_normals=True,
    )

    size_kb = os.path.getsize(filepath) / 1024
    return filepath, size_kb


# ============================================================
# MAIN
# ============================================================

def main():
    start_time = time.time()

    print("=" * 60)
    print("Percival Labs -- Terrarium Robot Builder")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    total_agents = len(AGENTS)
    results = []

    for idx, agent in enumerate(AGENTS):
        agent_id = agent["id"]
        agent_name = agent["name"]
        step = idx + 1

        print(f"\n[{step}/{total_agents}] Building {agent_name} ({agent_id})...")

        # 1. Clear scene completely
        print(f"  Clearing scene...")
        clear_scene()

        # 2. Build base robot body
        print(f"  Building base body...")
        objects, mats = build_base_robot(agent)
        print(f"    Base parts: {len(objects)} objects")

        # 3. Add per-agent accessories
        builder = ACCESSORY_BUILDERS.get(agent_id)
        if builder:
            print(f"  Adding {agent_name} accessories...")
            builder(agent, mats, objects)
            print(f"    Total parts: {len(objects)} objects")

        # 4. Apply all modifiers (subdivision, bevel)
        print(f"  Applying modifiers...")
        apply_all_modifiers()

        # 5. Apply transforms
        print(f"  Applying transforms...")
        apply_transforms()

        # 6. Count triangles
        tri_count = count_triangles()
        print(f"  Triangle count: {tri_count}")

        if tri_count > 8000:
            print(f"  WARNING: {agent_name} exceeds 8K triangle budget "
                  f"({tri_count} tris)")
        elif tri_count < 500:
            print(f"  WARNING: {agent_name} seems too low-poly "
                  f"({tri_count} tris)")

        # 7. Export as GLB
        print(f"  Exporting GLB...")
        filepath, size_kb = export_agent_glb(agent_id, OUTPUT_DIR)
        print(f"  Exported: {filepath} ({size_kb:.1f} KB)")

        results.append({
            "id": agent_id,
            "name": agent_name,
            "triangles": tri_count,
            "size_kb": size_kb,
            "path": filepath,
        })

    # Summary
    elapsed = time.time() - start_time
    total_tris = sum(r["triangles"] for r in results)
    total_size = sum(r["size_kb"] for r in results)

    print(f"\n{'=' * 60}")
    print(f"BUILD COMPLETE in {elapsed:.1f}s")
    print(f"{'=' * 60}")
    print(f"\n{'Agent':<12} {'Tris':>6} {'Size (KB)':>10}")
    print(f"{'-' * 30}")
    for r in results:
        print(f"{r['name']:<12} {r['triangles']:>6} {r['size_kb']:>10.1f}")
    print(f"{'-' * 30}")
    print(f"{'TOTAL':<12} {total_tris:>6} {total_size:>10.1f}")
    print(f"\nOutput directory: {OUTPUT_DIR}")

    if total_tris > 50000:
        print(f"\nWARNING: Total triangles ({total_tris}) may be high for "
              f"scene budget (target: <50K for {total_agents} robots)")

    print(f"\nAll {total_agents} robot GLBs generated successfully.")


if __name__ == "__main__":
    main()
