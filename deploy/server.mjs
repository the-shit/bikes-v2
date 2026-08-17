#!/usr/bin/env node
/**
 * Static file server for Bikes v2 + POST /api/feedback
 * → feedback.jsonl + screenshots + Mattermost + GitHub (the-shit/bikes-v2)
 *
 * Env (optional files: ../.env.mattermost, ../.env, or v1 siblings):
 *   MATTERMOST_URL, MATTERMOST_BOT_TOKEN, MATTERMOST_BIKES_CHANNEL_ID
 *   GITHUB_TOKEN, GITHUB_REPO (default the-shit/bikes-v2)
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');
const ROOT = path.resolve(
  process.env.BIKES_V2_ROOT || path.join(PROJECT, 'dist'),
);
const PORT = Number(process.env.BIKES_V2_PORT || 8311);
const HOST = process.env.BIKES_V2_HOST || '127.0.0.1';
const FEEDBACK_FILE =
  process.env.BIKES_V2_FEEDBACK_FILE || path.join(PROJECT, 'feedback.jsonl');
const SCREENSHOTS_DIR =
  process.env.BIKES_V2_SCREENSHOTS_DIR ||
  path.join(PROJECT, 'feedback', 'screenshots');
const PUBLIC_URL =
  process.env.BIKES_V2_PUBLIC_URL || 'https://bikes-v2.jordanpartridge.us';
const BODY_LIMIT = 2_500_000;
const FARM_FILES = ['feedbackFarm.mjs', 'feedbackFormat.mjs'];

/** Old odin.sh only copies server.mjs — pull farm siblings from the src clone. */
export function ensureFarmSiblings(
  destDir = __dirname,
  srcDir = path.join(
    process.env.BIKES_V2_SRC || path.join(os.homedir(), 'Sites/bikes-v2-src'),
    'deploy',
  ),
) {
  const copied = [];
  for (const name of FARM_FILES) {
    const dest = path.join(destDir, name);
    if (fs.existsSync(dest)) {
      continue;
    }
    const src = path.join(srcDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      copied.push(name);
    }
  }
  return copied;
}

let farmBundle;

async function loadFarmBundle() {
  if (farmBundle) {
    return farmBundle;
  }
  ensureFarmSiblings();
  const farmPath = path.join(__dirname, 'feedbackFarm.mjs');
  const mod = await import(pathToFileURL(farmPath).href);
  mod.loadEnvFile(path.join(PROJECT, '.env.mattermost'));
  mod.loadEnvFile(path.join(PROJECT, '.env'));
  mod.loadEnvFile(path.join(PROJECT, '..', 'bikes', '.env.mattermost'));
  mod.loadEnvFile(path.join(PROJECT, '..', 'bikes', '.env'));
  farmBundle = {
    farm: mod.createFeedbackFarm(),
    ingestFeedback: mod.ingestFeedback,
  };
  return farmBundle;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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

function readBody(req, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function requestPublicUrl(req) {
  const host = req.headers.host;
  if (!host) {
    return PUBLIC_URL;
  }
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwarded || req.socket.remoteAddress || null;
}

const SHOT_NAME = /^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i;

async function resolveFarm(options) {
  if (options.farm && options.ingestFeedback) {
    return { farm: options.farm, ingestFeedback: options.ingestFeedback };
  }
  if (options.farm) {
    const bundle = await loadFarmBundle();
    return { farm: options.farm, ingestFeedback: bundle.ingestFeedback };
  }
  return loadFarmBundle();
}

export function createServer(root = ROOT, options = {}) {
  const feedbackFile = options.feedbackFile || FEEDBACK_FILE;
  const screenshotsDir = options.screenshotsDir || SCREENSHOTS_DIR;

  return http.createServer(async (req, res) => {
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

    if (req.method === 'GET' && url.pathname === '/api/feedback/health') {
      const bundle = await resolveFarm(options);
      send(
        res,
        200,
        JSON.stringify({
          ok: true,
          file: feedbackFile,
          screenshots: screenshotsDir,
          mattermost: bundle.farm.enabled.mattermost,
          github: bundle.farm.enabled.github,
          repo: bundle.farm.enabled.repo,
        }),
        'application/json',
      );
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/feedback/screenshots/')) {
      const name = url.pathname.slice('/api/feedback/screenshots/'.length);
      if (!SHOT_NAME.test(name)) {
        send(res, 404, 'Not found');
        return;
      }
      const filePath = path.join(screenshotsDir, name);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        send(res, 404, 'Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const body = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/feedback') {
      try {
        const bundle = await resolveFarm(options);
        const raw = await readBody(req);
        const data = JSON.parse(raw);
        const result = await bundle.ingestFeedback(data, {
          ip: requestIp(req),
          feedbackFile,
          screenshotsDir,
          publicUrl: options.publicUrl || requestPublicUrl(req),
          farm: bundle.farm,
        });
        send(res, result.status, JSON.stringify(result.body), 'application/json');
      } catch (err) {
        const code = String(err.message || err) === 'too large' ? 413 : 400;
        send(
          res,
          code,
          JSON.stringify({ ok: false, error: String(err.message || err) }),
          'application/json',
        );
      }
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
  server.listen(PORT, HOST, async () => {
    const { farm } = await loadFarmBundle();
    const { mattermost, github, repo } = farm.enabled;
    console.log(
      `bikes-v2 http://${HOST}:${PORT}  root=${ROOT}  feedback=${FEEDBACK_FILE}  mattermost=${mattermost}  github=${github ? repo : false}`,
    );
  });
}
