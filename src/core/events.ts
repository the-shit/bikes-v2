/**
 * Ownership: typed pub/sub bus. Systems talk through this, not internals.
 * Talks via: string topics + payloads. Do not import other systems.
 * Budget: keep this file under ~300 lines.
 */

export type Handler<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export type EventBus = {
  on<T>(topic: string, handler: Handler<T>): Unsubscribe;
  off<T>(topic: string, handler: Handler<T>): void;
  emit<T>(topic: string, payload: T): void;
  clear(): void;
};

export function createBus(): EventBus {
  const topics = new Map<string, Set<Handler<unknown>>>();

  function on<T>(topic: string, handler: Handler<T>): Unsubscribe {
    let set = topics.get(topic);
    if (!set) {
      set = new Set();
      topics.set(topic, set);
    }
    set.add(handler as Handler<unknown>);
    return () => off(topic, handler);
  }

  function off<T>(topic: string, handler: Handler<T>): void {
    const set = topics.get(topic);
    if (!set) {
      return;
    }
    set.delete(handler as Handler<unknown>);
    if (set.size === 0) {
      topics.delete(topic);
    }
  }

  function emit<T>(topic: string, payload: T): void {
    const set = topics.get(topic);
    if (!set) {
      return;
    }
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  function clear(): void {
    topics.clear();
  }

  return { on, off, emit, clear };
}
