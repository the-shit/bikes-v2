# Bikes v2 — factory notes

Source of truth: Solo scratchpad `bikes-v2-master-plan` (project 21). v1 at `~/Sites/bikes` is reference + asset donor only.

## Stack

- JavaScript + JSDoc + Three.js + Vite. Pure sim in `src/core/*` (no WebGL in tests).
- Input is intents, not keys. Adapters live in `src/input/`.
- Ship gate: `npm run quality`.

## Boundaries

| Dir | Owns |
|-----|------|
| `core/` | game loop, ECS-lite registry, events, fixed-timestep sim |
| `input/` | keyboard / gamepad / touch → intents |
| `bike/` | physics, battery, tires, upgrades |
| `world/` | OSM loader, terrain, curation, flip state |
| `combat/` | melee, ram, throwables, damage |
| `zombies/` | spawning, AI, hordes |
| `ui/` | HUD, minimap, feedback |

Budget: no file over ~300 lines. Systems talk via events/state, not each other's internals.

## Do not

- Re-interview Jordan. Escalate taste questions on your Solo todo.
- Blind-copy v1 `main.js`. Salvage assets, not the god-object.
- Put `window.addEventListener('keydown')` in gameplay code.
