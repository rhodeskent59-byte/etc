/**
 * Gemini Supply - Main Application Orchestrator & Deterministic ?screenshot=1 Harness
 */

import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import {
  IS_SCREENSHOT_MODE,
  SCREENSHOT_SECTION,
  SCREENSHOT_PRODUCT,
  prefersReducedMotion,
  openProductStage,
  subscribeDrawer,
  subscribeStage,
} from './state/store.js';

import { createSparkHeroCanvas } from './webgl/sparkHeroCanvas.js';
import { createLiquidLensViewer } from './webgl/liquidLensCanvas.js';
import { createOdometer } from './ui/odometer.js';
import { initFilmGrain } from './ui/filmGrain.js';
import { initHud } from './ui/hud.js';
import { initProductStage } from './ui/productStage.js';
import { initBagDrawer } from './ui/bagDrawer.js';

import { initAct1Hero } from './acts/act1Hero.js';
import { initApparelShowcases } from './acts/apparelShowcases.js';
import { initObjectShowcases } from './acts/objectShowcases.js';
import { initAct4Spread } from './acts/act4Spread.js';
import { initMonochromeSparkInterlude } from './acts/monochromeSparkInterlude.js';
import { initAct5Lineup } from './acts/act5Lineup.js';
import { mountHouseObdHud } from './obd/mountObd.tsx';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

function getDocumentTop(el) {
  if (!el) return 0;
  return el.getBoundingClientRect().top + window.scrollY;
}

async function waitForDecodedImages(root = document, timeoutMs = 3000) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      img.removeAttribute('loading');
      img.loading = 'eager';

      const loadJob = (async () => {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          });
        }
        if (typeof img.decode === 'function') {
          try {
            await img.decode();
          } catch {
            // Ignore decode errors
          }
        }
      })();

      const timeoutJob = new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
      return Promise.race([loadJob, timeoutJob]);
    })
  );
}

async function boot() {
  mountHouseObdHud();
  initFilmGrain();

  let lenis = null;
  if (!IS_SCREENSHOT_MODE && !prefersReducedMotion()) {
    lenis = new Lenis({
      lerp: 0.11,
      smoothWheel: true,
      syncTouch: false,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToY(y) {
    if (lenis) {
      lenis.scrollTo(y, { duration: 0.9 });
    } else {
      window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function scrollToTop() {
    scrollToY(0);
  }

  const hud = initHud({
    createOdometer,
    onScrollToTop: scrollToTop,
  });

  const stageRoot = document.getElementById('product-stage-root');
  const productStage = initProductStage(stageRoot, {
    createLiquidLensViewer,
  });

  const drawerRoot = document.getElementById('bag-drawer-root');
  initBagDrawer(drawerRoot, {
    onExploreCatalog: () => {
      const act5 = document.getElementById('act-5');
      if (act5) scrollToY(getDocumentTop(act5));
    },
  });

  let isStageOpen = false;
  let isDrawerOpen = false;
  function syncScrollLock() {
    const locked = isStageOpen || isDrawerOpen;
    document.body.classList.toggle('is-scroll-locked', locked);
    if (lenis) {
      if (locked) lenis.stop();
      else lenis.start();
    }
  }
  subscribeStage((st) => {
    isStageOpen = st.open;
    syncScrollLock();
  });
  subscribeDrawer((dr) => {
    isDrawerOpen = dr.open;
    syncScrollLock();
  });

  const act1 = initAct1Hero({
    createSparkHeroCanvas,
    onPastHeroChange: (pastHero) => hud.setPastHero(pastHero),
  });

  const apparel = initApparelShowcases();
  const objects = initObjectShowcases();

  const act4 = initAct4Spread({
    createOdometer,
  });

  const monoSpark = initMonochromeSparkInterlude();

  const act5 = initAct5Lineup({
    onScrollToTop: scrollToTop,
  });

  await document.fonts.ready;
  await Promise.allSettled([
    document.fonts.load('400 16px "Google Sans"'),
    document.fonts.load('500 120px "Google Sans"'),
    document.fonts.load('700 24px "Google Sans"'),
    document.fonts.load('400 12px "Google Sans Mono"'),
  ]);

  ScrollTrigger.refresh();

  if (!IS_SCREENSHOT_MODE) {
    await act1.ready();
    act1.start();
    ScrollTrigger.refresh();

    // Keep ScrollTrigger pin spacers and Lenis bounds in sync when iframe/sidebar containers resize
    if (typeof ResizeObserver === 'function') {
      let lastRootW = Math.round(document.documentElement.clientWidth);
      let refreshDebounce = 0;
      const rootRo = new ResizeObserver(() => {
        const nextW = Math.round(document.documentElement.clientWidth);
        if (nextW > 0 && nextW !== lastRootW) {
          lastRootW = nextW;
          window.clearTimeout(refreshDebounce);
          refreshDebounce = window.setTimeout(() => {
            lenis?.resize();
            ScrollTrigger.refresh();
          }, 120);
        }
      });
      rootRo.observe(document.documentElement);
    }
    return;
  }

  // =========================================================================
  // Deterministic ?screenshot=1 Harness across all 8 Product Sections & Gates
  // =========================================================================

  const params = new URLSearchParams(window.location.search);
  const customScrub = params.has('scrub') ? parseFloat(params.get('scrub')) : null;

  async function jumpToPinnedOrStatic(el, st, progress) {
    if (st) {
      const targetScroll = st.start + (st.end - st.start) * progress;
      window.scrollTo(0, targetScroll);
      ScrollTrigger.update();
    } else if (el) {
      window.scrollTo(0, getDocumentTop(el));
      ScrollTrigger.update();
    }
    if (el) await waitForDecodedImages(el, 2500);
  }

  if (SCREENSHOT_PRODUCT) {
    openProductStage(SCREENSHOT_PRODUCT, null, true);
    await productStage.ready();
    const stageRootEl = document.getElementById('product-stage-root');
    if (stageRootEl) await waitForDecodedImages(stageRootEl, 2500);
  } else if (
    SCREENSHOT_SECTION === 'sweatshirt' ||
    SCREENSHOT_SECTION === 'black-tee' ||
    SCREENSHOT_SECTION === 'socks' ||
    SCREENSHOT_SECTION === 'gate-apparel'
  ) {
    const scrubVal = customScrub !== null && Number.isFinite(customScrub) ? customScrub : 0.08;
    const el = apparel.getSectionElement(SCREENSHOT_SECTION);
    const st = apparel.getScrollTrigger(SCREENSHOT_SECTION);
    await jumpToPinnedOrStatic(el, st, scrubVal);
    apparel.setDeterministic(SCREENSHOT_SECTION, scrubVal);
    hud.setPastHero(true);
  } else if (
    SCREENSHOT_SECTION === 'tote' ||
    SCREENSHOT_SECTION === 'bottle' ||
    SCREENSHOT_SECTION === 'pin' ||
    SCREENSHOT_SECTION === 'stickers' ||
    SCREENSHOT_SECTION === 'gate-objects'
  ) {
    const scrubVal = customScrub !== null && Number.isFinite(customScrub) ? customScrub : 0.12;
    const el = objects.getSectionElement(SCREENSHOT_SECTION);
    const st = objects.getScrollTrigger(SCREENSHOT_SECTION);
    await jumpToPinnedOrStatic(el, st, scrubVal);
    objects.setDeterministic(SCREENSHOT_SECTION, scrubVal);
    hud.setPastHero(true);
  } else if (SCREENSHOT_SECTION === '4' || SCREENSHOT_SECTION === 'set') {
    document.body.classList.remove('is-cobalt-polarity');
    const sec4 = act4.getSectionElement();
    if (sec4) {
      window.scrollTo(0, getDocumentTop(sec4));
      ScrollTrigger.update();
      await waitForDecodedImages(sec4, 2500);
    }
    hud.setPastHero(true);
  } else if (SCREENSHOT_SECTION === 'mono-spark') {
    document.body.classList.remove('is-cobalt-polarity');
    const scrubVal = customScrub !== null && Number.isFinite(customScrub) ? customScrub : 0.55;
    const el = monoSpark.getSectionElement();
    const sec5 = act5.getSectionElement();
    if (el) {
      window.scrollTo(0, Math.max(0, getDocumentTop(el) - 24));
      ScrollTrigger.update();
    }
    monoSpark.setDeterministic(scrubVal);
    if (sec5) await waitForDecodedImages(sec5, 2500);
    hud.setPastHero(true);
  } else if (SCREENSHOT_SECTION === '5' || SCREENSHOT_SECTION === 'catalog') {
    document.body.classList.remove('is-cobalt-polarity');
    const sec5 = act5.getSectionElement();
    if (sec5) {
      window.scrollTo(0, getDocumentTop(sec5));
      ScrollTrigger.update();
      await waitForDecodedImages(sec5, 2500);
    }
    hud.setPastHero(true);
  } else if (SCREENSHOT_SECTION === 'footer') {
    document.body.classList.remove('is-cobalt-polarity');
    const footerEl = document.getElementById('gs-footer');
    if (footerEl) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      ScrollTrigger.update();
    }
    hud.setPastHero(true);
  } else {
    await act1.ready();
    const scrubVal = customScrub !== null && Number.isFinite(customScrub) ? customScrub : 0.0;
    const st1 = act1.getScrollTrigger();
    if (st1 && scrubVal > 0) {
      window.scrollTo(0, st1.start + (st1.end - st1.start) * scrubVal);
      ScrollTrigger.update();
    }
    act1.setDeterministicHero(1.4, scrubVal);
    hud.setPastHero(scrubVal >= 0.24);
  }

  gsap.ticker.sleep();

  await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  document.body.id = 'screenshot-ready';
}

boot();
