/**
 * Gemini Supply - WebGL2 Optical Shader Utilities
 * Shared GLSL primitives, fullscreen gl_VertexID triangle VAO,
 * async image decoding, mipmapped CLAMP_TO_EDGE texture creation,
 * and cover-fit UV math with Canvas2D fallback helpers.
 */

export const FULLSCREEN_VERT_GLSL = `#version 300 es
precision highp float;

out vec2 vUv;

void main() {
  // 3-vertex fullscreen triangle driven solely by gl_VertexID (zero VBO overhead)
  float x = float((gl_VertexID & 1) << 2) - 1.0;
  float y = float((gl_VertexID & 2) << 1) - 1.0;
  vUv = vec2((x + 1.0) * 0.5, (y + 1.0) * 0.5);
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

export const GLSL_OPTICAL_COMMON = `
// Strict Gemini Brand Palette (obsidian, cobalt, sky cyan, ice, pure white)
const vec3 COL_VOID      = vec3(0.0314, 0.0314, 0.0392); // #08080A
const vec3 COL_CORE_BLUE = vec3(0.1216, 0.2039, 1.0000); // #1F34FF
const vec3 COL_MID_BLUE  = vec3(0.1922, 0.5255, 1.0000); // #3186FF
const vec3 COL_SKY_BLUE  = vec3(0.3098, 0.6275, 1.0000); // #4FA0FF
const vec3 COL_CYAN_ICE  = vec3(0.5882, 0.8157, 1.0000); // #96D0FF
const vec3 COL_ICE       = vec3(0.8235, 0.8902, 0.9882); // #D2E3FC
const vec3 COL_WHITE     = vec3(1.0000, 1.0000, 1.0000); // #FFFFFF

// Concave 4-point Gemini Spark SDF (power = 0.64 for hero, 0.65 for micro-sparks)
float sdGeminiSpark(vec2 p, float radius, float power) {
  if (radius <= 1e-4) {
    return length(p);
  }
  vec2 q = abs(p) / max(radius, 1e-4);
  return (pow(max(q.x, 1e-5), power) + pow(max(q.y, 1e-5), power) - 1.0) * radius;
}

// Cover-fit UV transform expecting top-down screen UV (0,0 at top-left, 1,1 at bottom-right)
// paired with UNPACK_FLIP_Y_WEBGL = false so row 0 of HTMLImageElement stays at top (uv.y = 0).
vec2 computeCoverUV(vec2 topDownUv, float texAspect, float canvasAspect) {
  float safeTex = max(texAspect, 1e-4);
  float safeCanvas = max(canvasAspect, 1e-4);
  vec2 scale = (safeCanvas > safeTex)
    ? vec2(1.0, safeTex / safeCanvas)
    : vec2(safeCanvas / safeTex, 1.0);
  return (topDownUv - 0.5) * scale + 0.5;
}
`;

function formatShaderLog(source, rawLog) {
  const lines = source.split('\n');
  const numbered = lines
    .map((line, idx) => `${String(idx + 1).padStart(3, ' ')} | ${line}`)
    .join('\n');
  return `${rawLog || 'Unknown GLSL compile error'}\n--- Shader Source ---\n${numbered}`;
}

export function createWebGL2Context(canvasEl, { isScreenshotMode = false, alpha = false } = {}) {
  if (!canvasEl || typeof canvasEl.getContext !== 'function') {
    return null;
  }
  try {
    return canvasEl.getContext('webgl2', {
      alpha,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: Boolean(isScreenshotMode),
      powerPreference: 'high-performance',
    });
  } catch (_err) {
    return null;
  }
}

export function compileShader(gl, type, source, label = 'shader') {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error(`[glUtils] Unable to allocate WebGLShader (${label})`);
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`[glUtils] Failed compiling ${label}:\n${formatShaderLog(source, info)}`);
  }
  return shader;
}

export function createProgram(gl, vertSource, fragSource, label = 'program') {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSource, `${label}:vert`);
  let frag = null;
  try {
    frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSource, `${label}:frag`);
  } catch (err) {
    gl.deleteShader(vert);
    throw err;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    throw new Error(`[glUtils] Unable to allocate WebGLProgram (${label})`);
  }

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  gl.detachShader(program, vert);
  gl.detachShader(program, frag);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`[glUtils] Failed linking ${label}: ${info || 'Unknown link error'}`);
  }

  return program;
}

export function getUniformLocations(gl, program, uniformNames = []) {
  const map = Object.create(null);
  for (const name of uniformNames) {
    map[name] = gl.getUniformLocation(program, name);
  }
  return map;
}

/**
 * WebGL2 core profile requires a bound VAO for gl.drawArrays even when using gl_VertexID
 * with zero vertex buffer bindings.
 */
export function createFullscreenVAO(gl) {
  const vao = gl.createVertexArray();
  if (!vao) {
    throw new Error('[glUtils] Failed to create empty fullscreen VAO');
  }
  return vao;
}

export function drawFullscreenTriangle(gl, vao) {
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

export function createSolidTexture(gl, rgba = [8, 8, 10, 255]) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const pixel = new Uint8Array([
    rgba[0] ?? 8,
    rgba[1] ?? 8,
    rgba[2] ?? 10,
    rgba[3] ?? 255,
  ]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

const b64ScriptInflight = new Map();

function loadSandboxedTextureDataUri(url) {
  const cleanPath = String(url).split('?')[0].split('#')[0];
  const fileName = cleanPath.split('/').pop();
  if (!fileName) {
    return Promise.resolve(null);
  }
  const store = window.__GEMINI_TEX_B64__;
  if (store && typeof store[fileName] === 'string') {
    return Promise.resolve(store[fileName]);
  }
  if (b64ScriptInflight.has(fileName)) {
    return b64ScriptInflight.get(fileName);
  }

  const p = new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `./assets/photos-js/${fileName}.js`;
    script.onload = () => {
      script.remove();
      const loaded = window.__GEMINI_TEX_B64__ && window.__GEMINI_TEX_B64__[fileName];
      resolve(typeof loaded === 'string' ? loaded : null);
    };
    script.onerror = () => {
      script.remove();
      resolve(null);
    };
    document.head.appendChild(script);
  }).finally(() => {
    b64ScriptInflight.delete(fileName);
  });

  b64ScriptInflight.set(fileName, p);
  return p;
}

export async function loadImageDecoded(url) {
  if (!url) {
    throw new Error('[glUtils] loadImageDecoded received an empty URL');
  }

  let resolvedSrc = url;
  const isNullOrigin =
    typeof window !== 'undefined' &&
    (window.origin === 'null' || window.location.protocol === 'file:');

  if (isNullOrigin && !String(url).startsWith('data:')) {
    const dataUri = await loadSandboxedTextureDataUri(url);
    if (dataUri) {
      resolvedSrc = dataUri;
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    if (!String(resolvedSrc).startsWith('data:') && !isNullOrigin) {
      img.crossOrigin = 'anonymous';
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(img);
    };
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(`[glUtils] Failed loading image: ${url}`));
    };

    const decodeOrFinish = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(finish)
          .catch(() => {
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              finish();
            } else {
              fail(new Error(`[glUtils] Failed decoding image: ${url}`));
            }
          });
      } else {
        finish();
      }
    };

    img.onload = decodeOrFinish;
    img.onerror = () => fail(new Error(`[glUtils] Network or decode error for image: ${url}`));
    img.src = resolvedSrc;

    if (img.complete && img.naturalWidth > 0) {
      decodeOrFinish();
    }
  });
}

export function createTextureFromImage(gl, img, { mipmaps = true } = {}) {
  const tex = gl.createTexture();
  const width = img.naturalWidth || img.width || 1;
  const height = img.naturalHeight || img.height || 1;

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  if (mipmaps && width > 1 && height > 1) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  gl.bindTexture(gl.TEXTURE_2D, null);
  return {
    texture: tex,
    width,
    height,
    aspect: width / Math.max(height, 1),
    img,
  };
}

export async function loadTexture2D(gl, url, options = {}) {
  const img = await loadImageDecoded(url);
  const entry = createTextureFromImage(gl, img, options);
  return { ...entry, url };
}

export function computeCoverUVUniforms(texWidth, texHeight, canvasWidth, canvasHeight) {
  const texAspect = Math.max(texWidth, 1) / Math.max(texHeight, 1);
  const canvasAspect = Math.max(canvasWidth, 1) / Math.max(canvasHeight, 1);
  const scaleX = canvasAspect > texAspect ? 1.0 : canvasAspect / texAspect;
  const scaleY = canvasAspect > texAspect ? texAspect / canvasAspect : 1.0;
  return { texAspect, canvasAspect, scaleX, scaleY };
}

export function resizeCanvasToDisplaySize(canvasEl, maxDpr = 2) {
  if (!canvasEl) {
    return { width: 1, height: 1, cssWidth: 1, cssHeight: 1, dpr: 1, aspect: 1, resized: false };
  }
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const dpr = Math.min(Math.max(rawDpr, 1), maxDpr);

  const rect = typeof canvasEl.getBoundingClientRect === 'function'
    ? canvasEl.getBoundingClientRect()
    : null;
  const cssWidth = Math.max(
    1,
    Math.round(
      canvasEl.clientWidth ||
      (rect && rect.width) ||
      (typeof window !== 'undefined' ? window.innerWidth : 1) ||
      1
    )
  );
  const cssHeight = Math.max(
    1,
    Math.round(
      canvasEl.clientHeight ||
      (rect && rect.height) ||
      (typeof window !== 'undefined' ? window.innerHeight : 1) ||
      1
    )
  );

  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));
  const resized = canvasEl.width !== width || canvasEl.height !== height;
  if (resized) {
    canvasEl.width = width;
    canvasEl.height = height;
  }

  return {
    width,
    height,
    cssWidth,
    cssHeight,
    dpr,
    aspect: width / height,
    resized,
  };
}

export function drawImageCover2D(ctx, img, destW, destH) {
  if (!ctx || !img) return;
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const { scaleX, scaleY } = computeCoverUVUniforms(iw, ih, destW, destH);
  const sw = iw * scaleX;
  const sh = ih * scaleY;
  const sx = (iw - sw) * 0.5;
  const sy = (ih - sh) * 0.5;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destW, destH);
}
