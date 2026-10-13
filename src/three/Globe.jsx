import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { profile } from '../data.js';
import { getMotion, lean } from '../lib/store.js';
import { LAND_BITS, LAND_SAMPLES } from './landmask.js';
import { clamp, damp, decodeBits, fibonacciPoint, formatLatLon, knnEdges, latLonToVec3, polylineSegments, rng, vec3ToLatLon } from './geo.js';
import { fresnelMaterial, glowPointMaterial, pointGeometry, ribbonGeometry, ribbonMaterial, useShaderClock } from './materials.js';

const R = 2.2;
const FOV = 42;
const TILT = 0.32;
// Spin so the home longitude faces the camera.
const FACE = -Math.PI / 2 - THREE.MathUtils.degToRad(profile.geo.lon);
const MAGENTA = '#ff4fa8';

export const COORD_COUNT = 5;

function buildGlobe() {
  const rand = rng(31);
  const land = decodeBits(LAND_BITS, LAND_SAMPLES).map((i) => fibonacciPoint(i, LAND_SAMPLES).multiplyScalar(R));

  const shellCount = 240;
  const shell = Array.from({ length: shellCount }, (_, i) => fibonacciPoint(i, shellCount).multiplyScalar(R * 1.012));
  const edges = knnEdges(shell, 3, R * 0.5);
  const shellSegs = edges.map(([a, b]) => [shell[a].x, shell[a].y, shell[a].z, shell[b].x, shell[b].y, shell[b].z]);
  const shellPhase = edges.map(() => rand());
  const nodes = shell.filter(() => rand() < 0.3);

  const home = latLonToVec3(profile.geo.lat, profile.geo.lon, R);
  const hot = [];
  for (let guard = 0; hot.length < 6 && guard < 500; guard++) {
    const p = land[Math.floor(rand() * land.length)];
    if (p.distanceTo(home) > 1.2 && p.y > -1.5 && hot.every((q) => q.distanceTo(p) > 0.9)) hot.push(p.clone());
  }

  const tags = [];
  for (let guard = 0; tags.length < COORD_COUNT && guard < 600; guard++) {
    const p = shell[Math.floor(rand() * shell.length)];
    if (Math.abs(p.y) < R * 0.72 && p.distanceTo(home) > 1.1 && tags.every((q) => q.distanceTo(p) > 1.4)) tags.push(p.clone());
  }
  return { land, shellSegs, shellPhase, nodes, home, hot, tags };
}

let cached = null;
const globeData = () => cached || (cached = buildGlobe());

// The DOM labels read the same tagged points the scene draws.
export const coordLabels = () => globeData().tags.map((p) => formatLatLon(vec3ToLatLon(p)));

const ORBIT_STEPS = 200;
const ORBITS = [
  { radius: 2.95, speed: 0.07, euler: new THREE.Euler(1.2, 0, 0.3) },
  { radius: 3.35, speed: -0.05, euler: new THREE.Euler(1.42, 0, -0.55) },
  { radius: 3.7, speed: 0.04, euler: new THREE.Euler(0.95, 0, 0.95) },
];

function orbit({ radius, euler }) {
  return Array.from({ length: ORBIT_STEPS }, (_, i) => {
    const a = (i / ORBIT_STEPS) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius).applyEuler(euler);
  });
}

// The code snippets are DOM boxes hung above each polyhedron. Reserve their size (CSS px, with margin)
// so they stay inside the frame and below its corner brackets, whatever the frame's proportions.
const SNIP_HALF_W = 140;
const SNIP_H = 124;
const EDGE = 32;

export function globeLayout(width, height) {
  const aspect = width / Math.max(1, height);
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const fitW = (R * 2.9) / (2 * t * aspect);
  const fitH = (R * 2.75) / (2 * t);
  const dist = Math.max(fitW, fitH, 8.2);
  const halfH = dist * t;
  const halfW = halfH * aspect;
  const wpp = (2 * halfH) / Math.max(1, height); // world units per CSS px on the z = 0 plane
  const ix = Math.min(halfW - Math.max(1.4, (SNIP_HALF_W + EDGE) * wpp), R + 2.7);
  const wide = aspect > 1.15 && ix > R + 1.35; // room for a polyhedron and its curves beside the globe
  const anchorY = Math.min(1.55, halfH - (EDGE + SNIP_H + 10) * wpp);
  return { dist, wide, ix, anchorY };
}

const CURVE_STEPS = 48;
const bezier = (p0, p1, p2, p3) => new THREE.CubicBezierCurve3(p0, p1, p2, p3).getPoints(CURVE_STEPS);

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

export default function Globe({ homeEl, tagEls, snippetEls }) {
  const { camera, size } = useThree();
  const data = globeData();
  const layout = useMemo(() => globeLayout(size.width, size.height), [size.width, size.height]);

  const geo = useMemo(() => {
    const rand = rng(5);
    const stars = Array.from({ length: 650 }, () => {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
      return v.multiplyScalar(16 + rand() * 16).add(V(0, 0, -6));
    });
    const orbitGeos = ORBITS.map((o) => {
      const { segs, phase } = polylineSegments(orbit(o), true);
      return ribbonGeometry(segs, { phase });
    });
    const beamSeg = [[...data.home.toArray(), ...data.home.clone().multiplyScalar(1.34).toArray()]];
    return {
      land: pointGeometry(data.land, { size: 0.036, phase: () => rand() }),
      shell: ribbonGeometry(data.shellSegs, { phase: data.shellPhase }),
      nodes: pointGeometry(data.nodes, { size: 0.085, phase: () => rand() }),
      hot: pointGeometry(data.hot, { size: 0.15, phase: () => rand() }),
      home: pointGeometry([data.home.clone().multiplyScalar(1.005)], { size: 0.34 }),
      beam: ribbonGeometry(beamSeg, { phase: [0] }),
      stars: pointGeometry(stars, { size: 0.08, phase: () => rand() }),
      orbitGeos,
    };
  }, [data]);

  // Side polyhedra and the curves that wire them (and the code snippets) into the globe.
  const rig = useMemo(() => {
    if (!layout.wide) return null;
    const { ix, anchorY } = layout;
    const ico = new THREE.IcosahedronGeometry(0.9, 1);
    const edgePos = new THREE.EdgesGeometry(ico, 1).attributes.position;
    const icoSegs = [];
    for (let i = 0; i < edgePos.count; i += 2) {
      icoSegs.push([edgePos.getX(i), edgePos.getY(i), edgePos.getZ(i), edgePos.getX(i + 1), edgePos.getY(i + 1), edgePos.getZ(i + 1)]);
    }
    const posAttr = ico.attributes.position;
    const verts = [];
    for (let i = 0; i < posAttr.count; i++) {
      const p = V(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      if (!verts.some((q) => q.distanceToSquared(p) < 1e-6)) verts.push(p);
    }
    const curves = [];
    const ends = [];
    // control points scale with the gap to the globe, so the curves stay smooth however close the polyhedra sit
    const ax = R * 0.985;
    const b0 = ix - 0.88;
    const b1 = R * 0.95;
    for (const s of [-1, 1]) {
      const a = bezier(V(s * ix, anchorY), V(s * ix, (anchorY + 0.38) / 2), V(s * (ax + 0.55 * (ix - ax)), 0.55), V(s * ax, 0.38));
      const b = bezier(V(s * b0, -1.2), V(s * (b0 - 0.4 * (b0 - b1)), -1.2), V(s * (b1 + 0.4 * (b0 - b1)), -0.72), V(s * b1, -0.68));
      curves.push(a, b);
      ends.push(a[0], a[a.length - 1], b[0], b[b.length - 1]);
    }
    const curveSegs = [];
    const curvePhase = [];
    for (const pts of curves) {
      const pl = polylineSegments(pts);
      curveSegs.push(...pl.segs);
      curvePhase.push(...pl.phase);
    }
    return {
      ix,
      icoLines: ribbonGeometry(icoSegs, { phase: icoSegs.map((_, i) => (i * 0.37) % 1) }),
      icoVerts: pointGeometry(verts, { size: 0.09, phase: (i) => (i * 0.29) % 1 }),
      curves: ribbonGeometry(curveSegs, { phase: curvePhase }),
      ends: pointGeometry(ends, { size: 0.2 }),
      anchors: [V(-ix, anchorY), V(ix, anchorY)],
    };
  }, [layout]);

  const mats = useMemo(
    () => ({
      land: glowPointMaterial({ color: '#3fe6d3', core: '#bffcf4', opacity: 0.55, twinkle: 0.15, near: 4, far: 30, sphereFade: true }),
      shell: ribbonMaterial({ color: '#2fd3c4', hot: '#e8fffd', width: 1.25, opacity: 0.38, pulse: 1, speed: 0.16, near: 4, far: 30, sphereFade: true }),
      nodes: glowPointMaterial({ color: '#6ff7e6', core: '#ffffff', opacity: 0.9, twinkle: 0.25, near: 4, far: 30, sphereFade: true }),
      hot: glowPointMaterial({ color: MAGENTA, core: '#ffe0f0', opacity: 1, twinkle: 0.45, near: 4, far: 30, sphereFade: true }),
      home: glowPointMaterial({ color: MAGENTA, core: '#fff2f8', opacity: 1, twinkle: 0.2, near: 4, far: 30 }),
      beam: ribbonMaterial({ color: MAGENTA, hot: '#ffd6ea', width: 2.6, opacity: 0.55, pulse: 1.4, speed: 0.6, segLen: 1, trail: true, near: 4, far: 30 }),
      orbit: ORBITS.map((o) =>
        ribbonMaterial({ color: '#59e3f0', hot: '#f0feff', width: 1.5, opacity: 0.16, pulse: 1.6, speed: o.speed, segLen: 1 / ORBIT_STEPS, trail: true, near: 4, far: 30 }),
      ),
      stars: glowPointMaterial({ color: '#8fd8e6', core: '#cfefff', opacity: 0.35, twinkle: 0.6, near: 4, far: 60 }),
      atmos: fresnelMaterial({ color: '#36e0d0', power: 2.8, intensity: 0.75 }),
      ico: ribbonMaterial({ color: '#7fe9f2', hot: '#ffffff', width: 1.3, opacity: 0.55, pulse: 0.7, speed: 0.25, near: 4, far: 30 }),
      icoVerts: glowPointMaterial({ color: '#9ff4ff', core: '#ffffff', opacity: 0.8, twinkle: 0.3, near: 4, far: 30 }),
      curves: ribbonMaterial({ color: '#9feaf2', hot: '#ffffff', width: 1.5, opacity: 0.4, pulse: 1.5, speed: 0.32, segLen: 1 / CURVE_STEPS, trail: true, near: 4, far: 30 }),
      ends: glowPointMaterial({ color: '#c8fbff', core: '#ffffff', opacity: 1, twinkle: 0.2, near: 4, far: 30 }),
      core: new THREE.MeshBasicMaterial({ color: '#02070a', transparent: true, opacity: 0.72, depthWrite: false }),
    }),
    [],
  );
  useShaderClock([mats.land, mats.shell, mats.nodes, mats.hot, mats.home, mats.beam, ...mats.orbit, mats.stars, mats.ico, mats.icoVerts, mats.curves, mats.ends]);

  const outer = useRef(null);
  const inner = useRef(null);
  const icoL = useRef(null);
  const icoR = useRef(null);
  const ringA = useRef(null);
  const ringB = useRef(null);
  const homeGroup = useRef(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  const n = useMemo(() => new THREE.Vector3(), []);
  const toCam = useMemo(() => new THREE.Vector3(), []);
  const heads = useRef([]);
  const tilt = useMemo(() => ({ x: 0, y: 0 }), []);

  const homeQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), data.home.clone().normalize()), [data]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const motion = getMotion();
    const t = state.clock.elapsedTime;

    const k = motion ? 2 : 60;
    const l = lean(t, tilt);
    camera.position.x = damp(camera.position.x, motion ? l.x * 0.45 : 0, k, dt);
    camera.position.y = damp(camera.position.y, motion ? -l.y * 0.3 : 0, k, dt);
    camera.position.z = layout.dist;
    camera.lookAt(0, 0, 0);
    if (camera.fov !== FOV) {
      camera.fov = FOV;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    outer.current.rotation.x = TILT;
    inner.current.rotation.y = FACE + (motion ? Math.sin(t * 0.1) * 0.8 : 0);
    outer.current.updateMatrixWorld();

    // comet heads ride the orbit trails
    ORBITS.forEach((o, i) => {
      const head = heads.current[i];
      if (!head) return;
      const s = (((t * o.speed) % 1) + 1) % 1;
      const a = s * Math.PI * 2;
      head.position.set(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius).applyEuler(o.euler);
    });

    // home pulse rings
    const pulse = (offset) => ((t * 0.42 + offset) % 1 + 1) % 1;
    [ringA.current, ringB.current].forEach((ring, i) => {
      if (!ring) return;
      const p = motion ? pulse(i * 0.5) : 0.35 + i * 0.3;
      ring.scale.setScalar(0.5 + p * 2.6);
      ring.material.opacity = (1 - p) * 0.9;
    });

    if (rig) {
      const spin = motion ? t * 0.18 : 0.4;
      icoL.current.rotation.set(spin * 0.7, spin, 0.2);
      icoR.current.rotation.set(-spin * 0.6, -spin, -0.15);
    }

    // DOM: home marker + coordinate tags follow the globe; hide them on the far side
    const w = size.width;
    const h = size.height;
    const place = (el, local, matrix, extra = 1) => {
      if (!el) return;
      v.copy(local).applyMatrix4(matrix);
      n.copy(v).normalize();
      toCam.copy(camera.position).sub(v).normalize();
      const facing = clamp((n.dot(toCam) - 0.12) * 3.2, 0, 1);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (0.5 - v.y * 0.5) * h;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = (facing * extra).toFixed(3);
    };
    const m = inner.current.matrixWorld;
    place(homeEl?.current, data.home, m);
    // keep the home label inside the frame: hang it on the left only if it would overflow the right edge
    if (homeEl?.current) homeEl.current.toggleAttribute('data-flip', (v.x * 0.5 + 0.5) * w > w - 240);
    (tagEls?.current || []).forEach((el, i) => data.tags[i] && place(el, data.tags[i], m, 0.85));

    (snippetEls?.current || []).forEach((el, i) => {
      if (!el) return;
      if (!rig) {
        el.style.opacity = '0';
        return;
      }
      v.copy(rig.anchors[i]).project(camera);
      el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((0.5 - v.y * 0.5) * h).toFixed(1)}px, 0)`;
      el.style.opacity = '1';
    });
  });

  return (
    <>
      <points geometry={geo.stars} material={mats.stars} renderOrder={-2} frustumCulled={false} />
      <group ref={outer}>
        <mesh material={mats.core} renderOrder={-1}>
          <sphereGeometry args={[R * 0.985, 48, 32]} />
        </mesh>
        <mesh material={mats.atmos}>
          <sphereGeometry args={[R * 1.03, 64, 48]} />
        </mesh>
        <group ref={inner}>
          <points geometry={geo.land} material={mats.land} frustumCulled={false} />
          <mesh geometry={geo.shell} material={mats.shell} frustumCulled={false} />
          <points geometry={geo.nodes} material={mats.nodes} frustumCulled={false} />
          <points geometry={geo.hot} material={mats.hot} frustumCulled={false} />
          <points geometry={geo.home} material={mats.home} frustumCulled={false} />
          <mesh geometry={geo.beam} material={mats.beam} frustumCulled={false} />
          <group ref={homeGroup} position={data.home} quaternion={homeQuat}>
            {[ringA, ringB].map((ref, i) => (
              <mesh key={i} ref={ref}>
                <ringGeometry args={[0.07, 0.085, 48]} />
                <meshBasicMaterial color={MAGENTA} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>
      </group>

      {geo.orbitGeos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.orbit[i]} frustumCulled={false} />
      ))}
      {ORBITS.map((_, i) => (
        <mesh key={`h${i}`} ref={(el) => (heads.current[i] = el)}>
          <sphereGeometry args={[0.045, 12, 8]} />
          <meshBasicMaterial color={new THREE.Color('#f0feff').multiplyScalar(2.2)} toneMapped={false} />
        </mesh>
      ))}

      {rig && (
        <>
          <group ref={icoL} position={[-rig.ix, -1.25, 0]}>
            <mesh geometry={rig.icoLines} material={mats.ico} frustumCulled={false} />
            <points geometry={rig.icoVerts} material={mats.icoVerts} frustumCulled={false} />
          </group>
          <group ref={icoR} position={[rig.ix, -1.25, 0]}>
            <mesh geometry={rig.icoLines} material={mats.ico} frustumCulled={false} />
            <points geometry={rig.icoVerts} material={mats.icoVerts} frustumCulled={false} />
          </group>
          <mesh geometry={rig.curves} material={mats.curves} frustumCulled={false} />
          <points geometry={rig.ends} material={mats.ends} frustumCulled={false} />
        </>
      )}
    </>
  );
}
