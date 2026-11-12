/**
 * Gemini Supply - Convex Liquid-Lens + Micro-Spark Halftone Wipe Viewer
 * Powers Act II Cobalt Jukebox and Act V Full-Viewport Product Stage.
 *
 * Optical transition (~420ms expo.out):
 * - 1:1 crisp cover-fitted sampling at rest (uProg <= 0.0005 or uProg >= 0.9995)
 *   with UNPACK_FLIP_Y_WEBGL = false and top-down screen UV vec2(vUv.x, 1.0 - vUv.y)
 * - Radial convex barrel warp + 5-tap directional optical blur along vec2(0.7, 0.3)
 * - Diagonal micro-spark halftone wavefront (miniature 4-point sdGeminiSpark lattice)
 *   with #96D0FF / #FFFFFF optical specular glint along the active wave crest
 */

import gsap from 'gsap';
import {
  FULLSCREEN_VERT_GLSL,
  GLSL_OPTICAL_COMMON,
  createWebGL2Context,
  createProgram,
  getUniformLocations,
  createFullscreenVAO,
  drawFullscreenTriangle,
  createSolidTexture,
  loadImageDecoded,
  createTextureFromImage,
  resizeCanvasToDisplaySize,
  drawImageCover2D,
} from './glUtils.js';

const LIQUID_LENS_FRAG_GLSL = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uAspectA;
uniform float uAspectB;
uniform float uCanvasAspect;
uniform float uProg;
uniform float uDpr;
uniform float uHasTex;
uniform vec3 uBgColor;

${GLSL_OPTICAL_COMMON}

vec3 sampleDirectional5Tap(
  sampler2D tex,
  vec2 baseTopDownUv,
  float texAspect,
  float canvasAspect,
  vec2 blurStep
) {
  vec2 uv0 = computeCoverUV(baseTopDownUv - blurStep * 2.0, texAspect, canvasAspect);
  vec2 uv1 = computeCoverUV(baseTopDownUv - blurStep * 1.0, texAspect, canvasAspect);
  vec2 uv2 = computeCoverUV(baseTopDownUv,                  texAspect, canvasAspect);
  vec2 uv3 = computeCoverUV(baseTopDownUv + blurStep * 1.0, texAspect, canvasAspect);
  vec2 uv4 = computeCoverUV(baseTopDownUv + blurStep * 2.0, texAspect, canvasAspect);
  return texture(tex, uv0).rgb * 0.10
       + texture(tex, uv1).rgb * 0.22
       + texture(tex, uv2).rgb * 0.36
       + texture(tex, uv3).rgb * 0.22
       + texture(tex, uv4).rgb * 0.10;
}

void main() {
  if (uHasTex < 0.5) {
    outColor = vec4(uBgColor, 1.0);
    return;
  }

  // Top-down screen UV: (0, 0) at top-left, (1, 1) at bottom-right.
  // Paired with UNPACK_FLIP_Y_WEBGL = false so row 0 of image renders at top of canvas.
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);

  // Rest states: 1:1 tack-sharp sampling with zero distortion or blur
  if (uProg <= 0.0005) {
    vec2 coverA = computeCoverUV(uv, uAspectA, uCanvasAspect);
    outColor = vec4(texture(uTexA, coverA).rgb, 1.0);
    return;
  }

  if (uProg >= 0.9995) {
    vec2 coverB = computeCoverUV(uv, uAspectB, uCanvasAspect);
    outColor = vec4(texture(uTexB, coverB).rgb, 1.0);
    return;
  }

  // Active Convex Liquid-Lens + Micro-Spark Halftone Wipe (0 < uProg < 1)
  float envelope = sin(uProg * 3.14159265);
  vec2 delta = uv - 0.5;
  vec2 warpedUv = 0.5 + delta * (1.0 - 0.22 * envelope * exp(-dot(delta, delta) * 3.5));

  vec2 blurStep = vec2(0.7, 0.3) * (0.014 * envelope);
  vec3 colA = sampleDirectional5Tap(uTexA, warpedUv, uAspectA, uCanvasAspect, blurStep);
  vec3 colB = sampleDirectional5Tap(uTexB, warpedUv, uAspectB, uCanvasAspect, blurStep);

  // Diagonal micro-spark halftone wavefront sweeping top-left -> bottom-right
  float diag = uv.x * 0.7 + uv.y * 0.3;
  float front = mix(-0.25, 1.25, uProg);
  float baseMix = smoothstep(front + 0.22, front - 0.22, diag);

  // Miniature 4-point concave Spark lattice (radius >= 1.50 covers full [-0.5, 0.5]^2 cell)
  vec2 cellUV = fract(gl_FragCoord.xy / (13.5 * uDpr)) - 0.5;
  float sparkRadius = 1.56 * pow(max(baseMix, 0.0), 0.78);
  float sdMicro = sdGeminiSpark(cellUV, sparkRadius, 0.65);

  float halftoneMask;
  if (baseMix <= 0.001) {
    halftoneMask = 0.0;
  } else if (baseMix >= 0.999) {
    halftoneMask = 1.0;
  } else {
    halftoneMask = smoothstep(0.065, -0.065, sdMicro);
  }

  float mixWeight = mix(baseMix, halftoneMask, 0.88 * envelope);
  vec3 col = mix(colA, colB, mixWeight);

  // Optical #96D0FF -> #FFFFFF specular glint right along active micro-spark perimeter
  float waveActivity = 4.0 * baseMix * (1.0 - baseMix) * envelope;
  float edgeGlint = exp(-abs(sdMicro) / 0.085) * waveActivity;
  vec3 glintTint = mix(COL_CYAN_ICE, COL_WHITE, clamp(edgeGlint * 1.15, 0.0, 1.0));
  float glintAmount = clamp(edgeGlint * 0.45 + waveActivity * 0.075, 0.0, 0.58);
  col = mix(col, glintTint, glintAmount);

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const UNIFORM_NAMES = [
  'uTexA',
  'uTexB',
  'uAspectA',
  'uAspectB',
  'uCanvasAspect',
  'uProg',
  'uDpr',
  'uHasTex',
  'uBgColor',
];

function toCssRgb(bgColor) {
  const r = Math.round(Math.min(Math.max(bgColor[0] ?? 0.0314, 0), 1) * 255);
  const g = Math.round(Math.min(Math.max(bgColor[1] ?? 0.0314, 0), 1) * 255);
  const b = Math.round(Math.min(Math.max(bgColor[2] ?? 0.0392, 0), 1) * 255);
  return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
}

export function createLiquidLensViewer(canvasEl, options = {}) {
  const {
    urls = [],
    initialUrl = null,
    isScreenshotMode = false,
    reducedMotion = false,
    bgColor = [0.0314, 0.0314, 0.0392],
  } = options;

  const maxDpr = isScreenshotMode ? 1.5 : 2;
  const bg = toCssRgb(bgColor);

  let destroyed = false;
  let isReady = false;
  let currentUrl = initialUrl || '';
  let opToken = 0;
  let activeTween = null;
  let activeTweenResolve = null;

  const tweenState = { prog: 0 };
  let entryA = null;
  let entryB = null;

  const textureCache = new Map();
  const inflightMap = new Map();

  let metrics = resizeCanvasToDisplaySize(canvasEl, maxDpr);

  const gl = createWebGL2Context(canvasEl, { isScreenshotMode, alpha: false });
  const ctx2d = !gl && canvasEl ? canvasEl.getContext('2d') : null;

  let program = null;
  let vao = null;
  let uniforms = null;
  let fallbackTex = null;

  if (gl) {
    program = createProgram(gl, FULLSCREEN_VERT_GLSL, LIQUID_LENS_FRAG_GLSL, 'LiquidLensProgram');
    vao = createFullscreenVAO(gl);
    uniforms = getUniformLocations(gl, program, UNIFORM_NAMES);
    fallbackTex = createSolidTexture(gl, [bg.r, bg.g, bg.b, 255]);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  function killActiveTween() {
    if (activeTween) {
      activeTween.kill();
      activeTween = null;
    }
    if (activeTweenResolve) {
      const resolvePrev = activeTweenResolve;
      activeTweenResolve = null;
      resolvePrev();
    }
  }

  function ensureTexture(url) {
    if (!url || destroyed) {
      return Promise.resolve(null);
    }
    if (textureCache.has(url)) {
      return Promise.resolve(textureCache.get(url));
    }
    if (inflightMap.has(url)) {
      return inflightMap.get(url);
    }

    const promise = (async () => {
      try {
        const img = await loadImageDecoded(url);
        if (destroyed) return null;

        let entry;
        if (gl) {
          entry = {
            ...createTextureFromImage(gl, img, { mipmaps: true }),
            url,
          };
        } else {
          const w = img.naturalWidth || img.width || 1;
          const h = img.naturalHeight || img.height || 1;
          entry = {
            texture: null,
            width: w,
            height: h,
            aspect: w / Math.max(h, 1),
            img,
            url,
          };
        }

        textureCache.set(url, entry);
        return entry;
      } catch (err) {
        console.warn(`[liquidLensCanvas] Failed loading texture (${url}):`, err);
        return null;
      } finally {
        inflightMap.delete(url);
      }
    })();

    inflightMap.set(url, promise);
    return promise;
  }

  async function preload(urlList = []) {
    const normalized = Array.isArray(urlList) ? urlList : [urlList];
    const uniqueUrls = [...new Set(normalized.filter(Boolean))];
    if (!uniqueUrls.length || destroyed) return;
    await Promise.all(uniqueUrls.map((u) => ensureTexture(u)));
  }

  // Initial preload coalesces initialUrl + urls.
  // Zero gl.drawArrays calls occur before readyPromise resolves in ?screenshot=1 mode.
  const initialBatch = [
    ...(initialUrl ? [initialUrl] : []),
    ...(Array.isArray(urls) ? urls : []),
  ];

  const readyPromise = (async () => {
    await preload(initialBatch);
    if (destroyed) return;

    if (initialUrl && !entryA && textureCache.has(initialUrl)) {
      const initialEntry = textureCache.get(initialUrl);
      entryA = initialEntry;
      entryB = initialEntry;
      tweenState.prog = 0;
      if (!currentUrl) currentUrl = initialUrl;
    }

    isReady = true;

    if (!isScreenshotMode && entryA) {
      renderOnce();
    }
  })();

  function renderCanvas2DFallback() {
    if (!ctx2d || !canvasEl) return;
    const w = metrics.width;
    const h = metrics.height;

    ctx2d.save();
    ctx2d.fillStyle = bg.css;
    ctx2d.fillRect(0, 0, w, h);

    if (entryA && entryA.img && tweenState.prog < 0.9995) {
      ctx2d.globalAlpha = 1;
      drawImageCover2D(ctx2d, entryA.img, w, h);
    }
    if (entryB && entryB.img && tweenState.prog > 0.0005) {
      ctx2d.globalAlpha = Math.min(Math.max(tweenState.prog, 0), 1);
      drawImageCover2D(ctx2d, entryB.img, w, h);
    }

    ctx2d.restore();
  }

  function resize() {
    if (destroyed) return metrics;
    metrics = resizeCanvasToDisplaySize(canvasEl, maxDpr);
    return metrics;
  }

  function renderOnce() {
    if (destroyed) return;
    if (isScreenshotMode && !isReady) return;

    metrics = resizeCanvasToDisplaySize(canvasEl, maxDpr);

    if (!gl) {
      renderCanvas2DFallback();
      return;
    }

    const { width, height, dpr, aspect } = metrics;
    const hasTex = Boolean(entryA || entryB);
    const activeA = entryA || entryB;
    const activeB = entryB || entryA;

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, activeA ? activeA.texture : fallbackTex);
    gl.uniform1i(uniforms.uTexA, 0);
    gl.uniform1f(uniforms.uAspectA, activeA ? activeA.aspect : aspect);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, activeB ? activeB.texture : fallbackTex);
    gl.uniform1i(uniforms.uTexB, 1);
    gl.uniform1f(uniforms.uAspectB, activeB ? activeB.aspect : aspect);

    gl.uniform1f(uniforms.uCanvasAspect, aspect);
    gl.uniform1f(uniforms.uProg, tweenState.prog);
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.uniform1f(uniforms.uHasTex, hasTex ? 1.0 : 0.0);
    gl.uniform3f(
      uniforms.uBgColor,
      bgColor[0] ?? 0.0314,
      bgColor[1] ?? 0.0314,
      bgColor[2] ?? 0.0392
    );

    drawFullscreenTriangle(gl, vao);
  }

  async function setImmediate(url) {
    if (!url || destroyed) return;
    const token = ++opToken;
    killActiveTween();
    currentUrl = url;

    const entry = await ensureTexture(url);
    if (isScreenshotMode && !isReady) {
      await readyPromise;
    }
    if (destroyed || token !== opToken || !entry) return;

    entryA = entry;
    entryB = entry;
    tweenState.prog = 0;
    renderOnce();
  }

  async function transitionTo(url, durationSec = 0.42) {
    if (!url || destroyed) return;

    if (
      url === currentUrl ||
      isScreenshotMode ||
      reducedMotion ||
      durationSec <= 0 ||
      !entryA
    ) {
      await setImmediate(url);
      return;
    }

    const token = ++opToken;

    // If interrupting an in-flight transition past midpoint, promote incoming texture seamlessly
    if (activeTween && tweenState.prog > 0.5 && entryB) {
      entryA = entryB;
    }
    killActiveTween();
    currentUrl = url;

    const nextEntry = await ensureTexture(url);
    if (destroyed || token !== opToken || !nextEntry) return;

    if (!entryA) {
      entryA = nextEntry;
      entryB = nextEntry;
      tweenState.prog = 0;
      renderOnce();
      return;
    }

    entryB = nextEntry;
    tweenState.prog = 0;
    renderOnce();

    await new Promise((resolve) => {
      activeTweenResolve = resolve;
      activeTween = gsap.to(tweenState, {
        prog: 1,
        duration: durationSec,
        ease: 'expo.out',
        onUpdate: () => {
          if (!destroyed && token === opToken) {
            renderOnce();
          }
        },
        onComplete: () => {
          activeTween = null;
          activeTweenResolve = null;
          if (!destroyed && token === opToken) {
            entryA = nextEntry;
            entryB = nextEntry;
            tweenState.prog = 0;
            renderOnce();
          }
          resolve();
        },
      });
    });
  }

  function getCurrentUrl() {
    return currentUrl;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    opToken++;
    killActiveTween();

    if (gl) {
      for (const entry of textureCache.values()) {
        if (entry && entry.texture) {
          gl.deleteTexture(entry.texture);
        }
      }
      if (fallbackTex) {
        gl.deleteTexture(fallbackTex);
        fallbackTex = null;
      }
      if (vao) {
        gl.deleteVertexArray(vao);
        vao = null;
      }
      if (program) {
        gl.deleteProgram(program);
        program = null;
      }
    }

    textureCache.clear();
    inflightMap.clear();
    entryA = null;
    entryB = null;
  }

  return {
    ready: () => readyPromise,
    preload,
    resize,
    setImmediate,
    transitionTo,
    getCurrentUrl,
    renderOnce,
    destroy,
  };
}
