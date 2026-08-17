# Bikes v2 — factory notes

Source of truth: Solo scratchpad `bikes-v2-master-plan` (project 21). v1 at `~/Sites/bikes` is reference + asset donor only.

## Stack

- TypeScript + Three.js + Vite. Pure sim in `src/core/*` (no WebGL in tests).
- Input is intents, not keys. Adapters live in `src/input/`.
- Ship gate: `npm run quality` (`tsc --noEmit` + Vitest + build). CI runs it on every PR.

## Boundaries

| Dir | Owns |
|-----|------|
| `core/` | game loop, ECS-lite registry, events, fixed-timestep sim |
| `input/` | keyboard / gamepad / touch → intents |
| `bike/` | physics, battery, tires, upgrades |
| `world/` | OSM loader, terrain, curation, flip state |
| `combat/` | melee, ram, throwables, damage |
| `zombies/` | spawning, AI, hordes |
| `ui/` | HUD, minimap, F-Widget |

Budget: no file over ~300 lines. Systems talk via events/state, not each other's internals.

## Art

- **Heroes** (7620, later Circle K): `tools/models/*.py` → `public/models/`. Asset issues are labeled `asset`.
- **Kit** (bike, rider, snap sockets): `tools/models/kit/`. Fashion parts; do not one-off cubes. See `tools/models/KIT.md`.
- **Fill streets:** instanced later. Do not clone the 7620 GLB.
- v1 meshes are donors. Rebuild against the real pin + photos.

## Do not

- Re-interview Jordan. Escalate taste questions on your Solo todo.
- Blind-copy v1 `main.js`. Salvage assets, not the god-object.
- Put `window.addEventListener('keydown')` in gameplay code.
