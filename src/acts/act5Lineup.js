/**
 * All Pieces: #08080A 4:5 8-Piece Shop Grid + Procedural Micro-Spark Perimeter Sweep
 * - Row 1 = 4 Apparel pieces (02, 01, 06, 04), Row 2 = 4 Objects (03, 07, 05, 08)
 * - 4-column desktop (2 tablet, 1 mobile) 4:5 grid joined by flush 1px seams
 * - Hover swaps to 2nd angle + procedural micro-spark border sweep + + Bag in bottom bar
 * - Clicking any card opens the 100vw x 100dvh #08080A Product Stage
 */

import { CATALOG_DISPLAY_ORDER, PRODUCTS_BY_ID, webPhoto } from '../data/catalog.js';
import {
  addItemToBag,
  openProductStage,
  IS_SCREENSHOT_MODE,
  prefersReducedMotion,
} from '../state/store.js';

function drawConcaveSpark2D(ctx, cx, cy, radius, rot = 0, power = 0.64) {
  const segs = 32;
  const exp = 2 / power;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < segs; i++) {
    const theta = (i / segs) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const x = Math.sign(c) * Math.pow(Math.abs(c), exp) * radius;
    const y = Math.sign(s) * Math.pow(Math.abs(s), exp) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function pointAlongRectPerimeter(dist, w, h) {
  const perim = 2 * (w + h);
  const d = ((dist % perim) + perim) % perim;
  if (d < w) return { x: d, y: 0.5 };
  if (d < w + h) return { x: w - 0.5, y: d - w };
  if (d < 2 * w + h) return { x: w - (d - (w + h)), y: h - 0.5 };
  return { x: 0.5, y: h - (d - (2 * w + h)) };
}

function attachPerimeterMicroSparkSweep(cardEl, canvasEl) {
  if (IS_SCREENSHOT_MODE) return () => {};
  let rafId = null;
  let hovering = false;
  let phase = 0;

  function renderFrame() {
    if (!hovering || prefersReducedMotion()) {
      rafId = null;
      return;
    }
    const rect = canvasEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.round(rect.width * dpr));
    const bh = Math.max(1, Math.round(rect.height * dpr));
    if (canvasEl.width !== bw || canvasEl.height !== bh) {
      canvasEl.width = bw;
      canvasEl.height = bh;
    }

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const perim = 2 * (w + h);
    phase = (phase + perim * 0.0065) % perim;

    const trailSteps = 26;
    const trailLength = Math.min(220, perim * 0.24);
    for (let i = 0; i < trailSteps; i++) {
      const frac = i / trailSteps;
      const p1 = pointAlongRectPerimeter(phase - frac * trailLength, w, h);
      const p2 = pointAlongRectPerimeter(phase - ((i + 1) / trailSteps) * trailLength, w, h);
      if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 30) {
        ctx.strokeStyle =
          frac < 0.25
            ? `rgba(210, 227, 252, ${(0.95 * (1 - frac)).toFixed(3)})`
            : `rgba(79, 160, 255, ${(0.72 * (1 - frac)).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    const sparkOffsets = [0, -18, -36, -56];
    const sparkRadii = [5.2, 3.4, 2.5, 1.8];
    sparkOffsets.forEach((off, idx) => {
      const pt = pointAlongRectPerimeter(phase + off, w, h);
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#96D0FF';
      drawConcaveSpark2D(ctx, pt.x, pt.y, sparkRadii[idx], phase * 0.015);
    });

    rafId = window.requestAnimationFrame(renderFrame);
  }

  function onEnter(e) {
    if (e && e.pointerType && e.pointerType !== 'mouse') return;
    if (prefersReducedMotion()) return;
    hovering = true;
    if (!rafId) {
      rafId = window.requestAnimationFrame(renderFrame);
    }
  }

  function onLeave(e) {
    if (e && e.pointerType && e.pointerType !== 'mouse') return;
    hovering = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  cardEl.addEventListener('pointerenter', onEnter);
  cardEl.addEventListener('pointerleave', onLeave);

  return () => {
    onLeave();
    cardEl.removeEventListener('pointerenter', onEnter);
    cardEl.removeEventListener('pointerleave', onLeave);
  };
}

export function initAct5Lineup({ onScrollToTop }) {
  const sectionEl = document.getElementById('act-5');
  const gridEl = document.getElementById('catalog-grid-mount');
  const topBtn = document.getElementById('footer-top-btn');

  const cleanups = [];
  const isTouchLayout = window.matchMedia('(hover: none)').matches;
  const orderedProducts = CATALOG_DISPLAY_ORDER.map((id) => PRODUCTS_BY_ID[id]).filter(Boolean);

  orderedProducts.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'catalog-card';
    card.id = `catalog-card-${product.id}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${product.title}, ${product.priceFormatted}`);

    const quickLabel = isTouchLayout ? '+' : '+ Bag';

    card.innerHTML = `
      <div class="catalog-card__media">
        <img
          class="catalog-card__img catalog-card__img--primary"
          src="${webPhoto(product.cardPrimaryShot)}"
          alt="${product.title}"
          loading="lazy"
          decoding="async"
        />
        <img
          class="catalog-card__img catalog-card__img--hover"
          src="${webPhoto(product.cardHoverShot)}"
          alt="${product.title} alternate view"
          loading="lazy"
          decoding="async"
        />
        <canvas class="catalog-card__spark-border" aria-hidden="true"></canvas>
      </div>
      <div class="catalog-card__bar">
        <span class="catalog-card__title">${product.title}</span>
        <div class="catalog-card__action-slot">
          <span class="catalog-card__price">${product.priceFormatted}</span>
          <button
            type="button"
            class="catalog-card__quick-add"
            id="quick-add-${product.id}"
            aria-label="Add ${product.title} to bag"
          >${quickLabel}</button>
        </div>
      </div>
    `;

    const sparkCanvas = card.querySelector('.catalog-card__spark-border');
    if (sparkCanvas) {
      cleanups.push(attachPerimeterMicroSparkSweep(card, sparkCanvas));
    }

    const quickBtn = card.querySelector('.catalog-card__quick-add');
    let feedbackTimer = null;
    if (quickBtn) {
      quickBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addItemToBag(product.id, product.defaultSize, 1);
        if (!IS_SCREENSHOT_MODE && !prefersReducedMotion() && !isTouchLayout) {
          clearTimeout(feedbackTimer);
          quickBtn.textContent = 'Added';
          feedbackTimer = setTimeout(() => {
            quickBtn.textContent = '+ Bag';
          }, 950);
        }
      });
    }

    card.addEventListener('click', () => {
      openProductStage(product.id, product.cardPrimaryShot);
    });
    card.addEventListener('keydown', (e) => {
      if (e.target === quickBtn) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProductStage(product.id, product.cardPrimaryShot);
      }
    });

    gridEl?.appendChild(card);
  });

  if (topBtn) {
    topBtn.addEventListener('click', () => {
      onScrollToTop?.();
    });
  }

  return {
    getSectionElement: () => sectionEl,
    destroy() {
      cleanups.forEach((fn) => fn());
    },
  };
}
