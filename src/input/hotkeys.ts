/**
 * Ownership: UI hotkeys → events. Not ride intents.
 * Talks via: EventBus (feedback:open/close/send). No gameplay imports.
 * Budget: keep this file under ~300 lines.
 */

import type { EventBus } from '../core/events';

type TypingTarget = {
  tagName?: string;
  isContentEditable?: boolean;
};

export function isTypingTarget(target: TypingTarget | EventTarget | null): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const el = target as TypingTarget;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return Boolean(el.isContentEditable);
}

/** F opens, Esc closes, Cmd/Ctrl+Enter sends. Ride adapters ignore form targets. */
export function mountFeedbackHotkey(bus: EventBus): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.repeat || event.altKey) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      bus.emit('feedback:close', null);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      if (!isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      bus.emit('feedback:send', null);
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      return;
    }
    if (event.code !== 'KeyF' && event.key !== 'f' && event.key !== 'F') {
      return;
    }
    if (isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    bus.emit('feedback:open', null);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
