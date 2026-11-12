/**
 * Objects Chapter Showcases:
 * - Gate II (#gate-objects): #1F34FF -> #08080A expanding [ Objects ] bracket curtain
 * - 03 Nano Banana Tote Bag (#piece-tote): #08080A 180-Deg 3D Dual-Sided Canvas Flip
 * - 07 Gemini Insulated Bottle (#piece-bottle): #08080A High-Velocity Camera-Pan Arrest
 * - 05 Nano Banana Pin Badge (#piece-pin): #1F34FF Cobalt Continuous Focal-Point Macro Zoom
 * - 08 Gemini Holographic Sticker Pack (#piece-stickers): #08080A Horizontal 4-Surface Foil Rail
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  TOTE_SHOWCASE,
  BOTTLE_FRAMES,
  PIN_ZOOM_STAGES,
  STICKER_SURFACES,
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

export function initObjectShowcases() {
  const cleanups = [];
  const triggers = [];

  const onKeyActivate = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  // =========================================================================
  // CHAPTER GATE II: [ Objects ] Expanding Curtain (#1F34FF -> #08080A)
  // =========================================================================
  const gateEl = document.getElementById('gate-objects');
  const gateFill = document.getElementById('gate-objects-fill');
  const gateLeftBracket = gateEl?.querySelector('.chapter-gate__bracket--left');
  const gateRightBracket = gateEl?.querySelector('.chapter-gate__bracket--right');
  const gateWord = gateEl?.querySelector('.chapter-gate__word');

  function applyGateObjects(progress) {
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
    applyGateObjects(0);
    triggers.push(
      ScrollTrigger.create({
        trigger: gateEl,
        start: 'top 88%',
        end: 'bottom 25%',
        scrub: IS_SCREENSHOT_MODE ? false : 0.22,
        onUpdate: (self) => applyGateObjects(self.progress),
      })
    );
  } else if (gateEl) {
    applyGateObjects(1);
  }

  // =========================================================================
  // 5. NANO BANANA TOTE BAG (03): #08080A 180-Deg 3D Dual-Sided Canvas Flip
  // =========================================================================
  const toteSection = document.getElementById('piece-tote');
  const totePin = document.getElementById('tote-pin');
  const toteScene = document.getElementById('tote-flip-scene');
  const toteCard3d = document.getElementById('tote-card-3d');
  const toteFrontFace = toteCard3d?.querySelector('.piece-tote__face--front');
  const toteBackFace = toteCard3d?.querySelector('.piece-tote__face--back');
  const toteEdgeGlint = document.getElementById('tote-edge-glint');
  const toteFlankLeft = document.getElementById('tote-flank-left');
  const toteFlankRight = document.getElementById('tote-flank-right');
  const toteBarEl = document.getElementById('tote-bar');

  let toteFlipped = false;
  let toteSt = null;

  function applyToteProgress(progress) {
    const p = clamp01(progress);
    // Sharp hold on Side A [0.00..0.28], 180-deg Y-axis flip [0.28..0.72], sharp hold on Side B [0.72..1.00]
    const flipFrac = smoothRange(p, 0.28, 0.72);
    const rotDeg = flipFrac * 180;
    const edgePeak = Math.sin(flipFrac * Math.PI); // 0 on plateaus, 1 at 90-deg edge-on!

    toteFlipped = rotDeg >= 90;

    if (toteCard3d) {
      const liftScale = 1 + edgePeak * 0.036;
      toteCard3d.style.transform = `rotateY(${rotDeg.toFixed(2)}deg) scale(${liftScale.toFixed(4)})`;
    }
    if (toteFrontFace) {
      toteFrontFace.style.opacity = rotDeg < 90 ? '1' : '0';
    }
    if (toteBackFace) {
      toteBackFace.style.opacity = rotDeg >= 90 ? '1' : '0';
    }
    if (toteEdgeGlint) {
      toteEdgeGlint.style.opacity = (edgePeak * 0.28).toFixed(3);
    }

    // Opposing vertical parallax on flanking street carry studies
    const flankTravel = (p - 0.5) * 68;
    if (toteFlankLeft) {
      toteFlankLeft.style.transform = `translate3d(0, ${(-flankTravel).toFixed(1)}px, 0)`;
    }
    if (toteFlankRight) {
      toteFlankRight.style.transform = `translate3d(0, ${flankTravel.toFixed(1)}px, 0)`;
    }
  }

  applyToteProgress(0);

  cleanups.push(
    mountPieceActionBar(toteBarEl, TOTE_SHOWCASE.productId, {
      getActiveStem: () =>
        toteFlipped ? TOTE_SHOWCASE.backStem : TOTE_SHOWCASE.frontStem,
    })
  );

  if (toteScene) {
    const onOpenToteCenter = () =>
      openProductStage(
        TOTE_SHOWCASE.productId,
        toteFlipped ? TOTE_SHOWCASE.backStem : TOTE_SHOWCASE.frontStem
      );
    const keyFn = onKeyActivate(onOpenToteCenter);
    toteScene.addEventListener('click', onOpenToteCenter);
    toteScene.addEventListener('keydown', keyFn);
    cleanups.push(() => {
      toteScene.removeEventListener('click', onOpenToteCenter);
      toteScene.removeEventListener('keydown', keyFn);
    });
  }

  if (toteFlankLeft) {
    const onOpenLeft = () => openProductStage(TOTE_SHOWCASE.productId, TOTE_SHOWCASE.flankLeftStem);
    const keyFn = onKeyActivate(onOpenLeft);
    toteFlankLeft.addEventListener('click', onOpenLeft);
    toteFlankLeft.addEventListener('keydown', keyFn);
    cleanups.push(() => {
      toteFlankLeft.removeEventListener('click', onOpenLeft);
      toteFlankLeft.removeEventListener('keydown', keyFn);
    });
  }

  if (toteFlankRight) {
    const onOpenRight = () =>
      openProductStage(TOTE_SHOWCASE.productId, TOTE_SHOWCASE.flankRightStem);
    const keyFn = onKeyActivate(onOpenRight);
    toteFlankRight.addEventListener('click', onOpenRight);
    toteFlankRight.addEventListener('keydown', keyFn);
    cleanups.push(() => {
      toteFlankRight.removeEventListener('click', onOpenRight);
      toteFlankRight.removeEventListener('keydown', keyFn);
    });
  }

  if (toteSection && totePin && !prefersReducedMotion()) {
    toteSt = ScrollTrigger.create({
      trigger: toteSection,
      pin: totePin,
      start: 'top top',
      end: '+=160%',
      scrub: IS_SCREENSHOT_MODE ? false : 0.26,
      snap: IS_SCREENSHOT_MODE
        ? undefined
        : {
            snapTo: [0.12, 0.88],
            duration: { min: 0.36, max: 0.65 },
            delay: 0.16,
            ease: 'power2.inOut',
            directional: false,
          },
      invalidateOnRefresh: true,
      onUpdate: (self) => applyToteProgress(self.progress),
    });
    triggers.push(toteSt);
  }

  // =========================================================================
  // 6. GEMINI INSULATED BOTTLE (07): #08080A High-Velocity Camera-Pan Arrest
  // =========================================================================
  const bottleSection = document.getElementById('piece-bottle');
  const bottlePin = document.getElementById('bottle-pin');
  const bottleStreaks = document.getElementById('bottle-streaks');
  const bottleViewport = document.getElementById('bottle-viewport');
  const bottleFramesMount = document.getElementById('bottle-frames');
  const bottleDotsMount = document.getElementById('bottle-dots');
  const bottleBarEl = document.getElementById('bottle-bar');

  const bottleFrameEls = [];
  const bottleDots = [];
  let bottleActiveIdx = 0;
  let bottleSt = null;

  if (bottleStreaks) {
    // Architectural cobalt/ice horizontal velocity hairlines that decelerate to stillness
    const lines = [14, 26, 38, 52, 66, 78, 88];
    bottleStreaks.innerHTML = lines
      .map(
        (topPct, i) =>
          `<span class="bottle-streak-line" style="top:${topPct}%; width:${22 + (i % 3) * 14}vw; left:${(i * 19) % 72}vw;"></span>`
      )
      .join('');
  }

  if (bottleFramesMount) {
    BOTTLE_FRAMES.forEach((frame, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'piece-bottle__frame';
      wrap.innerHTML = `
        <img
          class="piece-bottle__img"
          src="${webPhoto(frame.stem)}"
          alt="${frame.alt}"
          decoding="async"
        />
      `;
      bottleFramesMount.appendChild(wrap);
      bottleFrameEls.push(wrap);
    });
  }

  if (bottleDotsMount) {
    BOTTLE_FRAMES.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'piece-step-dot';
      if (idx === 0) dot.classList.add('is-active');
      bottleDotsMount.appendChild(dot);
      bottleDots.push(dot);
    });
  }

  function applyBottleProgress(progress) {
    const p = clamp01(progress);
    // [0.00..0.30]: Shot 0 (07_a motion pan) decelerating horizontally
    // [0.30..0.40]: Cut to Shot 1 (07_b foreground grip)
    // [0.40..0.66]: Shot 1 sharp hold
    // [0.66..0.76]: Arrest cut to Shot 2 (07_c dead-still black basalt monolith)
    // [0.76..1.00]: Shot 2 dead-still monolith hold (streaks = 0)
    const c1 = smoothRange(p, 0.30, 0.40);
    const c2 = smoothRange(p, 0.66, 0.76);

    const streakEnergy = 1 - smoothRange(p, 0.12, 0.76);
    if (bottleStreaks) {
      const shiftX = (1 - p) * 90 - 45;
      bottleStreaks.style.opacity = (streakEnergy * 0.75).toFixed(3);
      bottleStreaks.style.transform = `translate3d(${shiftX.toFixed(1)}px, 0, 0) scaleX(${(0.55 + streakEnergy * 0.75).toFixed(3)})`;
    }

    if (bottleFrameEls[0]) {
      const panSlide = (1 - smoothRange(p, 0.0, 0.32)) * 20;
      bottleFrameEls[0].style.opacity = (1 - c1).toFixed(3);
      bottleFrameEls[0].style.transform = `translate3d(${panSlide.toFixed(1)}px, 0, 0) scale(1.07)`;
      bottleFrameEls[0].style.zIndex = '1';
    }
    if (bottleFrameEls[1]) {
      const alpha1 = c1 * (1 - c2);
      const slide1 = (1 - c1) * -22 + c2 * 14;
      bottleFrameEls[1].style.opacity = alpha1.toFixed(3);
      bottleFrameEls[1].style.transform = `translate3d(${slide1.toFixed(1)}px, 0, 0) scale(${(1.02 - c1 * 0.02).toFixed(4)})`;
      bottleFrameEls[1].style.zIndex = '2';
    }
    if (bottleFrameEls[2]) {
      // Dead-still monolith lock on basalt
      const settleScale = 1.035 - c2 * 0.035;
      bottleFrameEls[2].style.opacity = c2.toFixed(3);
      bottleFrameEls[2].style.transform = `translate3d(0, 0, 0) scale(${settleScale.toFixed(4)})`;
      bottleFrameEls[2].style.zIndex = '3';
    }

    bottleActiveIdx = c2 >= 0.5 ? 2 : c1 >= 0.5 ? 1 : 0;
    bottleDots.forEach((d, idx) => d.classList.toggle('is-active', idx === bottleActiveIdx));
  }

  applyBottleProgress(0);

  cleanups.push(
    mountPieceActionBar(bottleBarEl, '07', {
      getActiveStem: () => BOTTLE_FRAMES[bottleActiveIdx].stem,
    })
  );

  if (bottleViewport) {
    const onOpenBottle = () => openProductStage('07', BOTTLE_FRAMES[bottleActiveIdx].stem);
    const keyFn = onKeyActivate(onOpenBottle);
    bottleViewport.addEventListener('click', onOpenBottle);
    bottleViewport.addEventListener('keydown', keyFn);
    cleanups.push(() => {
      bottleViewport.removeEventListener('click', onOpenBottle);
      bottleViewport.removeEventListener('keydown', keyFn);
    });
  }

  if (bottleSection && bottlePin && !prefersReducedMotion()) {
    bottleSt = ScrollTrigger.create({
      trigger: bottleSection,
      pin: bottlePin,
      start: 'top top',
      end: '+=165%',
      scrub: IS_SCREENSHOT_MODE ? false : 0.25,
      snap: IS_SCREENSHOT_MODE
        ? undefined
        : {
            snapTo: [0.10, 0.52, 0.90],
            duration: { min: 0.36, max: 0.65 },
            delay: 0.16,
            ease: 'power2.inOut',
            directional: false,
          },
      invalidateOnRefresh: true,
      onUpdate: (self) => applyBottleProgress(self.progress),
    });
    triggers.push(bottleSt);
  }

  // =========================================================================
  // 7. NANO BANANA PIN BADGE (05): #1F34FF Cobalt Continuous Focal Macro Zoom
  // =========================================================================
  const pinSection = document.getElementById('piece-pin');
  const pinPin = document.getElementById('pin-pin');
  const pinViewport = document.getElementById('pin-viewport');
  const pinLayersMount = document.getElementById('pin-layers');
  const pinGlint = document.getElementById('pin-glint');
  const pinDotsMount = document.getElementById('pin-dots');
  const pinBarEl = document.getElementById('pin-bar');

  const pinLayerEls = [];
  const pinDots = [];
  let pinActiveIdx = 0;
  let pinSt = null;

  if (pinLayersMount) {
    PIN_ZOOM_STAGES.forEach((stage, idx) => {
      const layer = document.createElement('div');
      layer.className = 'piece-pin__layer';
      layer.style.transformOrigin = `${stage.originX} ${stage.originY}`;
      layer.style.zIndex = String(idx + 1);
      layer.innerHTML = `
        <img
          class="piece-pin__img"
          src="${webPhoto(stage.stem)}"
          alt="Nano Banana Pin Badge zoom stage ${idx + 1}"
          decoding="async"
        />
      `;
      pinLayersMount.appendChild(layer);
      pinLayerEls.push(layer);
    });
  }

  if (pinDotsMount) {
    PIN_ZOOM_STAGES.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'piece-step-dot';
      if (idx === 0) dot.classList.add('is-active');
      pinDotsMount.appendChild(dot);
      pinDots.push(dot);
    });
  }

  function applyPinProgress(progress) {
    const p = clamp01(progress);
    // Concentric optical zoom locked onto exact lapel coordinates of the yellow banana pin:
    // [0.00..0.26]: Stage 0 (05_b night portrait) 1.0x sharp hold
    // [0.26..0.38]: Concentric zoom into lapel -> Stage 1 (05_a collar flash)
    // [0.38..0.62]: Stage 1 1.0x sharp hold
    // [0.62..0.74]: Concentric zoom into lapel -> Stage 2 (05_c enamel bevel macro)
    // [0.74..1.00]: Stage 2 1.0x sharp hold + diagonal metal bevel specular sweep
    const z1 = smoothRange(p, 0.26, 0.38);
    const z2 = smoothRange(p, 0.62, 0.74);

    if (pinLayerEls[0]) {
      const scale0 = 1.0 + z1 * 1.25;
      const alpha0 = 1.0 - smoothRange(z1, 0.45, 1.0);
      pinLayerEls[0].style.transform = `scale(${scale0.toFixed(4)})`;
      pinLayerEls[0].style.opacity = alpha0.toFixed(3);
    }
    if (pinLayerEls[1]) {
      const enterScale1 = 0.84 + z1 * 0.16;
      const exitScale1 = z2 * 1.32;
      const scale1 = enterScale1 + exitScale1;
      const alphaIn1 = smoothRange(z1, 0.12, 0.88);
      const alphaOut1 = 1.0 - smoothRange(z2, 0.45, 1.0);
      pinLayerEls[1].style.transform = `scale(${scale1.toFixed(4)})`;
      pinLayerEls[1].style.opacity = (alphaIn1 * alphaOut1).toFixed(3);
    }
    if (pinLayerEls[2]) {
      const scale2 = 0.85 + z2 * 0.15;
      const alpha2 = smoothRange(z2, 0.12, 0.88);
      pinLayerEls[2].style.transform = `scale(${scale2.toFixed(4)})`;
      pinLayerEls[2].style.opacity = alpha2.toFixed(3);
    }

    if (pinGlint) {
      const glintProg = smoothRange(p, 0.75, 0.95);
      const glintAlpha = Math.sin(glintProg * Math.PI) * 0.24;
      const glintShift = -110 + glintProg * 220;
      pinGlint.style.opacity = glintAlpha.toFixed(3);
      pinGlint.style.transform = `translate3d(${glintShift.toFixed(1)}%, 0, 0) skewX(-24deg)`;
    }

    pinActiveIdx = z2 >= 0.5 ? 2 : z1 >= 0.5 ? 1 : 0;
    pinDots.forEach((d, idx) => d.classList.toggle('is-active', idx === pinActiveIdx));
  }

  applyPinProgress(0);

  cleanups.push(
    mountPieceActionBar(pinBarEl, '05', {
      getActiveStem: () => PIN_ZOOM_STAGES[pinActiveIdx].stem,
    })
  );

  if (pinViewport) {
    const onOpenPin = () => openProductStage('05', PIN_ZOOM_STAGES[pinActiveIdx].stem);
    const keyFn = onKeyActivate(onOpenPin);
    pinViewport.addEventListener('click', onOpenPin);
    pinViewport.addEventListener('keydown', keyFn);
    cleanups.push(() => {
      pinViewport.removeEventListener('click', onOpenPin);
      pinViewport.removeEventListener('keydown', keyFn);
    });
  }

  if (pinSection) {
    // Toggle #1F34FF Cobalt HUD polarity while inside Pin Badge chapter
    triggers.push(
      ScrollTrigger.create({
        trigger: pinSection,
        start: 'top 48%',
        end: 'bottom 48%',
        onEnter: () => document.body.classList.add('is-cobalt-polarity'),
        onEnterBack: () => document.body.classList.add('is-cobalt-polarity'),
        onLeave: () => document.body.classList.remove('is-cobalt-polarity'),
        onLeaveBack: () => document.body.classList.remove('is-cobalt-polarity'),
      })
    );

    if (pinPin && !prefersReducedMotion()) {
      pinSt = ScrollTrigger.create({
        trigger: pinSection,
        pin: pinPin,
        start: 'top top',
        end: '+=180%',
        scrub: IS_SCREENSHOT_MODE ? false : 0.25,
        snap: IS_SCREENSHOT_MODE
          ? undefined
          : {
              snapTo: [0.10, 0.50, 0.88],
              duration: { min: 0.36, max: 0.65 },
              delay: 0.16,
              ease: 'power2.inOut',
              directional: false,
            },
        invalidateOnRefresh: true,
        onUpdate: (self) => applyPinProgress(self.progress),
      });
      triggers.push(pinSt);
    }
  }

  // =========================================================================
  // 8. GEMINI HOLOGRAPHIC STICKER PACK (08): #08080A Horizontal 4-Surface Rail
  // =========================================================================
  const stickersSection = document.getElementById('piece-stickers');
  const stickersPin = document.getElementById('stickers-pin');
  const stickersTrack = document.getElementById('stickers-track');
  const stickersBarEl = document.getElementById('stickers-bar');

  const stickerCards = [];
  let stickersActiveIdx = 0;
  let stickersSt = null;

  if (stickersTrack) {
    STICKER_SURFACES.forEach((surface, idx) => {
      const card = document.createElement('article');
      card.className = 'sticker-surface-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', surface.alt);

      card.innerHTML = `
        <div class="sticker-surface-card__media">
          <img
            class="sticker-surface-card__img"
            src="${webPhoto(surface.stem)}"
            alt="${surface.alt}"
            decoding="async"
          />
        </div>
      `;

      const onOpenSticker = () => {
        stickersActiveIdx = idx;
        openProductStage('08', surface.stem);
      };
      const keyFn = onKeyActivate(onOpenSticker);

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        stickersActiveIdx = idx;
      });
      card.addEventListener('click', onOpenSticker);
      card.addEventListener('keydown', keyFn);

      stickersTrack.appendChild(card);
      stickerCards.push(card);
    });
  }

  cleanups.push(
    mountPieceActionBar(stickersBarEl, '08', {
      getActiveStem: () =>
        STICKER_SURFACES[stickersActiveIdx]?.stem || STICKER_SURFACES[0].stem,
    })
  );

  function computeStickersMaxShift() {
    if (!stickersTrack) return 0;
    const mask = stickersTrack.parentElement;
    if (!mask) return 0;
    return Math.max(0, stickersTrack.scrollWidth - mask.clientWidth);
  }

  function applyStickersProgress(progress) {
    const p = clamp01(progress);
    const isDesktop = window.innerWidth >= 768;
    if (stickersTrack && isDesktop && !prefersReducedMotion()) {
      const maxShift = computeStickersMaxShift();
      const tx = -p * maxShift;
      stickersTrack.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
    } else if (stickersTrack) {
      stickersTrack.style.transform = 'none';
    }

    stickersActiveIdx = Math.min(
      STICKER_SURFACES.length - 1,
      Math.floor(p * STICKER_SURFACES.length)
    );
  }

  applyStickersProgress(0);

  const mm = gsap.matchMedia();
  if (stickersSection && stickersPin && !prefersReducedMotion()) {
    mm.add('(min-width: 768px)', () => {
      stickersSt = ScrollTrigger.create({
        trigger: stickersSection,
        pin: stickersPin,
        start: 'top top',
        end: () => `+=${Math.max(window.innerHeight * 1.15, computeStickersMaxShift() + 240)}`,
        scrub: IS_SCREENSHOT_MODE ? false : 0.28,
        invalidateOnRefresh: true,
        onUpdate: (self) => applyStickersProgress(self.progress),
      });
      return () => {
        stickersSt?.kill();
        stickersSt = null;
      };
    });
  }

  return {
    getSectionElement(name) {
      if (name === 'tote') return toteSection;
      if (name === 'bottle') return bottleSection;
      if (name === 'pin') return pinSection;
      if (name === 'stickers') return stickersSection;
      if (name === 'gate-objects') return gateEl;
      return null;
    },
    getScrollTrigger(name) {
      if (name === 'tote') return toteSt;
      if (name === 'bottle') return bottleSt;
      if (name === 'pin') return pinSt;
      if (name === 'stickers') return stickersSt;
      return null;
    },
    setDeterministic(name, scrub = 0.0) {
      if (name === 'tote') {
        document.body.classList.remove('is-cobalt-polarity');
        applyToteProgress(scrub);
      } else if (name === 'bottle') {
        document.body.classList.remove('is-cobalt-polarity');
        applyBottleProgress(scrub);
      } else if (name === 'pin') {
        document.body.classList.add('is-cobalt-polarity');
        applyPinProgress(scrub);
      } else if (name === 'stickers') {
        document.body.classList.remove('is-cobalt-polarity');
        applyStickersProgress(scrub);
      } else if (name === 'gate-objects') {
        applyGateObjects(scrub);
      }
    },
    destroy() {
      mm.revert();
      triggers.forEach((t) => t.kill());
      cleanups.forEach((fn) => fn());
    },
  };
}
