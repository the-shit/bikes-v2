"""E-bike kit. Sockets: seat, bars, hub-f, hub-r. ~1.8 m long, hub 0.42 m."""

from pathlib import Path
import sys

import bpy

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from parts import (  # noqa: E402
    box,
    cyl,
    export_kit,
    mat,
    mesa_sun,
    parent,
    socket,
    torus,
)

from studio import reset_scene  # noqa: E402

ROOT = HERE.parents[2]
OUT = ROOT / "public" / "models"


def build_bike():
    frame = mat("BikeFrame", (0.08, 0.09, 0.11), roughness=0.38, metallic=0.7)
    accent = mat("BikeAccent", (0.85, 0.32, 0.05), roughness=0.4, metallic=0.25)
    rubber = mat("BikeRubber", (0.04, 0.04, 0.045), roughness=0.95)
    rim = mat("BikeRim", (0.78, 0.80, 0.84), roughness=0.28, metallic=0.82)
    dark = mat("BikeDark", (0.06, 0.06, 0.07), roughness=0.45, metallic=0.5)

    parts = []
    # Wheels — Y is bike forward in Blender so +Y is street-nose
    for name, y in (("hub-f", 0.58), ("hub-r", -0.58)):
        t = torus(f"tire-{name}", 0.34, 0.055, (0, y, 0.42), rubber, rot=(0, 1.5708, 0))
        r = cyl(f"rim-{name}", 0.20, 0.04, (0, y, 0.42), rim, rot=(0, 1.5708, 0))
        parts += [t, r]
        parts.append(socket(f"socket-{name}", (0, y, 0.42)))

    parts.append(cyl("tube-top", 0.028, 0.95, (0, 0.02, 0.64), frame, rot=(1.25, 0, 0)))
    parts.append(cyl("tube-down", 0.03, 0.58, (0, 0.16, 0.52), frame, rot=(0.85, 0, 0)))
    parts.append(cyl("seat-post", 0.018, 0.28, (0, -0.22, 0.78), dark))
    parts.append(box("seat", (0.14, 0.28, 0.05), (0, -0.24, 0.94), dark))
    parts.append(socket("socket-seat", (0, -0.22, 0.96)))

    parts.append(box("pack", (0.12, 0.46, 0.14), (0, 0.08, 0.50), dark, rot=(-0.55, 0, 0)))
    parts.append(box("pack-stripe", (0.125, 0.40, 0.03), (0, 0.10, 0.56), accent, rot=(-0.55, 0, 0)))

    parts.append(cyl("stem", 0.016, 0.14, (0, 0.54, 0.92), dark))
    parts.append(cyl("bars", 0.014, 0.68, (0, 0.56, 0.99), dark, rot=(0, 1.5708, 0)))
    parts.append(socket("socket-bars", (0, 0.56, 0.99)))
    parts.append(box("light", (0.06, 0.05, 0.05), (0, 0.64, 0.88), accent))

    root = parent("kit-bike", parts)
    return root


reset_scene()
build_bike()
mesa_sun((2.4, -2.6, 1.5), (0, 0.1, 0.55), lens=40)
export_kit(OUT / "kit-bike.glb", OUT / "kit-bike.png", samples=14)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "kit-bike.blend"))
