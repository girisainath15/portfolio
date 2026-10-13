import { useEffect, useRef, useState } from 'react';
import { getMotion } from './store.js';

// True once the element has scrolled into view (and stays true).
export function useInView(ref, { rootMargin = '0px 0px -12% 0px', once = true } = {}) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) setSeen(false);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return seen;
}

const finePointer = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Pointer-driven 3D tilt. Writes CSS variables directly, so moving the mouse never re-renders React.
export function useTilt(max = 3.5) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer) return undefined;
    let raf = 0;
    let px = 0.5;
    let py = 0.5;
    const paint = () => {
      raf = 0;
      el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    };
    const onMove = (e) => {
      if (!getMotion()) return;
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max]);
  return ref;
}

// "HH:MM" in a given time zone, refreshed on the minute.
export function useClock(timeZone) {
  const fmt = () =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(new Date());
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      setNow(fmt());
      id = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    id = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeZone]);
  return now;
}

export function useMedia(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
