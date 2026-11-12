/**
 * Reusable Zero-Clutter Product Caption & Action Bar
 * Shows strictly: Product Title | USD $XX.00 | + Bag (tactile scale 0.97 + blur(2px) swap)
 * Clicking the title opens the 100vw x 100dvh 4K Product Stage.
 */

import { PRODUCTS_BY_ID } from '../data/catalog.js';
import {
  addItemToBag,
  openProductStage,
  IS_SCREENSHOT_MODE,
  prefersReducedMotion,
} from '../state/store.js';

export function mountPieceActionBar(containerEl, productId, { getActiveStem = null } = {}) {
  if (!containerEl) return () => {};
  const product = PRODUCTS_BY_ID[productId];
  if (!product) return () => {};

  containerEl.classList.add('gs-piece-bar');
  containerEl.innerHTML = `
    <button
      type="button"
      class="gs-piece-bar__title-btn"
      aria-label="Inspect ${product.title}"
    >
      <span class="gs-piece-bar__title">${product.title}</span>
    </button>
    <div class="gs-piece-bar__right">
      <span class="gs-piece-bar__price">${product.priceFormatted}</span>
      <button
        type="button"
        class="gs-piece-bar__add gs-pressable"
        id="piece-add-${product.id}"
        aria-label="Add ${product.title} to bag"
      >
        <span class="gs-btn-label">+ Bag</span>
      </button>
    </div>
  `;

  const titleBtn = containerEl.querySelector('.gs-piece-bar__title-btn');
  const addBtn = containerEl.querySelector('.gs-piece-bar__add');
  const addLabel = addBtn?.querySelector('.gs-btn-label');

  let swapTimer = 0;
  let holdTimer = 0;
  let resetTimer = 0;

  const onInspect = () => {
    const stem = typeof getActiveStem === 'function' ? getActiveStem() : null;
    openProductStage(product.id, stem);
  };

  const onAdd = (e) => {
    e.stopPropagation();
    addItemToBag(product.id, product.defaultSize, 1);

    window.clearTimeout(swapTimer);
    window.clearTimeout(holdTimer);
    window.clearTimeout(resetTimer);

    if (!addLabel) return;

    if (IS_SCREENSHOT_MODE || prefersReducedMotion()) {
      addLabel.textContent = 'Added';
      holdTimer = window.setTimeout(() => {
        addLabel.textContent = '+ Bag';
      }, 950);
      return;
    }

    addLabel.classList.add('is-transitioning');
    swapTimer = window.setTimeout(() => {
      addLabel.textContent = 'Added';
      addLabel.classList.remove('is-transitioning');
    }, 95);

    holdTimer = window.setTimeout(() => {
      addLabel.classList.add('is-transitioning');
      resetTimer = window.setTimeout(() => {
        addLabel.textContent = '+ Bag';
        addLabel.classList.remove('is-transitioning');
      }, 95);
    }, 1050);
  };

  titleBtn?.addEventListener('click', onInspect);
  addBtn?.addEventListener('click', onAdd);

  return () => {
    window.clearTimeout(swapTimer);
    window.clearTimeout(holdTimer);
    window.clearTimeout(resetTimer);
    titleBtn?.removeEventListener('click', onInspect);
    addBtn?.removeEventListener('click', onAdd);
  };
}
