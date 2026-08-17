#!/usr/bin/env node
/**
 * Static file server for Bikes v2.
 * Feedback API is not wired in M0 — v1's jsonl farm stays on bikes.jordanpartridge.us.
 *
 * Env:
 *   BIKES_V2_PORT (default 8311)
 *   BIKES_V2_HOST (default 127.0.0.1)
 *   BIKES_V2_ROOT (default ../dist)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');
const ROOT = path.resolve(
  process.env.BIKES_V2_ROOT || path.join(PROJECT, 'dist'),
);
const PORT = Number(process.env.BIKES_V2_PORT || 8311);
const HOST = process.env.BIKES_V2_HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
};

export function safeJoin(root, reqPath) {
  let decoded;
  try {
    decoded = decodeURIComponent((reqPath || '/').split('?')[0]);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('..')) {
    return null;
  }
  const full = path.resolve(root, decoded.replace(/^[/\\]+/, ''));
  const rel = path.relative(root, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return full;
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': code === 200 ? 'public, max-age=60' : 'no-store',
  });
  res.end(body);
}

export function createServer(root = ROOT) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      send(
        res,
        200,
        JSON.stringify({ ok: true, name: 'bikes-v2', root }),
        'application/json',
      );
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method not allowed');
      return;
    }

    let filePath = safeJoin(root, url.pathname === '/' ? '/index.html' : url.pathname);
    if (!filePath) {
      send(res, 403, 'Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      send(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    const body = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': type });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(body);
  });
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`bikes-v2 http://${HOST}:${PORT}  root=${ROOT}`);
  });
}
