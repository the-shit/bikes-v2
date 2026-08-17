# Mesa kit

Fashion heroes from named parts. Do not one-off a cube per ticket.

## Build

```bash
npm run model:kit
```

Writes `public/models/kit-bike.glb` and `kit-rider.glb`.

## Sockets

| Name | On | Use |
|---|---|---|
| `socket-seat` | bike | snap rider hip |
| `socket-bars` | bike | hands / camera |
| `socket-hub-f` / `socket-hub-r` | bike | spin later |
| `socket-head` | rider | hats |
| `socket-hands` | rider | bars reach |

## Fashion a new piece

1. `from parts import box, cyl, mat, socket, parent, export_kit`
2. Name every object. No `Cube.001`.
3. Sit origin at the snap point (seat / ground).
4. Preview with `mesa_sun`, not the crate studio (too dark at bike scale).

7620 ranch is **not** in this kit. That is issue #4.
