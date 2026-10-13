import { useSyncExternalStore } from 'react';

// Tiny shared state kept outside React, so 60fps readers (the 3D scenes) never cause re-renders.

const reduceQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function initialMotion() {
  try {
    const saved = localStorage.getItem('hud-motion');
    if (saved === 'on') return true;
    if (saved === 'off') return false;
  } catch {
    /* storage blocked: fall through to the OS setting */
  }
  return !(reduceQuery && reduceQuery.matches);
}

const state = { motion: typeof window === 'undefined' ? true : initialMotion() };
const subs = new Set();

function apply() {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('still', !state.motion);
}
apply();

export const getMotion = () => state.motion;

export function setMotion(on) {
  state.motion = on;
  try {
    localStorage.setItem('hud-motion', on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  apply();
  subs.forEach((fn) => fn());
}

const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export function useMotion() {
  return useSyncExternalStore(subscribe, getMotion, getMotion);
}

// Normalised pointer, -1…1 on both axes. One listener for the whole page.
export const pointer = { x: 0, y: 0, at: -Infinity };
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.at = performance.now();
    },
    { passive: true },
  );
}

// Where the 3D cameras should lean: toward the mouse while it moves, otherwise a slow idle drift.
// Phones and tablets have no hover pointer, so they always get the drift.
export function lean(time, out) {
  if (performance.now() - pointer.at < 4000) {
    out.x = pointer.x;
    out.y = pointer.y;
  } else {
    out.x = Math.sin(time * 0.17) * 0.6;
    out.y = Math.sin(time * 0.11 + 1.3) * 0.4;
  }
  return out;
}

// Corridor flight state: `f` is the stop index (0 = entrance … STOPS-1 = exit) the DOM asks for;
// the 3D rig damps toward it and reports its speed back for the warp streaks.
export const corridor = { f: 0, vel: 0, snap: false };
