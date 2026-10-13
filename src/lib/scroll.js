import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { getMotion } from './store.js';

// Inertial wheel scrolling (Lenis) while motion is on; plain native scrolling otherwise.
// Lenis moves the real window scroll position, so sticky sections and scroll listeners keep working.

let lenis = null;

export function enableSmoothScroll(on) {
  if (on && !lenis) {
    lenis = new Lenis({ autoRaf: true, lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true });
  } else if (!on && lenis) {
    lenis.destroy();
    lenis = null;
  }
}

export function scrollToY(y, { immediate = false } = {}) {
  const top = Math.max(0, y);
  if (lenis) {
    lenis.scrollTo(top, { immediate, duration: immediate ? 0 : Math.min(2.6, 1 + Math.abs(top - window.scrollY) / 4000) });
  } else {
    window.scrollTo({ top, behavior: immediate || !getMotion() ? 'auto' : 'smooth' });
  }
}

// Leaves room for the fixed tab bar; elements can opt out with data-offset="0" (the pinned corridor).
export function scrollToId(id, { focus = false } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = el.dataset.offset != null ? Number(el.dataset.offset) : 76;
  const y = id === 'home' ? 0 : el.getBoundingClientRect().top + window.scrollY - offset;
  scrollToY(y);
  if (focus) el.focus({ preventScroll: true });
}

export function lockScroll(locked) {
  if (lenis) (locked ? lenis.stop() : lenis.start());
  document.documentElement.classList.toggle('is-locked', locked);
}

// Route every in-page link (#id) through scrollToId so Lenis and the corridor animate the trip.
export function interceptAnchors() {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    scrollToId(id, { focus: a.hasAttribute('data-focus') });
    history.replaceState(null, '', `#${id}`);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
