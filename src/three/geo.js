import * as THREE from 'three';

// Deterministic helpers shared by the scenes, so every visit draws the same network.

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Must match the generator that produced landmask.js.
export function fibonacciPoint(i, n, out = new THREE.Vector3()) {
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(1 - y * y);
  const t = GOLDEN * i;
  return out.set(Math.cos(t) * r, y, Math.sin(t) * r);
}

export function latLonToVec3(lat, lon, radius = 1, out = new THREE.Vector3()) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return out.set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(radius);
}

export function vec3ToLatLon(v) {
  const n = v.clone().normalize();
  return { lat: THREE.MathUtils.radToDeg(Math.asin(n.y)), lon: THREE.MathUtils.radToDeg(Math.atan2(-n.z, n.x)) };
}

export const formatLatLon = ({ lat, lon }) =>
  `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

// Indices of the Fibonacci samples whose bit is set in the base64 bitset.
export function decodeBits(b64, n) {
  const bin = atob(b64);
  const out = [];
  for (let i = 0; i < n; i++) if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) out.push(i);
  return out;
}

// k-nearest-neighbour edges; O(n²), fine for a few hundred points.
export function knnEdges(points, k = 3, maxDist = Infinity) {
  const seen = new Set();
  const edges = [];
  const max2 = maxDist * maxDist;
  for (let i = 0; i < points.length; i++) {
    const near = [];
    for (let j = 0; j < points.length; j++) if (j !== i) near.push([points[i].distanceToSquared(points[j]), j]);
    near.sort((a, b) => a[0] - b[0]);
    for (let m = 0; m < Math.min(k, near.length); m++) {
      const [d2, j] = near[m];
      if (d2 > max2) break;
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

// Turn a polyline into segments for ribbonGeometry, with each segment's start position along the path.
export function polylineSegments(points, closed = false) {
  const segs = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    segs.push([a.x, a.y, a.z, b.x, b.y, b.z]);
  }
  const phase = segs.map((_, i) => i / count);
  return { segs, phase, segLen: 1 / count };
}

export const damp = THREE.MathUtils.damp;
export const clamp = THREE.MathUtils.clamp;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
