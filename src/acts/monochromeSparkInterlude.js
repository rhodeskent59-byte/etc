/**
 * Monochrome Black & White Gemini Spark Threshold (#act-mono-spark)
 * Unpinned sculptural threshold placed immediately above All Pieces (#act-5)
 * on the shared #08080A Obsidian surface so All Pieces and its first row of photographs
 * remain clearly visible directly underneath.
 *
 * 100% procedural math (|x|^0.64 + |y|^0.64 = r^0.64), strictly #08080A and #FFFFFF:
 * - Confident mid-scale emblem (~196px-216px tall on desktop, outer radius ~98px-108px)
 * - Whisper-thin 1px horizontal horizon hairlines aligned to the outer catalog margins
 * - 48 fine monochrome stipple particles converging onto the Spark contour on scroll
 * - 4 counter-rotating crisp #FFFFFF wireframe concave Gemini Sparks settling into 0-deg alignment
 *   around a solid #FFFFFF Spark core with #08080A negative-space pinpoint
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { IS_SCREENSHOT_MODE, prefersReducedMotion } from '../state/store.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smoothRange(x, a, b) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  const t = (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}

function traceSparkPath(ctx, cx, cy, rx, ry, rotRad = 0, power = 0.64, segments = 80) {
  const exp = 2 / power;
  const cRot = Math.cos(rotRad);
  const sRot = Math.sin(rotRad);
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const lx = Math.sign(c) * Math.pow(Math.abs(c), exp) * rx;
    const ly = Math.sign(s) * Math.pow(Math.abs(s), exp) * ry;
    const x = cx + lx * cRot - ly * sRot;
    const y = cy + lx * sRot + ly * cRot;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function initMonochromeSparkInterlude() {
  const sectionEl = document.getElementById('act-mono-spark');
  const canvasEl = document.getElementById('mono-spark-canvas');

  if (!sectionEl || !canvasEl) {
    return {
      getSectionElement: () => null,
      getScrollTrigger: () => null,
      setDeterministic: () => {},
      destroy: () => {},
    };
  }

  let currentProgress = 0.55;
  let isVisible = false;
  let st = null;
  const startClock = performance.now();

  // Deterministic 48 monochrome stipple particles on golden-angle polar seeds
  const stipples = Array.from({ length: 48 }, (_, i) => {
    const theta = (i / 48) * Math.PI * 2 + (i % 3) * 0.12;
    const radialSpread = 1.18 + ((i * 0.6180339) % 1) * 1.05;
    const phase = i * 0.79;
    return { theta, radialSpread, phase };
  });

  function renderFrame(progress, timeSec) {
    const rect = canvasEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, IS_SCREENSHOT_MODE ? 1.5 : 2);
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
    const cx = w * 0.5;
    const cy = h * 0.52;

    const p = clamp01(progress);
    const settle = smoothRange(p, 0.08, 0.62);
    const wingDraw = smoothRange(p, 0.05, 0.54);
    const breath = prefersReducedMotion() ? 0 : Math.sin(timeSec * 1.15) * 0.032;

    // 1. Seamless #08080A Obsidian canvas matching All Pieces directly below
    ctx.fillStyle = '#08080A';
    ctx.fillRect(0, 0, w, h);

    // Sculptural mid-scale outer Spark radius (~102px on 1440x900 desktop -> ~204px tall emblem, ~68px on mobile)
    const maxAllowedByHeight = h * 0.345;
    const desiredByWidth = Math.min(106, Math.max(66, w * 0.072));
    const baseR = Math.min(desiredByWidth, maxAllowedByHeight) * (1 + breath * 0.5);

    // 2. Whisper-thin 1px horizontal horizon hairline wings with center breathing gap
    const padX = Math.min(36, Math.max(16, w * 0.025));
    const innerX = baseR + 42;
    const maxWingLen = Math.max(0, cx - padX - innerX);
    const curWingLen = maxWingLen * wingDraw;
    if (curWingLen > 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - innerX, Math.round(cy) + 0.5);
      ctx.lineTo(cx - innerX - curWingLen, Math.round(cy) + 0.5);
      ctx.moveTo(cx + innerX, Math.round(cy) + 0.5);
      ctx.lineTo(cx + innerX + curWingLen, Math.round(cy) + 0.5);
      ctx.stroke();

      // Crisp 3.4px inner terminal spark ticks flanking the centerpiece
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.46 * wingDraw).toFixed(3)})`;
      traceSparkPath(ctx, cx - innerX + 10, cy, 3.4, 3.4, 0, 0.64, 24);
      ctx.fill();
      traceSparkPath(ctx, cx + innerX - 10, cy, 3.4, 3.4, 0, 0.64, 24);
      ctx.fill();
    }

    // 3. Converging Monochrome Micro-Stipple Constellation (fine #FFFFFF dots)
    const exp = 2 / 0.64;
    stipples.forEach((stDot, idx) => {
      const driftAngle =
        stDot.theta +
        (1 - settle) * (idx % 2 === 0 ? 0.58 : -0.58) +
        (prefersReducedMotion() ? 0 : timeSec * 0.08 * (idx % 2 === 0 ? 1 : -1));
      const c = Math.cos(driftAngle);
      const s = Math.sin(driftAngle);

      const sparkTargetR = baseR * (idx % 3 === 0 ? 1.15 : 0.88);
      const sparkX = Math.sign(c) * Math.pow(Math.abs(c), exp) * sparkTargetR;
      const sparkY = Math.sign(s) * Math.pow(Math.abs(s), exp) * sparkTargetR;

      const cloudR = baseR * stDot.radialSpread * 1.28;
      const cloudX = c * cloudR * 1.32;
      const cloudY = s * cloudR * 0.74;

      const dx = cloudX + (sparkX - cloudX) * settle;
      const dy = cloudY + (sparkY - cloudY) * settle;
      const dotAlpha = 0.20 + 0.42 * settle * (0.5 + 0.5 * Math.sin(timeSec * 1.4 + stDot.phase));

      ctx.fillStyle = `rgba(255, 255, 255, ${dotAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, idx % 4 === 0 ? 1.65 : 1.15, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Four Counter-Rotating Crisp #FFFFFF Wireframe Concave Sparks
    const wireRings = [
      { scale: 1.0, startDeg: 38, alpha: 0.30, width: 1.0, idleMult: 1.0 },
      { scale: 0.73, startDeg: -32, alpha: 0.50, width: 1.1, idleMult: -1.15 },
      { scale: 0.49, startDeg: 26, alpha: 0.72, width: 1.2, idleMult: 1.3 },
      { scale: 0.29, startDeg: -18, alpha: 0.90, width: 1.25, idleMult: -1.45 },
    ];

    wireRings.forEach((ring) => {
      const r = baseR * ring.scale;
      const unwoundRad = ((ring.startDeg * Math.PI) / 180) * (1 - settle);
      const subtleIdleRot = prefersReducedMotion()
        ? 0
        : Math.sin(timeSec * 0.65 * ring.idleMult) * 0.045;
      traceSparkPath(ctx, cx, cy, r, r, unwoundRad + subtleIdleRot, 0.64, 80);
      ctx.strokeStyle = `rgba(255, 255, 255, ${ring.alpha.toFixed(3)})`;
      ctx.lineWidth = ring.width;
      ctx.stroke();
    });

    // 5. Four Cardinal Cusp Satellite Sparks (Top / Right / Bottom / Left)
    const cuspDist = baseR + 14;
    const cuspR = 3.6 * (0.45 + 0.55 * settle);
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.72 * (0.35 + 0.65 * settle)).toFixed(3)})`;
    [
      [cx, cy - cuspDist],
      [cx + cuspDist, cy],
      [cx, cy + cuspDist],
      [cx - cuspDist, cy],
    ].forEach(([sx, sy]) => {
      traceSparkPath(ctx, sx, sy, cuspR, cuspR, 0, 0.64, 24);
      ctx.fill();
    });

    // 6. Crisp Solid #FFFFFF Gemini Spark Core + #08080A Negative-Space Pinpoint
    const coreR = Math.max(10.5, baseR * 0.145);
    traceSparkPath(ctx, cx, cy, coreR, coreR, 0, 0.64, 48);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    traceSparkPath(ctx, cx, cy, coreR * 0.36, coreR * 0.36, 0, 0.64, 32);
    ctx.fillStyle = '#08080A';
    ctx.fill();
  }

  function onTick() {
    if (!isVisible || IS_SCREENSHOT_MODE || prefersReducedMotion()) return;
    const elapsed = (performance.now() - startClock) * 0.001;
    renderFrame(currentProgress, elapsed);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          const elapsed = IS_SCREENSHOT_MODE ? 1.6 : (performance.now() - startClock) * 0.001;
          renderFrame(currentProgress, elapsed);
        }
      });
    },
    { threshold: 0.01 }
  );
  io.observe(sectionEl);

  if (!prefersReducedMotion()) {
    st = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top 95%',
      end: 'bottom 10%',
      scrub: IS_SCREENSHOT_MODE ? false : 0.35,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        currentProgress = self.progress;
        const elapsed = IS_SCREENSHOT_MODE ? 1.6 : (performance.now() - startClock) * 0.001;
        renderFrame(currentProgress, elapsed);
      },
    });
    if (!IS_SCREENSHOT_MODE) {
      gsap.ticker.add(onTick);
    }
  } else {
    renderFrame(0.65, 0);
  }

  const onResize = () => {
    const elapsed = IS_SCREENSHOT_MODE ? 1.6 : (performance.now() - startClock) * 0.001;
    renderFrame(currentProgress, elapsed);
  };
  window.addEventListener('resize', onResize, { passive: true });

  renderFrame(0.55, 1.6);

  return {
    getSectionElement: () => sectionEl,
    getScrollTrigger: () => st,
    setDeterministic(scrub = 0.55) {
      currentProgress = scrub;
      renderFrame(scrub, 1.6);
    },
    destroy() {
      gsap.ticker.remove(onTick);
      st?.kill();
      io.disconnect();
      window.removeEventListener('resize', onResize);
    },
  };
}
