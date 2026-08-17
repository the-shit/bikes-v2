import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const FORBIDDEN =
  /openai|anthropic|@anthropic|spacexai|asgard\/|from ['"]ai['"]|createCompletion|chat\.completions/i;

const LOOP_DIRS = ['bike', 'input', 'combat', 'core'];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...walk(path));
    } else if (name.name.endsWith('.ts')) {
      out.push(path);
    }
  }
  return out;
}

describe('AI boundary (master plan addendum)', () => {
  it('keeps physics / input / combat / frame loop free of LLM clients', () => {
    const files = LOOP_DIRS.flatMap((d) => walk(join(ROOT, d)));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(FORBIDDEN);
    }
  });
});
