/**
 * Mathematical procedural 4-point concave Gemini Spark path generator.
 * Evaluates |x|^power + |y|^power = 1 parametrically across [0, 2*PI):
 * Since cos^2(t) + sin^2(t) = 1, |x| = |cos(t)|^(2 / power), |y| = |sin(t)|^(2 / power).
 * Matches the WebGL2 sdGeminiSpark(p, r, 0.64) SDF silhouette identically.
 */

export function buildGeminiSparkPath(cx = 12, cy = 12, radius = 10.5, power = 0.64, segments = 72) {
  const exp = 2 / power;
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const x = cx + Math.sign(c) * Math.pow(Math.abs(c), exp) * radius;
    const y = cy + Math.sign(s) * Math.pow(Math.abs(s), exp) * radius;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  pts.push('Z');
  return pts.join(' ');
}

export function createSparkSvgElement(size = 14, power = 0.64) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('procedural-spark-svg');

  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', buildGeminiSparkPath(12, 12, 11.2, power, 72));
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}
