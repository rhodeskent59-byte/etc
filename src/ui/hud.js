/**
 * Minimalist Top Navigation Controller (z-index: 40)
 * - At scroll = 0 (Hero): ONLY top-right Bag [ 00 ] is visible (zero duplicate brand text, zero bottom chips/%)
 * - Once scrolled past Hero: bare borderless 14px procedural Gemini Spark appears top-left to return to top
 */

import { subscribeBag, toggleBagDrawer, IS_SCREENSHOT_MODE, prefersReducedMotion } from '../state/store.js';
import { createSparkSvgElement } from './proceduralSparkSvg.js';

export function initHud({ createOdometer, onScrollToTop }) {
  const hudEl = document.getElementById('gs-hud');
  const brandBtn = document.getElementById('hud-brand-btn');
  const sparkSlot = document.getElementById('hud-spark-slot');
  const bagBtn = document.getElementById('hud-bag-btn');
  const bagCountEl = document.getElementById('hud-bag-count');

  if (sparkSlot) {
    sparkSlot.innerHTML = '';
    sparkSlot.appendChild(createSparkSvgElement(15, 0.64));
  }

  const countOdometer = bagCountEl && createOdometer ? createOdometer(bagCountEl, '00') : null;
  let initializedBag = false;

  const unsubBag = subscribeBag((snapshot) => {
    if (countOdometer) {
      countOdometer.setValue(snapshot.countPadded, !initializedBag);
    } else if (bagCountEl) {
      bagCountEl.textContent = snapshot.countPadded;
    }
    if (bagBtn) {
      bagBtn.setAttribute(
        'aria-label',
        `Open shopping bag, ${snapshot.count} ${snapshot.count === 1 ? 'item' : 'items'}`
      );
    }
    initializedBag = true;
  });

  if (brandBtn) {
    brandBtn.addEventListener('click', () => {
      onScrollToTop?.();
    });
  }

  if (bagBtn) {
    bagBtn.addEventListener('click', () => {
      toggleBagDrawer(IS_SCREENSHOT_MODE || prefersReducedMotion());
    });
  }

  function setPastHero(pastHero) {
    if (!hudEl) return;
    hudEl.classList.toggle('is-past-hero', Boolean(pastHero));
  }

  // Subtle top-of-viewport scroll-based progress indicator
  let progressRail = document.getElementById('hud-scroll-progress-rail');
  let progressFill = document.getElementById('hud-scroll-progress-fill');
  let progressLabel = document.getElementById('hud-scroll-progress-label');

  if (hudEl && !progressRail) {
    progressRail = document.createElement('div');
    progressRail.id = 'hud-scroll-progress-rail';
    progressRail.className = 'gs-hud__progress-rail';
    progressRail.setAttribute('role', 'progressbar');
    progressRail.setAttribute('aria-label', 'Collection exploration progress');
    progressRail.setAttribute('aria-valuemin', '0');
    progressRail.setAttribute('aria-valuemax', '100');
    progressRail.setAttribute('aria-valuenow', '0');

    progressFill = document.createElement('div');
    progressFill.id = 'hud-scroll-progress-fill';
    progressFill.className = 'gs-hud__progress-fill';
    progressRail.appendChild(progressFill);

    hudEl.prepend(progressRail);
  }

  const hudTop = hudEl?.querySelector('.gs-hud__top');
  if (hudTop && !progressLabel) {
    progressLabel = document.createElement('div');
    progressLabel.id = 'hud-scroll-progress-label';
    progressLabel.className = 'gs-hud__progress-readout';
    progressLabel.setAttribute('aria-hidden', 'true');
    progressLabel.textContent = '01 / 08 · 00%';
    if (bagBtn) {
      hudTop.insertBefore(progressLabel, bagBtn);
    } else {
      hudTop.appendChild(progressLabel);
    }
  }

  const pieceSectionIds = [
    'act-1',
    'piece-sweatshirt',
    'piece-black-tee',
    'piece-socks',
    'piece-tote',
    'piece-bottle',
    'piece-pin',
    'piece-stickers',
  ];

  function updateScrollProgress() {
    const docEl = document.documentElement;
    const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
    const currentScroll = Math.max(0, Math.min(maxScroll, window.scrollY || window.pageYOffset || 0));
    const ratio = Math.max(0, Math.min(1, currentScroll / maxScroll));
    const pct = Math.round(ratio * 100);

    if (progressFill) {
      progressFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
    if (progressRail) {
      progressRail.setAttribute('aria-valuenow', String(pct));
      progressRail.classList.toggle('is-active', currentScroll > 8);
    }
    if (progressLabel) {
      const viewportCenter = currentScroll + window.innerHeight * 0.45;
      let activeIndex = 1;
      for (let i = 0; i < pieceSectionIds.length; i++) {
        const el = document.getElementById(pieceSectionIds[i]);
        if (el) {
          const top = el.getBoundingClientRect().top + currentScroll;
          if (viewportCenter >= top) {
            activeIndex = i + 1;
          }
        }
      }
      const paddedIdx = String(activeIndex).padStart(2, '0');
      const paddedPct = String(pct).padStart(2, '0');
      progressLabel.textContent = `${paddedIdx} / 08 · ${paddedPct}%`;
    }
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress, { passive: true });
  updateScrollProgress();

  return {
    setPastHero,
    updateScrollProgress,
    destroy() {
      unsubBag();
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    },
  };
}
