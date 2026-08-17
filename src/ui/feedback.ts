/**
 * Ownership: in-ride feedback widget. Snapshot/screenshot via events only.
 * Talks via: EventBus feedback:* topics. Do not import bike/world/combat.
 * Budget: keep this file under ~300 lines.
 */

import type { EventBus } from '../core/events';
import { collectCapture } from './capture';
import {
  collectSnapshot,
  formatSnapshotLine,
  type RideSnapshot,
} from './snapshot';
import {
  buildFeedbackPayload,
  flushStashedFeedback,
  getStoredPlayerName,
  storePlayerName,
  submitFeedback,
  validateFeedbackDraft,
} from './submit';

export type FeedbackWidget = {
  open(): void;
  close(): void;
  destroy(): void;
  readonly isOpen: boolean;
};

export function createFeedback(
  root: HTMLElement,
  bus: EventBus,
): FeedbackWidget {
  const wrap = document.createElement('div');
  wrap.id = 'feedback-root';
  wrap.innerHTML = `
    <button type="button" class="fb-open" data-fb-open aria-haspopup="dialog">
      Got a note?
    </button>
    <div class="fb-modal" data-fb-modal hidden role="dialog" aria-modal="true" aria-label="Note to the pit crew">
      <div class="fb-card">
        <header>
          <strong>Note to the pit crew</strong>
          <button type="button" class="fb-x" data-fb-close aria-label="Close">×</button>
        </header>
        <label class="fb-field">
          <span>Your handle <em>(for glory if we build it)</em></span>
          <input type="text" data-fb-name maxlength="32" placeholder="e.g. Alex" autocomplete="nickname" />
        </label>
        <label class="fb-field">
          <span>What's up?</span>
          <textarea data-fb-text rows="4" maxlength="2000" placeholder="Wobbly bike? Missing a jump? Type it — F opens, Esc closes, WASD works here"></textarea>
        </label>
        <label class="fb-check">
          <input type="checkbox" data-fb-idea />
          <span>This is a wild idea — paint my name on it if it ships</span>
        </label>
        <div class="fb-meta" data-fb-meta></div>
        <footer>
          <button type="button" class="fb-send" data-fb-send>Send it</button>
          <span class="fb-status" data-fb-status></span>
        </footer>
      </div>
    </div>
  `;
  root.appendChild(wrap);

  const modal = wrap.querySelector('[data-fb-modal]') as HTMLElement;
  const text = wrap.querySelector('[data-fb-text]') as HTMLTextAreaElement;
  const nameInput = wrap.querySelector('[data-fb-name]') as HTMLInputElement;
  const ideaCheck = wrap.querySelector('[data-fb-idea]') as HTMLInputElement;
  const status = wrap.querySelector('[data-fb-status]') as HTMLElement;
  const meta = wrap.querySelector('[data-fb-meta]') as HTMLElement;

  const stopRideKeys = (event: Event) => event.stopPropagation();
  for (const el of [text, nameInput]) {
    el.addEventListener('keydown', stopRideKeys);
    el.addEventListener('keyup', stopRideKeys);
    el.addEventListener('keypress', stopRideKeys);
  }

  nameInput.value = getStoredPlayerName();
  void flushStashedFeedback();

  let opening = false;
  let snapshot: RideSnapshot | null = null;
  let screenshot: string | null = null;

  function isOpen(): boolean {
    return !modal.hidden;
  }

  async function open(): Promise<void> {
    if (isOpen() || opening) {
      return;
    }
    opening = true;
    try {
      const [snap, shot] = await Promise.all([
        collectSnapshot(bus),
        collectCapture(bus),
      ]);
      snapshot = snap;
      screenshot = shot;
      meta.textContent = formatSnapshotLine(snap);
      status.textContent = '';
      modal.hidden = false;
      bus.emit('feedback:opened', snap);
      requestAnimationFrame(() => {
        if (!nameInput.value) {
          nameInput.focus();
        } else {
          text.focus();
        }
      });
    } finally {
      opening = false;
    }
  }

  function close(): void {
    if (!isOpen()) {
      return;
    }
    modal.hidden = true;
    status.textContent = '';
    bus.emit('feedback:closed', null);
  }

  async function send(): Promise<void> {
    if (!isOpen()) {
      return;
    }
    const draft = validateFeedbackDraft({
      message: text.value,
      name: nameInput.value,
      featureIdea: ideaCheck.checked,
    });
    if (!draft.ok) {
      status.textContent = draft.error ?? 'Invalid';
      if (draft.error?.includes('handle')) {
        nameInput.focus();
      }
      return;
    }

    const name = nameInput.value.trim().slice(0, 32);
    storePlayerName(name);

    const payload = buildFeedbackPayload({
      message: text.value,
      name,
      featureIdea: ideaCheck.checked,
      snapshot: snapshot ?? (await collectSnapshot(bus)),
      screenshot,
      href: typeof location !== 'undefined' ? location.href : '',
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });

    status.textContent = 'Pedaling it over…';
    const result = await submitFeedback(payload);
    bus.emit('feedback:submitted', result);
    if (result.ok) {
      status.textContent =
        result.via === 'api'
          ? name
            ? `Got it — thanks, ${name}!`
            : 'Got it — the pit crew is on it!'
          : 'Stashed on this device till we find a signal';
      text.value = '';
      ideaCheck.checked = false;
      setTimeout(close, 1400);
    } else {
      status.textContent = 'Whoops — try one more toss';
    }
  }

  wrap.querySelector('[data-fb-open]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    void open();
  });
  wrap.querySelector('[data-fb-close]')?.addEventListener('click', () => close());
  wrap.querySelector('[data-fb-send]')?.addEventListener('click', () => {
    void send();
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      close();
    }
  });

  const offOpen = bus.on('feedback:open', () => {
    void open();
  });
  const offClose = bus.on('feedback:close', () => close());
  const offSend = bus.on('feedback:send', () => {
    void send();
  });

  return {
    open() {
      void open();
    },
    close,
    destroy() {
      offOpen();
      offClose();
      offSend();
      wrap.remove();
    },
    get isOpen() {
      return isOpen();
    },
  };
}
