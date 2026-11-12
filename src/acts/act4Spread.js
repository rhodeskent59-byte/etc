/**
 * Complete Set: #131418 Slate (a) (b) (c) (d) Asymmetric Editorial Spread
 * - Left (~28% sticky): Mono manifest, bidirectional hover sync, rolling odometer
 *   Set Total: USD $146.00, and single-line Add Set to Bag CTA.
 * - Right (~72%): Four staggered varied-scale frames (01_a, 03_a, 08_b, 05_a) with
 *   outside top-left (a)-(d) mono markers, multi-speed scroll parallax, and 2nd-angle cut.
 */

import gsap from 'gsap';
import {
  ACT4_SPREAD_ITEMS,
  ACT4_SET_TOTAL_FORMATTED,
  webPhoto,
} from '../data/catalog.js';
import {
  addEditionSetToBag,
  openBagDrawer,
  openProductStage,
  IS_SCREENSHOT_MODE,
  prefersReducedMotion,
} from '../state/store.js';

export function initAct4Spread({ createOdometer }) {
  const sectionEl = document.getElementById('act-4');
  const listEl = document.getElementById('spread-manifest-list');
  const galleryEl = document.getElementById('spread-gallery-mount');
  const totalEl = document.getElementById('spread-total-odometer');
  const addSetBtn = document.getElementById('spread-add-set-btn');
  const addSetLabel = document.getElementById('spread-add-set-label');

  const rowEls = [];
  const cardEls = [];

  const totalOdometer =
    totalEl && createOdometer ? createOdometer(totalEl, ACT4_SET_TOTAL_FORMATTED) : null;

  function setHighlightedIndex(idx) {
    rowEls.forEach((r, i) => r.classList.toggle('is-highlighted', i === idx));
    cardEls.forEach((c, i) => c.classList.toggle('is-highlighted', i === idx));

    if (totalOdometer && idx >= 0 && ACT4_SPREAD_ITEMS[idx]) {
      totalOdometer.setValue(ACT4_SET_TOTAL_FORMATTED, true);
    }
  }

  ACT4_SPREAD_ITEMS.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'act-spread__row';
    li.id = `spread-manifest-${item.productId}`;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.innerHTML = `
      <span class="act-spread__row-marker">${item.marker}</span>
      <span class="act-spread__row-name">${item.shortName}</span>
      <span class="act-spread__row-price">${item.priceFormatted}</span>
    `;

    li.addEventListener('pointerenter', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      setHighlightedIndex(idx);
    });
    li.addEventListener('pointerleave', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      setHighlightedIndex(-1);
    });
    li.addEventListener('click', () => openProductStage(item.productId, item.primaryStem));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProductStage(item.productId, item.primaryStem);
      }
    });
    listEl?.appendChild(li);
    rowEls.push(li);

    const card = document.createElement('article');
    card.className = `spread-card ${item.slotClass}`;
    card.id = `spread-card-${item.productId}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${item.marker} ${item.shortName}, ${item.priceFormatted}`);

    card.innerHTML = `
      <div class="spread-card__meta-top">
        <span class="spread-card__marker">${item.marker}</span>
        <span class="spread-card__price">${item.priceFormatted}</span>
      </div>
      <div class="spread-card__media" style="aspect-ratio: ${item.aspect};">
        <img
          class="spread-card__img spread-card__img--primary"
          src="${webPhoto(item.primaryStem)}"
          alt="${item.shortName}"
          decoding="async"
        />
        <img
          class="spread-card__img spread-card__img--hover"
          src="${webPhoto(item.hoverStem)}"
          alt="${item.shortName} alternate angle"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="spread-card__caption">${item.shortName}</div>
    `;

    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      setHighlightedIndex(idx);
    });
    card.addEventListener('pointerleave', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      setHighlightedIndex(-1);
    });
    card.addEventListener('click', () => openProductStage(item.productId, item.primaryStem));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProductStage(item.productId, item.primaryStem);
      }
    });

    galleryEl?.appendChild(card);
    cardEls.push(card);
  });

  let resetTimer = null;
  if (addSetBtn) {
    addSetBtn.addEventListener('click', () => {
      addEditionSetToBag();
      if (addSetLabel && !IS_SCREENSHOT_MODE && !prefersReducedMotion()) {
        clearTimeout(resetTimer);
        addSetLabel.classList.add('is-transitioning');
        setTimeout(() => {
          addSetLabel.textContent = 'Set Added';
          addSetLabel.classList.remove('is-transitioning');
        }, 110);
        resetTimer = setTimeout(() => {
          addSetLabel.classList.add('is-transitioning');
          setTimeout(() => {
            addSetLabel.textContent = 'Add Set to Bag';
            addSetLabel.classList.remove('is-transitioning');
          }, 110);
        }, 1250);
      } else {
        openBagDrawer(true);
      }
    });
  }

  const mm = gsap.matchMedia();
  if (!IS_SCREENSHOT_MODE && !prefersReducedMotion()) {
    mm.add('(min-width: 1024px)', () => {
      cardEls.forEach((card, idx) => {
        const yTravel = ACT4_SPREAD_ITEMS[idx].parallaxY;
        gsap.fromTo(
          card,
          { y: -yTravel },
          {
            y: yTravel,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionEl,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.4,
            },
          }
        );
      });
    });
  }

  return {
    getSectionElement: () => sectionEl,
    destroy() {
      clearTimeout(resetTimer);
      mm.revert();
    },
  };
}
