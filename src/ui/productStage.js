/**
 * Gemini Supply - Full-Viewport Product Stage (100vw x 100dvh, #08080A)
 * Left 60%: Multi-angle WebGL2 Liquid-Lens optical pane, pointer-capture swipe scrub,
 *           wheel scrub, keyboard angle step, and 2.4x 4K optical zoom loupe.
 * Right 40%: Architectural spec grid, size selector, blur-crossfade ADD TO BAG,
 *            and Official Google Merch Store outbound link.
 */

import { PRODUCTS, PRODUCTS_BY_ID, webPhoto, hiResPhoto } from '../data/catalog.js';
import {
  IS_SCREENSHOT_MODE,
  prefersReducedMotion,
  addItemToBag,
  closeProductStage,
  getStageState,
  subscribeStage,
} from '../state/store.js';
import { createSparkSvgElement } from './proceduralSparkSvg.js';

const LOUPE_SCALE = 2.4;
const SWIPE_DISTANCE_PX = 64;
const SWIPE_VELOCITY_THRESHOLD = 0.11;
const BOUNDARY_FRICTION = 0.18;
const LENS_TRANSITION_SEC = 0.42;
const WHEEL_THRESHOLD = 52;
const WHEEL_COOLDOWN_MS = 340;
const ADD_FEEDBACK_HOLD_MS = 1100;
const LABEL_CROSSFADE_HALF_MS = 95;

export function initProductStage(mountEl, { createLiquidLensViewer, onLockScroll } = {}) {
  const hostEl = mountEl || document.body;

  let stageEl;
  if (hostEl.id === 'product-stage') {
    stageEl = hostEl;
  } else {
    stageEl = document.createElement('div');
    stageEl.id = 'product-stage';
    hostEl.innerHTML = '';
    hostEl.appendChild(stageEl);
  }

  stageEl.className = 'gs-stage';
  stageEl.setAttribute('data-lenis-prevent', '');
  stageEl.setAttribute('role', 'dialog');
  stageEl.setAttribute('aria-modal', 'true');
  stageEl.setAttribute('aria-hidden', 'true');
  stageEl.setAttribute('aria-labelledby', 'stage-product-title');

  stageEl.innerHTML = `
    <div class="gs-stage__panel">
      <div class="gs-stage__media">
        <div class="gs-stage__viewport" id="stage-optical-viewport">
          <div class="gs-stage__canvas-track">
            <img
              class="gs-stage__fallback-img"
              alt=""
              decoding="async"
              draggable="false"
            />
            <canvas class="gs-stage__canvas"></canvas>
          </div>

          <div class="gs-stage__loupe-layer" aria-hidden="true">
            <img
              class="gs-stage__loupe-img"
              alt=""
              decoding="async"
              draggable="false"
            />
            <div class="gs-stage__loupe-crosshair" aria-hidden="true">
              <span class="gs-stage__crosshair-h"></span>
              <span class="gs-stage__crosshair-v"></span>
            </div>
            <div class="gs-stage__loupe-readout" aria-live="off">LOUPE 2.4X / X 0.50 Y 0.50</div>
          </div>

          <button
            type="button"
            id="stage-zoom-toggle"
            class="gs-stage__loupe-toggle gs-pressable"
            aria-pressed="false"
            aria-label="Toggle 4K zoom loupe"
          >LOUPE [ + ]</button>
        </div>

        <div class="gs-stage__angles" role="group" aria-label="Product camera angles"></div>
      </div>

      <div class="gs-stage__details">
        <div class="gs-stage__topbar">
          <div class="gs-stage__sku-group">
            <span class="gs-stage__spark" aria-hidden="true"></span>
            <span class="gs-stage__sku">Apparel</span>
          </div>
          <button
            type="button"
            id="stage-close-btn"
            class="gs-stage__close gs-pressable"
            aria-label="Close product stage"
          >
            <span class="gs-stage__close-text">CLOSE [ ESC ]</span>
            <span class="gs-stage__close-glyph" aria-hidden="true">×</span>
          </button>
        </div>

        <div class="gs-stage__body">
          <div class="gs-stage__heading-group">
            <h2 id="stage-product-title" class="gs-stage__title">Nano Banana Sweatshirt</h2>
            <div class="gs-stage__price">GBP £77.00</div>
          </div>

          <p class="gs-stage__spec"></p>

          <div class="gs-stage__spec-grid" role="list" aria-label="Material specifications"></div>

          <div class="gs-stage__sizes">
            <div class="gs-stage__sizes-label">SIZE</div>
            <div class="gs-stage__sizes-row" role="radiogroup" aria-label="Select size"></div>
          </div>
        </div>

        <div class="gs-stage__actions">
          <button
            type="button"
            id="stage-add-btn"
            class="gs-btn-primary gs-stage__add-btn gs-pressable"
          >
            <span class="gs-btn-label">ADD TO BAG</span>
          </button>

          <a
            id="stage-merch-link"
            class="gs-btn-outbound gs-stage__outbound gs-pressable"
            href="https://your.merch.google/brands/gemini.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Official Google Merch Listing</span>
            <span class="gs-outbound-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </div>
  `;

  // Query internal references once
  const mediaEl = stageEl.querySelector('.gs-stage__media');
  const viewportEl = stageEl.querySelector('.gs-stage__viewport');
  const canvasTrackEl = stageEl.querySelector('.gs-stage__canvas-track');
  const fallbackImgEl = stageEl.querySelector('.gs-stage__fallback-img');
  const canvasEl = stageEl.querySelector('.gs-stage__canvas');
  const loupeLayerEl = stageEl.querySelector('.gs-stage__loupe-layer');
  const loupeImgEl = stageEl.querySelector('.gs-stage__loupe-img');
  const loupeReadoutEl = stageEl.querySelector('.gs-stage__loupe-readout');
  const loupeToggleBtn = stageEl.querySelector('#stage-zoom-toggle');
  const anglesEl = stageEl.querySelector('.gs-stage__angles');

  const sparkSlotEl = stageEl.querySelector('.gs-stage__spark');
  const skuEl = stageEl.querySelector('.gs-stage__sku');
  const closeBtn = stageEl.querySelector('#stage-close-btn');
  const stageBodyEl = stageEl.querySelector('.gs-stage__body');
  const titleEl = stageEl.querySelector('.gs-stage__title');
  const priceEl = stageEl.querySelector('.gs-stage__price');
  const specEl = stageEl.querySelector('.gs-stage__spec');
  const specGridEl = stageEl.querySelector('.gs-stage__spec-grid');
  const sizesRowEl = stageEl.querySelector('.gs-stage__sizes-row');
  const addBtn = stageEl.querySelector('#stage-add-btn');
  const addBtnLabelEl = addBtn.querySelector('.gs-btn-label');
  const merchLinkEl = stageEl.querySelector('#stage-merch-link');

  if (sparkSlotEl) {
    sparkSlotEl.appendChild(createSparkSvgElement(12, 0.64));
  }

  const allStageWebpUrls = Array.from(
    new Set(PRODUCTS.flatMap((p) => p.stageShots.map((s) => webPhoto(s.stem))))
  );

  // Component state
  let isOpen = false;
  let currentProduct = PRODUCTS[0];
  let activeShotIndex = 0;
  let selectedSize = PRODUCTS[0].defaultSize || PRODUCTS[0].sizes[0];
  let viewer = null;
  let viewerReadyFlag = false;
  let activeRenderPromise = Promise.resolve();
  let renderSeq = 0;
  let lastFocusedEl = null;

  // Loupe state
  let loupeActive = false;
  let targetNormX = 0.5;
  let targetNormY = 0.5;
  let currentNormX = 0.5;
  let currentNormY = 0.5;
  let loupeRafId = 0;
  let hiResLoadToken = 0;

  // Pointer drag state (multi-touch protected)
  let activePointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let dragStartTime = 0;
  let hasDragged = false;

  // Wheel scrub state
  let wheelAccum = 0;
  let wheelCooldownUntil = 0;

  // Add-to-bag button feedback timers
  let addedBurstCount = 0;
  let swapInTimer = 0;
  let resetHoldTimer = 0;
  let swapOutTimer = 0;

  function ensureViewer() {
    if (viewer || typeof createLiquidLensViewer !== 'function' || !canvasEl) {
      return viewer;
    }
    try {
      viewer = createLiquidLensViewer(canvasEl, {
        urls: [],
        isScreenshotMode: IS_SCREENSHOT_MODE,
        reducedMotion: prefersReducedMotion(),
      });
    } catch {
      viewer = null;
    }
    return viewer;
  }

  async function awaitViewerReady(v) {
    if (!v) return false;
    try {
      if (typeof v.ready === 'function') {
        await v.ready();
      } else if (v.ready && typeof v.ready.then === 'function') {
        await v.ready;
      } else if (typeof v.whenReady === 'function') {
        await v.whenReady();
      }
      return !v.failed;
    } catch {
      return false;
    }
  }

  async function driveViewerToUrl(url, durationSec) {
    const v = ensureViewer();
    if (!v) return false;

    const ok = await awaitViewerReady(v);
    if (!ok) return false;

    if (typeof v.resize === 'function') {
      v.resize();
    }

    const effectiveSec =
      durationSec <= 0 || IS_SCREENSHOT_MODE || prefersReducedMotion() ? 0 : durationSec;

    if (effectiveSec === 0 && typeof v.setImmediate === 'function') {
      await v.setImmediate(url);
    } else if (effectiveSec === 0 && typeof v.jumpTo === 'function') {
      await v.jumpTo(url);
    } else if (typeof v.transitionTo === 'function') {
      await v.transitionTo(url, effectiveSec);
    } else if (typeof v.setImage === 'function') {
      await v.setImage(url);
    }

    if (effectiveSec === 0 || IS_SCREENSHOT_MODE) {
      if (typeof v.renderOnce === 'function') {
        v.renderOnce();
      } else if (typeof v.renderFrame === 'function') {
        v.renderFrame();
      } else if (typeof v.draw === 'function') {
        v.draw();
      }
    }

    return true;
  }

  function decodeImgElement(imgEl, src) {
    return new Promise((resolve) => {
      if (!imgEl) {
        resolve();
        return;
      }
      if (imgEl.getAttribute('src') !== src) {
        imgEl.src = src;
      }
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        resolve();
        return;
      }
      if (typeof imgEl.decode === 'function') {
        imgEl
          .decode()
          .then(() => resolve())
          .catch(() => resolve());
      } else {
        const done = () => {
          imgEl.removeEventListener('load', done);
          imgEl.removeEventListener('error', done);
          resolve();
        };
        imgEl.addEventListener('load', done, { once: true });
        imgEl.addEventListener('error', done, { once: true });
      }
    });
  }

  // ---- 4K Optical Zoom Loupe ----

  function applyLoupeTransform() {
    if (!viewportEl || !loupeImgEl) return;
    const rect = viewportEl.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const tx = (0.5 - currentNormX) * (LOUPE_SCALE - 1) * w;
    const ty = (0.5 - currentNormY) * (LOUPE_SCALE - 1) * h;
    loupeImgEl.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${LOUPE_SCALE})`;
    if (loupeReadoutEl) {
      loupeReadoutEl.textContent = `LOUPE 2.4X / X ${currentNormX.toFixed(2)} Y ${currentNormY.toFixed(2)}`;
    }
  }

  function stepLoupeFollow() {
    loupeRafId = 0;
    if (!loupeActive) return;

    const dx = targetNormX - currentNormX;
    const dy = targetNormY - currentNormY;

    if (IS_SCREENSHOT_MODE || prefersReducedMotion() || Math.hypot(dx, dy) < 0.0008) {
      currentNormX = targetNormX;
      currentNormY = targetNormY;
      applyLoupeTransform();
      return;
    }

    currentNormX += dx * 0.24;
    currentNormY += dy * 0.24;
    applyLoupeTransform();
    loupeRafId = window.requestAnimationFrame(stepLoupeFollow);
  }

  function scheduleLoupeFollow() {
    if (IS_SCREENSHOT_MODE || prefersReducedMotion()) {
      currentNormX = targetNormX;
      currentNormY = targetNormY;
      applyLoupeTransform();
      return;
    }
    if (!loupeRafId) {
      loupeRafId = window.requestAnimationFrame(stepLoupeFollow);
    }
  }

  function loadLoupeMasterForActiveShot() {
    const shot = currentProduct.stageShots[activeShotIndex];
    if (!shot || !loupeImgEl) return;

    const webUrl = webPhoto(shot.stem);
    const masterUrl = hiResPhoto(shot.stem);
    const token = ++hiResLoadToken;

    loupeLayerEl.classList.remove('is-hires-ready');
    loupeImgEl.src = webUrl;
    loupeImgEl.alt = `${currentProduct.title} - ${shot.label} 4K detail`;

    const hiResPreloader = new Image();
    hiResPreloader.decoding = 'async';
    hiResPreloader.src = masterUrl;

    const commitMaster = () => {
      if (token !== hiResLoadToken || !loupeActive) return;
      loupeImgEl.src = masterUrl;
      loupeLayerEl.classList.add('is-hires-ready');
    };

    if (typeof hiResPreloader.decode === 'function') {
      hiResPreloader
        .decode()
        .then(commitMaster)
        .catch(() => {
          // Keep sharp WebP fallback if 4K file is unavailable
        });
    } else {
      hiResPreloader.addEventListener('load', commitMaster, { once: true });
    }
  }

  function setLoupeMode(nextActive, clientX = null, clientY = null) {
    loupeActive = Boolean(nextActive);
    if (loupeRafId) {
      window.cancelAnimationFrame(loupeRafId);
      loupeRafId = 0;
    }

    stageEl.classList.toggle('is-loupe-active', loupeActive);
    mediaEl.classList.toggle('is-loupe-active', loupeActive);
    loupeLayerEl.classList.toggle('is-active', loupeActive);
    loupeLayerEl.setAttribute('aria-hidden', loupeActive ? 'false' : 'true');
    loupeToggleBtn.classList.toggle('is-active', loupeActive);
    loupeToggleBtn.setAttribute('aria-pressed', loupeActive ? 'true' : 'false');
    loupeToggleBtn.textContent = loupeActive ? 'LOUPE [ − ]' : 'LOUPE [ + ]';

    if (!loupeActive) {
      hiResLoadToken += 1;
      return;
    }

    if (clientX !== null && clientY !== null && viewportEl) {
      const rect = viewportEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        targetNormX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        targetNormY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      }
    } else {
      targetNormX = 0.5;
      targetNormY = 0.5;
    }

    currentNormX = targetNormX;
    currentNormY = targetNormY;
    loadLoupeMasterForActiveShot();
    applyLoupeTransform();
  }

  // ---- Angle Selection & Optical Sync ----

  function updateAngleButtonsUI() {
    const buttons = anglesEl.querySelectorAll('.gs-stage__angle-btn');
    buttons.forEach((btn, idx) => {
      const active = idx === activeShotIndex;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function selectAngle(nextIndex, { instant = false } = {}) {
    const shots = currentProduct.stageShots;
    if (!shots || shots.length === 0) return Promise.resolve();

    const normalized = ((nextIndex % shots.length) + shots.length) % shots.length;
    const isSame = normalized === activeShotIndex;
    activeShotIndex = normalized;
    updateAngleButtonsUI();

    const shot = shots[activeShotIndex];
    const url = webPhoto(shot.stem);
    fallbackImgEl.alt = `${currentProduct.title} - ${shot.label}`;

    if (loupeActive) {
      loadLoupeMasterForActiveShot();
    }

    const durationSec = instant || isSame ? 0 : LENS_TRANSITION_SEC;
    const seq = ++renderSeq;

    const job = (async () => {
      const decodePromise = decodeImgElement(fallbackImgEl, url);
      const webglOk = await driveViewerToUrl(url, durationSec);
      await decodePromise;

      if (seq !== renderSeq) return;

      viewerReadyFlag = webglOk;
      mediaEl.classList.toggle('is-webgl-ready', webglOk);
      fallbackImgEl.classList.toggle('is-hidden', webglOk);

      if (IS_SCREENSHOT_MODE && webglOk) {
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    })();

    activeRenderPromise = job;
    return job;
  }

  // ---- Render Product Details & Angles ----

  function clearAddFeedbackTimers() {
    if (swapInTimer) {
      window.clearTimeout(swapInTimer);
      swapInTimer = 0;
    }
    if (resetHoldTimer) {
      window.clearTimeout(resetHoldTimer);
      resetHoldTimer = 0;
    }
    if (swapOutTimer) {
      window.clearTimeout(swapOutTimer);
      swapOutTimer = 0;
    }
    addedBurstCount = 0;
    addBtn.classList.remove('is-added');
    addBtnLabelEl.classList.remove('is-transitioning');
    addBtnLabelEl.textContent = 'ADD TO BAG';
  }

  function renderSizeSelector(product) {
    sizesRowEl.innerHTML = '';
    product.sizes.forEach((size) => {
      const btn = document.createElement('button');
      const selected = size === selectedSize;
      btn.type = 'button';
      btn.className = `gs-size-btn gs-pressable${selected ? ' is-selected' : ''}`;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', selected ? 'true' : 'false');
      btn.dataset.size = size;
      btn.textContent = size;
      btn.addEventListener('click', () => {
        selectedSize = size;
        const siblings = sizesRowEl.querySelectorAll('.gs-size-btn');
        siblings.forEach((el) => {
          const isMatch = el.dataset.size === selectedSize;
          el.classList.toggle('is-selected', isMatch);
          el.setAttribute('aria-checked', isMatch ? 'true' : 'false');
        });
      });
      sizesRowEl.appendChild(btn);
    });
  }

  function renderSpecGrid(product) {
    specGridEl.innerHTML = '';
    product.specGrid.forEach((cell) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'gs-stage__spec-cell';
      cellEl.setAttribute('role', 'listitem');

      const keyEl = document.createElement('span');
      keyEl.className = 'gs-stage__spec-key';
      keyEl.textContent = cell.key;

      const valEl = document.createElement('span');
      valEl.className = 'gs-stage__spec-value';
      valEl.textContent = cell.value;

      cellEl.appendChild(keyEl);
      cellEl.appendChild(valEl);
      specGridEl.appendChild(cellEl);
    });
  }

  function renderAnglesStrip(product) {
    anglesEl.innerHTML = '';
    anglesEl.style.setProperty('--angle-count', String(product.stageShots.length));

    product.stageShots.forEach((shot, idx) => {
      const btn = document.createElement('button');
      const active = idx === activeShotIndex;
      btn.type = 'button';
      btn.className = `gs-stage__angle-btn gs-pressable${active ? ' is-active' : ''}`;
      btn.dataset.shotIndex = String(idx);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label', `Angle ${idx + 1}: ${shot.label}`);

      const thumbWrap = document.createElement('span');
      thumbWrap.className = 'gs-stage__angle-thumb';

      const img = document.createElement('img');
      img.src = webPhoto(shot.stem);
      img.alt = '';
      img.decoding = 'async';
      thumbWrap.appendChild(img);

      const meta = document.createElement('span');
      meta.className = 'gs-stage__angle-meta';

      const indexSpan = document.createElement('span');
      indexSpan.className = 'gs-stage__angle-index';
      indexSpan.textContent = `(${String(idx + 1).padStart(2, '0')})`;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'gs-stage__angle-label';
      labelSpan.textContent = shot.label;

      meta.appendChild(indexSpan);
      meta.appendChild(labelSpan);
      btn.appendChild(thumbWrap);
      btn.appendChild(meta);

      btn.addEventListener('click', () => {
        if (idx === activeShotIndex) return;
        selectAngle(idx, { instant: IS_SCREENSHOT_MODE || prefersReducedMotion() });
      });

      anglesEl.appendChild(btn);
    });
  }

  function populateProduct(product, initialShotStem) {
    currentProduct = product;
    selectedSize = product.defaultSize || product.sizes[0];

    let shotIdx = 0;
    if (initialShotStem) {
      const found = product.stageShots.findIndex((s) => s.stem === initialShotStem);
      if (found >= 0) shotIdx = found;
    }
    activeShotIndex = shotIdx;

    clearAddFeedbackTimers();
    setLoupeMode(false);
    if (stageBodyEl) {
      stageBodyEl.scrollTop = 0;
    }

    skuEl.textContent = product.category || '';
    titleEl.textContent = product.title;
    priceEl.textContent = product.priceFormatted;
    specEl.textContent = product.spec;
    merchLinkEl.href = product.outboundUrl;

    renderSpecGrid(product);
    renderSizeSelector(product);
    renderAnglesStrip(product);

    if (!IS_SCREENSHOT_MODE) {
      const v = ensureViewer();
      if (v && typeof v.preload === 'function') {
        v.preload(product.stageShots.map((s) => webPhoto(s.stem)));
      }
    }

    return selectAngle(activeShotIndex, { instant: true });
  }

  // ---- Interactive Events ----

  closeBtn.addEventListener('click', () => {
    closeProductStage(IS_SCREENSHOT_MODE || prefersReducedMotion());
  });

  loupeToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setLoupeMode(!loupeActive);
  });

  addBtn.addEventListener('click', () => {
    if (!currentProduct) return;
    addItemToBag(currentProduct.id, selectedSize, 1);
    addedBurstCount += 1;
    const nextLabel = `ADDED TO BAG [ +${String(addedBurstCount).padStart(2, '0')} ]`;

    if (swapInTimer) window.clearTimeout(swapInTimer);
    if (resetHoldTimer) window.clearTimeout(resetHoldTimer);
    if (swapOutTimer) window.clearTimeout(swapOutTimer);

    if (IS_SCREENSHOT_MODE || prefersReducedMotion()) {
      addBtn.classList.add('is-added');
      addBtnLabelEl.classList.remove('is-transitioning');
      addBtnLabelEl.textContent = nextLabel;
      resetHoldTimer = window.setTimeout(() => {
        addBtn.classList.remove('is-added');
        addBtnLabelEl.textContent = 'ADD TO BAG';
        addedBurstCount = 0;
      }, ADD_FEEDBACK_HOLD_MS);
      return;
    }

    addBtnLabelEl.classList.add('is-transitioning');
    swapInTimer = window.setTimeout(() => {
      addBtn.classList.add('is-added');
      addBtnLabelEl.textContent = nextLabel;
      addBtnLabelEl.classList.remove('is-transitioning');
    }, LABEL_CROSSFADE_HALF_MS);

    resetHoldTimer = window.setTimeout(() => {
      addBtnLabelEl.classList.add('is-transitioning');
      swapOutTimer = window.setTimeout(() => {
        addBtn.classList.remove('is-added');
        addBtnLabelEl.textContent = 'ADD TO BAG';
        addBtnLabelEl.classList.remove('is-transitioning');
        addedBurstCount = 0;
      }, LABEL_CROSSFADE_HALF_MS);
    }, ADD_FEEDBACK_HOLD_MS);
  });

  // Pointer-capture axis-locked horizontal angle scrub + vertical flick dismissal + 4K loupe
  let gestureAxis = null;

  viewportEl.addEventListener('pointerdown', (e) => {
    if (!isOpen) return;
    if (e.target.closest('button, a')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (activePointerId !== null) return; // Multi-touch protection

    activePointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    dragStartTime = performance.now();
    hasDragged = false;
    gestureAxis = null;

    try {
      viewportEl.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic event pointer capture exceptions
    }
  });

  viewportEl.addEventListener('pointermove', (e) => {
    if (!isOpen) return;

    // Fine-pointer hover tracking when 4K loupe is open and no drag button is held
    if (loupeActive && activePointerId === null && e.pointerType === 'mouse') {
      const rect = viewportEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        targetNormX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        targetNormY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        scheduleLoupeFollow();
      }
      return;
    }

    if (e.pointerId !== activePointerId) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const stepDx = e.clientX - lastPointerX;
    const stepDy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    if (!hasDragged && Math.hypot(dx, dy) > 6) {
      hasDragged = true;
      gestureAxis = Math.abs(dy) > Math.abs(dx) * 1.15 ? 'y' : 'x';
      if (gestureAxis === 'y' && !loupeActive) {
        stageEl.classList.add('is-dragging');
      } else {
        canvasTrackEl.classList.add('is-dragging');
      }
    }

    if (!hasDragged) return;

    if (loupeActive) {
      const rect = viewportEl.getBoundingClientRect();
      const denomX = Math.max((LOUPE_SCALE - 1) * rect.width, 1);
      const denomY = Math.max((LOUPE_SCALE - 1) * rect.height, 1);
      if (e.pointerType === 'mouse') {
        targetNormX = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(rect.width, 1)));
        targetNormY = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(rect.height, 1)));
      } else {
        targetNormX = Math.max(0, Math.min(1, targetNormX - stepDx / denomX));
        targetNormY = Math.max(0, Math.min(1, targetNormY - stepDy / denomY));
      }
      scheduleLoupeFollow();
      return;
    }

    if (gestureAxis === 'y') {
      const offsetY = dy > 0 ? dy : dy * BOUNDARY_FRICTION;
      const scaleDrop = dy > 0 ? Math.max(0.95, 1 - Math.min(dy / 1400, 0.05)) : 1;
      stageEl.style.transform = `translate3d(0, ${offsetY.toFixed(1)}px, 0) scale(${scaleDrop.toFixed(4)})`;
      return;
    }

    // Horizontal scrub tactile offset with boundary friction damping (* 0.18)
    const shotsLen = currentProduct.stageShots.length;
    const atStartBoundary = activeShotIndex === 0 && dx > 0;
    const atEndBoundary = activeShotIndex === shotsLen - 1 && dx < 0;
    const dampedX =
      atStartBoundary || atEndBoundary
        ? dx * BOUNDARY_FRICTION
        : Math.max(-44, Math.min(44, dx * 0.36));

    canvasTrackEl.style.transform = `translate3d(${dampedX.toFixed(1)}px, 0, 0)`;
  });

  function finishPointerGesture(e, cancelled = false) {
    if (e.pointerId !== activePointerId) return;

    try {
      if (viewportEl.hasPointerCapture(e.pointerId)) {
        viewportEl.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const elapsedMs = Math.max(performance.now() - dragStartTime, 1);
    const velocityX = Math.abs(dx) / elapsedMs;
    const velocityY = dy / elapsedMs;
    const wasDragged = hasDragged;
    const axis = gestureAxis;

    activePointerId = null;
    hasDragged = false;
    gestureAxis = null;
    stageEl.classList.remove('is-dragging');
    stageEl.style.transform = '';
    canvasTrackEl.classList.remove('is-dragging');
    canvasTrackEl.style.transform = '';

    if (cancelled || !isOpen) return;

    if (!wasDragged) {
      // Crisp tap/click on optical viewport toggles 2.4x 4K inspection mode
      setLoupeMode(!loupeActive, e.clientX, e.clientY);
      return;
    }

    if (loupeActive) return;

    if (axis === 'y') {
      if (dy > 96 || (dy > 24 && velocityY > SWIPE_VELOCITY_THRESHOLD)) {
        closeProductStage(prefersReducedMotion());
      }
      return;
    }

    if (Math.abs(dx) > SWIPE_DISTANCE_PX || (Math.abs(dx) > 16 && velocityX > SWIPE_VELOCITY_THRESHOLD)) {
      const shotsLen = currentProduct.stageShots.length;
      if (dx < 0 && activeShotIndex < shotsLen - 1) {
        selectAngle(activeShotIndex + 1, { instant: IS_SCREENSHOT_MODE || prefersReducedMotion() });
      } else if (dx > 0 && activeShotIndex > 0) {
        selectAngle(activeShotIndex - 1, { instant: IS_SCREENSHOT_MODE || prefersReducedMotion() });
      }
    }
  }

  viewportEl.addEventListener('pointerup', (e) => finishPointerGesture(e, false));
  viewportEl.addEventListener('pointercancel', (e) => finishPointerGesture(e, true));

  // Throttled wheel scrub across angles on .gs-stage__media (disabled while in 4K loupe mode)
  mediaEl.addEventListener(
    'wheel',
    (e) => {
      if (!isOpen) return;
      e.preventDefault();
      if (loupeActive) return;

      const now = performance.now();
      if (now < wheelCooldownUntil) {
        wheelAccum = 0;
        return;
      }

      const dominantDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wheelAccum += dominantDelta;

      if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
        const step = wheelAccum > 0 ? 1 : -1;
        wheelAccum = 0;
        wheelCooldownUntil = now + WHEEL_COOLDOWN_MS;
        selectAngle(activeShotIndex + step, {
          instant: IS_SCREENSHOT_MODE || prefersReducedMotion(),
        });
      }
    },
    { passive: false }
  );

  // Keyboard navigation: 0ms Escape dismissal, Tab focus trap, + 0ms ArrowLeft/ArrowRight angle step
  function onKeyDown(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeProductStage(true);
      return;
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(
        stageEl.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hidden && el.offsetParent !== null);
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || !stageEl.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectAngle(activeShotIndex + 1, { instant: true });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectAngle(activeShotIndex - 1, { instant: true });
    }
  }

  window.addEventListener('keydown', onKeyDown);

  function onWindowResize() {
    if (!isOpen) return;
    if (viewer) {
      if (typeof viewer.resize === 'function') {
        viewer.resize();
      }
      if (typeof viewer.renderOnce === 'function') {
        viewer.renderOnce();
      }
    }
    if (loupeActive) {
      applyLoupeTransform();
    }
  }

  window.addEventListener('resize', onWindowResize);

  let viewportRo = null;
  if (typeof ResizeObserver === 'function' && viewportEl) {
    viewportRo = new ResizeObserver(() => {
      if (isOpen) {
        onWindowResize();
      }
    });
    viewportRo.observe(viewportEl);
  }

  // ---- Stage Store Subscription ----

  function handleStageState(state) {
    const useInstant = Boolean(state.instant || IS_SCREENSHOT_MODE || prefersReducedMotion());

    if (state.open) {
      const product = PRODUCTS_BY_ID[state.productId] || PRODUCTS[0];
      const wasOpen = isOpen;
      if (!wasOpen) {
        lastFocusedEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      isOpen = true;

      stageEl.classList.toggle('is-instant', useInstant);
      stageEl.setAttribute('aria-hidden', 'false');

      if (!useInstant && !wasOpen) {
        // Ensure starting scale(0.95) + opacity: 0 commits before transitioning to .is-open
        stageEl.classList.remove('is-open');
        void stageEl.offsetWidth;
      }
      stageEl.classList.add('is-open');

      if (onLockScroll) {
        onLockScroll(true);
      }

      populateProduct(product, state.initialShotStem);

      if (!IS_SCREENSHOT_MODE && closeBtn) {
        closeBtn.focus({ preventScroll: true });
      }
    } else {
      if (!isOpen) return;
      isOpen = false;
      activePointerId = null;
      hasDragged = false;
      canvasTrackEl.classList.remove('is-dragging');
      canvasTrackEl.style.transform = '';

      setLoupeMode(false);
      clearAddFeedbackTimers();

      stageEl.classList.toggle('is-instant', useInstant);
      stageEl.classList.remove('is-open');
      stageEl.setAttribute('aria-hidden', 'true');

      if (onLockScroll) {
        onLockScroll(false);
      }

      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
        lastFocusedEl.focus({ preventScroll: true });
        lastFocusedEl = null;
      }
    }
  }

  const unsubStage = subscribeStage(handleStageState);

  // Sync immediately if openProductStage() was called prior to initProductStage()
  const initialStage = getStageState();
  if (initialStage.open) {
    handleStageState(initialStage);
  } else if (!IS_SCREENSHOT_MODE) {
    // Gently warm WebGL viewer during browser idle time for zero first-open latency
    const warmCallback = () => {
      if (!viewer) ensureViewer();
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(warmCallback, { timeout: 1200 });
    } else {
      window.setTimeout(warmCallback, 700);
    }
  }

  return {
    async ready() {
      const current = getStageState();
      if (!current.open) {
        return;
      }
      await activeRenderPromise;
    },
    destroy() {
      unsubStage();
      viewportRo?.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onWindowResize);
      clearAddFeedbackTimers();
      if (loupeRafId) {
        window.cancelAnimationFrame(loupeRafId);
      }
      if (viewer && typeof viewer.destroy === 'function') {
        viewer.destroy();
      }
    },
  };
}
