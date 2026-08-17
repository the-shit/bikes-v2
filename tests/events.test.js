import { describe, expect, it, vi } from 'vitest';
import { createBus } from '../src/core/events.js';

describe('event bus', () => {
  it('delivers to subscribers', () => {
    const bus = createBus();
    const seen = [];
    bus.on('tick', (n) => seen.push(n));
    bus.emit('tick', 1);
    bus.emit('tick', 2);
    expect(seen).toEqual([1, 2]);
  });

  it('unsubscribe stops delivery', () => {
    const bus = createBus();
    const fn = vi.fn();
    const off = bus.on('hit', fn);
    off();
    bus.emit('hit', { dmg: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not leak across topics', () => {
    const bus = createBus();
    const fn = vi.fn();
    bus.on('a', fn);
    bus.emit('b', true);
    expect(fn).not.toHaveBeenCalled();
  });
});
