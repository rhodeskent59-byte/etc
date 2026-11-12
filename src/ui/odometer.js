/**
 * Gemini Supply - Tabular Google Sans Mono Odometer
 * Character-diffed vertical slot roll powered by off-main-thread WAAPI.
 */

import { IS_SCREENSHOT_MODE, prefersReducedMotion } from '../state/store.js';

const ODOMETER_DURATION_MS = 190;
const ODOMETER_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function createOdometer(containerEl, initialText = '') {
  if (!containerEl) {
    let fallbackValue = String(initialText ?? '');
    return {
      setValue(nextText) {
        fallbackValue = String(nextText ?? '');
      },
      getValue() {
        return fallbackValue;
      },
    };
  }

  containerEl.classList.add('gs-odometer');

  let currentValue = String(initialText ?? '');
  /** @type {Array<{ slotEl: HTMLSpanElement, charEl: HTMLSpanElement, outEl: HTMLSpanElement | null, inAnim: Animation | null, outAnim: Animation | null, char: string }>} */
  let slots = [];

  function cancelSlotAnimations(slot) {
    if (slot.inAnim) {
      try {
        slot.inAnim.cancel();
      } catch {
        // Ignore cancelled animation errors
      }
      slot.inAnim = null;
    }
    if (slot.outAnim) {
      try {
        slot.outAnim.cancel();
      } catch {
        // Ignore cancelled animation errors
      }
      slot.outAnim = null;
    }
    if (slot.outEl && slot.outEl.parentNode) {
      slot.outEl.parentNode.removeChild(slot.outEl);
    }
    slot.outEl = null;
  }

  function clearAllSlots() {
    for (let i = 0; i < slots.length; i += 1) {
      cancelSlotAnimations(slots[i]);
    }
    slots = [];
  }

  function createSlotRecord(ch) {
    const slotEl = document.createElement('span');
    slotEl.className = 'gs-odometer__slot';
    slotEl.setAttribute('aria-hidden', 'true');

    const charEl = document.createElement('span');
    charEl.className = 'gs-odometer__char gs-odometer__char--in';
    charEl.textContent = ch;

    slotEl.appendChild(charEl);
    return {
      slotEl,
      charEl,
      outEl: null,
      inAnim: null,
      outAnim: null,
      char: ch,
    };
  }

  function hydrateSlotsFromText(text) {
    clearAllSlots();
    containerEl.textContent = '';
    const chars = Array.from(text);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < chars.length; i += 1) {
      const rec = createSlotRecord(chars[i]);
      slots.push(rec);
      frag.appendChild(rec.slotEl);
    }
    containerEl.appendChild(frag);
  }

  function applyInstant(nextStr) {
    clearAllSlots();
    currentValue = nextStr;
    containerEl.setAttribute('aria-label', nextStr);
    containerEl.textContent = nextStr;
  }

  function setValue(nextText, instant = false) {
    const nextStr = String(nextText ?? '');

    if (instant || IS_SCREENSHOT_MODE || prefersReducedMotion()) {
      applyInstant(nextStr);
      return;
    }

    if (nextStr === currentValue && slots.length === Array.from(nextStr).length) {
      containerEl.setAttribute('aria-label', nextStr);
      return;
    }

    if (slots.length === 0) {
      hydrateSlotsFromText(currentValue);
    }

    const prevChars = Array.from(currentValue);
    const nextChars = Array.from(nextStr);

    currentValue = nextStr;
    containerEl.setAttribute('aria-label', nextStr);

    // Remove surplus trailing character slots if string shortened
    while (slots.length > nextChars.length) {
      const removed = slots.pop();
      if (removed) {
        cancelSlotAnimations(removed);
        if (removed.slotEl.parentNode) {
          removed.slotEl.parentNode.removeChild(removed.slotEl);
        }
      }
    }

    for (let i = 0; i < nextChars.length; i += 1) {
      const nextCh = nextChars[i];
      const prevCh = i < prevChars.length ? prevChars[i] : null;

      if (i >= slots.length) {
        const rec = createSlotRecord(nextCh);
        slots.push(rec);
        containerEl.appendChild(rec.slotEl);

        if (typeof rec.charEl.animate === 'function') {
          rec.inAnim = rec.charEl.animate(
            [
              { transform: 'translateY(100%)', filter: 'blur(1.5px)', opacity: 0 },
              { transform: 'translateY(0%)', filter: 'blur(0px)', opacity: 1 },
            ],
            {
              duration: ODOMETER_DURATION_MS,
              easing: ODOMETER_EASING,
              fill: 'none',
            }
          );
          rec.inAnim.finished
            .then(() => {
              rec.inAnim = null;
            })
            .catch(() => {});
        }
        continue;
      }

      const slot = slots[i];
      if (prevCh === nextCh && slot.char === nextCh) {
        // Unchanged character stays completely static
        continue;
      }

      // Clean up any prior mid-flight animations on this slot before retargeting
      cancelSlotAnimations(slot);

      const outgoingEl = slot.charEl;
      outgoingEl.className = 'gs-odometer__char gs-odometer__char--out';
      outgoingEl.style.position = 'absolute';
      outgoingEl.style.left = '0';
      outgoingEl.style.top = '0';
      outgoingEl.style.pointerEvents = 'none';

      const incomingEl = document.createElement('span');
      incomingEl.className = 'gs-odometer__char gs-odometer__char--in';
      incomingEl.textContent = nextCh;

      slot.slotEl.appendChild(incomingEl);
      slot.charEl = incomingEl;
      slot.outEl = outgoingEl;
      slot.char = nextCh;

      if (typeof incomingEl.animate === 'function') {
        const outAnim = outgoingEl.animate(
          [
            { transform: 'translateY(0%)', filter: 'blur(0px)', opacity: 1 },
            { transform: 'translateY(-100%)', filter: 'blur(1.5px)', opacity: 0 },
          ],
          {
            duration: ODOMETER_DURATION_MS,
            easing: ODOMETER_EASING,
            fill: 'forwards',
          }
        );
        slot.outAnim = outAnim;
        outAnim.finished
          .then(() => {
            if (outgoingEl.parentNode) {
              outgoingEl.parentNode.removeChild(outgoingEl);
            }
            if (slot.outEl === outgoingEl) {
              slot.outEl = null;
              slot.outAnim = null;
            }
          })
          .catch(() => {});

        const inAnim = incomingEl.animate(
          [
            { transform: 'translateY(100%)', filter: 'blur(1.5px)', opacity: 0.35 },
            { transform: 'translateY(0%)', filter: 'blur(0px)', opacity: 1 },
          ],
          {
            duration: ODOMETER_DURATION_MS,
            easing: ODOMETER_EASING,
            fill: 'none',
          }
        );
        slot.inAnim = inAnim;
        inAnim.finished
          .then(() => {
            if (slot.inAnim === inAnim) {
              slot.inAnim = null;
            }
          })
          .catch(() => {});
      } else if (outgoingEl.parentNode) {
        outgoingEl.parentNode.removeChild(outgoingEl);
        slot.outEl = null;
      }
    }
  }

  // Initialize cleanly with zero transition
  applyInstant(currentValue);

  return {
    setValue,
    getValue() {
      return currentValue;
    },
  };
}
