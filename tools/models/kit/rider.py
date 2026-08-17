"""Seated rider. Hip sits on socket-seat. Hands reach socket-bars."""

from pathlib import Path
import sys

import bpy

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from parts import box, cyl, export_kit, mat, mesa_sun, parent, socket, sphere  # noqa: E402
from studio import reset_scene  # noqa: E402

ROOT = HERE.parents[2]
OUT = ROOT / "public" / "models"


def build_rider():
    skin = mat("RiderSkin", (0.62, 0.42, 0.28), roughness=0.72)
    shirt = mat("RiderShirt", (0.14, 0.28, 0.22), roughness=0.78)
    pants = mat("RiderPants", (0.12, 0.13, 0.16), roughness=0.82)
    hair = mat("RiderHair", (0.12, 0.08, 0.06), roughness=0.9)
    shoe = mat("RiderShoe", (0.08, 0.08, 0.09), roughness=0.7)

    parts = []
    # Hip at origin — Three snaps this to socket-seat
    parts.append(box("hip", (0.30, 0.20, 0.16), (0, 0.02, 0.08), pants))
    parts.append(box("torso", (0.34, 0.20, 0.40), (0, 0.10, 0.38), shirt, rot=(0.45, 0, 0)))
    parts.append(sphere("head", 0.13, (0, 0.22, 0.68), skin, segments=14))
    parts.append(sphere("hair", 0.135, (0, 0.20, 0.72), hair, segments=12))
    parts.append(socket("socket-head", (0, 0.22, 0.68)))

    for side, sx in (("l", -1), ("r", 1)):
        parts.append(
            cyl(
                f"thigh-{side}",
                0.055,
                0.36,
                (sx * 0.10, -0.06, -0.10),
                pants,
                rot=(1.05, 0, sx * 0.08),
            )
        )
        parts.append(
            cyl(
                f"shin-{side}",
                0.045,
                0.34,
                (sx * 0.10, 0.16, -0.28),
                pants,
                rot=(0.15, 0, 0),
            )
        )
        parts.append(box(f"shoe-{side}", (0.09, 0.20, 0.07), (sx * 0.10, 0.30, -0.44), shoe))
        parts.append(
            cyl(
                f"upper-arm-{side}",
                0.04,
                0.28,
                (sx * 0.20, 0.18, 0.42),
                shirt,
                rot=(1.1, 0, sx * 0.35),
            )
        )
        parts.append(
            cyl(
                f"forearm-{side}",
                0.035,
                0.26,
                (sx * 0.26, 0.36, 0.52),
                skin,
                rot=(0.35, 0, sx * 0.15),
            )
        )
        parts.append(sphere(f"hand-{side}", 0.045, (sx * 0.28, 0.48, 0.58), skin, segments=8))

    parts.append(socket("socket-hands", (0, 0.50, 0.58)))
    return parent("kit-rider", parts)


reset_scene()
build_rider()
mesa_sun((1.6, -1.8, 1.2), (0, 0.15, 0.25), lens=45)
export_kit(OUT / "kit-rider.glb", OUT / "kit-rider.png", samples=14)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "kit-rider.blend"))
