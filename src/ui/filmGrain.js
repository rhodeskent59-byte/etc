/**
 * Procedural 128x128 Monochrome Film-Grain Tile Generator
 * Applied once to fixed pointer-events: none #gs-film-grain.
 * Zero per-frame SVG feTurbulence repaint cost on CPU/mobile.
 */

export function initFilmGrain() {
  const el = document.getElementById('gs-film-grain');
  if (!el) return;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = ctx.createImageData(size, size);
  const data = img.data;
  // Deterministic PRNG so ?screenshot=1 captures identical grain across runs
  let seed = 0x5f3759df;
  for (let i = 0; i < data.length; i += 4) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const v = (seed >>> 24) & 0xff;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  el.style.backgroundImage = `url(${canvas.toDataURL('image/png')})`;
}
