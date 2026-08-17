/**
 * Ownership: ECS-lite entity ids + ordered system ticks.
 * Talks via: tick(dt) and entity ids. Do not import other systems' internals.
 * Budget: keep this file under ~300 lines.
 */

export type EntityId = number;

export type System = {
  name: string;
  tick: (dt: number) => void;
};

export type Registry = {
  spawn(): EntityId;
  despawn(id: EntityId): void;
  has(id: EntityId): boolean;
  addSystem(system: System): void;
  tick(dt: number): void;
};

export function createRegistry(): Registry {
  let next = 1;
  const entities = new Set<EntityId>();
  const systems: System[] = [];

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
