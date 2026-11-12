/**
 * Gemini Supply - Reactive Application Store
 * Manages Bag items, Bag Drawer visibility, Full-Viewport Product Stage,
 * and deterministic ?screenshot=1 / prefers-reduced-motion flags.
 */

import {
  PRODUCTS_BY_ID,
  ACT4_SPREAD_ITEMS,
  ACT4_SET_RAW_TOTAL_CENTS,
  ACT4_SET_TOTAL_CENTS,
} from '../data/catalog.js';

const searchParams = new URLSearchParams(window.location.search);

export const IS_SCREENSHOT_MODE = searchParams.get('screenshot') === '1';
export const SCREENSHOT_SECTION = searchParams.get('section') || searchParams.get('act');
export const SCREENSHOT_PRODUCT = searchParams.get('product'); // '01' .. '08' | null

export const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

const STORAGE_KEY = 'gemini_supply_bag_v1';

function loadInitialBag() {
  if (IS_SCREENSHOT_MODE) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        PRODUCTS_BY_ID[item.productId] &&
        typeof item.size === 'string' &&
        Number.isInteger(item.qty) &&
        item.qty > 0
    );
  } catch {
    return [];
  }
}

let bagItems = loadInitialBag();
let drawerOpen = false;
let stageState = {
  open: false,
  productId: null,
  initialShotStem: null,
  instant: false,
};

const bagListeners = new Set();
const drawerListeners = new Set();
const stageListeners = new Set();

function persistBag() {
  if (IS_SCREENSHOT_MODE) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bagItems));
  } catch {
    // Ignore storage quota errors
  }
}

function notifyBag() {
  persistBag();
  const snapshot = getBagSnapshot();
  bagListeners.forEach((fn) => fn(snapshot));
}

export function formatGbpPence(pence) {
  const pounds = (pence / 100).toFixed(2);
  return `GBP £${pounds}`;
}

export function getBagSnapshot() {
  const detailed = bagItems.map((entry) => {
    const product = PRODUCTS_BY_ID[entry.productId];
    return {
      ...entry,
      product,
      lineTotalCents: product.priceCents * entry.qty,
      lineTotalFormatted: formatGbpPence(product.priceCents * entry.qty),
    };
  });
  const count = detailed.reduce((acc, item) => acc + item.qty, 0);
  const rawSubtotalCents = detailed.reduce((acc, item) => acc + item.lineTotalCents, 0);
  const setProductIds = ACT4_SPREAD_ITEMS.map((item) => item.productId);
  const completeSets =
    setProductIds.length > 0
      ? Math.min(
          ...setProductIds.map((pid) =>
            bagItems
              .filter((entry) => entry.productId === pid)
              .reduce((sum, entry) => sum + entry.qty, 0)
          )
        )
      : 0;
  const perSetDiscount = Math.max(0, ACT4_SET_RAW_TOTAL_CENTS - ACT4_SET_TOTAL_CENTS);
  const subtotalCents = Math.max(0, rawSubtotalCents - completeSets * perSetDiscount);
  return {
    items: detailed,
    count,
    countPadded: String(count).padStart(2, '0'),
    subtotalCents,
    subtotalFormatted: formatGbpPence(subtotalCents),
  };
}

export function addItemToBag(productId, size = null, qty = 1) {
  const product = PRODUCTS_BY_ID[productId];
  if (!product) return;
  const resolvedSize = size || product.defaultSize || product.sizes[0];
  const uid = `${productId}__${resolvedSize}`;
  const existing = bagItems.find((i) => i.uid === uid);
  if (existing) {
    existing.qty += qty;
  } else {
    bagItems = [...bagItems, { uid, productId, size: resolvedSize, qty }];
  }
  notifyBag();
}

export function addEditionSetToBag() {
  ACT4_SPREAD_ITEMS.forEach((entry) => {
    const product = PRODUCTS_BY_ID[entry.productId];
    if (!product) return;
    const resolvedSize = product.defaultSize || product.sizes[0];
    const uid = `${product.id}__${resolvedSize}`;
    const existing = bagItems.find((i) => i.uid === uid);
    if (existing) {
      existing.qty += 1;
    } else {
      bagItems.push({ uid, productId: product.id, size: resolvedSize, qty: 1 });
    }
  });
  bagItems = [...bagItems];
  notifyBag();
}

export function updateBagItemQty(uid, delta) {
  bagItems = bagItems
    .map((item) => (item.uid === uid ? { ...item, qty: item.qty + delta } : item))
    .filter((item) => item.qty > 0);
  notifyBag();
}

export function removeBagItem(uid) {
  bagItems = bagItems.filter((item) => item.uid !== uid);
  notifyBag();
}

export function subscribeBag(fn) {
  bagListeners.add(fn);
  fn(getBagSnapshot());
  return () => bagListeners.delete(fn);
}

export function openBagDrawer(instant = false) {
  if (stageState.open) {
    closeProductStage(true);
  }
  drawerOpen = true;
  drawerListeners.forEach((fn) => fn({ open: true, instant }));
}

export function closeBagDrawer(instant = false) {
  if (!drawerOpen) return;
  drawerOpen = false;
  drawerListeners.forEach((fn) => fn({ open: false, instant }));
}

export function toggleBagDrawer(instant = false) {
  if (drawerOpen) {
    closeBagDrawer(instant);
  } else {
    openBagDrawer(instant);
  }
}

export function isBagDrawerOpen() {
  return drawerOpen;
}

export function subscribeDrawer(fn) {
  drawerListeners.add(fn);
  return () => drawerListeners.delete(fn);
}

export function openProductStage(productId, initialShotStem = null, instant = false) {
  if (!PRODUCTS_BY_ID[productId]) return;
  if (drawerOpen) {
    closeBagDrawer(true);
  }
  stageState = {
    open: true,
    productId,
    initialShotStem,
    instant: instant || IS_SCREENSHOT_MODE || prefersReducedMotion(),
  };
  stageListeners.forEach((fn) => fn({ ...stageState }));
}

export function closeProductStage(instant = false) {
  if (!stageState.open) return;
  stageState = {
    open: false,
    productId: stageState.productId,
    initialShotStem: null,
    instant: instant || IS_SCREENSHOT_MODE || prefersReducedMotion(),
  };
  stageListeners.forEach((fn) => fn({ ...stageState }));
}

export function getStageState() {
  return { ...stageState };
}

export function subscribeStage(fn) {
  stageListeners.add(fn);
  return () => stageListeners.delete(fn);
}
