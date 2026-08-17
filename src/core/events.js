/**
 * Ownership: typed pub/sub bus. Systems talk through this, not internals.
 * Talks via: string topics + payloads. Do not import other systems.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @template T
 * @callback Handler
 * @param {T} payload
 * @returns {void}
 */

/**
 * @typedef {object} EventBus
 * @property {<T>(topic: string, handler: Handler<T>) => () => void} on
 * @property {<T>(topic: string, handler: Handler<T>) => void} off
 * @property {<T>(topic: string, payload: T) => void} emit
 * @property {() => void} clear
 */

/** @returns {EventBus} */
export function createBus() {
  /** @type {Map<string, Set<Handler<unknown>>>} */
  const topics = new Map();

  /**
   * @template T
   * @param {string} topic
   * @param {Handler<T>} handler
   * @returns {() => void}
   */
  function on(topic, handler) {
    let set = topics.get(topic);
    if (!set) {
      set = new Set();
      topics.set(topic, set);
    }
    set.add(/** @type {Handler<unknown>} */ (handler));
    return () => off(topic, handler);
  }

  /**
   * @template T
   * @param {string} topic
   * @param {Handler<T>} handler
   */
  function off(topic, handler) {
    const set = topics.get(topic);
    if (!set) {
      return;
    }
    set.delete(/** @type {Handler<unknown>} */ (handler));
    if (set.size === 0) {
      topics.delete(topic);
    }
  }

  /**
   * @template T
   * @param {string} topic
   * @param {T} payload
   */
  function emit(topic, payload) {
    const set = topics.get(topic);
    if (!set) {
      return;
    }
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  function clear() {
    topics.clear();
  }

  return { on, off, emit, clear };
}
