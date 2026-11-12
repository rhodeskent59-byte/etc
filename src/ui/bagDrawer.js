/**
 * Gemini Supply - Slide-Over Bag Drawer (#08080A, 1px Left Hairline)
 * Features rolling tabular odometers, keyed item DOM updates, single-SKU vs
 * brand-store checkout routing, pointer-capture drag-right dismissal, and 0ms Escape close.
 */

import { OFFICIAL_BRAND_STORE_URL, webPhoto } from '../data/catalog.js';
import {
  IS_SCREENSHOT_MODE,
  prefersReducedMotion,
  subscribeBag,
  subscribeDrawer,
  closeBagDrawer,
  isBagDrawerOpen,
  updateBagItemQty,
  removeBagItem,
} from '../state/store.js';
import { createOdometer } from './odometer.js';
import { createSparkSvgElement } from './proceduralSparkSvg.js';

const DRAG_DISMISS_PX = 100;
const DRAG_VELOCITY_THRESHOLD = 0.11;
const LEFTWARD_FRICTION = 0.18;

export function initBagDrawer(mountEl, { onExploreCatalog, onLockScroll } = {}) {
  const hostEl = mountEl || document.body;
  hostEl.innerHTML = '';

  const backdropEl = document.createElement('div');
  backdropEl.className = 'gs-drawer-backdrop';
  backdropEl.setAttribute('aria-hidden', 'true');

  const drawerEl = document.createElement('div');
  drawerEl.id = 'bag-drawer';
  drawerEl.className = 'gs-drawer';
  drawerEl.setAttribute('data-lenis-prevent', '');
  drawerEl.setAttribute('role', 'dialog');
  drawerEl.setAttribute('aria-modal', 'true');
  drawerEl.setAttribute('aria-hidden', 'true');
  drawerEl.setAttribute('aria-label', 'Shopping Bag');

  drawerEl.innerHTML = `
    <div class="gs-drawer__header">
      <div class="gs-drawer__heading">
        <span class="gs-drawer__heading-prefix">BAG [</span>
        <span class="gs-drawer__count">00</span>
        <span class="gs-drawer__heading-suffix">]</span>
      </div>
      <button
        type="button"
        id="drawer-close-btn"
        class="gs-drawer__close gs-pressable"
        aria-label="Close shopping bag"
      >
        <span class="gs-drawer__close-text">CLOSE</span>
        <span class="gs-drawer__close-glyph" aria-hidden="true">×</span>
      </button>
    </div>

    <div class="gs-drawer__body">
      <div class="gs-drawer__empty">
        <span class="gs-drawer__empty-spark" aria-hidden="true"></span>
        <p class="gs-drawer__empty-title">YOUR BAG IS EMPTY</p>
        <p class="gs-drawer__empty-hint">Select any edition piece or add the four-piece set.</p>
        <button
          type="button"
          id="drawer-explore-btn"
          class="gs-btn-primary gs-drawer__explore-btn gs-pressable"
        >Explore Catalog</button>
      </div>

      <ul class="gs-drawer__list" hidden></ul>
    </div>

    <div class="gs-drawer__footer" hidden>
      <div class="gs-drawer__subtotal-row">
        <span class="gs-drawer__subtotal-label">SUBTOTAL</span>
        <span class="gs-drawer__subtotal-value">GBP £0.00</span>
      </div>

      <p class="gs-drawer__note">
        Individual items fulfill via official Google Merch Store listings.
      </p>

      <a
        class="gs-btn-primary gs-drawer__checkout gs-pressable"
        href="${OFFICIAL_BRAND_STORE_URL}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>Official Google Merch Store</span>
        <span class="gs-outbound-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  `;

  hostEl.appendChild(backdropEl);
  hostEl.appendChild(drawerEl);

  const countSlotEl = drawerEl.querySelector('.gs-drawer__count');
  const closeBtn = drawerEl.querySelector('#drawer-close-btn');
  const emptyEl = drawerEl.querySelector('.gs-drawer__empty');
  const emptySparkEl = drawerEl.querySelector('.gs-drawer__empty-spark');
  const exploreBtn = drawerEl.querySelector('#drawer-explore-btn');
  const listEl = drawerEl.querySelector('.gs-drawer__list');
  const footerEl = drawerEl.querySelector('.gs-drawer__footer');
  const subtotalValueEl = drawerEl.querySelector('.gs-drawer__subtotal-value');
  const checkoutLinkEl = drawerEl.querySelector('.gs-drawer__checkout');

  if (emptySparkEl) {
    emptySparkEl.appendChild(createSparkSvgElement(16, 0.64));
  }

  const countOdometer = createOdometer(countSlotEl, '00');
  const subtotalOdometer = createOdometer(subtotalValueEl, 'GBP £0.00');

  /** @type {Map<string, { li: HTMLLIElement, qtyOdometer: ReturnType<typeof createOdometer>, totalOdometer: ReturnType<typeof createOdometer> }>} */
  const itemRowMap = new Map();
  let hasHydratedBag = false;
  let lastFocusedEl = null;

  // Pointer drag state (multi-touch protected)
  let activePointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTime = 0;
  let isHorizontalDrag = false;
  let dragDecided = false;

  function createItemRow(entry, instant) {
    const { uid, product, size, qty, lineTotalFormatted } = entry;
    const qtyPadded = String(qty).padStart(2, '0');

    const li = document.createElement('li');
    li.className = 'gs-drawer-item';
    li.dataset.uid = uid;

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'gs-drawer-item__thumb';
    const img = document.createElement('img');
    img.src = webPhoto(product.cardPrimaryShot);
    img.alt = product.title;
    img.decoding = 'async';
    thumbWrap.appendChild(img);

    const content = document.createElement('div');
    content.className = 'gs-drawer-item__content';

    const topRow = document.createElement('div');
    topRow.className = 'gs-drawer-item__top';

    const titleEl = document.createElement('h3');
    titleEl.className = 'gs-drawer-item__title';
    titleEl.textContent = product.title;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'gs-drawer-item__remove gs-pressable';
    removeBtn.setAttribute('aria-label', `Remove ${product.title} (${size})`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      removeBagItem(uid);
    });

    topRow.appendChild(titleEl);
    topRow.appendChild(removeBtn);

    const sizeEl = document.createElement('div');
    sizeEl.className = 'gs-drawer-item__size';
    sizeEl.textContent = `SIZE: ${size}`;

    const controlsRow = document.createElement('div');
    controlsRow.className = 'gs-drawer-item__controls';

    const stepper = document.createElement('div');
    stepper.className = 'gs-stepper';
    stepper.setAttribute('role', 'group');
    stepper.setAttribute('aria-label', `Quantity for ${product.title}, size ${size}`);

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'gs-stepper__btn gs-stepper__btn--dec gs-pressable';
    decBtn.setAttribute('aria-label', `Decrease quantity of ${product.title}`);
    decBtn.textContent = '−';
    decBtn.addEventListener('click', () => {
      updateBagItemQty(uid, -1);
    });

    const qtySpan = document.createElement('span');
    qtySpan.className = 'gs-stepper__qty';

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'gs-stepper__btn gs-stepper__btn--inc gs-pressable';
    incBtn.setAttribute('aria-label', `Increase quantity of ${product.title}`);
    incBtn.textContent = '+';
    incBtn.addEventListener('click', () => {
      updateBagItemQty(uid, 1);
    });

    stepper.appendChild(decBtn);
    stepper.appendChild(qtySpan);
    stepper.appendChild(incBtn);

    const lineTotalEl = document.createElement('div');
    lineTotalEl.className = 'gs-drawer-item__total';

    controlsRow.appendChild(stepper);
    controlsRow.appendChild(lineTotalEl);

    const outboundLink = document.createElement('a');
    outboundLink.className = 'gs-drawer-item__outbound';
    outboundLink.href = product.outboundUrl;
    outboundLink.target = '_blank';
    outboundLink.rel = 'noopener noreferrer';
    outboundLink.innerHTML = '<span>Official Listing</span> <span aria-hidden="true">↗</span>';

    content.appendChild(topRow);
    content.appendChild(sizeEl);
    content.appendChild(controlsRow);
    content.appendChild(outboundLink);

    li.appendChild(thumbWrap);
    li.appendChild(content);

    const qtyOdometer = createOdometer(qtySpan, qtyPadded);
    const totalOdometer = createOdometer(lineTotalEl, lineTotalFormatted);
    qtyOdometer.setValue(qtyPadded, instant);
    totalOdometer.setValue(lineTotalFormatted, instant);

    return { li, qtyOdometer, totalOdometer };
  }

  function renderBagSnapshot(snapshot) {
    const instant = !hasHydratedBag || !isBagDrawerOpen() || IS_SCREENSHOT_MODE || prefersReducedMotion();
    hasHydratedBag = true;

    countOdometer.setValue(snapshot.countPadded, instant);
    subtotalOdometer.setValue(snapshot.subtotalFormatted, instant);

    const hasItems = snapshot.items.length > 0;
    emptyEl.hidden = hasItems;
    emptyEl.classList.toggle('is-hidden', hasItems);
    listEl.hidden = !hasItems;
    listEl.classList.toggle('is-hidden', !hasItems);
    footerEl.hidden = !hasItems;
    footerEl.classList.toggle('is-hidden', !hasItems);

    // Reconcile keyed item rows without tearing down unchanged DOM or images
    const activeUids = new Set(snapshot.items.map((item) => item.uid));
    for (const [uid, record] of itemRowMap.entries()) {
      if (!activeUids.has(uid)) {
        if (record.li.parentNode) {
          record.li.parentNode.removeChild(record.li);
        }
        itemRowMap.delete(uid);
      }
    }

    snapshot.items.forEach((entry) => {
      const existing = itemRowMap.get(entry.uid);
      const qtyPadded = String(entry.qty).padStart(2, '0');
      if (existing) {
        existing.qtyOdometer.setValue(qtyPadded, instant);
        existing.totalOdometer.setValue(entry.lineTotalFormatted, instant);
        listEl.appendChild(existing.li);
      } else {
        const created = createItemRow(entry, instant);
        itemRowMap.set(entry.uid, created);
        listEl.appendChild(created.li);
      }
    });

    if (hasItems) {
      const distinctProductIds = new Set(snapshot.items.map((item) => item.productId));
      checkoutLinkEl.href =
        distinctProductIds.size === 1
          ? snapshot.items[0].product.outboundUrl
          : OFFICIAL_BRAND_STORE_URL;
    } else {
      checkoutLinkEl.href = OFFICIAL_BRAND_STORE_URL;
    }
  }

  function applyDrawerVisibility({ open, instant }) {
    const useInstant = Boolean(instant || IS_SCREENSHOT_MODE || prefersReducedMotion());

    backdropEl.classList.toggle('is-instant', useInstant);
    drawerEl.classList.toggle('is-instant', useInstant);

    if (open) {
      lastFocusedEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      drawerEl.style.transform = '';
      backdropEl.style.opacity = '';
      drawerEl.setAttribute('aria-hidden', 'false');

      if (!useInstant) {
        backdropEl.classList.remove('is-open');
        drawerEl.classList.remove('is-open');
        void drawerEl.offsetWidth;
      }

      backdropEl.classList.add('is-open');
      drawerEl.classList.add('is-open');

      if (onLockScroll) {
        onLockScroll(true);
      }
      if (!IS_SCREENSHOT_MODE && closeBtn) {
        closeBtn.focus({ preventScroll: true });
      }
    } else {
      activePointerId = null;
      isHorizontalDrag = false;
      dragDecided = false;
      drawerEl.classList.remove('is-dragging');
      drawerEl.style.transform = '';
      backdropEl.style.opacity = '';

      backdropEl.classList.remove('is-open');
      drawerEl.classList.remove('is-open');
      drawerEl.setAttribute('aria-hidden', 'true');

      if (onLockScroll) {
        onLockScroll(false);
      }
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
        lastFocusedEl.focus({ preventScroll: true });
        lastFocusedEl = null;
      }
    }
  }

  // ---- Interactive Events ----

  backdropEl.addEventListener('click', () => {
    closeBagDrawer(IS_SCREENSHOT_MODE || prefersReducedMotion());
  });

  closeBtn.addEventListener('click', () => {
    closeBagDrawer(IS_SCREENSHOT_MODE || prefersReducedMotion());
  });

  exploreBtn.addEventListener('click', () => {
    closeBagDrawer(IS_SCREENSHOT_MODE || prefersReducedMotion());
    if (onExploreCatalog) {
      onExploreCatalog();
    }
  });

  // Pointer-capture horizontal drag-right dismissal with leftward boundary friction
  drawerEl.addEventListener('pointerdown', (e) => {
    if (!isBagDrawerOpen()) return;
    if (e.target.closest('button, a, input, select, textarea')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (activePointerId !== null) return; // Multi-touch ignore

    activePointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTime = performance.now();
    isHorizontalDrag = false;
    dragDecided = false;
  });

  drawerEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointerId || !isBagDrawerOpen()) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!dragDecided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      dragDecided = true;
      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        isHorizontalDrag = true;
        drawerEl.classList.add('is-dragging');
        try {
          drawerEl.setPointerCapture(e.pointerId);
        } catch {
          // Ignore synthetic pointer capture exceptions
        }
      } else {
        // Vertical scroll inside drawer body takes precedence
        activePointerId = null;
        return;
      }
    }

    if (!isHorizontalDrag) return;

    const effectiveX = dx >= 0 ? dx : dx * LEFTWARD_FRICTION;
    drawerEl.style.transform = `translate3d(${effectiveX.toFixed(1)}px, 0, 0)`;

    const drawerWidth = Math.max(drawerEl.offsetWidth, 320);
    const fadeRatio = Math.max(0, Math.min(1, 1 - Math.max(0, dx) / drawerWidth));
    backdropEl.style.opacity = fadeRatio.toFixed(3);
  });

  function finishDrawerDrag(e, cancelled = false) {
    if (e.pointerId !== activePointerId) return;

    try {
      if (drawerEl.hasPointerCapture(e.pointerId)) {
        drawerEl.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release exceptions
    }

    const wasHorizontal = isHorizontalDrag;
    const dx = e.clientX - dragStartX;
    const elapsedMs = Math.max(performance.now() - dragStartTime, 1);
    const velocity = Math.abs(dx) / elapsedMs;

    activePointerId = null;
    isHorizontalDrag = false;
    dragDecided = false;
    drawerEl.classList.remove('is-dragging');
    backdropEl.style.opacity = '';

    if (!wasHorizontal || cancelled || !isBagDrawerOpen()) {
      drawerEl.style.transform = '';
      return;
    }

    if (dx > DRAG_DISMISS_PX || (dx > 18 && velocity > DRAG_VELOCITY_THRESHOLD)) {
      drawerEl.style.transform = '';
      closeBagDrawer(IS_SCREENSHOT_MODE || prefersReducedMotion());
    } else {
      drawerEl.style.transform = '';
    }
  }

  drawerEl.addEventListener('pointerup', (e) => finishDrawerDrag(e, false));
  drawerEl.addEventListener('pointercancel', (e) => finishDrawerDrag(e, true));

  // Keyboard Escape closes drawer in 0ms (instant = true); Tab traps focus inside open drawer
  function onKeyDown(e) {
    if (!isBagDrawerOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeBagDrawer(true);
      return;
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(
        drawerEl.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hidden && el.offsetParent !== null);
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || !drawerEl.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);

  const unsubBag = subscribeBag(renderBagSnapshot);
  const unsubDrawer = subscribeDrawer(applyDrawerVisibility);

  if (isBagDrawerOpen()) {
    applyDrawerVisibility({ open: true, instant: true });
  }

  return {
    destroy() {
      unsubBag();
      unsubDrawer();
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
