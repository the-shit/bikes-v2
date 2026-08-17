/**
 * Ownership: ECS-lite entity ids + ordered system ticks.
 * Talks via: tick(dt) and entity ids. Do not import other systems' internals.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {number} EntityId
 */

/**
 * @typedef {object} System
 * @property {string} name
 * @property {(dt: number) => void} tick
 */

/**
 * @typedef {object} Registry
 * @property {() => EntityId} spawn
 * @property {(id: EntityId) => void} despawn
 * @property {(id: EntityId) => boolean} has
 * @property {(system: System) => void} addSystem
 * @property {(dt: number) => void} tick
 */

/** @returns {Registry} */
export function createRegistry() {
  let next = 1;
  /** @type {Set<EntityId>} */
  const entities = new Set();
  /** @type {System[]} */
  const systems = [];

  return {
    spawn() {
      const id = next;
      next += 1;
      entities.add(id);
      return id;
    },
    despawn(id) {
      entities.delete(id);
    },
    has(id) {
      return entities.has(id);
    },
    addSystem(system) {
      systems.push(system);
    },
    tick(dt) {
      for (const system of systems) {
        system.tick(dt);
      }
    },
  };
}
