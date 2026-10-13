import { Component, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useMotion } from '../lib/store.js';

const webgl = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();

const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700;

class GLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    console.warn('3D scene disabled:', err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// One WebGL canvas per 3D section. It mounts when the section is about a screen away, renders only
// while visible, and drops to a single still frame when motion is off.
export default function Stage({ className = '', camera, bloom = {}, children }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const motion = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const soon = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '120% 0px' });
    const seen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '8% 0px' });
    soon.observe(el);
    seen.observe(el);
    return () => {
      soon.disconnect();
      seen.disconnect();
    };
  }, []);

  const frameloop = !visible ? 'never' : motion ? 'always' : 'demand';
  const { intensity = 1.05, threshold = 0.16, radius = 0.72 } = bloom;

  return (
    <div ref={ref} className={`stage ${ready ? 'is-ready' : ''} ${className}`} aria-hidden="true">
      {webgl && near && (
        <GLBoundary>
          <Canvas
            frameloop={frameloop}
            flat
            style={{ pointerEvents: 'none' }}
            dpr={[1, small ? 1.5 : 1.75]}
            camera={camera}
            gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
            onCreated={() => requestAnimationFrame(() => setReady(true))}
          >
            <color attach="background" args={['#02070a']} />
            {children}
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur intensity={intensity} luminanceThreshold={threshold} luminanceSmoothing={0.22} radius={radius} />
            </EffectComposer>
          </Canvas>
        </GLBoundary>
      )}
    </div>
  );
}
