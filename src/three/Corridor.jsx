import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { projects } from '../data.js';
import { corridor, getMotion, lean } from '../lib/store.js';
import { clamp, damp, easeInOutCubic, rng, smoothstep } from './geo.js';
import { codeWindowTexture, digitAtlasTexture, ghostPanelTexture, whenFontsReady } from './codeTexture.js';

// Stops: 0 = entrance, 1…n = one per project, n+1 = exit.
export const STOPS = projects.length + 2;
const SEG = 16;
const Z0 = 4;
export const stopZ = (k) => Z0 - SEG * k;

const W = 4.4; // half-width
const FLOOR = -2.3;
const CEIL = 2.7;
const H = CEIL - FLOOR;
const Z_NEAR = 12;
const Z_FAR = stopZ(STOPS - 1) - 22;
const LEN = Z_NEAR - Z_FAR;
const MID = (Z_NEAR + Z_FAR) / 2;
const FOG = '#02090c';
const FOG_DENSITY = 0.03;
const WIN_DIST = 5.2;

/* ---------------------------------------------------------------- walls, floor, ceiling */

const panelVert = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const panelFrag = /* glsl */ `
  uniform vec2 uSize;
  uniform vec2 uCell;
  uniform vec3 uBase;
  uniform vec3 uSeam;
  uniform vec3 uLight;
  uniform vec3 uFog;
  uniform float uDensity;
  uniform float uTime;
  uniform float uEdge;
  uniform float uEdgeAxis;
  uniform float uReflect;
  uniform float uLit;
  varying vec2 vUv;
  varying float vDepth;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 p = vUv * uSize;
    vec2 cell = floor(p / uCell);
    vec2 f = fract(p / uCell);
    vec2 g = min(f, 1.0 - f) * uCell;
    float seam = 1.0 - smoothstep(0.0, 0.035, min(g.x, g.y));
    float h = hash(cell);
    vec3 col = uBase * (0.7 + 0.6 * h);
    col += uSeam * seam;
    float lit = step(1.0 - uLit, h) * (0.55 + 0.45 * sin(uTime * 1.1 + h * 50.0));
    col += uLight * lit * 0.2 * (1.0 - seam);
    float e = abs(mix(vUv.x, vUv.y, uEdgeAxis) * 2.0 - 1.0);
    col += uLight * smoothstep(0.7, 1.0, e) * uEdge;
    float rx = (vUv.x - 0.5) * 8.0;
    col += uLight * exp(-rx * rx) * uReflect;
    float fog = 1.0 - exp(-vDepth * uDensity);
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }
`;

function panelMaterial({ size, cell, edgeAxis, edge = 0.05, reflect = 0, lit = 0.06, base = '#0a1d23' }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: new THREE.Vector2(...size) },
      uCell: { value: new THREE.Vector2(...cell) },
      uBase: { value: new THREE.Color(base) },
      uSeam: { value: new THREE.Color('#1d4a52') },
      uLight: { value: new THREE.Color('#7ff3ea') },
      uFog: { value: new THREE.Color(FOG) },
      uDensity: { value: FOG_DENSITY },
      uTime: { value: 0 },
      uEdge: { value: edge },
      uEdgeAxis: { value: edgeAxis },
      uReflect: { value: reflect },
      uLit: { value: lit },
    },
    vertexShader: panelVert,
    fragmentShader: panelFrag,
    side: THREE.DoubleSide,
  });
}

function Shell() {
  const mats = useMemo(
    () => ({
      floor: panelMaterial({ size: [2 * W, LEN], cell: [1.1, 2], edgeAxis: 0, edge: 0.06, reflect: 0.05, lit: 0.03, base: '#071519' }),
      ceil: panelMaterial({ size: [2 * W, LEN], cell: [1.1, 2], edgeAxis: 0, edge: 0.08, lit: 0.08 }),
      wall: panelMaterial({ size: [LEN, H], cell: [2, 0.9], edgeAxis: 1, edge: 0.07, lit: 0.07 }),
    }),
    [],
  );
  useFrame(({ clock }) => {
    for (const m of Object.values(mats)) m.uniforms.uTime.value = clock.elapsedTime;
  });
  const yMid = (FLOOR + CEIL) / 2;
  return (
    <group>
      <mesh position={[0, FLOOR, MID]} rotation={[-Math.PI / 2, 0, 0]} material={mats.floor}>
        <planeGeometry args={[2 * W, LEN]} />
      </mesh>
      <mesh position={[0, CEIL, MID]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceil}>
        <planeGeometry args={[2 * W, LEN]} />
      </mesh>
      <mesh position={[-W, yMid, MID]} rotation={[0, Math.PI / 2, 0]} material={mats.wall}>
        <planeGeometry args={[LEN, H]} />
      </mesh>
      <mesh position={[W, yMid, MID]} rotation={[0, -Math.PI / 2, 0]} material={mats.wall}>
        <planeGeometry args={[LEN, H]} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------- light strips + ribs */

function useInstances(list) {
  const ref = useRef(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach(([p, s], i) => mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...p), q, new THREE.Vector3(...s))));
    mesh.instanceMatrix.needsUpdate = true;
  }, [list]);
  return ref;
}

function Strips() {
  const list = useMemo(() => {
    const out = [];
    const lines = [
      [W - 0.05, CEIL - 0.05, [0.07, 0.04]],
      [-(W - 0.05), CEIL - 0.05, [0.07, 0.04]],
      [W - 0.05, FLOOR + 0.05, [0.07, 0.04]],
      [-(W - 0.05), FLOOR + 0.05, [0.07, 0.04]],
      [1.5, CEIL - 0.03, [0.13, 0.025]],
      [-1.5, CEIL - 0.03, [0.13, 0.025]],
    ];
    for (const [x, y, [sx, sy]] of lines) {
      for (let z = Z_NEAR - 3; z > Z_FAR; z -= 7.4) out.push([[x, y, z], [sx, sy, 6]]);
    }
    return out;
  }, []);
  const ref = useInstances(list);
  const color = useMemo(() => new THREE.Color('#d5fdff').multiplyScalar(2.3), []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

function Ribs() {
  const { frames, accents } = useMemo(() => {
    const frames = [];
    const accents = [];
    const yMid = (FLOOR + CEIL) / 2;
    for (let z = Z_NEAR - 6; z > Z_FAR + 4; z -= 8) {
      frames.push([[0, CEIL - 0.06, z], [2 * W, 0.12, 0.32]]);
      frames.push([[0, FLOOR + 0.06, z], [2 * W, 0.12, 0.32]]);
      frames.push([[-W + 0.06, yMid, z], [0.12, H, 0.32]]);
      frames.push([[W - 0.06, yMid, z], [0.12, H, 0.32]]);
      for (const sx of [-1, 1]) {
        accents.push([[sx * (W - 0.5), CEIL - 0.16, z + 0.17], [0.7, 0.025, 0.02]]);
        accents.push([[sx * (W - 0.16), CEIL - 0.5, z + 0.17], [0.025, 0.7, 0.02]]);
        accents.push([[sx * (W - 0.5), FLOOR + 0.16, z + 0.17], [0.7, 0.025, 0.02]]);
      }
    }
    return { frames, accents };
  }, []);
  const frameRef = useInstances(frames);
  const accentRef = useInstances(accents);
  const accent = useMemo(() => new THREE.Color('#5ef2e3').multiplyScalar(1.5), []);
  return (
    <>
      <instancedMesh ref={frameRef} args={[undefined, undefined, frames.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color="#10313a" />
      </instancedMesh>
      <instancedMesh ref={accentRef} args={[undefined, undefined, accents.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/* ---------------------------------------------------------------- binary rain on the walls */

const bufferSize = new THREE.Vector2();

function Binary() {
  const { geometry, material } = useMemo(() => {
    const rand = rng(42);
    const pos = [];
    const col = [];
    const row = [];
    const size = [];
    for (let z = Z_NEAR; z > Z_FAR; z -= 1.15) {
      for (const sx of [-1, 1]) {
        if (rand() > 0.42) continue;
        const x = sx * (W - 0.14 - rand() * 0.35);
        const c = rand();
        for (let y = FLOOR + 0.45, r = 0; y < CEIL - 0.4; y += 0.34, r++) {
          pos.push(x, y, z + (rand() - 0.5) * 0.2);
          col.push(c);
          row.push(r / 14);
          size.push(0.2);
        }
      }
    }
    // a few big, out-of-focus digits floating near the flight path
    for (let i = 0; i < 90; i++) {
      const sx = rand() < 0.5 ? -1 : 1;
      pos.push(sx * (1.7 + rand() * 2.1), FLOOR + 0.6 + rand() * (H - 1.2), Z_FAR + rand() * LEN);
      col.push(rand());
      row.push(rand());
      size.push(0.34 + rand() * 0.3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 1));
    g.setAttribute('aRow', new THREE.Float32BufferAttribute(row, 1));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: digitAtlasTexture() },
        uColor: { value: new THREE.Color('#5ef2e3') },
        uScale: { value: 800 },
        uTime: { value: 0 },
        uDensity: { value: FOG_DENSITY * 1.4 },
      },
      vertexShader: /* glsl */ `
        attribute float aCol;
        attribute float aRow;
        attribute float aSize;
        uniform float uScale;
        uniform float uTime;
        uniform float uDensity;
        varying float vGlyph;
        varying float vBright;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(-mv.z, 0.2);
          gl_Position = projectionMatrix * mv;
          float tick = floor(uTime * (0.7 + aCol * 1.6) + aCol * 37.0 + aRow * 23.0);
          vGlyph = step(0.5, fract(sin(tick * 12.9898 + aCol * 78.233) * 43758.5453));
          float rain = fract(aRow * 0.85 - uTime * (0.18 + aCol * 0.3) + aCol * 5.0);
          float head = pow(rain, 8.0);
          vBright = (0.18 + 0.82 * head) * exp(-(-mv.z) * uDensity) * smoothstep(0.6, 2.0, -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        uniform vec3 uColor;
        varying float vGlyph;
        varying float vBright;
        void main() {
          vec2 uv = vec2((gl_PointCoord.x + vGlyph) * 0.5, 1.0 - gl_PointCoord.y);
          float a = texture2D(uAtlas, uv).a;
          if (a < 0.03) discard;
          gl_FragColor = vec4(uColor * a * vBright * 1.4, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, []);

  useFrame(({ gl, camera, clock }) => {
    const hpx = gl.getDrawingBufferSize(bufferSize).y;
    material.uniforms.uScale.value = hpx / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    material.uniforms.uTime.value = clock.elapsedTime;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/* ---------------------------------------------------------------- dust that stretches into warp streaks */

function Streaks() {
  const { geometry, material } = useMemo(() => {
    const rand = rng(7);
    const pos = [];
    const end = [];
    let n = 0;
    while (n < 900) {
      const x = (rand() * 2 - 1) * (W - 0.3);
      const y = FLOOR + 0.2 + rand() * (H - 0.4);
      if (Math.abs(x) < 1.1 && Math.abs(y) < 0.9) continue; // keep the flight path clear
      const z = Z_FAR + rand() * LEN;
      pos.push(x, y, z, x, y, z);
      end.push(0, 1);
      n++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uStretch: { value: 0.05 }, uOpacity: { value: 0.3 }, uColor: { value: new THREE.Color('#c4f9ff') } },
      vertexShader: /* glsl */ `
        attribute float aEnd;
        uniform float uStretch;
        varying float vEnd;
        varying float vDepth;
        void main() {
          vec3 p = position;
          p.z += aEnd * uStretch;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          vEnd = aEnd;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vEnd;
        varying float vDepth;
        void main() {
          float fade = exp(-vDepth * 0.045) * smoothstep(0.3, 1.8, vDepth);
          gl_FragColor = vec4(uColor * (1.0 - vEnd) * uOpacity * fade, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, []);

  useFrame(() => {
    const v = corridor.vel;
    material.uniforms.uStretch.value = clamp(v * 0.1, 0.04, 4.5);
    material.uniforms.uOpacity.value = 0.22 + Math.min(1.4, v * 0.06);
  });
  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}

/* ---------------------------------------------------------------- windows */

export function windowLayout(i, aspect, fov) {
  const z = stopZ(i + 1) - WIN_DIST;
  const vh = 2 * WIN_DIST * Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const vw = vh * aspect;
  if (aspect >= 1.1) {
    const side = i % 2 === 0 ? 1 : -1; // window right → card left, then alternate
    const w = Math.min(3.8, vw * 0.41);
    return { x: side * vw * 0.2, y: 0.12, z, w, rotY: -side * 0.26 };
  }
  const w = Math.min(3.2, vw * 0.9);
  return { x: 0, y: -vh * 0.235, z, w, rotY: 0 };
}

function Ghosts() {
  const { gl } = useThree();
  const panels = useMemo(() => {
    const rand = rng(1234);
    const busy = projects.map((_, i) => stopZ(i + 1) - WIN_DIST);
    const textures = [ghostPanelTexture(11, gl), ghostPanelTexture(29, gl), ghostPanelTexture(53, gl)];
    const out = [];
    let guard = 0;
    while (out.length < 14 && guard++ < 400) {
      const z = Z_FAR + 10 + rand() * (LEN - 18);
      if (busy.some((b) => Math.abs(b - z) < 3.4)) continue;
      const sx = rand() < 0.5 ? -1 : 1;
      out.push({
        pos: [sx * (W - 0.95 - rand() * 0.55), 0.15 + (rand() - 0.5) * 1.9, z],
        // wall displays angled toward the oncoming camera: left wall faces +x, right wall faces -x
        rotY: -sx * (1.0 + rand() * 0.3),
        scale: 0.85 + rand() * 0.5,
        map: textures[out.length % textures.length],
      });
    }
    return out;
  }, [gl]);
  return panels.map((p, i) => (
    <mesh key={i} position={p.pos} rotation={[0, p.rotY, 0]} scale={p.scale}>
      <planeGeometry args={[1.9, 1.19]} />
      <meshBasicMaterial map={p.map} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  ));
}

function Windows() {
  const { gl, size, camera } = useThree();
  const [textures, setTextures] = useState(null);
  const refs = useRef([]);

  useEffect(() => {
    let alive = true;
    whenFontsReady().then(() => {
      if (!alive) return;
      setTextures(projects.map((p) => codeWindowTexture({ file: p.file, source: p.source, lang: p.file.endsWith('.yaml') ? 'yaml' : 'python' }, gl)));
    });
    return () => {
      alive = false;
    };
  }, [gl]);

  const aspect = size.width / size.height;
  const fov = aspect < 1.1 ? 62 : 55;
  const layouts = useMemo(() => projects.map((_, i) => windowLayout(i, aspect, fov)), [aspect, fov]);

  useFrame(() => {
    const f = corridor.f;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const L = layouts[i];
      const d = camera.position.z - L.z; // distance ahead of the camera
      const appear = smoothstep(32, 20, d);
      const pass = aspect < 1.1 ? smoothstep(2.6, 4.2, d) : smoothstep(0.6, 2.4, d);
      const focus = 1 - smoothstep(0, 0.6, Math.abs(f - (i + 1)));
      mesh.material.opacity = appear * pass * (0.62 + 0.38 * focus);
      mesh.material.depthWrite = mesh.material.opacity > 0.5; // a faint, far window shouldn't punch holes
      mesh.visible = mesh.material.opacity > 0.01;
      mesh.rotation.y = L.rotY * (1 - focus * 0.35);
      mesh.scale.setScalar(L.w * (1 + focus * 0.03));
    });
  });

  if (!textures) return null;
  // Drawn first and writing depth, so dust and digits behind a window can't bleed through it,
  // while anything in front of it still draws on top.
  return layouts.map((L, i) => (
    <mesh key={projects[i].id} ref={(m) => (refs.current[i] = m)} position={[L.x, L.y, L.z]} rotation={[0, L.rotY, 0]} scale={L.w} renderOrder={-1}>
      <planeGeometry args={[1, 0.625]} />
      <meshBasicMaterial map={textures[i]} transparent alphaTest={0.02} toneMapped={false} color="#d9d9d9" />
    </mesh>
  ));
}

function Portal() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color('#9ff8ff') }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * vec2(1.7, 1.0);
            float r = length(p);
            float core = exp(-r * r * 9.0);
            float dr = r - 0.32;
            float ring = exp(-dr * dr * 220.0) * (0.6 + 0.4 * sin(uTime * 1.5));
            gl_FragColor = vec4(uColor * (core * 2.2 + ring * 0.8), 1.0);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh position={[0, (FLOOR + CEIL) / 2, Z_FAR + 1.5]} material={material}>
      <planeGeometry args={[2 * W, H]} />
    </mesh>
  );
}

/* ---------------------------------------------------------------- camera rig */

function Rig() {
  const { camera, size, invalidate } = useThree();

  // With motion off the canvas renders on demand, so scrolling has to ask for frames.
  useEffect(() => {
    const on = () => invalidate();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [invalidate]);

  const tilt = useMemo(() => ({ x: 0, y: 0 }), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const motion = getMotion();
    const f = clamp(corridor.f, 0, STOPS - 1);
    const k = Math.min(STOPS - 2, Math.floor(f));
    const t = f - k;
    const eased = motion ? easeInOutCubic(t) : Math.round(t);
    const target = stopZ(k) + (stopZ(k + 1) - stopZ(k)) * eased;
    const prev = camera.position.z;
    camera.position.z = motion ? damp(prev, target, 7, dt) : target;
    const vel = dt > 0 ? Math.abs(camera.position.z - prev) / dt : 0;
    corridor.vel = motion ? damp(corridor.vel, vel, 6, dt) : 0;

    const aspect = size.width / size.height;
    const baseFov = aspect < 1.1 ? 62 : 55;
    const l = lean(state.clock.elapsedTime, tilt);
    camera.position.x = motion ? damp(camera.position.x, l.x * 0.35, 3, dt) : 0;
    camera.position.y = motion ? damp(camera.position.y, 0.12 - l.y * 0.2, 3, dt) : 0.12;
    camera.lookAt(camera.position.x * 0.3, 0.1, camera.position.z - 10);
    const fov = baseFov + (motion ? Math.min(9, corridor.vel * 0.3) : 0);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = motion ? damp(camera.fov, fov, 5, dt) : fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

export default function Corridor() {
  return (
    <>
      <fogExp2 attach="fog" args={[FOG, FOG_DENSITY]} />
      <Rig />
      <Shell />
      <Strips />
      <Ribs />
      <Binary />
      <Streaks />
      <Ghosts />
      <Windows />
      <Portal />
    </>
  );
}
