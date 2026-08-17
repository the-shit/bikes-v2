# Bikes v2

Zombie-apocalypse ebike survival set in a real Mesa, AZ neighborhood (Jan Ave origin). Opens as a normal ride, then the world flips.

**Live:** [https://bikes-v2.jordanpartridge.us](https://bikes-v2.jordanpartridge.us)

v1 (`the-shit/bikes`, [bikes.jordanpartridge.us](https://bikes.jordanpartridge.us)) is reference + asset donor only.

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (HMR) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (loop / sim, no WebGL) |
| `npm run quality` | Tests + production build |
| `npm run map:mesa` | Re-bake `public/data/mesa-az.json` |

## Stack

- TypeScript + Three.js + Vite
- Module boundaries: `core/`, `input/`, `bike/`, `world/`, `combat/`, `zombies/`, `ui/`
- Budget: no file over ~300 lines; systems talk via events/state, not each other's internals

## Map data

Origin: geocoded `7620 E Jan Ave, Mesa, AZ`. OSM roads (ODbL) + SRTM/Open-Meteo elevation, baked to `public/data/mesa-az.json`.

```bash
node scripts/fetch-mesa-map.mjs
```

## Deploy (Odin + Cloudflare Tunnel)

Same pattern as v1, new hostname and port.

| Piece | Detail |
|-------|--------|
| Source clone | `odin:~/Sites/bikes-v2-src` |
| Live tree | `odin:~/Sites/bikes-v2` (`dist/` + `deploy/server.mjs`) |
| Local server | `127.0.0.1:8311` (`systemd --user` `bikes-v2.service`) |
| Tunnel | `bikes-v2.jordanpartridge.us` → `http://127.0.0.1:8311` |

On odin, once:

```bash
~/Sites/bikes-v2-src/deploy/install-autodeploy.sh
```

Manual ship:

```bash
~/Sites/bikes-v2-src/deploy/odin.sh
```

Autodeploy polls `origin/main` every minute (`bikes-v2-autodeploy.timer`).

## PR flow

Work lands on `main` via pull request. Do not push gameplay to `main` directly.

## License

MIT.
