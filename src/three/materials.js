import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/* -------------------------------------------------------------------------------------------------
 * Glow ribbons: screen-space quads per line segment, with a soft core + halo profile.
 * WebGL lines are 1px; these keep a real width, fade with depth, and can carry travelling pulses
 * (PULSE: random packets per edge) or a comet trail along a whole path (TRAIL).
 * -----------------------------------------------------------------------------------------------*/

const ribbonVert = /* glsl */ `
  attribute vec3 aOther;
  attribute float aT;
  attribute float aSide;
  attribute float aPhase;
  attribute float aReveal;
  uniform vec2 uResolution;
  uniform float uWidth;
  uniform float uReveal;
  uniform float uNear;
  uniform float uFar;
  varying float vSide;
  varying float vT;
  varying float vPhase;
  varying float vFade;
  void main() {
    vec4 own = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec4 other = projectionMatrix * modelViewMatrix * vec4(aOther, 1.0);
    vec2 halfRes = uResolution * 0.5;
    vec2 sOwn = own.xy / own.w * halfRes;
    vec2 sOther = other.xy / other.w * halfRes;
    vec2 dir = (sOther - sOwn) * (aT > 0.5 ? -1.0 : 1.0);
    float len = length(dir);
    dir = len > 0.0001 ? dir / len : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    float w = uWidth * clamp(10.0 / own.w, 0.45, 1.7);
    own.xy += nrm * aSide * (w * 0.5) / halfRes * own.w;
    gl_Position = own;
    vSide = aSide;
    vT = aT;
    vPhase = aPhase;
    float shown = smoothstep(aReveal, aReveal + 0.12, uReveal);
    vFade = shown * (1.0 - smoothstep(uNear, uFar, own.w));
    #ifdef SPHERE_FADE
      vec3 n = normalize(normalMatrix * normalize(position));
      vFade *= mix(0.14, 1.0, smoothstep(-0.25, 0.35, n.z));
    #endif
  }
`;

const ribbonFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHot;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPulse;
  uniform float uSpeed;
  uniform float uSegLen;
  varying float vSide;
  varying float vT;
  varying float vPhase;
  varying float vFade;
  void main() {
    float d = abs(vSide);
    float core = 1.0 - smoothstep(0.0, 0.55, d);
    float halo = (1.0 - d) * (1.0 - d) * 0.45;
    float profile = core + halo;
    float hot = 0.0;
    #ifdef TRAIL
      float s = vPhase + vT * uSegLen;
      float behind = fract(uTime * uSpeed - s);
      hot = exp(-behind * 9.0) * uPulse;
    #else
      float cyc = uTime * uSpeed + vPhase;
      float p = fract(cyc);
      float gate = step(0.64, fract(sin(floor(cyc) * 12.9898 + vPhase * 78.233) * 43758.5453));
      float dx = (vT - p) * 7.0;
      hot = exp(-dx * dx) * gate * uPulse;
    #endif
    vec3 col = uColor * uOpacity * profile + uHot * hot * profile * 1.6;
    gl_FragColor = vec4(col * vFade, 1.0);
  }
`;

export function ribbonMaterial({
  color = '#5ef2e3',
  hot = '#eafffb',
  width = 2,
  opacity = 0.8,
  pulse = 0,
  speed = 0.25,
  segLen = 0,
  trail = false,
  sphereFade = false,
  near = 4,
  far = 40,
} = {}) {
  const defines = {};
  if (trail) defines.TRAIL = '';
  if (sphereFade) defines.SPHERE_FADE = '';
  const mat = new THREE.ShaderMaterial({
    defines,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uHot: { value: new THREE.Color(hot) },
      uOpacity: { value: opacity },
      uWidth: { value: width },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uPulse: { value: pulse },
      uSpeed: { value: speed },
      uSegLen: { value: segLen },
      uReveal: { value: 1 },
      uNear: { value: near },
      uFar: { value: far },
    },
    vertexShader: ribbonVert,
    fragmentShader: ribbonFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  mat.userData.baseWidth = width;
  return mat;
}

// segments: [[ax, ay, az, bx, by, bz], …]; phase / reveal: one value per segment.
export function ribbonGeometry(segments, { phase, reveal } = {}) {
  const n = segments.length;
  const pos = new Float32Array(n * 12);
  const other = new Float32Array(n * 12);
  const t = new Float32Array(n * 4);
  const side = new Float32Array(n * 4);
  const ph = new Float32Array(n * 4);
  const rv = new Float32Array(n * 4);
  const index = n * 4 > 65535 ? new Uint32Array(n * 6) : new Uint16Array(n * 6);
  for (let i = 0; i < n; i++) {
    const s = segments[i];
    for (let v = 0; v < 4; v++) {
      const k = i * 4 + v;
      const atB = v >= 2;
      for (let c = 0; c < 3; c++) {
        pos[k * 3 + c] = atB ? s[3 + c] : s[c];
        other[k * 3 + c] = atB ? s[c] : s[3 + c];
      }
      t[k] = atB ? 1 : 0;
      side[k] = v % 2 ? 1 : -1;
      ph[k] = phase ? phase[i] : 0;
      rv[k] = reveal ? reveal[i] : 0;
    }
    const b = i * 4;
    index.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], i * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aOther', new THREE.BufferAttribute(other, 3));
  g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aReveal', new THREE.BufferAttribute(rv, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

/* -------------------------------------------------------------------------------------------------
 * Glow points: nodes with a hot core and a soft halo, sized in world units.
 * -----------------------------------------------------------------------------------------------*/

const pointVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aReveal;
  uniform float uScale;
  uniform float uTime;
  uniform float uReveal;
  uniform float uNear;
  uniform float uFar;
  uniform float uTwinkle;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float shown = smoothstep(aReveal, aReveal + 0.1, uReveal);
    float tw = 1.0 + uTwinkle * sin(uTime * 2.1 + aPhase * 6.2831);
    gl_PointSize = aSize * uScale * tw * shown / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
    vFade = shown * (1.0 - smoothstep(uNear, uFar, -mv.z));
    #ifdef SPHERE_FADE
      vec3 n = normalize(normalMatrix * normalize(position));
      vFade *= mix(0.1, 1.0, smoothstep(-0.25, 0.35, n.z));
    #endif
  }
`;

const pointFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCore;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.3, d);
    float halo = exp(-d * d * 4.0) * (1.0 - d);
    vec3 col = uColor * halo * uOpacity + uCore * core;
    gl_FragColor = vec4(col * vFade, 1.0);
  }
`;

export function glowPointMaterial({ color = '#4ff5d8', core = '#f2fffd', opacity = 0.9, twinkle = 0, near = 4, far = 40, sphereFade = false } = {}) {
  return new THREE.ShaderMaterial({
    defines: sphereFade ? { SPHERE_FADE: '' } : {},
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uCore: { value: new THREE.Color(core) },
      uOpacity: { value: opacity },
      uScale: { value: 800 },
      uTime: { value: 0 },
      uReveal: { value: 1 },
      uNear: { value: near },
      uFar: { value: far },
      uTwinkle: { value: twinkle },
    },
    vertexShader: pointVert,
    fragmentShader: pointFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function pointGeometry(positions, { size, phase, reveal } = {}) {
  const n = positions.length;
  const pos = new Float32Array(n * 3);
  const s = new Float32Array(n);
  const ph = new Float32Array(n);
  const rv = new Float32Array(n);
  positions.forEach((p, i) => {
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
    s[i] = typeof size === 'function' ? size(i) : size ?? 0.2;
    ph[i] = typeof phase === 'function' ? phase(i) : 0;
    rv[i] = typeof reveal === 'function' ? reveal(i) : 0;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aReveal', new THREE.BufferAttribute(rv, 1));
  return g;
}

/* -------------------------------------------------------------------------------------------------
 * Bokeh: big, soft, out-of-focus discs with a faint rim, drifting slowly.
 * -----------------------------------------------------------------------------------------------*/

export function bokehMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 800 }, uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uScale;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.05 + aPhase * 6.2831) * 0.6;
        p.y += sin(uTime * 0.07 + aPhase * 12.566) * 0.4 + uTime * 0.02 * (0.5 + aPhase);
        p.y = mod(p.y + 9.0, 18.0) - 9.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min(aSize * uScale / max(-mv.z, 0.5), 260.0);
        gl_Position = projectionMatrix * mv;
        vColor = aColor;
        vAlpha = 0.55 + 0.45 * sin(uTime * 0.4 + aPhase * 40.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float disc = 1.0 - smoothstep(0.78, 1.0, d);
        float rim = smoothstep(0.62, 0.92, d) * disc * 0.55;
        float a = (disc * 0.4 + rim) * vAlpha * uOpacity;
        gl_FragColor = vec4(vColor * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/* -------------------------------------------------------------------------------------------------
 * Fresnel rim (globe atmosphere).
 * -----------------------------------------------------------------------------------------------*/

export function fresnelMaterial({ color = '#3fe6d6', power = 2.6, intensity = 1.2 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uIntensity: { value: intensity } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), uPower);
        gl_FragColor = vec4(uColor * f * uIntensity, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/* -------------------------------------------------------------------------------------------------
 * Keep per-frame uniforms (time, resolution, point scale) in sync for a set of materials.
 * -----------------------------------------------------------------------------------------------*/

const tmp = new THREE.Vector2();

export function useShaderClock(materials, timeRef) {
  useFrame((state) => {
    const { gl, camera, clock } = state;
    gl.getDrawingBufferSize(tmp);
    const t = timeRef ? timeRef.current : clock.elapsedTime;
    const scale = tmp.y / (2 * Math.tan(THREE.MathUtils.degToRad((camera.fov || 50) / 2)));
    const dpr = gl.getPixelRatio();
    for (const m of materials) {
      if (!m) continue;
      const u = m.uniforms;
      if (u.uTime) u.uTime.value = t;
      if (u.uResolution) u.uResolution.value.copy(tmp);
      if (u.uScale) u.uScale.value = scale;
      if (u.uWidth && m.userData.baseWidth) u.uWidth.value = m.userData.baseWidth * dpr;
    }
  });
}
