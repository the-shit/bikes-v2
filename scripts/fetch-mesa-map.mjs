#!/usr/bin/env node
/**
 * Re-fetch Mesa AZ map data (elevation + OSM roads) around 7620 E Jan Ave.
 * Writes public/data/mesa-az.json
 *
 *   node scripts/fetch-mesa-map.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = {
  lat: 33.38266,
  lon: -111.6668,
  label: '7620 E Jan Ave, Mesa, AZ',
};
const HALF_M = 900;
const GRID = 49;
const M_PER_DEG_LAT = 111320;
const mPerDegLon = M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180);

function localToLatLon(x, z) {
  return {
    lat: ORIGIN.lat - z / M_PER_DEG_LAT,
    lon: ORIGIN.lon + x / mPerDegLon,
  };
}
function latLonToLocal(lat, lon) {
  return {
    x: (lon - ORIGIN.lon) * mPerDegLon,
    z: (ORIGIN.lat - lat) * M_PER_DEG_LAT,
  };
}

const locations = [];
for (let iz = 0; iz < GRID; iz++) {
  for (let ix = 0; ix < GRID; ix++) {
    const x = -HALF_M + (ix / (GRID - 1)) * HALF_M * 2;
    const z = -HALF_M + (iz / (GRID - 1)) * HALF_M * 2;
    const { lat, lon } = localToLatLon(x, z);
    locations.push(`${lat},${lon}`);
  }
}

async function fetchElevations(locs) {
  const elev = new Array(locs.length).fill(null);
  const chunk = 90;
  for (let i = 0; i < locs.length; i += chunk) {
    const slice = locs.slice(i, i + chunk);
    let res = await fetch(
      `https://api.opentopodata.org/v1/srtm30m?locations=${slice.join('|')}`,
    );
    if (!res.ok) {
      res = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${slice
          .map((s) => s.split(',')[0])
          .join(',')}&longitude=${slice.map((s) => s.split(',')[1]).join(',')}`,
      );
      const data = await res.json();
      for (let j = 0; j < (data.elevation || []).length; j++) {
        elev[i + j] = data.elevation[j];
      }
    } else {
      const data = await res.json();
      for (let j = 0; j < data.results.length; j++) {
        elev[i + j] = data.results[j].elevation;
      }
    }
    console.log(`elev ${Math.min(i + chunk, locs.length)}/${locs.length}`);
    await new Promise((r) => setTimeout(r, 1100));
  }
  return elev;
}

const elevations = await fetchElevations(locations);
const valid = elevations.filter((e) => e != null && Number.isFinite(e));
const minE = Math.min(...valid);
const maxE = Math.max(...valid);

const pad = HALF_M * 1.05;
const a = localToLatLon(-pad, pad);
const b = localToLatLon(pad, -pad);
const south = Math.min(a.lat, b.lat);
const north = Math.max(a.lat, b.lat);
const west = Math.min(a.lon, b.lon);
const east = Math.max(a.lon, b.lon);
const bbox = `${south},${west},${north},${east}`;
const query = `[out:json][timeout:90];way["highway"](${bbox});out geom;`;

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'BikesV2/0.1 (Mesa AZ bike game)',
  },
  body: new URLSearchParams({ data: query }).toString(),
});
if (!res.ok) {
  throw new Error(`Overpass ${res.status}`);
}
const osm = await res.json();
const roads = [];
for (const el of osm.elements || []) {
  if (el.type !== 'way' || !el.geometry || !el.tags?.highway) {
    continue;
  }
  roads.push({
    id: el.id,
    highway: el.tags.highway,
    name: el.tags.name || null,
    points: el.geometry.map((g) => {
      const p = latLonToLocal(g.lat, g.lon);
      return [Number(p.x.toFixed(2)), Number(p.z.toFixed(2))];
    }),
  });
}

const payload = {
  meta: {
    source: 'OSM Overpass + OpenTopoData SRTM/Open-Meteo',
    license: 'ODbL for OSM roads; elevation per provider terms',
    origin: ORIGIN,
    halfExtentM: HALF_M,
    grid: GRID,
    fetchedAt: new Date().toISOString(),
    elevMin: minE,
    elevMax: maxE,
    roadCount: roads.length,
  },
  elevMin: minE,
  elevations: elevations.map((e) =>
    e == null ? 0 : Number((e - minE).toFixed(2)),
  ),
  roads,
};

const out = join(ROOT, 'public/data/mesa-az.json');
writeFileSync(out, JSON.stringify(payload));
console.log('wrote', out, {
  roads: roads.length,
  elev: elevations.length,
  range: [minE, maxE],
});
