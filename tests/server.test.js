import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { safeJoin } from '../deploy/server.mjs';

const ROOT = path.resolve('/tmp/bikes-v2-dist');

describe('safeJoin', () => {
  it('serves files under root', () => {
    expect(safeJoin(ROOT, '/index.html')).toBe(path.join(ROOT, 'index.html'));
  });

  it('rejects parent-directory escapes', () => {
    expect(safeJoin(ROOT, '/../etc/passwd')).toBeNull();
  });
});
