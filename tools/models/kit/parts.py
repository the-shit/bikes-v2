"""Named Mesa kit pieces. Import from bike.py / rider.py inside Blender."""

from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Vector

STUDIO = Path.home() / "projects" / "blender"
if str(STUDIO) not in sys.path:
    sys.path.insert(0, str(STUDIO))

from studio import principled  # noqa: E402


def mat(name: str, color, roughness=0.6, metallic=0.0):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    return principled(name, color=color, roughness=roughness, metallic=metallic)


def box(name, size, loc, material, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(material)
    return obj


def cyl(name, radius, depth, loc, material, verts=12, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius,
        depth=depth,
        vertices=verts,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def sphere(name, radius, loc, material, segments=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius,
        segments=segments,
        ring_count=max(8, segments // 2),
        location=loc,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def torus(name, major, minor, loc, material, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=18,
        minor_segments=8,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def socket(name, loc):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.empty_display_size = 0.12
    return obj


def parent(name, objects):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = name
    for obj in objects:
        obj.parent = root
    return root


def mesa_sun(cam_loc, look_at, lens=32.0):
    bpy.ops.object.camera_add(location=cam_loc)
    cam = bpy.context.active_object
    cam.name = "kit-cam"
    cam.data.lens = lens
    direction = Vector(look_at) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(6, -4, 10))
    sun = bpy.context.active_object
    sun.data.energy = 5.5
    sun.rotation_euler = (0.75, 0.2, 2.3)
    world = bpy.data.worlds.new("KitSky")
    bpy.context.scene.world = world
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.48, 0.64, 0.84, 1.0)
        bg.inputs[1].default_value = 1.0
    return cam


def export_kit(out_glb: Path, preview: Path, samples=16):
    out_glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(out_glb),
        export_format="GLB",
        export_apply=True,
    )
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.filepath = str(preview)
    scene.render.image_settings.media_type = "IMAGE"
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    bpy.ops.render.render(write_still=True)
    print(f"WROTE {out_glb}")
    print(f"WROTE {preview}")
