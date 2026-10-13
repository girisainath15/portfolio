import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp, damp, knnEdges, rng } from './geo.js';
import { bokehMaterial, glowPointMaterial, pointGeometry, ribbonGeometry, ribbonMaterial, useShaderClock } from './materials.js';
import { getMotion, lean } from '../lib/store.js';

// Small mono labels that ride on a few nodes, like the readouts in the reference frames.
export const NODE_TAGS = ['retriever 0.93', 'planner', 'validator ✓', 'embed 768d', 'rerank 0.88', 'tool:sql', 'guardrail', 'trace_id', 'memory', 'pii:mask'];

function buildNetwork() {
  const rand = rng(20240115);
  const nodes = [];
  let guard = 0;
  while (nodes.length < 80 && guard++ < 9000) {
    const x = (rand() * 2 - 1) * 15.5;
    const y = (rand() * 2 - 1) * 6.4;
    const z = 1.8 - rand() * 10.5;
    // keep the area behind the name sparse so the title stays readable
    const cx = x / 6.4;
    const cy = y / 2.9;
    if (cx * cx + cy * cy < 1 && z > -6.5 && rand() < 0.86) continue;
    const p = new THREE.Vector3(x, y, z);
    if (nodes.some((q) => q.distanceToSquared(p) < 2.35 * 2.35)) continue;
    nodes.push(p);
  }

  const edges = knnEdges(nodes, 3, 6.4);
  const origin = new THREE.Vector3(-7, 1.5, 0);
  const spread = 26;
  const mid = new THREE.Vector3();
  const segs = edges.map(([a, b]) => [nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z]);
  const edgeReveal = edges.map(([a, b]) => clamp(mid.copy(nodes[a]).add(nodes[b]).multiplyScalar(0.5).distanceTo(origin) / spread, 0, 0.9));
  const edgePhase = edges.map(() => rand());
  const nodeReveal = nodes.map((n) => clamp(n.distanceTo(origin) / spread - 0.05, 0, 0.9));
  const sizes = nodes.map(() => (rand() < 0.22 ? 0.85 + rand() * 0.35 : 0.32 + rand() * 0.22));

  const labelled = [];
  nodes.forEach((n, i) => {
    if (labelled.length >= NODE_TAGS.length) return;
    const onScreen = Math.abs(n.x) < 9.8 && Math.abs(n.y) < 4.3 && n.z > -5;
    const offCentre = Math.abs(n.x) > 5.2 || Math.abs(n.y) > 2.7;
    if (onScreen && offCentre) labelled.push(i);
  });

  return { nodes, segs, edgeReveal, edgePhase, nodeReveal, sizes, labelled };
}

function scatter(count, seed, { x, y, z, size }) {
  const rand = rng(seed);
  const pts = [];
  const sizes = [];
  for (let i = 0; i < count; i++) {
    pts.push(new THREE.Vector3((rand() * 2 - 1) * x, (rand() * 2 - 1) * y, z[0] + rand() * (z[1] - z[0])));
    sizes.push(size[0] + rand() * (size[1] - size[0]));
  }
  return { pts, sizes };
}

function bokehGeometry(count, seed) {
  const rand = rng(seed);
  const palette = ['#2fe0c8', '#5ff2a6', '#41c8e6', '#7fffd4', '#1fa7b8'].map((c) => new THREE.Color(c));
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    let z;
    // keep the soft discs out from behind the title block
    do {
      x = (rand() * 2 - 1) * 17;
      y = (rand() * 2 - 1) * 9;
      z = -26 + rand() * 30;
    } while (Math.abs(x) < 6 && Math.abs(y) < 3.2 && z > -14);
    pos.set([x, y, z], i * 3);
    size[i] = 0.16 + rand() * 0.42 + (z > -3 ? 0.22 : 0);
    phase[i] = rand();
    const c = palette[Math.floor(rand() * palette.length)].clone().multiplyScalar(0.1 + rand() * 0.18);
    color.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  return g;
}

export default function NeuralNet({ tagEls }) {
  const { camera, size } = useThree();
  const net = useMemo(buildNetwork, []);

  const geo = useMemo(() => {
    const dust = scatter(420, 77, { x: 18, y: 10, z: [-28, 6], size: [0.025, 0.07] });
    return {
      lines: ribbonGeometry(net.segs, { phase: net.edgePhase, reveal: net.edgeReveal }),
      nodes: pointGeometry(net.nodes, { size: (i) => net.sizes[i], phase: (i) => (i * 0.137) % 1, reveal: (i) => net.nodeReveal[i] }),
      dust: pointGeometry(dust.pts, { size: (i) => dust.sizes[i], phase: (i) => (i * 0.61) % 1 }),
      bokeh: bokehGeometry(150, 9),
    };
  }, [net]);

  const mats = useMemo(
    () => ({
      lines: ribbonMaterial({ color: '#2ee8cf', hot: '#f0fffc', width: 3, opacity: 1, pulse: 1.2, speed: 0.2, near: 9, far: 36 }),
      nodes: glowPointMaterial({ color: '#4ff6da', core: '#f2fffd', opacity: 1.1, twinkle: 0.12, near: 9, far: 38 }),
      dust: glowPointMaterial({ color: '#7fe9ff', core: '#d6fbff', opacity: 0.55, twinkle: 0.6, near: 3, far: 40 }),
      bokeh: bokehMaterial(),
    }),
    [],
  );
  useShaderClock(Object.values(mats));

  const group = useRef(null);
  const reveal = useRef(getMotion() ? 0 : 1);
  const look = useMemo(() => new THREE.Vector3(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const tilt = useMemo(() => ({ x: 0, y: 0 }), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const motion = getMotion();
    const t = state.clock.elapsedTime;
    reveal.current = motion ? Math.min(1, reveal.current + dt / 2.8) : 1;
    mats.lines.uniforms.uReveal.value = reveal.current;
    mats.nodes.uniforms.uReveal.value = reveal.current;

    // lean toward the mouse (or drift when idle / on touch), and pull back as the hero scrolls away
    const l = lean(t, tilt);
    const scroll = clamp(window.scrollY / Math.max(1, size.height), 0, 1.2);
    const k = motion ? 2.4 : 60;
    camera.position.x = damp(camera.position.x, motion ? l.x * 0.9 : 0, k, dt);
    camera.position.y = damp(camera.position.y, (motion ? -l.y * 0.5 : 0) - scroll * 1.4, k, dt);
    camera.position.z = damp(camera.position.z, 10 + scroll * 2.6, k, dt);
    look.set(camera.position.x * 0.25, camera.position.y * 0.6, -3);
    camera.lookAt(look);
    camera.updateMatrixWorld();

    const g = group.current;
    if (motion) {
      g.rotation.y = Math.sin(t * 0.06) * 0.16;
      g.rotation.x = Math.sin(t * 0.043) * 0.05;
    }
    g.updateMatrixWorld();

    // pin the DOM tags to their nodes
    const els = tagEls?.current || [];
    const w = size.width;
    const h = size.height;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!el) continue;
      const idx = net.labelled[i];
      if (idx === undefined) {
        el.style.opacity = '0';
        continue;
      }
      v.copy(net.nodes[idx]).applyMatrix4(g.matrixWorld).project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (0.5 - v.y * 0.5) * h;
      const cx = (x - w * 0.5) / (w * 0.33);
      const cy = (y - h * 0.5) / (h * 0.27);
      const clear = clamp((cx * cx + cy * cy - 1) * 1.6, 0, 1); // fade near the title
      const underHud = (w > 900 && x > w - 470 && y < 290) || (x < 250 && y < 96);
      const inside = v.z < 1 && x > 6 && x < w - 130 && y > 6 && y < h - 20 && !underHud;
      const shown = clamp((reveal.current - net.nodeReveal[idx]) * 6, 0, 1);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = inside ? (clear * shown * 0.9).toFixed(3) : '0';
    }
  });

  return (
    <>
      <group ref={group}>
        <mesh geometry={geo.lines} material={mats.lines} frustumCulled={false} />
        <points geometry={geo.nodes} material={mats.nodes} frustumCulled={false} />
      </group>
      <points geometry={geo.bokeh} material={mats.bokeh} frustumCulled={false} />
      <points geometry={geo.dust} material={mats.dust} frustumCulled={false} />
    </>
  );
}
