import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp, damp, rng } from './geo.js';
import { glowPointMaterial, pointGeometry, ribbonGeometry, ribbonMaterial, fresnelMaterial, useShaderClock } from './materials.js';
import { getMotion } from '../lib/store.js';

// A projector on the floor throws a cone of light; the skills of one area orbit a spinning core inside it.

const BASE_Y = -1.75;
const ORBIT_R = 2.05;
const HELIX_R = 0.95;
const FOV = 42;

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function coneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#5ef2e3') }, uTime: { value: 0 }, uReveal: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uReveal;
      varying vec2 vUv;
      void main() {
        float h = vUv.y;                                   // 0 at the projector, 1 at the top
        float fade = pow(1.0 - h, 1.4) * smoothstep(0.0, 0.05, h);
        float scan = 0.65 + 0.35 * sin(h * 90.0 - uTime * 4.0);
        float band = smoothstep(0.82, 1.0, fract(h * 5.0 - uTime * 0.4));
        float grow = smoothstep(h - 0.15, h, uReveal);     // the beam rises when it opens
        gl_FragColor = vec4(uColor * fade * (0.16 * scan + 0.14 * band) * grow, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function padMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#5ef2e3') }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float rings = pow(abs(sin(r * 26.0 - uTime * 1.6)), 36.0) * (1.0 - r);
        float a = atan(p.y, p.x);
        float ticks = step(0.94, abs(sin(a * 30.0 + uTime * 0.3))) * smoothstep(0.82, 0.86, r) * smoothstep(1.0, 0.95, r);
        float rim = smoothstep(0.9, 0.97, r) * smoothstep(1.0, 0.97, r);
        float core = exp(-r * r * 9.0);
        gl_FragColor = vec4(uColor * (rings * 0.7 + ticks * 0.9 + rim * 0.8 + core * 0.9), 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function particleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 800 }, uColor: { value: new THREE.Color('#9ff8ff') } },
    vertexShader: /* glsl */ `
      attribute float aAng;
      attribute float aRad;
      attribute float aPhase;
      attribute float aSpeed;
      uniform float uTime;
      uniform float uScale;
      varying float vA;
      void main() {
        float h = fract(aPhase + uTime * aSpeed);
        float r = mix(0.9, 2.5, h) * aRad;
        float ang = aAng + h * 1.4;
        vec3 p = vec3(cos(ang) * r, ${BASE_Y.toFixed(2)} + h * 3.4, sin(ang) * r);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 0.05 * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
        vA = sin(h * 3.14159);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        gl_FragColor = vec4(uColor * (1.0 - d) * vA * 0.9, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function particleGeometry(count) {
  const rand = rng(91);
  const g = new THREE.BufferGeometry();
  const f = (fn) => new THREE.Float32BufferAttribute(Array.from({ length: count }, fn), 1);
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aAng', f(() => rand() * Math.PI * 2));
  g.setAttribute('aRad', f(() => 0.25 + rand() * 0.75));
  g.setAttribute('aPhase', f(() => rand()));
  g.setAttribute('aSpeed', f(() => 0.06 + rand() * 0.1));
  return g;
}

export default function Hologram({ count, tagEls, spin }) {
  const { camera, size } = useThree();

  // Wide screens: skills sit on one orbit, alternating above and below it so neighbours don't collide.
  // Tall screens: they climb the beam as a helix, using the height instead of the width.
  const portrait = size.width / Math.max(1, size.height) < 0.9;
  const nodes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        if (portrait) {
          const a = i * 2.4;
          return V(Math.cos(a) * HELIX_R, -1.05 + (i / Math.max(1, count - 1)) * 3.0, Math.sin(a) * HELIX_R);
        }
        const a = (i / count) * Math.PI * 2;
        return V(Math.cos(a) * ORBIT_R, i % 2 ? -0.42 : 0.5, Math.sin(a) * ORBIT_R);
      }),
    [count, portrait],
  );
  const widths = useRef([]);

  const geo = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(0.55, 1);
    const e = new THREE.EdgesGeometry(ico, 1).attributes.position;
    const icoSegs = [];
    for (let i = 0; i < e.count; i += 2) icoSegs.push([e.getX(i), e.getY(i), e.getZ(i), e.getX(i + 1), e.getY(i + 1), e.getZ(i + 1)]);
    const reveal = (i) => 0.25 + (i / count) * 0.6;
    const spokes = nodes.map((n) => [0, n.y * 0.25, 0, n.x, n.y, n.z]);
    const ring = (y) => {
      const pts = Array.from({ length: 120 }, (_, i) => {
        const a = (i / 120) * Math.PI * 2;
        return V(Math.cos(a) * ORBIT_R, y, Math.sin(a) * ORBIT_R);
      });
      return pts.map((p, i) => [p.x, p.y, p.z, pts[(i + 1) % 120].x, pts[(i + 1) % 120].y, pts[(i + 1) % 120].z]);
    };
    return {
      ico: ribbonGeometry(icoSegs, { phase: icoSegs.map((_, i) => (i * 0.37) % 1) }),
      spokes: ribbonGeometry(spokes, { phase: nodes.map((_, i) => i / count), reveal: nodes.map((_, i) => reveal(i)) }),
      rings: ribbonGeometry([...ring(0.5), ...ring(-0.42)], { phase: Array.from({ length: 240 }, (_, i) => (i % 120) / 120) }),
      nodes: pointGeometry(nodes, { size: 0.32, phase: (i) => i / count, reveal }),
      particles: particleGeometry(240),
    };
  }, [nodes, count]);

  const mats = useMemo(
    () => ({
      ico: ribbonMaterial({ color: '#7fe9f2', hot: '#ffffff', width: 1.6, opacity: 0.8, pulse: 1, speed: 0.4, near: 2, far: 40 }),
      spokes: ribbonMaterial({ color: '#2fd3c4', hot: '#f0fffc', width: 1.6, opacity: 0.45, pulse: 1.4, speed: 0.5, near: 2, far: 40 }),
      rings: ribbonMaterial({ color: '#59e3f0', hot: '#f0feff', width: 1.3, opacity: 0.22, pulse: 1.2, speed: 0.12, segLen: 1 / 120, trail: true, near: 2, far: 40 }),
      nodes: glowPointMaterial({ color: '#4ff6da', core: '#f2fffd', opacity: 1.1, twinkle: 0.15, near: 2, far: 40 }),
      core: fresnelMaterial({ color: '#5ef2e3', power: 2, intensity: 1.2 }),
      cone: coneMaterial(),
      pad: padMaterial(),
      particles: particleMaterial(),
    }),
    [],
  );
  useShaderClock([mats.ico, mats.spokes, mats.rings, mats.nodes, mats.particles]);

  const group = useRef(null);
  const core = useRef(null);
  const reveal = useRef(getMotion() ? 0 : 1);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const motion = getMotion();
    reveal.current = motion ? Math.min(1, reveal.current + dt / 1.6) : 1;
    const r = reveal.current;
    mats.spokes.uniforms.uReveal.value = r;
    mats.nodes.uniforms.uReveal.value = r;
    mats.cone.uniforms.uReveal.value = r * 1.2;
    mats.cone.uniforms.uTime.value = t;
    mats.pad.uniforms.uTime.value = t;

    // fit the orbit and its labels on narrow screens
    const aspect = size.width / Math.max(1, size.height);
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    if (portrait) {
      camera.position.set(0, 0.9, Math.max(7.2, (HELIX_R + 1.1) / (tan * aspect)));
      camera.lookAt(0, 0.2, 0);
    } else {
      camera.position.set(0, 1.1, Math.max(6.5, (ORBIT_R + 1.5) / (tan * aspect)));
      camera.lookAt(0, -0.25, 0);
    }
    if (camera.fov !== FOV) {
      camera.fov = FOV;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    // auto-rotate, plus whatever the visitor flings with a drag
    const s = spin.current;
    if (!s.dragging) s.vel = damp(s.vel, 0, 1.6, dt);
    s.angle += (motion ? 0.22 * dt : 0) + s.vel * dt;
    group.current.rotation.y = s.angle;
    group.current.updateMatrixWorld();
    if (core.current) {
      core.current.rotation.set(t * 0.4, t * 0.6, 0);
      core.current.scale.setScalar(0.3 + 0.7 * clamp(r * 2, 0, 1));
    }

    // pin labels to their nodes; the far side of the orbit dims and shrinks
    const w = size.width;
    const h = size.height;
    const els = tagEls.current;
    for (let i = 0; i < count; i++) {
      const el = els[i];
      if (!el) continue;
      v.copy(nodes[i]).applyMatrix4(group.current.matrixWorld);
      const front = clamp(v.z / (portrait ? HELIX_R : ORBIT_R), -1, 1) * 0.5 + 0.5; // 0 = back, 1 = front
      v.project(camera);
      const shown = clamp((r - (0.25 + (i / count) * 0.6)) * 6, 0, 1);
      // keep the whole label on screen (it hangs centred above its node)
      if (!widths.current[i]) widths.current[i] = el.firstElementChild?.offsetWidth || 0;
      const half = widths.current[i] / 2 + 6;
      const x = clamp((v.x * 0.5 + 0.5) * w, half, Math.max(half, w - half));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${((0.5 - v.y * 0.5) * h).toFixed(1)}px, 0) scale(${(0.78 + 0.3 * front).toFixed(3)})`;
      el.style.opacity = (shown * (0.32 + 0.68 * front)).toFixed(3);
      el.style.zIndex = String(Math.round(front * 100));
    }
  });

  return (
    <>
      <mesh position={[0, BASE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.pad}>
        <circleGeometry args={[2.5, 96]} />
      </mesh>
      <mesh position={[0, BASE_Y + 1.7, 0]} material={mats.cone}>
        <cylinderGeometry args={[2.7, 1.05, 3.4, 64, 1, true]} />
      </mesh>
      <points geometry={geo.particles} material={mats.particles} frustumCulled={false} />
      <group ref={group}>
        {!portrait && <mesh geometry={geo.rings} material={mats.rings} frustumCulled={false} />}
        <mesh geometry={geo.spokes} material={mats.spokes} frustumCulled={false} />
        <points geometry={geo.nodes} material={mats.nodes} frustumCulled={false} />
        <group ref={core}>
          <mesh geometry={geo.ico} material={mats.ico} frustumCulled={false} />
          <mesh material={mats.core}>
            <sphereGeometry args={[0.42, 32, 24]} />
          </mesh>
        </group>
      </group>
    </>
  );
}
