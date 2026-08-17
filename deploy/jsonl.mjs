/**
 * Append-only jsonl helpers for the feedback farm.
 */
import fs from 'node:fs';
import path from 'node:path';

export function readJsonl(file) {
  if (!fs.existsSync(file)) {
    return [];
  }
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function jsonlHasId(file, id) {
  return Boolean(id) && readJsonl(file).some((rec) => rec.id === id);
}

export function appendJsonl(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

export function patchJsonlById(file, id, patch) {
  if (!id || !fs.existsSync(file)) {
    return;
  }
  const next = readJsonl(file).map((rec) =>
    rec.id === id ? { ...rec, ...patch } : rec,
  );
  fs.writeFileSync(
    file,
    `${next.map((rec) => JSON.stringify(rec)).join('\n')}${next.length ? '\n' : ''}`,
  );
}
