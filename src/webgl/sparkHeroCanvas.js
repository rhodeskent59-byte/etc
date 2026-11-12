/**
 * Gemini Supply - Act I Procedural Gemini Spark & Center-Locked Match-Cut Hero Canvas
 * 100% procedural WebGL2 GLSL optical shader with graceful Canvas2D fallback.
 *
 * Optical layers:
 * 1. Pointer-deflected & gravity-warped cobalt dot lattice (4% to 7% over #08080A)
 * 2. Concave 4-point Gemini Spark SDF (power = 0.64) + 3D beveled Y-axis prism flip
 *    + cut-sapphire axial star-ridge normals + Fresnel ramp + contour-ridge modulation
 * 3. Flow-warped 13px micro-spark halftone boundary plume (miniature 4-point sparks, never circles)
 * 4. Exponential center-locked aperture match-cut into 4-frame Sweatshirt sequence
 *    (01_a -> 01_b -> 01_c -> 01_d) with convex liquid-lens + micro-spark halftone transitions
 * 5. Live brand-pure optical exclusion / sapphire refraction where corner-split Google Sans
 *    <h1> ('Gemini' / 'Supply') intersects the 3D Spark & Micro-Spark Plume (zero RGB orange invert)
 */

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

const SPARK_HERO_FRAG_GLSL = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uDpr;
uniform float uTime;
uniform float uEntryScale;
uniform float uEntryRotRad;
uniform float uFlipY;
uniform float uAperture;
uniform float uPhotoMix;
uniform float uHasPhotos;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uAspectA;
uniform float uAspectB;
uniform vec2 uFocalA;
uniform vec2 uFocalB;
uniform float uCanvasAspect;

uniform sampler2D uTitleTex;
uniform float uHasTitle;
uniform float uTitleOpacity;
uniform float uTitleShiftNorm;

uniform vec2 uCursorFrag;
uniform float uCursorAngle;
uniform float uCursorHover;

${GLSL_OPTICAL_COMMON}

vec2 computeFocalCoverUV(vec2 topDownUv, float texAspect, float canvasAspect, vec2 focal) {
  float safeTex = max(texAspect, 1e-4);
  float safeCanvas = max(canvasAspect, 1e-4);
  vec2 scale = (safeCanvas > safeTex)
    ? vec2(1.0, safeTex / safeCanvas)
    : vec2(safeCanvas / safeTex, 1.0);
  vec2 minCenter = scale * 0.5;
  vec2 maxCenter = vec2(1.0) - scale * 0.5;
  vec2 clampedFocal = clamp(focal, minCenter, maxCenter);
  return (topDownUv - 0.5) * scale + clampedFocal;
}

vec3 sampleDirectional5Tap(
  sampler2D tex,
  vec2 baseTopDownUv,
  float texAspect,
  float canvasAspect,
  vec2 focal,
  vec2 blurStep
) {
  vec2 uv0 = computeFocalCoverUV(baseTopDownUv - blurStep * 2.0, texAspect, canvasAspect, focal);
  vec2 uv1 = computeFocalCoverUV(baseTopDownUv - blurStep * 1.0, texAspect, canvasAspect, focal);
  vec2 uv2 = computeFocalCoverUV(baseTopDownUv,                  texAspect, canvasAspect, focal);
  vec2 uv3 = computeFocalCoverUV(baseTopDownUv + blurStep * 1.0, texAspect, canvasAspect, focal);
  vec2 uv4 = computeFocalCoverUV(baseTopDownUv + blurStep * 2.0, texAspect, canvasAspect, focal);
  return texture(tex, uv0).rgb * 0.10
       + texture(tex, uv1).rgb * 0.22
       + texture(tex, uv2).rgb * 0.36
       + texture(tex, uv3).rgb * 0.22
       + texture(tex, uv4).rgb * 0.10;
}

vec3 evaluatePhotoSequence(vec2 topDownUv) {
  float lensZoom = 1.0 - 0.055 * (1.0 - smoothstep(0.04, 0.78, uAperture));
  vec2 settledUv = (topDownUv - 0.5) * lensZoom + 0.5;

  vec3 photoCol;
  if (uPhotoMix <= 0.0005) {
    photoCol = texture(uTexA, computeFocalCoverUV(settledUv, uAspectA, uCanvasAspect, uFocalA)).rgb;
  } else if (uPhotoMix >= 0.9995) {
    photoCol = texture(uTexB, computeFocalCoverUV(settledUv, uAspectB, uCanvasAspect, uFocalB)).rgb;
  } else {
    float envelope = sin(uPhotoMix * 3.14159265);
    vec2 delta = settledUv - 0.5;
    vec2 warpedUv = 0.5 + delta * (1.0 - 0.11 * envelope * exp(-dot(delta, delta) * 3.5));
    vec2 blurStep = vec2(0.7, 0.3) * (0.0045 * envelope);

    vec3 colA = sampleDirectional5Tap(uTexA, warpedUv, uAspectA, uCanvasAspect, uFocalA, blurStep);
    vec3 colB = sampleDirectional5Tap(uTexB, warpedUv, uAspectB, uCanvasAspect, uFocalB, blurStep);

    float diag = settledUv.x * 0.72 + settledUv.y * 0.28;
    float front = mix(-0.32, 1.32, uPhotoMix);
    float baseMix = smoothstep(front + 0.30, front - 0.30, diag);

    // Crisp 17px lattice of miniature 4-point concave Gemini Spark dots across the wave
    vec2 waveCell = fract(gl_FragCoord.xy / (17.0 * uDpr)) - 0.5;
    float cellRadius = 1.62 * pow(max(baseMix, 0.0), 0.74);
    float sdCell = sdGeminiSpark(waveCell, cellRadius, 0.64);
    float microMask = (baseMix <= 0.001)
      ? 0.0
      : (baseMix >= 0.999 ? 1.0 : smoothstep(0.055, -0.055, sdCell));
    float finalMix = mix(baseMix, microMask, 0.92 * envelope);

    // Highlight discrete miniature Gemini Spark dots along the active transition ribbon
    float waveCrest = 4.0 * baseMix * (1.0 - baseMix) * envelope;
    float dotSparkBody = smoothstep(0.06, -0.04, sdGeminiSpark(waveCell, 0.38 * waveCrest, 0.64));
    float sparkRimGlint = exp(-abs(sdCell) / 0.085) * waveCrest;
    vec3 glintCol = mix(COL_CYAN_ICE, COL_WHITE, clamp(sparkRimGlint + dotSparkBody * 0.5, 0.0, 1.0));

    photoCol = mix(colA, colB, finalMix);
    photoCol = mix(
      photoCol,
      glintCol,
      clamp(dotSparkBody * 0.58 * envelope + sparkRimGlint * 0.38 + waveCrest * 0.06, 0.0, 0.68)
    );
  }

  float bottomVignette = smoothstep(0.66, 1.0, topDownUv.y) * 0.18;
  photoCol = mix(photoCol, COL_VOID, bottomVignette);
  return photoCol;
}

void main() {
  vec2 topDownUv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 centerPx = 0.5 * uResolution;
  vec2 centered = gl_FragCoord.xy - centerPx;
  float minDim = min(uResolution.x, uResolution.y);
  float hypotDim = length(uResolution);

  // Monumental resting Spark scale (0.355 * minDim) so corner-split Gemini / Supply slice across its tips
  float baseRadius = minDim * 0.355;
  float maxRadius = hypotDim * 1.85;
  float sparkRadius = baseRadius * pow(max(maxRadius / max(baseRadius, 1.0), 1.0), uAperture) * max(uEntryScale, 0.05);

  // -------------------------------------------------------------------------
  // 1. Pointer-Deflected & Spark-Warped Cobalt Dot Lattice (4% - 7% intensity)
  // -------------------------------------------------------------------------
  vec2 fromCursor = gl_FragCoord.xy - uCursorFrag;
  float cursorDist = length(fromCursor);
  float cursorRange = 235.0 * uDpr;
  vec2 cursorDir = fromCursor / max(cursorDist, 1e-3);
  float cursorPush = uCursorHover * exp(-(cursorDist * cursorDist) / max(cursorRange * cursorRange * 0.45, 1.0));

  float centerDist = length(centered);
  vec2 centerDir = centered / max(centerDist, 1e-3);
  float wellNorm = centerDist / max(baseRadius * 1.42, 1.0);
  float wellActive = 1.0 - smoothstep(0.06, 0.62, uAperture);
  float gravityPull = wellNorm * exp(-wellNorm * wellNorm * 0.85) * wellActive;

  float gridSpacing = 24.0 * uDpr;
  vec2 warpedGridPx = centered
    - cursorDir * (cursorPush * 14.0 * uDpr)
    + centerDir * (gravityPull * 11.5 * uDpr);
  vec2 gridCell = fract(warpedGridPx / gridSpacing + 0.5) - 0.5;
  float dotDist = length(gridCell) * gridSpacing;
  float dotRadius = (1.15 + 0.45 * cursorPush + 0.35 * gravityPull) * uDpr;
  float dotMask = smoothstep(dotRadius + 0.85 * uDpr, max(dotRadius - 0.65 * uDpr, 0.0), dotDist);

  float radialVignette = 1.0 - 0.30 * smoothstep(0.28, 1.05, centerDist / max(hypotDim * 0.5, 1.0));
  float dotActivity = clamp(cursorPush * 0.78 + gravityPull * 0.65, 0.0, 1.0);
  float latticeFade = 1.0 - smoothstep(0.18, 0.82, uAperture);
  float dotIntensity = mix(0.046, 0.070, dotActivity) * radialVignette * latticeFade;
  vec3 dotTint = mix(COL_CORE_BLUE, COL_MID_BLUE, dotActivity);
  vec3 col = COL_VOID + dotTint * (dotMask * dotIntensity);

  // -------------------------------------------------------------------------
  // 2. Concave 4-Point Gemini Spark SDF & 3D Beveled Y-Axis Prism Flip
  // -------------------------------------------------------------------------
  float cRot = cos(-uEntryRotRad);
  float sRot = sin(-uEntryRotRad);
  vec2 rawP = mat2(cRot, -sRot, sRot, cRot) * centered;

  float apertureSettle = smoothstep(0.76, 0.98, uAperture);
  float cosFlipRaw = cos(uFlipY);
  float sinFlipRaw = sin(uFlipY);
  float cosFlip = mix(max(abs(cosFlipRaw), 0.035), 1.0, apertureSettle);
  float sinFlipAbs = abs(sinFlipRaw) * (1.0 - apertureSettle);

  float bevelThickness = clamp(baseRadius * 0.092, 9.0 * uDpr, 26.0 * uDpr);
  float flipSign = (cosFlipRaw >= 0.0) ? 1.0 : -1.0;
  float frontOffset = sinFlipRaw * bevelThickness * 0.46 * flipSign * (1.0 - apertureSettle);

  vec2 frontScreenP = vec2(rawP.x - frontOffset, rawP.y);
  vec2 p = vec2(frontScreenP.x / cosFlip, frontScreenP.y);
  float d = sdGeminiSpark(p, sparkRadius, 0.64);

  float rxFront = sparkRadius * cosFlip;
  float ryFront = sparkRadius;
  vec2 qFront = abs(p) / max(sparkRadius, 1e-4);
  vec2 gradFrontScreen = vec2(
    (0.64 * pow(max(qFront.x, 0.16), -0.36)) / cosFlip,
    0.64 * pow(max(qFront.y, 0.16), -0.36)
  );
  float dFrontPx = d / max(length(gradFrontScreen), 0.65);
  if (d > 0.0) {
    float topBottomCone = (abs(frontScreenP.y) > ryFront)
      ? length(vec2(frontScreenP.x, abs(frontScreenP.y) - ryFront))
      : 0.0;
    float leftRightCone = (abs(frontScreenP.x) > rxFront)
      ? length(vec2(abs(frontScreenP.x) - rxFront, frontScreenP.y))
      : 0.0;
    dFrontPx = max(dFrontPx, max(topBottomCone, leftRightCone));
  }

  vec2 backScreenP = vec2(rawP.x + frontOffset, rawP.y);
  vec2 pBack = vec2(backScreenP.x / cosFlip, backScreenP.y);
  float dBack = sdGeminiSpark(pBack, sparkRadius, 0.64);
  vec2 qBack = abs(pBack) / max(sparkRadius, 1e-4);
  vec2 gradBackScreen = vec2(
    (0.64 * pow(max(qBack.x, 0.16), -0.36)) / cosFlip,
    0.64 * pow(max(qBack.y, 0.16), -0.36)
  );
  float dBackPx = 1e5;
  if (sinFlipAbs > 1e-3) {
    dBackPx = dBack / max(length(gradBackScreen), 0.65);
    if (dBack > 0.0) {
      float tbBack = (abs(backScreenP.y) > ryFront)
        ? length(vec2(backScreenP.x, abs(backScreenP.y) - ryFront))
        : 0.0;
      float lrBack = (abs(backScreenP.x) > rxFront)
        ? length(vec2(abs(backScreenP.x) - rxFront, backScreenP.y))
        : 0.0;
      dBackPx = max(dBackPx, max(tbBack, lrBack));
    }
  }

  float yEnv = abs(rawP.y) / max(sparkRadius, 1e-4);
  float tipTaper = pow(clamp(1.0 - yEnv, 0.0, 1.0), 0.58);
  float slabHalfWidth = bevelThickness * sinFlipAbs * tipTaper;
  float dSlabPx = 1e5;
  if (sinFlipAbs > 1e-3) {
    float slabVert = abs(rawP.y) - sparkRadius;
    float slabHoriz = abs(rawP.x) - slabHalfWidth;
    dSlabPx = (slabVert > 0.0)
      ? length(vec2(max(slabHoriz, 0.0), slabVert))
      : max(slabHoriz, slabVert);
  }

  float dBevelUnionPx = min(dSlabPx, dBackPx);
  float dPrismPx = min(dFrontPx, dBevelUnionPx);

  float slabNormX = clamp(rawP.x / max(slabHalfWidth, 1.0), -1.0, 1.0);
  float bevelRidge = exp(-pow(slabNormX * 1.65 - 0.18 * flipSign, 2.0));
  float bevelSheen = 0.5 + 0.5 * cos(yEnv * 4.8 - uFlipY * 2.2);
  vec3 bevelCol = mix(COL_MID_BLUE, COL_SKY_BLUE, bevelSheen * 0.75);
  bevelCol = mix(bevelCol, COL_CYAN_ICE, clamp(0.30 + 0.58 * bevelRidge, 0.0, 1.0));
  bevelCol = mix(bevelCol, COL_WHITE, pow(clamp(bevelRidge, 0.0, 1.0), 1.45) * (0.68 + 0.32 * sinFlipAbs));

  float depth01 = clamp(-dFrontPx / max(baseRadius * 0.48, 1.0), 0.0, 1.0);
  vec2 axisSmooth = clamp(abs(p) / (2.2 * uDpr), 0.0, 1.0);
  vec2 sdfGrad2D = sign(p) * axisSmooth * 0.64 * pow(qFront + vec2(0.014), vec2(-0.36));
  vec2 gradDir = sdfGrad2D / max(length(sdfGrad2D), 1e-4);

  vec3 nLocal = normalize(vec3(
    gradDir * (1.0 - 0.52 * depth01),
    0.30 + 0.90 * pow(max(depth01, 1e-4), 0.54)
  ));
  vec3 normal = normalize(vec3(
    nLocal.x * cosFlipRaw + nLocal.z * sinFlipRaw * 0.62,
    nLocal.y,
    max(-nLocal.x * sinFlipRaw * 0.62 + nLocal.z * abs(cosFlipRaw), 0.06)
  ));

  float ridgeWidth = (2.2 + 2.8 * (1.0 - depth01)) * uDpr;
  float ridgeX = exp(-abs(p.x) * cosFlip / ridgeWidth) * smoothstep(1.0, 0.06, qFront.y);
  float ridgeY = exp(-abs(p.y) / ridgeWidth) * smoothstep(1.0, 0.06, qFront.x);
  float starCrease = clamp(max(ridgeX, ridgeY), 0.0, 1.0);

  vec3 keyLight = normalize(vec3(
    -0.36 + 0.44 * uCursorHover * cos(uCursorAngle),
     0.48 + 0.44 * uCursorHover * sin(uCursorAngle),
     0.80
  ));
  vec3 counterRim = normalize(vec3(0.54, -0.42, 0.72));
  float ndotl = clamp(dot(normal, keyLight), 0.0, 1.0);
  float ndotRim = clamp(dot(normal, counterRim), 0.0, 1.0);
  float fresnel = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.35);
  vec3 halfVec = normalize(keyLight + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(normal, halfVec), 0.0, 1.0), 30.0);

  float dPhysical = d * (baseRadius / max(sparkRadius, 1.0));
  float contourMod = sin(dPhysical * (42.0 / max(baseRadius, 1.0)) - uTime * 2.0) * 0.06;

  float prismTone = clamp(0.16 + 0.52 * ndotl + 0.22 * ndotRim + 0.56 * fresnel + contourMod, 0.0, 1.0);
  vec3 frontPrismCol = mix(COL_CORE_BLUE, COL_MID_BLUE, smoothstep(0.04, 0.40, prismTone));
  frontPrismCol = mix(frontPrismCol, COL_SKY_BLUE, smoothstep(0.34, 0.70, prismTone));
  frontPrismCol = mix(frontPrismCol, COL_CYAN_ICE, smoothstep(0.64, 0.90, prismTone + fresnel * 0.26));
  frontPrismCol = mix(frontPrismCol, COL_ICE, clamp(fresnel * 0.62 + starCrease * 0.44, 0.0, 1.0));
  frontPrismCol = mix(
    frontPrismCol,
    COL_WHITE,
    clamp(spec * 0.80 + starCrease * 0.30 + pow(fresnel, 3.0) * 0.45, 0.0, 1.0)
  );

  float frontFaceMask = smoothstep(1.1 * uDpr, -1.1 * uDpr, dFrontPx);
  float edgeOnBlend = smoothstep(0.26, 0.05, abs(cosFlipRaw)) * (1.0 - apertureSettle);
  vec3 proceduralSparkCol = mix(bevelCol, frontPrismCol, frontFaceMask * (1.0 - edgeOnBlend * 0.82));

  // -------------------------------------------------------------------------
  // 4. Center-Locked Exponential Match-Cut -> 4-Frame Sweatshirt Scrub
  // -------------------------------------------------------------------------
  vec3 interiorCol = proceduralSparkCol;
  float photoReveal = 0.0;
  if (uHasPhotos > 0.5 && uAperture > 0.035) {
    photoReveal = smoothstep(0.04, 0.55, uAperture);
    vec3 photoCol = evaluatePhotoSequence(topDownUv);
    interiorCol = mix(proceduralSparkCol, photoCol, photoReveal);

    float apertureRim = exp(-abs(dPrismPx) / (6.0 * uDpr))
      * photoReveal
      * (1.0 - smoothstep(0.76, 0.98, uAperture));
    interiorCol = mix(interiorCol, COL_CYAN_ICE, clamp(apertureRim * 0.55, 0.0, 0.65));
  }

  float solidSparkAlpha = smoothstep(1.15 * uDpr, -1.15 * uDpr, dPrismPx);
  col = mix(col, interiorCol, solidSparkAlpha);

  // -------------------------------------------------------------------------
  // 3. Flow-Warped Micro-Spark Halftone Boundary Plume (~13px * uDpr lattice)
  // -------------------------------------------------------------------------
  float plumeStrength = 0.0;
  float plumeFade = 1.0 - smoothstep(0.84, 0.99, uAperture);
  if (plumeFade > 0.001) {
    vec2 flow = vec2(
      sin(vUv.y * 5.5 + uTime * 0.9),
      cos(vUv.x * 5.5 - uTime * 0.7)
    ) * 6.0 * uDpr;
    vec2 cellUV = fract((gl_FragCoord.xy + flow) / (13.0 * uDpr)) - 0.5;

    float featherOut = 48.0 * uDpr;
    float featherIn = 26.0 * uDpr;
    float edgeAlpha = smoothstep(featherOut, -featherIn, dPrismPx);
    // Blend 2D unit vectors instead of unbounded angles so leaving the viewport never spins or flickers
    vec2 orbitVec = vec2(cos(uTime * 0.75), sin(uTime * 0.75));
    vec2 cursorVec = vec2(cos(uCursorAngle), sin(uCursorAngle));
    vec2 lobeVec = mix(orbitVec, cursorVec, uCursorHover * 0.85);
    vec2 pDir = p / max(length(p), 1e-3);
    float lobe = smoothstep(-0.25, 0.85, dot(pDir, lobeVec));
    float band = clamp(4.0 * edgeAlpha * (1.0 - edgeAlpha) * (0.28 + 0.72 * lobe), 0.0, 1.0);
    float microSpark = smoothstep(0.07, -0.07, sdGeminiSpark(cellUV, 0.46 * band, 0.65)) * smoothstep(0.02, 0.09, band);

    vec3 plumeCol = mix(COL_SKY_BLUE, COL_CYAN_ICE, smoothstep(0.18, 0.65, band));
    plumeCol = mix(plumeCol, COL_WHITE, smoothstep(0.65, 0.95, band));

    float outsideWeight = 1.0 - solidSparkAlpha;
    col += COL_MID_BLUE * (band * band * 0.14 * outsideWeight * plumeFade);

    plumeStrength = clamp(
      microSpark * plumeFade * mix(0.58 * (1.0 - photoReveal * 0.65), 1.0, outsideWeight),
      0.0,
      1.0
    );
    col = mix(col, plumeCol, plumeStrength);
  }

  // -------------------------------------------------------------------------
  // 5. Live Brand-Pure Optical Exclusion & Sapphire Refraction on <h1> Typography
  // -------------------------------------------------------------------------
  if (uHasTitle > 0.5 && uTitleOpacity > 0.002) {
    float rowSign = (topDownUv.y < 0.5) ? 1.0 : -1.0; // Top word shifts left (-), bottom word shifts right (+)
    vec2 shiftedUv = vec2(topDownUv.x + rowSign * uTitleShiftNorm, topDownUv.y);

    // Subtle 3D sapphire prism refraction where letters cross inside the Spark
    float refractAmt = solidSparkAlpha * (1.0 - photoReveal) * 0.009;
    vec2 refractedUv = shiftedUv - vec2(normal.x, -normal.y) * refractAmt;

    float glyphOuter = texture(uTitleTex, clamp(shiftedUv, 0.0, 1.0)).a;
    float glyphInner = texture(uTitleTex, clamp(refractedUv, 0.0, 1.0)).a;
    float glyphAlpha = mix(glyphOuter, glyphInner, solidSparkAlpha) * uTitleOpacity;

    if (glyphAlpha > 0.002) {
      // Outside Spark: pure #FFFFFF.
      // Across Micro-Spark Plume: shifts into vivid #1F34FF Gemini Core Blue.
      // Inside 3D Sapphire Spark: live polarity cut into #08080A Obsidian etched with #1F34FF / #96D0FF cobalt edge!
      float sparkOverlap = clamp(solidSparkAlpha * (1.0 - photoReveal * 0.85), 0.0, 1.0);
      vec3 excludedInside = mix(COL_VOID, COL_CORE_BLUE, 0.28 + 0.35 * fresnel);
      // Crisp icy edge glint right where letterform slices across Spark perimeter
      float boundaryCut = exp(-abs(dPrismPx) / (2.5 * uDpr)) * (1.0 - photoReveal);
      excludedInside = mix(excludedInside, COL_CYAN_ICE, clamp(boundaryCut * 0.85, 0.0, 1.0));

      vec3 plumeExcluded = mix(COL_WHITE, COL_CORE_BLUE, clamp(plumeStrength * 0.92, 0.0, 1.0));
      vec3 targetTextCol = mix(plumeExcluded, excludedInside, sparkOverlap);

      col = mix(col, targetTextCol, clamp(glyphAlpha, 0.0, 1.0));
    }
  }

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const UNIFORM_NAMES = [
  'uResolution',
  'uDpr',
  'uTime',
  'uEntryScale',
  'uEntryRotRad',
  'uFlipY',
  'uAperture',
  'uPhotoMix',
  'uHasPhotos',
  'uTexA',
  'uTexB',
  'uAspectA',
  'uAspectB',
  'uFocalA',
  'uFocalB',
  'uCanvasAspect',
  'uTitleTex',
  'uHasTitle',
  'uTitleOpacity',
  'uTitleShiftNorm',
  'uCursorFrag',
  'uCursorAngle',
  'uCursorHover',
];

function buildCanvas2DSparkPath(ctx, cx, cy, radius, rotRad, cosFlip, power = 0.64) {
  const exp = 2 / power;
  const segments = 72;
  const cRot = Math.cos(rotRad);
  const sRot = Math.sin(rotRad);
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const lx = Math.sign(c) * Math.pow(Math.abs(c), exp) * radius * cosFlip;
    const ly = Math.sign(s) * Math.pow(Math.abs(s), exp) * radius;
    const rx = lx * cRot - ly * sRot;
    const ry = lx * sRot + ly * cRot;
    if (i === 0) ctx.moveTo(cx + rx, cy + ry);
    else ctx.lineTo(cx + rx, cy + ry);
  }
  ctx.closePath();
}

export function createSparkHeroCanvas(canvasEl, options = {}) {
  const {
    frameUrls = [],
    frameFocals = [],
    isScreenshotMode = false,
    reducedMotion = false,
  } = options;

  const maxDpr = isScreenshotMode ? 1.5 : 2;

  const state = {
    time: 0,
    entryScale: 1.0,
    entryRotDeg: 0,
    flipY: 0,
    apertureProgress: 0,
    photoSequenceProgress: 0,
    titleOpacity: 1.0,
    titleShiftNorm: 0.0,
    cursorX: 0.5,
    cursorY: 0.5,
    cursorHover: 0,
  };

  let destroyed = false;
  let isReady = false;
  let metrics = resizeCanvasToDisplaySize(canvasEl, maxDpr);

  const gl = createWebGL2Context(canvasEl, { isScreenshotMode, alpha: false });
  const ctx2d = !gl && canvasEl ? canvasEl.getContext('2d') : null;

  let program = null;
  let vao = null;
  let uniforms = null;
  let fallbackTex = null;
  let titleTex = null;
  let hasTitleMask = false;
  let titleMaskWidth = 0;
  let titleMaskHeight = 0;
  let titleDomRefs = { titleEl: null, wordLeftEl: null, wordRightEl: null };
  const loadedFrames = new Array(frameUrls.length).fill(null);

  // Offscreen 2D canvas to rasterize crisp hi-DPI DOM <h1> coordinates into TEXTURE2
  const titleOffscreen = document.createElement('canvas');
  const titleCtx = titleOffscreen.getContext('2d');

  if (gl) {
    program = createProgram(gl, FULLSCREEN_VERT_GLSL, SPARK_HERO_FRAG_GLSL, 'SparkHeroProgram');
    vao = createFullscreenVAO(gl);
    uniforms = getUniformLocations(gl, program, UNIFORM_NAMES);
    fallbackTex = createSolidTexture(gl, [8, 8, 10, 255]);
    titleTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, titleTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  function rasterizeTitleMask(titleEl, wordLeftEl, wordRightEl) {
    if (titleEl && wordLeftEl && wordRightEl) {
      titleDomRefs = { titleEl, wordLeftEl, wordRightEl };
    }
    const tEl = titleEl || titleDomRefs.titleEl;
    const wlEl = wordLeftEl || titleDomRefs.wordLeftEl;
    const wrEl = wordRightEl || titleDomRefs.wordRightEl;

    if (!gl || !titleCtx || !canvasEl || !tEl || !wlEl || !wrEl) {
      hasTitleMask = false;
      return;
    }

    metrics = resizeCanvasToDisplaySize(canvasEl, maxDpr);
    const { width, height, dpr } = metrics;
    if (width <= 2 || height <= 2) return;

    titleOffscreen.width = width;
    titleOffscreen.height = height;
    titleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    titleCtx.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);

    const canvasRect = canvasEl.getBoundingClientRect();
    const words = [wlEl, wrEl];

    // Temporarily reset any inline transform on word spans so base rest geometry is exact
    const savedTransforms = words.map((el) => el.style.transform);
    words.forEach((el) => {
      el.style.transform = 'none';
    });

    words.forEach((el) => {
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const fontSizePx = parseFloat(cs.fontSize) || 120;
      const fontWeight = cs.fontWeight || '500';
      const fontFamily = cs.fontFamily || '"Google Sans", sans-serif';
      const letterSpacing = cs.letterSpacing || '-0.045em';

      titleCtx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
      if ('letterSpacing' in titleCtx) {
        titleCtx.letterSpacing = letterSpacing;
      }
      titleCtx.textBaseline = 'top';
      titleCtx.fillStyle = '#FFFFFF';
      const relX = rect.left - canvasRect.left;
      const relY = rect.top - canvasRect.top;
      titleCtx.fillText(el.textContent.trim(), relX, relY);
    });

    words.forEach((el, idx) => {
      el.style.transform = savedTransforms[idx];
    });

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, titleTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, titleOffscreen);
    hasTitleMask = true;
    titleMaskWidth = width;
    titleMaskHeight = height;
    tEl.classList.add('is-webgl-composited');
  }

  const readyPromise = (async () => {
    if (!frameUrls.length) {
      isReady = true;
      return;
    }

    await Promise.all(
      frameUrls.map(async (url, idx) => {
        try {
          const img = await loadImageDecoded(url);
          if (destroyed) return;
          const focalPair = Array.isArray(frameFocals[idx]) ? frameFocals[idx] : [0.5, 0.5];
          if (gl) {
            loadedFrames[idx] = {
              ...createTextureFromImage(gl, img, { mipmaps: true }),
              focalX: Number.isFinite(focalPair[0]) ? focalPair[0] : 0.5,
              focalY: Number.isFinite(focalPair[1]) ? focalPair[1] : 0.5,
              url,
            };
          } else {
            const w = img.naturalWidth || img.width || 1;
            const h = img.naturalHeight || img.height || 1;
            loadedFrames[idx] = {
              texture: null,
              width: w,
              height: h,
              aspect: w / Math.max(h, 1),
              focalX: Number.isFinite(focalPair[0]) ? focalPair[0] : 0.5,
              focalY: Number.isFinite(focalPair[1]) ? focalPair[1] : 0.5,
              img,
              url,
            };
          }
        } catch (err) {
          console.warn(`[sparkHeroCanvas] Failed preloading frame ${idx} (${url}):`, err);
        }
      })
    );

    isReady = true;

    if (!destroyed && !isScreenshotMode && state.apertureProgress > 0.035) {
      renderOnce();
    }
  })();

  function resolveNormalizedCursor() {
    const nx = Number.isFinite(state.cursorX) ? state.cursorX : 0.5;
    const ny = Number.isFinite(state.cursorY) ? state.cursorY : 0.5;
    return {
      nx: Math.min(Math.max(nx, 0), 1),
      ny: Math.min(Math.max(ny, 0), 1),
    };
  }

  function selectFramePair() {
    const validFrames = loadedFrames.filter(Boolean);
    if (validFrames.length === 0) {
      return { frameA: null, frameB: null, localMix: 0, hasPhotos: false };
    }
    if (validFrames.length === 1) {
      return { frameA: validFrames[0], frameB: validFrames[0], localMix: 0, hasPhotos: true };
    }
    const maxIdx = validFrames.length - 1;
    const clampedSeq = Math.min(Math.max(state.photoSequenceProgress || 0, 0), maxIdx);
    const idxA = Math.min(Math.floor(clampedSeq), maxIdx - 1);
    const idxB = idxA + 1;
    const localMix = clampedSeq - idxA;
    return {
      frameA: validFrames[idxA],
      frameB: validFrames[idxB],
      localMix,
      hasPhotos: true,
    };
  }

  function renderCanvas2DFallback() {
    if (!ctx2d || !canvasEl) return;
    const w = metrics.width;
    const h = metrics.height;
    const dpr = metrics.dpr;

    ctx2d.save();
    ctx2d.fillStyle = '#08080A';
    ctx2d.fillRect(0, 0, w, h);

    const aperture = Math.min(Math.max(state.apertureProgress, 0), 1);
    const baseR = Math.min(w, h) * 0.355;
    const maxR = Math.hypot(w, h) * 1.85;
    const radius = baseR * Math.pow(maxR / Math.max(baseR, 1), aperture) * Math.max(state.entryScale, 0.05);
    const rotRad = (state.entryRotDeg * Math.PI) / 180;
    const cosFlip = Math.max(Math.abs(Math.cos(state.flipY)), 0.035);

    if (aperture < 0.85) {
      const step = 24 * dpr;
      ctx2d.fillStyle = 'rgba(31, 52, 255, 0.06)';
      for (let y = (h % step) * 0.5; y < h; y += step) {
        for (let x = (w % step) * 0.5; x < w; x += step) {
          ctx2d.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr);
        }
      }
    }

    buildCanvas2DSparkPath(ctx2d, w * 0.5, h * 0.5, radius, rotRad, cosFlip, 0.64);
    ctx2d.clip();

    const grad = ctx2d.createRadialGradient(w * 0.5, h * 0.5, radius * 0.05, w * 0.5, h * 0.5, radius);
    grad.addColorStop(0.0, '#1F34FF');
    grad.addColorStop(0.55, '#4FA0FF');
    grad.addColorStop(0.88, '#96D0FF');
    grad.addColorStop(1.0, '#D2E3FC');
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, w, h);

    const { frameA, frameB, localMix, hasPhotos } = selectFramePair();
    const photoReveal = aperture <= 0.04 ? 0 : Math.min(1, (aperture - 0.04) / 0.51);
    if (hasPhotos && photoReveal > 0) {
      ctx2d.globalAlpha = photoReveal;
      if (frameA && frameA.img) {
        drawImageCover2D(ctx2d, frameA.img, w, h);
      }
      if (frameB && frameB.img && localMix > 0.001) {
        ctx2d.globalAlpha = photoReveal * localMix;
        drawImageCover2D(ctx2d, frameB.img, w, h);
      }
    }

    ctx2d.restore();
  }

  function resize() {
    if (destroyed) return metrics;
    metrics = resizeCanvasToDisplaySize(canvasEl, maxDpr);
    return metrics;
  }

  function setState(partial = {}) {
    if (!partial || typeof partial !== 'object') return;
    if (partial.time !== undefined) state.time = Number(partial.time) || 0;
    if (partial.entryScale !== undefined) state.entryScale = Number(partial.entryScale);
    if (partial.entryRotDeg !== undefined) {
      state.entryRotDeg = Number(partial.entryRotDeg) || 0;
    } else if (partial.entryRotRad !== undefined) {
      state.entryRotDeg = ((Number(partial.entryRotRad) || 0) * 180) / Math.PI;
    }
    if (partial.flipY !== undefined) state.flipY = Number(partial.flipY) || 0;
    if (partial.apertureProgress !== undefined) {
      state.apertureProgress = Math.min(Math.max(Number(partial.apertureProgress) || 0, 0), 1);
    }
    if (partial.photoSequenceProgress !== undefined) {
      state.photoSequenceProgress = Math.max(Number(partial.photoSequenceProgress) || 0, 0);
    }
    if (partial.titleOpacity !== undefined) {
      state.titleOpacity = Math.min(Math.max(Number(partial.titleOpacity), 0), 1);
    }
    if (partial.titleShiftNorm !== undefined) {
      state.titleShiftNorm = Number(partial.titleShiftNorm) || 0;
    }
    if (partial.cursorX !== undefined) state.cursorX = Number(partial.cursorX);
    if (partial.cursorY !== undefined) state.cursorY = Number(partial.cursorY);
    if (partial.cursorHover !== undefined) {
      state.cursorHover = Math.min(Math.max(Number(partial.cursorHover) || 0, 0), 1);
    }
  }

  function getState() {
    return { ...state };
  }

  function renderOnce() {
    if (destroyed) return;
    if (isScreenshotMode && !isReady) return;

    metrics = resizeCanvasToDisplaySize(canvasEl, maxDpr);

    if (
      gl &&
      titleDomRefs.titleEl &&
      (metrics.width !== titleMaskWidth || metrics.height !== titleMaskHeight)
    ) {
      rasterizeTitleMask();
    }

    if (!gl) {
      renderCanvas2DFallback();
      return;
    }

    const { width, height, dpr, aspect } = metrics;
    const { nx, ny } = resolveNormalizedCursor();
    const cursorFragX = nx * width;
    const cursorFragY = (1.0 - ny) * height;

    const entryRotRad = (state.entryRotDeg * Math.PI) / 180;
    const dx = cursorFragX - width * 0.5;
    const dy = cursorFragY - height * 0.5;
    const cRot = Math.cos(-entryRotRad);
    const sRot = Math.sin(-entryRotRad);
    const rotCursorX = dx * cRot - dy * sRot;
    const rotCursorY = dx * sRot + dy * cRot;
    const cursorAngle = Math.atan2(rotCursorY, rotCursorX);

    const { frameA, frameB, localMix, hasPhotos } = selectFramePair();
    const effectiveHover = reducedMotion ? 0 : state.cursorHover;

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);

    gl.uniform2f(uniforms.uResolution, width, height);
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.uniform1f(uniforms.uTime, state.time);
    gl.uniform1f(uniforms.uEntryScale, state.entryScale);
    gl.uniform1f(uniforms.uEntryRotRad, entryRotRad);
    gl.uniform1f(uniforms.uFlipY, state.flipY);
    gl.uniform1f(uniforms.uAperture, state.apertureProgress);
    gl.uniform1f(uniforms.uPhotoMix, localMix);
    gl.uniform1f(uniforms.uHasPhotos, hasPhotos ? 1.0 : 0.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frameA ? frameA.texture : fallbackTex);
    gl.uniform1i(uniforms.uTexA, 0);
    gl.uniform1f(uniforms.uAspectA, frameA ? frameA.aspect : aspect);
    gl.uniform2f(uniforms.uFocalA, frameA ? frameA.focalX : 0.5, frameA ? frameA.focalY : 0.5);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, frameB ? frameB.texture : fallbackTex);
    gl.uniform1i(uniforms.uTexB, 1);
    gl.uniform1f(uniforms.uAspectB, frameB ? frameB.aspect : aspect);
    gl.uniform2f(uniforms.uFocalB, frameB ? frameB.focalX : 0.5, frameB ? frameB.focalY : 0.5);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, hasTitleMask ? titleTex : fallbackTex);
    gl.uniform1i(uniforms.uTitleTex, 2);
    gl.uniform1f(uniforms.uHasTitle, hasTitleMask ? 1.0 : 0.0);
    gl.uniform1f(uniforms.uTitleOpacity, state.titleOpacity);
    gl.uniform1f(uniforms.uTitleShiftNorm, state.titleShiftNorm);

    gl.uniform1f(uniforms.uCanvasAspect, aspect);
    gl.uniform2f(uniforms.uCursorFrag, cursorFragX, cursorFragY);
    gl.uniform1f(uniforms.uCursorAngle, cursorAngle);
    gl.uniform1f(uniforms.uCursorHover, effectiveHover);

    drawFullscreenTriangle(gl, vao);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (gl) {
      for (const entry of loadedFrames) {
        if (entry && entry.texture) {
          gl.deleteTexture(entry.texture);
        }
      }
      loadedFrames.fill(null);
      if (fallbackTex) {
        gl.deleteTexture(fallbackTex);
        fallbackTex = null;
      }
      if (titleTex) {
        gl.deleteTexture(titleTex);
        titleTex = null;
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
  }

  return {
    ready: () => readyPromise,
    resize,
    syncTitleOverlay: rasterizeTitleMask,
    setState,
    getState,
    renderOnce,
    destroy,
  };
}
