import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const GAMEPLAY = ['bike', 'core', 'combat', 'zombies', 'world'];
const RAW_INPUT =
  /addEventListener\(\s*['"]keydown['"]|addEventListener\(\s*['"]keyup['"]|addEventListener\(\s*['"]gamepad|navigator\.getGamepads|addEventListener\(\s*['"]touchstart/;

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

describe('portability audit', () => {
  it('keeps raw device listeners out of gameplay modules', () => {
    const files = GAMEPLAY.flatMap((d) => walk(join(ROOT, d)));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(RAW_INPUT);
    }
  });

  it('does not ship a D-pad overlay', () => {
    const ui = walk(join(ROOT, 'ui'))
      .concat(walk(join(ROOT, 'input')))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(ui).not.toMatch(/data-tc-left|virtual-dpad|class=['"]dpad|id=['"]dpad/i);
  });

  it('avoids chrome-only globals in the sim', () => {
    const files = ['bike', 'core', 'combat', 'zombies'].flatMap((d) =>
      walk(join(ROOT, d)),
    );
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /window\.chrome|webkitRequestFileSystem/,
      );
    }
  });
});
