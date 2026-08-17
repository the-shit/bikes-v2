/**
 * Ownership: neighborhood minimap.
 * Talks via: read-only pose + roads snapshot.
 * Budget: keep this file under ~300 lines.
 */

export type Minimap = {
  draw(): void;
};

/** Stub. M3. */
export function createMinimap(): Minimap {
  return {
    draw() {},
  };
}
