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
| `socket-rack` | bike | cargo rack upgrade |
| `socket-armor` | bike | frame plates |
| `socket-mount` | bike | weapon mount / slingshot |
| `socket-head` | rider | hats only — **no helmets** game-wide |
| `socket-hands` | rider | bars reach |

## Rider likeness

The seated rider is a campy cartoon of Jordan. Bind to `tools/models/rider/refs/` (issue #12), not a generic mannequin.

| Ref | Read |
|---|---|
| `jordan-face-front.jpg` | beard + rectangular glasses — chase-cam identity |
| `jordan-face-low-profile.jpg` | beard volume; exaggerate |
| `jordan-profile-right.jpg` | hairline, beard-to-neck |
| `jordan-feet-flipflops.jpg` | grey flops, bare feet, never socks |

Default kit: heather-blue tee, khaki shorts, flip-flops. No helmet. Not photoreal.

## Fashion a new piece

1. `from parts import box, cyl, mat, socket, parent, export_kit`
2. Name every object. No `Cube.001`.
3. Sit origin at the snap point (seat / ground).
4. Preview with `mesa_sun`, not the crate studio (too dark at bike scale).

7620 ranch is **not** in this kit. That is issue #4.
