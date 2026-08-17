"""7620 E Jan Ave — 1971 wood ranch from listing photos.

Street face = +Y. Carport on +X (left when you stand in the street
looking at the door). Game maps that to west after a π yaw.

  blender --background --python tools/models/ranch_7620.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

try:
    import bpy
    import bmesh
    from mathutils import Vector
except ImportError:
    sys.stderr.write("Run inside Blender.\n")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "models"
OUT_GLB = OUT_DIR / "ranch-7620.glb"
OUT_BLEND = Path(__file__).resolve().parent / "ranch-7620.blend"
STUDIO = Path.home() / "projects" / "blender"
if str(STUDIO) not in sys.path:
    sys.path.insert(0, str(STUDIO))

from studio import principled, reset_scene  # noqa: E402


def box(name: str, size, loc, mat, rot=(0.0, 0.0, 0.0), bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return obj


def gable(name: str, width: float, depth: float, rise: float, loc, mat):
    """Ridge along X, slopes to ±Y. Base at loc z, peak +rise."""
    w, d = width / 2, depth / 2
    verts = [
        (-w, -d, 0),
        (w, -d, 0),
        (w, d, 0),
        (-w, d, 0),
        (-w, 0, rise),
        (w, 0, rise),
    ]
    faces = [
        (0, 1, 5, 4),
        (3, 2, 5, 4),
        (0, 4, 3),
        (1, 2, 5),
        (0, 1, 2, 3),
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.data.materials.append(mat)
    return obj


reset_scene()

clap = principled("Clapboard", color=(0.62, 0.60, 0.56), roughness=0.88)
trim = principled("WhiteTrim", color=(0.93, 0.92, 0.90), roughness=0.55)
shingle = principled("Shingle", color=(0.28, 0.20, 0.16), roughness=0.94)
metal = principled("CarportMetal", color=(0.78, 0.76, 0.72), roughness=0.45, metallic=0.25)
door = principled("WhiteDoor", color=(0.94, 0.94, 0.93), roughness=0.5)
glass = principled("SliderGlass", color=(0.45, 0.58, 0.62), roughness=0.08, metallic=0.06)
shutter = principled("Shutters", color=(0.08, 0.08, 0.09), roughness=0.7)
gravel = principled("Gravel", color=(0.55, 0.50, 0.45), roughness=0.98)
conc = principled("Pad", color=(0.70, 0.68, 0.64), roughness=0.92)
bush = principled("Bush", color=(0.22, 0.32, 0.16), roughness=0.85)

W, D, H = 14.2, 9.6, 2.55
body = box("body", (W, D, H), (0, 0, H / 2), clap, bevel=0.015)
# clapboard laps on the street face
for i in range(9):
    y = D / 2 + 0.015
    z = 0.28 + i * 0.26
    box(f"lap-{i}", (W - 0.12, 0.03, 0.035), (0, y, z), clap, bevel=0)

gable("roof", W + 0.7, D + 0.7, 1.35, (0, 0, H), shingle)
box("fascia", (W + 0.76, 0.08, 0.16), (0, D / 2 + 0.34, H + 0.08), trim, bevel=0.01)
box("chimney", (0.55, 0.42, 0.85), (4.6, -0.2, H + 1.15), clap, bevel=0.02)

# Entry gable — two white posts, small lid
box("porch-slab", (3.4, 1.7, 0.1), (-0.15, D / 2 + 0.7, 0.06), conc)
box("post-l", (0.16, 0.16, 2.15), (-1.45, D / 2 + 1.15, 1.12), trim, bevel=0.01)
box("post-r", (0.16, 0.16, 2.15), (1.15, D / 2 + 1.15, 1.12), trim, bevel=0.01)
gable("entry-gable", 3.6, 2.0, 0.85, (-0.15, D / 2 + 0.85, 2.25), trim)
box("door", (0.95, 0.07, 2.08), (-0.15, D / 2 + 0.04, 1.08), door, bevel=0.01)
box("door-panel", (0.55, 0.02, 0.7), (-0.15, D / 2 + 0.08, 1.35), door, bevel=0)

# Left slider (carport side of the door is −X in this face? door at -0.15)
box("win-l", (1.85, 0.05, 1.25), (-2.55, D / 2 + 0.04, 1.55), glass, bevel=0)
box("win-l-frame", (2.05, 0.07, 1.42), (-2.55, D / 2 + 0.01, 1.55), trim, bevel=0.008)
# Right slider + black shutters
box("win-r", (2.15, 0.05, 1.15), (3.15, D / 2 + 0.04, 1.52), glass, bevel=0)
box("win-r-frame", (2.35, 0.07, 1.32), (3.15, D / 2 + 0.01, 1.52), trim, bevel=0.008)
box("shutter-l", (0.22, 0.04, 1.15), (1.88, D / 2 + 0.05, 1.52), shutter, bevel=0)
box("shutter-r", (0.22, 0.04, 1.15), (4.42, D / 2 + 0.05, 1.52), shutter, bevel=0)

# Carport on +X (street-left when facing the door)
cx = W / 2 + 2.85
box("carport-slab", (5.5, 8.6, 0.08), (cx, 0.2, 0.04), conc, bevel=0)
box("carport-roof", (5.7, 8.8, 0.1), (cx, 0.2, 2.55), metal, bevel=0.01)
box("carport-beam", (5.7, 0.12, 0.16), (cx, D / 2 + 0.15, 2.42), trim, bevel=0)
# Lattice screen on the street end
for i in range(7):
    box(
        f"lattice-v-{i}",
        (0.035, 0.035, 2.15),
        (cx - 2.4 + i * 0.8, D / 2 + 0.55, 1.15),
        trim,
        bevel=0,
    )
for i in range(5):
    box(
        f"lattice-h-{i}",
        (5.2, 0.035, 0.035),
        (cx, D / 2 + 0.55, 0.35 + i * 0.45),
        trim,
        bevel=0,
    )

box("gravel", (11.5, 6.4, 0.06), (-1.2, D / 2 + 3.4, 0.03), gravel, bevel=0)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.55, segments=10, ring_count=7, location=(-1.9, D / 2 + 1.35, 0.45))
b1 = bpy.context.active_object
b1.name = "bush-l"
b1.scale = (1.3, 0.9, 0.7)
b1.data.materials.append(bush)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.42, segments=10, ring_count=7, location=(0.85, D / 2 + 1.2, 0.38))
b2 = bpy.context.active_object
b2.name = "bush-r"
b2.scale = (1.1, 0.8, 0.65)
b2.data.materials.append(bush)

parts = [o for o in bpy.data.objects if o.type == "MESH"]
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
empty = bpy.context.active_object
empty.name = "ranch-7620"
for obj in parts:
    obj.parent = empty

# Preview cam — street 3/4, same as the listing
bpy.ops.object.camera_add(location=(9.5, 14.5, 4.8))
cam = bpy.context.active_object
cam.name = "preview_cam"
cam.data.lens = 28
direction = Vector((0.4, 4.2, 1.3)) - cam.location
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = cam
bpy.ops.object.light_add(type="SUN", location=(12, 8, 16))
sun = bpy.context.active_object
sun.data.energy = 6.5
sun.rotation_euler = (0.7, 0.15, 2.4)
world = bpy.data.worlds.new("MesaNoon")
bpy.context.scene.world = world
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.45, 0.62, 0.82, 1.0)
    bg.inputs[1].default_value = 1.1

OUT_DIR.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.export_scene.gltf(
    filepath=str(OUT_GLB),
    export_format="GLB",
    export_apply=True,
)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 20
scene.cycles.use_denoising = False
scene.render.resolution_x = 960
scene.render.resolution_y = 640
scene.render.filepath = str(OUT_DIR / "ranch-7620.png")
scene.render.image_settings.media_type = "IMAGE"
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
bpy.ops.render.render(write_still=True)
print(f"WROTE {OUT_GLB}")
print(f"WROTE {OUT_DIR / 'ranch-7620.png'}")
