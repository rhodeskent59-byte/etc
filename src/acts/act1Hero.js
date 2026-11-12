/**
 * Act I: #08080A Kinetic Spark -> Center-Locked Match-Cut Hero (02 Nano Banana Tee)
 * - Load (0.0s-1.3s): 3-frame (50ms) micro-compression -> 4-frame (66ms) expo.out snap (-14deg -> 0deg)
 * - Live WebGL2 optical exclusion / sapphire refraction where Gemini / Supply intersect Spark
 * - Unhurried 320% scroll scrub: Y-axis 3D prism flip + exponential sdGeminiSpark aperture expansion
 *   into 02 Nano Banana Tee (02_a -> 02_c -> 02_d) with generous miniature Gemini-spark dot transitions
 * - Gentle idle-triggered ScrollTrigger snap so users see the full micro-spark dot wave while scrolling
 *   and smoothly settle onto a razor-sharp frame once they pause
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ACT1_HERO_PRODUCT_ID, ACT1_HERO_FRAMES, webPhoto } from '../data/catalog.js';
import { openProductStage, IS_SCREENSHOT_MODE, prefersReducedMotion } from '../state/store.js';
import { mountPieceActionBar } from '../ui/pieceActionBar.js';

function smoothRange(x, a, b) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  const t = (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}

/**
 * Maps scroll progress [0..1] across a spacious 320vh budget:
 * - [0.00 .. 0.22]: Spark prism flip + aperture opens onto Frame 0 (02_a_banana_tee_candid)
 * - [0.22 .. 0.36]: 100% sharp hold on Frame 0 (snap target 0.29)
 * - [0.36 .. 0.54]: Generous (~58vh) diagonal miniature Gemini-spark dot transition 0.0 -> 1.0
 * - [0.54 .. 0.68]: 100% sharp hold on Frame 1 (02_c_banana_tee_chest_flash, snap target 0.61)
 * - [0.68 .. 0.86]: Generous (~58vh) diagonal miniature Gemini-spark dot transition 1.0 -> 2.0
 * - [0.86 .. 1.00]: 100% sharp hold on Frame 2 (02_d_banana_tee_back_collar, snap target 0.93)
 */
function computeSteppedPhotoSequence(p) {
  if (p < 0.36) return 0.0;
  if (p < 0.54) return smoothRange(p, 0.36, 0.54);
  if (p < 0.68) return 1.0;
  if (p < 0.86) return 1.0 + smoothRange(p, 0.68, 0.86);
  return 2.0;
}

export function initAct1Hero({ createSparkHeroCanvas, onPastHeroChange }) {
  const sectionEl = document.getElementById('act-1');
  const pinEl = document.getElementById('act-1-pin');
  const canvasEl = document.getElementById('hero-spark-canvas');
  const titleEl = document.getElementById('hero-title');
  const wordLeft = document.getElementById('hero-word-gemini');
  const wordRight = document.getElementById('hero-word-supply');
  const pieceBarEl = document.getElementById('hero-piece-bar');

  const frameUrls = ACT1_HERO_FRAMES.map((f) => webPhoto(f.stem));
  const frameFocals = ACT1_HERO_FRAMES.map((f) => [f.focalX ?? 0.5, f.focalY ?? 0.5]);

  const sparkStage = createSparkHeroCanvas(canvasEl, {
    frameUrls,
    frameFocals,
    isScreenshotMode: IS_SCREENSHOT_MODE,
    reducedMotion: prefersReducedMotion(),
  });

  let currentProgress = 0;

  function getActiveHeroStem() {
    const seq = computeSteppedPhotoSequence(currentProgress);
    const idx = Math.min(ACT1_HERO_FRAMES.length - 1, Math.max(0, Math.round(seq)));
    return ACT1_HERO_FRAMES[idx].stem;
  }

  const cleanupBar = mountPieceActionBar(pieceBarEl, ACT1_HERO_PRODUCT_ID, {
    getActiveStem: getActiveHeroStem,
  });

  function onCanvasClick() {
    if (currentProgress < 0.18) return;
    openProductStage(ACT1_HERO_PRODUCT_ID, getActiveHeroStem());
  }

  if (canvasEl) {
    canvasEl.addEventListener('click', onCanvasClick);
  }

  const pointer = {
    targetX: 0.5,
    targetY: 0.5,
    currentX: 0.5,
    currentY: 0.5,
    targetHover: 0,
    currentHover: 0,
  };

  function onPointerMove(e) {
    if (!pinEl) return;
    const rect = pinEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
      pointer.targetHover = 0;
      return;
    }
    pointer.targetX = nx;
    pointer.targetY = ny;
    pointer.targetHover = 1;
  }

  function onPointerLeave() {
    pointer.targetHover = 0;
  }

  if (pinEl && !IS_SCREENSHOT_MODE) {
    pinEl.addEventListener('pointermove', onPointerMove, { passive: true });
    pinEl.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });
    window.addEventListener('blur', onPointerLeave, { passive: true });
  }

  function refreshTitleMask() {
    sparkStage.syncTitleOverlay?.(titleEl, wordLeft, wordRight);
  }

  function applyScrubProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    currentProgress = p;

    const flipPhase = Math.min(1, p / 0.21);
    const flipY = flipPhase * Math.PI;

    const apertureRaw = Math.max(0, Math.min(1, (p - 0.02) / 0.20));
    const apertureProgress =
      apertureRaw <= 0 ? 0 : apertureRaw >= 1 ? 1 : Math.pow(apertureRaw, 1.32);

    const photoSequenceProgress = computeSteppedPhotoSequence(p);

    const wordFade = Math.max(0, Math.min(1, (p - 0.035) / 0.165));
    const titleOpacity = 1 - wordFade;
    const titleShiftNorm = wordFade * 0.042;

    sparkStage.setState({
      flipY,
      apertureProgress,
      photoSequenceProgress,
      titleOpacity,
      titleShiftNorm,
    });

    if (canvasEl) {
      canvasEl.style.cursor = p >= 0.20 ? 'pointer' : 'default';
    }

    if (wordLeft) {
      const shiftX = -wordFade * 48;
      wordLeft.style.transform = `translate3d(${shiftX.toFixed(1)}px, 0, 0)`;
      wordLeft.style.opacity = String(titleOpacity.toFixed(3));
    }
    if (wordRight) {
      const shiftX = wordFade * 48;
      wordRight.style.transform = `translate3d(${shiftX.toFixed(1)}px, 0, 0)`;
      wordRight.style.opacity = String(titleOpacity.toFixed(3));
    }

    if (pieceBarEl) {
      const barAlpha = smoothRange(p, 0.19, 0.25);
      const barY = (1 - barAlpha) * 12;
      pieceBarEl.style.opacity = barAlpha.toFixed(3);
      pieceBarEl.style.transform = `translate3d(0, ${barY.toFixed(1)}px, 0)`;
      pieceBarEl.style.pointerEvents = barAlpha > 0.45 ? 'auto' : 'none';
      pieceBarEl.classList.toggle('is-hidden-at-rest', barAlpha <= 0.02);
    }

    onPastHeroChange?.(p >= 0.21);
  }

  let isVisible = true;
  let scrollTriggerInstance = null;
  let introTl = null;
  const startClock = performance.now();

  function onTick() {
    if (!isVisible || IS_SCREENSHOT_MODE) return;
    const elapsed = (performance.now() - startClock) * 0.001;
    pointer.currentX += (pointer.targetX - pointer.currentX) * 0.10;
    pointer.currentY += (pointer.targetY - pointer.currentY) * 0.10;
    pointer.currentHover += (pointer.targetHover - pointer.currentHover) * 0.055;

    sparkStage.setState({
      time: prefersReducedMotion() ? 1.4 : elapsed,
      cursorX: pointer.currentX,
      cursorY: pointer.currentY,
      cursorHover: prefersReducedMotion() ? 0 : pointer.currentHover,
    });
    sparkStage.renderOnce();
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
      });
    },
    { threshold: 0.01 }
  );
  if (sectionEl) io.observe(sectionEl);

  if (sectionEl && pinEl && !prefersReducedMotion()) {
    scrollTriggerInstance = ScrollTrigger.create({
      trigger: sectionEl,
      pin: pinEl,
      start: 'top top',
      end: '+=320%',
      scrub: IS_SCREENSHOT_MODE ? false : 0.42,
      snap: IS_SCREENSHOT_MODE
        ? undefined
        : {
            snapTo: [0, 0.29, 0.61, 0.93],
            duration: { min: 0.42, max: 0.78 },
            delay: 0.18,
            ease: 'power2.inOut',
            directional: false,
          },
      invalidateOnRefresh: true,
      onLeave: () => onPastHeroChange?.(true),
      onEnterBack: (self) => onPastHeroChange?.(self.progress >= 0.21),
      onUpdate: (self) => {
        applyScrubProgress(self.progress);
        if (!IS_SCREENSHOT_MODE) {
          sparkStage.renderOnce();
        }
      },
    });
  } else if (sectionEl) {
    if (pieceBarEl) {
      pieceBarEl.style.opacity = '0';
      pieceBarEl.style.pointerEvents = 'none';
    }
    scrollTriggerInstance = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'bottom top+=80',
      onEnter: () => onPastHeroChange?.(true),
      onLeaveBack: () => onPastHeroChange?.(false),
    });
  }

  function runEntrance() {
    refreshTitleMask();

    if (pieceBarEl) {
      pieceBarEl.style.opacity = '0';
      pieceBarEl.style.transform = 'translate3d(0, 12px, 0)';
      pieceBarEl.style.pointerEvents = 'none';
    }

    if (IS_SCREENSHOT_MODE || prefersReducedMotion()) {
      sparkStage.setState({
        time: 1.4,
        entryScale: 1.0,
        entryRotDeg: 0.0,
        flipY: 0.0,
        apertureProgress: 0.0,
        photoSequenceProgress: 0.0,
        titleOpacity: 1.0,
        titleShiftNorm: 0.0,
      });
      return;
    }

    const animProxy = {
      scale: 1.0,
      rot: -14.0,
      titleOpacity: 0.0,
      titleShift: 0.025,
    };
    sparkStage.setState({
      entryScale: 1.0,
      entryRotDeg: -14.0,
      titleOpacity: 0.0,
      titleShiftNorm: 0.025,
    });

    introTl = gsap.timeline({
      onUpdate: () => {
        if (currentProgress > 0.01) return;
        sparkStage.setState({
          entryScale: animProxy.scale,
          entryRotDeg: animProxy.rot,
          titleOpacity: animProxy.titleOpacity,
          titleShiftNorm: animProxy.titleShift,
        });
      },
    });

    introTl
      .to(animProxy, {
        scale: 0.92,
        rot: -14.0,
        duration: 0.05,
        ease: 'power2.in',
      })
      .to(animProxy, {
        scale: 1.0,
        rot: 0.0,
        duration: 0.42,
        ease: 'expo.out',
      })
      .to(
        animProxy,
        {
          titleOpacity: 1.0,
          titleShift: 0.0,
          duration: 0.65,
          ease: 'expo.out',
        },
        0.05
      );

    gsap.ticker.add(onTick);
  }

  const onResize = () => {
    sparkStage.resize();
    refreshTitleMask();
    sparkStage.renderOnce();
  };
  window.addEventListener('resize', onResize, { passive: true });
  ScrollTrigger.addEventListener('refresh', onResize);

  let pinResizeObserver = null;
  if (typeof ResizeObserver === 'function' && pinEl) {
    let lastObsW = 0;
    let lastObsH = 0;
    pinResizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w > 0 && h > 0 && (w !== lastObsW || h !== lastObsH)) {
        lastObsW = w;
        lastObsH = h;
        onResize();
      }
    });
    pinResizeObserver.observe(pinEl);
  }

  return {
    ready: () => sparkStage.ready(),
    start() {
      sparkStage.resize();
      runEntrance();
      applyScrubProgress(0);
      sparkStage.renderOnce();
    },
    setDeterministicHero(timeSec = 1.4, scrub = 0.0) {
      sparkStage.resize();
      refreshTitleMask();
      sparkStage.setState({
        time: timeSec,
        entryScale: 1.0,
        entryRotDeg: 0.0,
        cursorX: 0.62,
        cursorY: 0.42,
        cursorHover: 0.35,
      });
      applyScrubProgress(scrub);
      sparkStage.renderOnce();
    },
    getScrollTrigger: () => scrollTriggerInstance,
    destroy() {
      gsap.ticker.remove(onTick);
      introTl?.kill();
      scrollTriggerInstance?.kill();
      io.disconnect();
      pinResizeObserver?.disconnect();
      cleanupBar();
      window.removeEventListener('resize', onResize);
      ScrollTrigger.removeEventListener('refresh', onResize);
      document.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      if (canvasEl) {
        canvasEl.removeEventListener('click', onCanvasClick);
      }
      if (pinEl) {
        pinEl.removeEventListener('pointermove', onPointerMove);
        pinEl.removeEventListener('pointerleave', onPointerLeave);
      }
      sparkStage.destroy();
    },
  };
}
