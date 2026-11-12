/**
 * Apparel Chapter Showcases:
 * - Gate I (#gate-apparel): #08080A -> #1F34FF expanding [ Apparel ] bracket curtain
 * - 01 Nano Banana Sweatshirt (#piece-sweatshirt): #1F34FF Cobalt 62/38 Architectural Shutter Monolith
 * - 06 Gemini Black T-Shirt (#piece-black-tee): #08080A 4-Blade Kinetic Architectural Accordion + Tracking Spotlight
 * - 04 Nano Banana Sports Socks (#piece-socks): #131418 Slate Stepped Diagonal Triptych
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  SWEATSHIRT_SHOWCASE,
  BLACK_TEE_FRAMES,
  SOCKS_TRIPTYCH,
  webPhoto,
} from '../data/catalog.js';
import {
  openProductStage,
  IS_SCREENSHOT_MODE,
  prefersReducedMotion,
} from '../state/store.js';
import { mountPieceActionBar } from '../ui/pieceActionBar.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smoothRange(x, a, b) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  const t = (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}

function drawConcaveSpark2D(ctx, cx, cy, radius, rot = 0, power = 0.64) {
  const segs = 24;
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

export function initApparelShowcases() {
  const cleanups = [];
  const triggers = [];

  const onKeyActivate = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  // =========================================================================
  // CHAPTER GATE I: [ Apparel ] Expanding Curtain (#08080A -> #1F34FF Cobalt)
  // =========================================================================
  const gateEl = document.getElementById('gate-apparel');
  const gateFill = document.getElementById('gate-apparel-fill');
  const gateLeftBracket = gateEl?.querySelector('.chapter-gate__bracket--left');
  const gateRightBracket = gateEl?.querySelector('.chapter-gate__bracket--right');
  const gateWord = gateEl?.querySelector('.chapter-gate__word');

  function applyGateApparel(progress) {
    const p = clamp01(progress);
    const expand = smoothRange(p, 0.05, 0.85);
    if (gateFill) {
      const sx = 0.04 + expand * 0.96;
      gateFill.style.transform = `scaleX(${sx.toFixed(4)})`;
    }
    if (gateLeftBracket) {
      const shift = (1 - expand) * 28;
      gateLeftBracket.style.transform = `translate3d(${shift.toFixed(1)}px, 0, 0)`;
    }
    if (gateRightBracket) {
      const shift = -(1 - expand) * 28;
      gateRightBracket.style.transform = `translate3d(${shift.toFixed(1)}px, 0, 0)`;
    }
    if (gateWord) {
      const alpha = 0.35 + expand * 0.65;
      gateWord.style.opacity = alpha.toFixed(3);
    }
  }

  if (gateEl && !prefersReducedMotion()) {
    applyGateApparel(0);
    triggers.push(
      ScrollTrigger.create({
        trigger: gateEl,
        start: 'top 88%',
        end: 'bottom 25%',
        scrub: IS_SCREENSHOT_MODE ? false : 0.22,
        onUpdate: (self) => applyGateApparel(self.progress),
      })
    );
  } else if (gateEl) {
    applyGateApparel(1);
  }

  // =========================================================================
  // 2. NANO BANANA SWEATSHIRT (01): #1F34FF Cobalt 62/38 Shutter Monolith
  // =========================================================================
  const sweatSection = document.getElementById('piece-sweatshirt');
  const sweatPin = document.getElementById('sweatshirt-pin');
  const sweatAnchor = document.getElementById('sweatshirt-anchor');
  const sweatAnchorImg = document.getElementById('sweatshirt-anchor-img');
  const sweatShutter = document.getElementById('sweatshirt-shutter');
  const sweatLayersMount = document.getElementById('sweatshirt-layers');
  const sweatDotsMount = document.getElementById('sweatshirt-dots');
  const sweatBarEl = document.getElementById('sweatshirt-bar');

  const sweatLayers = [];
  const sweatDots = [];
  let sweatActiveIdx = 0;
  let sweatSt = null;

  if (sweatLayersMount) {
    SWEATSHIRT_SHOWCASE.shutterStems.forEach((stem, idx) => {
      const layer = document.createElement('div');
      layer.className = 'piece-sweatshirt__layer';
      layer.style.zIndex = String(idx + 1);
      layer.innerHTML = `
        <img
          class="piece-sweatshirt__layer-img"
          src="${webPhoto(stem)}"
          alt="Nano Banana Sweatshirt detail ${idx + 1}"
          decoding="async"
        />
      `;
      sweatLayersMount.appendChild(layer);
      sweatLayers.push(layer);
    });
  }

  if (sweatDotsMount) {
    SWEATSHIRT_SHOWCASE.shutterStems.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'piece-step-dot';
      if (idx === 0) dot.classList.add('is-active');
      sweatDotsMount.appendChild(dot);
      sweatDots.push(dot);
    });
  }

  function applySweatshirtProgress(progress) {
    const p = clamp01(progress);

    if (sweatAnchorImg) {
      const anchorScale = 1.05 - p * 0.05;
      sweatAnchorImg.style.transform = `scale(${anchorScale.toFixed(4)})`;
    }

    const w1 = smoothRange(p, 0.28, 0.42);
    const w2 = smoothRange(p, 0.62, 0.76);

    if (sweatLayers[0]) {
      const img0 = sweatLayers[0].firstElementChild;
      sweatLayers[0].style.clipPath = 'inset(0% 0% 0% 0%)';
      if (img0) {
        const s0 = 1.0 + w1 * 0.035;
        img0.style.transform = `scale(${s0.toFixed(4)})`;
      }
    }
    if (sweatLayers[1]) {
      const insetTop1 = (1 - w1) * 100;
      sweatLayers[1].style.clipPath = `inset(${insetTop1.toFixed(2)}% 0% 0% 0%)`;
      const img1 = sweatLayers[1].firstElementChild;
      if (img1) {
        const s1 = 1.05 - w1 * 0.05 + w2 * 0.035;
        img1.style.transform = `scale(${s1.toFixed(4)})`;
      }
    }
    if (sweatLayers[2]) {
      const insetTop2 = (1 - w2) * 100;
      sweatLayers[2].style.clipPath = `inset(${insetTop2.toFixed(2)}% 0% 0% 0%)`;
      const img2 = sweatLayers[2].firstElementChild;
      if (img2) {
        const s2 = 1.05 - w2 * 0.05;
        img2.style.transform = `scale(${s2.toFixed(4)})`;
      }
    }

    sweatActiveIdx = w2 >= 0.5 ? 2 : w1 >= 0.5 ? 1 : 0;
    sweatDots.forEach((d, idx) => d.classList.toggle('is-active', idx === sweatActiveIdx));
  }

  applySweatshirtProgress(0);

  cleanups.push(
    mountPieceActionBar(sweatBarEl, SWEATSHIRT_SHOWCASE.productId, {
      getActiveStem: () => SWEATSHIRT_SHOWCASE.shutterStems[sweatActiveIdx],
    })
  );

  const onSweatAnchorClick = () => {
    openProductStage(SWEATSHIRT_SHOWCASE.productId, SWEATSHIRT_SHOWCASE.anchorStem);
  };
  const onSweatShutterClick = () => {
    openProductStage(
      SWEATSHIRT_SHOWCASE.productId,
      SWEATSHIRT_SHOWCASE.shutterStems[sweatActiveIdx]
    );
  };

  if (sweatAnchor) {
    const keyFn = onKeyActivate(onSweatAnchorClick);
    sweatAnchor.addEventListener('click', onSweatAnchorClick);
    sweatAnchor.addEventListener('keydown', keyFn);
    cleanups.push(() => {
      sweatAnchor.removeEventListener('click', onSweatAnchorClick);
      sweatAnchor.removeEventListener('keydown', keyFn);
    });
  }
  if (sweatShutter) {
    const keyFn = onKeyActivate(onSweatShutterClick);
    sweatShutter.addEventListener('click', onSweatShutterClick);
    sweatShutter.addEventListener('keydown', keyFn);
    cleanups.push(() => {
      sweatShutter.removeEventListener('click', onSweatShutterClick);
      sweatShutter.removeEventListener('keydown', keyFn);
    });
  }

  if (sweatSection) {
    triggers.push(
      ScrollTrigger.create({
        trigger: sweatSection,
        start: 'top 48%',
        end: 'bottom 48%',
        onEnter: () => document.body.classList.add('is-cobalt-polarity'),
        onEnterBack: () => document.body.classList.add('is-cobalt-polarity'),
        onLeave: () => document.body.classList.remove('is-cobalt-polarity'),
        onLeaveBack: () => document.body.classList.remove('is-cobalt-polarity'),
      })
    );

    if (sweatPin && !prefersReducedMotion()) {
      sweatSt = ScrollTrigger.create({
        trigger: sweatSection,
        pin: sweatPin,
        start: 'top top',
        end: '+=185%',
        scrub: IS_SCREENSHOT_MODE ? false : 0.32,
        snap: IS_SCREENSHOT_MODE
          ? undefined
          : {
              snapTo: [0.10, 0.52, 0.90],
              duration: { min: 0.34, max: 0.62 },
              delay: 0.16,
              ease: 'power2.inOut',
              directional: false,
            },
        invalidateOnRefresh: true,
        onUpdate: (self) => applySweatshirtProgress(self.progress),
      });
      triggers.push(sweatSt);
    }
  }

  // =========================================================================
  // 3. GEMINI BLACK T-SHIRT (06): #08080A 4-Blade Kinetic Architectural Accordion
  //    All 4 Cobalt-lit angles stand side-by-side as expanding vertical blades;
  //    scroll (or pointer hover) sweeps expansion + overhead Cobalt spotlight beam
  //    across Blades 0 -> 1 -> 2 -> 3.
  // =========================================================================
  const blackSection = document.getElementById('piece-black-tee');
  const blackPin = document.getElementById('black-tee-pin');
  const blackCone = document.getElementById('black-tee-cone');
  const blackMotesCanvas = document.getElementById('black-tee-motes');
  const blackAccordion = document.getElementById('black-tee-accordion');
  const blackDotsMount = document.getElementById('black-tee-dots');
  const blackBarEl = document.getElementById('black-tee-bar');

  const bladeEls = [];
  const bladeImgEls = [];
  const blackDots = [];
  let blackActiveIdx = 0;
  let blackScrollFocus = 0;
  let blackHoverFocus = null;
  let blackHoverArmed = false;
  let blackPointerAnchorX = null;
  let blackPointerAnchorY = null;
  let blackRenderedFocus = 0;
  let blackSt = null;

  function clearBlackHoverState() {
    blackHoverFocus = null;
    blackHoverArmed = false;
    blackPointerAnchorX = null;
    blackPointerAnchorY = null;
  }

  if (blackAccordion) {
    BLACK_TEE_FRAMES.forEach((frame, idx) => {
      const blade = document.createElement('article');
      blade.className = 'black-tee-blade';
      blade.dataset.bladeIdx = String(idx);
      if (idx === 0) blade.classList.add('is-active');
      blade.setAttribute('role', 'button');
      blade.setAttribute('tabindex', '0');
      blade.setAttribute('aria-label', `Inspect Gemini Black T-Shirt view ${idx + 1}`);

      blade.innerHTML = `
        <span class="corner-tick corner-tick--dark corner-tick--tl" aria-hidden="true"></span>
        <span class="corner-tick corner-tick--dark corner-tick--tr" aria-hidden="true"></span>
        <span class="corner-tick corner-tick--dark corner-tick--bl" aria-hidden="true"></span>
        <span class="corner-tick corner-tick--dark corner-tick--br" aria-hidden="true"></span>
        <div class="black-tee-blade__clip">
          <img
            class="black-tee-blade__img"
            src="${webPhoto(frame.stem)}"
            alt="Gemini Black T-Shirt view ${idx + 1}"
            style="object-position: ${frame.objectPosition};"
            decoding="async"
          />
        </div>
      `;

      const onOpenBlade = () => openProductStage('06', frame.stem);
      const keyFn = onKeyActivate(onOpenBlade);

      blade.addEventListener('click', onOpenBlade);
      blade.addEventListener('keydown', keyFn);

      blackAccordion.appendChild(blade);
      bladeEls.push(blade);
      bladeImgEls.push(blade.querySelector('.black-tee-blade__img'));
    });

    // Only focus blades via hover when the user actively moves their mouse (>= 6px delta),
    // preventing a stationary/parked cursor from interrupting the scroll choreography.
    const onMoveAccordion = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (blackPointerAnchorX === null || blackPointerAnchorY === null) {
        blackPointerAnchorX = e.clientX;
        blackPointerAnchorY = e.clientY;
        return;
      }
      if (!blackHoverArmed) {
        const movedDist = Math.hypot(
          e.clientX - blackPointerAnchorX,
          e.clientY - blackPointerAnchorY
        );
        if (movedDist < 6) return;
        blackHoverArmed = true;
      }
      const bladeEl =
        e.target instanceof Element ? e.target.closest('.black-tee-blade') : null;
      if (!bladeEl) return;
      const idx = Number(bladeEl.dataset.bladeIdx);
      if (Number.isInteger(idx) && idx >= 0 && idx < BLACK_TEE_FRAMES.length) {
        blackHoverFocus = idx;
      }
    };

    const onLeaveAccordion = () => {
      clearBlackHoverState();
    };
    blackAccordion.addEventListener('pointermove', onMoveAccordion);
    blackAccordion.addEventListener('pointerleave', onLeaveAccordion);
    cleanups.push(() => {
      blackAccordion.removeEventListener('pointermove', onMoveAccordion);
      blackAccordion.removeEventListener('pointerleave', onLeaveAccordion);
    });
  }

  if (blackDotsMount) {
    BLACK_TEE_FRAMES.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'piece-step-dot';
      if (idx === 0) dot.classList.add('is-active');
      blackDotsMount.appendChild(dot);
      blackDots.push(dot);
    });
  }

  function applyBlackFocusState(focusVal) {
    const clampedFocus = Math.max(0, Math.min(BLACK_TEE_FRAMES.length - 1, focusVal));
    blackActiveIdx = Math.round(clampedFocus);

    bladeEls.forEach((blade, idx) => {
      const dist = Math.abs(clampedFocus - idx);
      const weight = Math.exp(-dist * dist * 2.35); // 1.0 on focused blade, ~0.095 on neighbors
      const flexGrow = 0.85 + weight * 4.45;
      blade.style.flexGrow = flexGrow.toFixed(4);
      blade.classList.toggle('is-active', idx === blackActiveIdx);

      const img = bladeImgEls[idx];
      if (img) {
        const scale = 1.045 - weight * 0.045;
        img.style.transform = `scale(${scale.toFixed(4)})`;
      }
    });

    // Track the overhead Cobalt spotlight beam across the 4 horizontal blades
    if (blackCone) {
      const beamCenterPct = 15 + (clampedFocus / 3) * 70;
      const beamTilt = (clampedFocus - 1.5) * 4.5;
      blackCone.style.left = `${beamCenterPct.toFixed(2)}%`;
      blackCone.style.transform = `translateX(-50%) rotate(${beamTilt.toFixed(2)}deg)`;
    }

    blackDots.forEach((d, idx) => d.classList.toggle('is-active', idx === blackActiveIdx));
  }

  function computeBlackTeeSequence(p) {
    if (p < 0.16) return 0.0;
    if (p < 0.34) return smoothRange(p, 0.16, 0.34);
    if (p < 0.48) return 1.0;
    if (p < 0.66) return 1.0 + smoothRange(p, 0.48, 0.66);
    if (p < 0.78) return 2.0;
    if (p < 0.92) return 2.0 + smoothRange(p, 0.78, 0.92);
    return 3.0;
  }

  // Deterministic miniature 4-point Spark motes drifting inside the tracking Cobalt spotlight beam
  const motes = Array.from({ length: 18 }, (_, i) => ({
    xOffset: (((i * 0.6180339) % 1) - 0.5) * 0.34,
    yNorm: (i * 0.381966) % 1,
    speedY: 0.022 + (i % 5) * 0.007,
    driftX: (i % 2 === 0 ? 1 : -1) * (0.006 + (i % 3) * 0.004),
    radius: 2.0 + (i % 4) * 0.85,
    alpha: 0.22 + (i % 4) * 0.14,
    phase: i * 1.17,
  }));

  function renderBlackTeeMotes(timeSec = 1.5, focusVal = 0) {
    if (!blackMotesCanvas) return;
    const rect = blackMotesCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.round(rect.width * dpr));
    const bh = Math.max(1, Math.round(rect.height * dpr));
    if (blackMotesCanvas.width !== bw || blackMotesCanvas.height !== bh) {
      blackMotesCanvas.width = bw;
      blackMotesCanvas.height = bh;
    }
    const ctx = blackMotesCanvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const beamCenterNorm = 0.15 + (clamp01(focusVal / 3) * 0.70);

    motes.forEach((m) => {
      const y = (((m.yNorm - timeSec * m.speedY) % 1) + 1) % 1;
      const x = beamCenterNorm + m.xOffset + Math.sin(timeSec * 0.7 + m.phase) * m.driftX * 2.5;
      const edgeFade = Math.sin(y * Math.PI);
      const alpha = m.alpha * edgeFade;
      if (alpha <= 0.02 || x < 0.02 || x > 0.98) return;

      ctx.fillStyle =
        m.radius > 3.2
          ? `rgba(210, 227, 252, ${alpha.toFixed(3)})`
          : `rgba(79, 160, 255, ${alpha.toFixed(3)})`;
      drawConcaveSpark2D(
        ctx,
        x * rect.width,
        y * rect.height,
        m.radius,
        timeSec * 0.28 + m.phase
      );
    });
  }

  let blackVisible = false;
  const blackStartClock = performance.now();
  function onBlackTick() {
    if (!blackVisible || IS_SCREENSHOT_MODE || prefersReducedMotion()) return;
    const targetFocus = blackHoverFocus !== null ? blackHoverFocus : blackScrollFocus;
    blackRenderedFocus += (targetFocus - blackRenderedFocus) * 0.14;
    applyBlackFocusState(blackRenderedFocus);
    renderBlackTeeMotes((performance.now() - blackStartClock) * 0.001, blackRenderedFocus);
  }

  function applyBlackTeeProgress(progress) {
    const p = clamp01(progress);
    const nextScrollFocus = computeBlackTeeSequence(p);
    // Whenever scroll progresses, yield focus back to scroll choreography until the mouse moves again
    if (Math.abs(nextScrollFocus - blackScrollFocus) > 0.002) {
      clearBlackHoverState();
    }
    blackScrollFocus = nextScrollFocus;
    if (IS_SCREENSHOT_MODE || prefersReducedMotion() || !blackVisible) {
      blackRenderedFocus = blackScrollFocus;
      applyBlackFocusState(blackRenderedFocus);
    }
  }

  applyBlackTeeProgress(0);
  renderBlackTeeMotes(1.8, 0);

  if (blackSection && !IS_SCREENSHOT_MODE && !prefersReducedMotion()) {
    const blackIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          blackVisible = entry.isIntersecting;
          if (!blackVisible) {
            clearBlackHoverState();
          } else {
            renderBlackTeeMotes((performance.now() - blackStartClock) * 0.001, blackRenderedFocus);
          }
        });
      },
      { threshold: 0.02 }
    );
    blackIo.observe(blackSection);
    gsap.ticker.add(onBlackTick);
    cleanups.push(() => {
      blackIo.disconnect();
      gsap.ticker.remove(onBlackTick);
    });
  }

  cleanups.push(
    mountPieceActionBar(blackBarEl, '06', {
      getActiveStem: () => BLACK_TEE_FRAMES[blackActiveIdx].stem,
    })
  );

  if (blackSection && blackPin && !prefersReducedMotion()) {
    blackSt = ScrollTrigger.create({
      trigger: blackSection,
      pin: blackPin,
      start: 'top top',
      end: '+=215%',
      scrub: IS_SCREENSHOT_MODE ? false : 0.34,
      snap: IS_SCREENSHOT_MODE
        ? undefined
        : {
            snapTo: [0.08, 0.41, 0.72, 0.96],
            duration: { min: 0.36, max: 0.65 },
            delay: 0.16,
            ease: 'power2.inOut',
            directional: false,
          },
      invalidateOnRefresh: true,
      onUpdate: (self) => applyBlackTeeProgress(self.progress),
    });
    triggers.push(blackSt);
  }

  // =========================================================================
  // 4. NANO BANANA SPORTS SOCKS (04): #131418 Slate Stepped Diagonal Triptych
  // =========================================================================
  const socksSection = document.getElementById('piece-socks');
  const socksTriptychEl = document.getElementById('socks-triptych');
  const socksBarEl = document.getElementById('socks-bar');

  const sockCardEls = [];
  let socksActiveIdx = 0;

  function setSocksSelected(idx) {
    socksActiveIdx = idx;
    sockCardEls.forEach((el, i) => el.classList.toggle('is-selected', i === idx));
  }

  if (socksTriptychEl) {
    SOCKS_TRIPTYCH.forEach((shot, idx) => {
      const card = document.createElement('article');
      card.className = `socks-card socks-card--${idx}`;
      if (idx === 0) card.classList.add('is-selected');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', shot.alt);

      card.innerHTML = `
        <span class="corner-tick corner-tick--slate corner-tick--tl" aria-hidden="true"></span>
        <span class="corner-tick corner-tick--slate corner-tick--tr" aria-hidden="true"></span>
        <span class="corner-tick corner-tick--slate corner-tick--bl" aria-hidden="true"></span>
        <span class="corner-tick corner-tick--slate corner-tick--br" aria-hidden="true"></span>
        <div class="socks-card__media">
          <img
            class="socks-card__img"
            src="${webPhoto(shot.stem)}"
            alt="${shot.alt}"
            decoding="async"
          />
        </div>
      `;

      const onOpenSock = () => openProductStage('04', shot.stem);
      const keyFn = onKeyActivate(onOpenSock);

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        setSocksSelected(idx);
      });
      card.addEventListener('click', onOpenSock);
      card.addEventListener('keydown', keyFn);

      socksTriptychEl.appendChild(card);
      sockCardEls.push(card);
    });
  }

  cleanups.push(
    mountPieceActionBar(socksBarEl, '04', {
      getActiveStem: () => SOCKS_TRIPTYCH[socksActiveIdx]?.stem || SOCKS_TRIPTYCH[0].stem,
    })
  );

  function applySocksProgress(progress) {
    const p = clamp01(progress);
    const active = p < 0.36 ? 0 : p < 0.68 ? 1 : 2;
    setSocksSelected(active);

    if (window.innerWidth >= 768 && !prefersReducedMotion()) {
      const centered = (p - 0.5) * 2;
      const offsets = [
        { x: -centered * 16, y: centered * 26 },
        { x: 0, y: -centered * 14 },
        { x: centered * 16, y: -centered * 28 },
      ];
      sockCardEls.forEach((el, idx) => {
        const off = offsets[idx];
        el.style.transform = `translate3d(${off.x.toFixed(1)}px, ${off.y.toFixed(1)}px, 0)`;
      });
    } else {
      sockCardEls.forEach((el) => {
        el.style.transform = 'none';
      });
    }
  }

  if (socksSection && !prefersReducedMotion()) {
    triggers.push(
      ScrollTrigger.create({
        trigger: socksSection,
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: IS_SCREENSHOT_MODE ? false : 0.3,
        onUpdate: (self) => applySocksProgress(self.progress),
      })
    );
  }

  return {
    getSectionElement(name) {
      if (name === 'sweatshirt') return sweatSection;
      if (name === 'black-tee') return blackSection;
      if (name === 'socks') return socksSection;
      if (name === 'gate-apparel') return gateEl;
      return null;
    },
    getScrollTrigger(name) {
      if (name === 'sweatshirt') return sweatSt;
      if (name === 'black-tee') return blackSt;
      return null;
    },
    setDeterministic(name, scrub = 0.0) {
      if (name === 'sweatshirt') {
        document.body.classList.add('is-cobalt-polarity');
        applySweatshirtProgress(scrub);
      } else if (name === 'black-tee') {
        document.body.classList.remove('is-cobalt-polarity');
        applyBlackTeeProgress(scrub);
        renderBlackTeeMotes(1.8, blackRenderedFocus);
      } else if (name === 'socks') {
        document.body.classList.remove('is-cobalt-polarity');
        applySocksProgress(scrub);
      } else if (name === 'gate-apparel') {
        applyGateApparel(scrub);
      }
    },
    destroy() {
      triggers.forEach((t) => t.kill());
      cleanups.forEach((fn) => fn());
    },
  };
}
