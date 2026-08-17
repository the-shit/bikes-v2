"""Seated Jordan caricature. Hip sits on socket-seat.

Likeness (issue #12): tools/models/rider/refs/
  jordan-face-front.jpg       beard + rectangular glasses silhouette
  jordan-face-low-profile.jpg beard volume from below — exaggerate
  jordan-profile-right.jpg    hairline, beard-to-neck
  jordan-feet-flipflops.jpg   grey flops, bare feet, never socks

Campy cartoon, not photoreal. No helmets. Chase-cam read is beard + glasses.
"""

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
REFS = ROOT / "tools" / "models" / "rider" / "refs"


def build_rider():
    # Heather-blue tee + khaki shorts from the flop stills.
    skin = mat("RiderSkin", (0.62, 0.42, 0.28), roughness=0.72)
    shirt = mat("RiderShirt", (0.58, 0.64, 0.72), roughness=0.82)
    shorts = mat("RiderShorts", (0.52, 0.44, 0.28), roughness=0.84)
    hair = mat("RiderHair", (0.32, 0.24, 0.16), roughness=0.92)
    beard = mat("RiderBeard", (0.38, 0.28, 0.18), roughness=0.95)
    glass = mat("RiderGlass", (0.06, 0.06, 0.07), roughness=0.25, metallic=0.15)
    flop = mat("RiderFlop", (0.28, 0.28, 0.30), roughness=0.78)

    parts = []
    # Hip at origin — Three snaps this to socket-seat. 6'4 seated: long spine.
    parts.append(box("hip", (0.36, 0.22, 0.18), (0, 0.02, 0.10), shorts))
    parts.append(box("chest", (0.42, 0.22, 0.36), (0, 0.12, 0.42), shirt, rot=(0.38, 0, 0)))
    parts.append(box("belly", (0.30, 0.16, 0.14), (0, 0.08, 0.24), shirt))

    # Smaller head than Homer. Identity is beard + glasses, not skull size.
    parts.append(sphere("head", 0.12, (0, 0.20, 0.74), skin, segments=14))
    parts.append(sphere("hair-cap", 0.122, (0, 0.18, 0.78), hair, segments=12))
    parts.append(socket("socket-head", (0, 0.20, 0.74)))

    # Full beard, volume from the low-profile ref.
    parts.append(box("beard", (0.16, 0.14, 0.12), (0, 0.26, 0.64), beard))
    parts.append(sphere("beard-chin", 0.08, (0, 0.30, 0.60), beard, segments=10))

    # Rectangular frames (front still).
    parts.append(box("lens-l", (0.055, 0.01, 0.04), (-0.05, 0.30, 0.76), glass))
    parts.append(box("lens-r", (0.055, 0.01, 0.04), (0.05, 0.30, 0.76), glass))
    parts.append(box("bridge", (0.03, 0.008, 0.012), (0, 0.305, 0.76), glass))
    parts.append(box("arm-l", (0.008, 0.07, 0.008), (-0.08, 0.24, 0.76), glass))
    parts.append(box("arm-r", (0.008, 0.07, 0.008), (0.08, 0.24, 0.76), glass))

    for side, sx in (("l", -1), ("r", 1)):
        parts.append(
            cyl(
                f"thigh-{side}",
                0.06,
                0.42,
                (sx * 0.11, -0.08, -0.12),
                shorts,
                rot=(1.05, 0, sx * 0.08),
            )
        )
        parts.append(
            cyl(
                f"shin-{side}",
                0.045,
                0.40,
                (sx * 0.11, 0.18, -0.32),
                skin,
                rot=(0.12, 0, 0),
            )
        )
        # Grey flop + bare foot. No shoe brick, no socks.
        parts.append(box(f"foot-{side}", (0.08, 0.18, 0.04), (sx * 0.11, 0.34, -0.50), skin))
        parts.append(box(f"flop-sole-{side}", (0.09, 0.20, 0.02), (sx * 0.11, 0.34, -0.53), flop))
        parts.append(box(f"flop-strap-{side}", (0.02, 0.08, 0.02), (sx * 0.11, 0.38, -0.48), flop))
        parts.append(
            cyl(
                f"upper-arm-{side}",
                0.045,
                0.30,
                (sx * 0.24, 0.16, 0.46),
                shirt,
                rot=(1.1, 0, sx * 0.32),
            )
        )
        parts.append(
            cyl(
                f"forearm-{side}",
                0.035,
                0.28,
                (sx * 0.28, 0.36, 0.54),
                skin,
                rot=(0.35, 0, sx * 0.15),
            )
        )
        parts.append(sphere(f"hand-{side}", 0.045, (sx * 0.30, 0.50, 0.60), skin, segments=8))

    parts.append(socket("socket-hands", (0, 0.52, 0.60)))
    if not REFS.is_dir():
        raise SystemExit(f"missing likeness refs: {REFS}")
    return parent("kit-rider", parts)


reset_scene()
build_rider()
mesa_sun((1.6, -1.8, 1.2), (0, 0.15, 0.25), lens=45)
export_kit(OUT / "kit-rider.glb", OUT / "kit-rider.png", samples=14)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "kit-rider.blend"))
