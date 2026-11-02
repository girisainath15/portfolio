import { useEffect, useRef, useState } from 'react';
import Stage from '../three/Stage.jsx';
import Corridor, { STOPS } from '../three/Corridor.jsx';
import { projects } from '../data.js';
import { corridor, useMotion } from '../lib/store.js';
import { scrollToY } from '../lib/scroll.js';
import { ArrowDown } from './Icons.jsx';

const VH_PER_STOP = 88;
const portrait = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 1.1;

// Scroll-pinned corridor. Scroll position → stop index `f`; the 3D camera flies to it and the matching
// card fades in beside its window. Cards stay in the DOM (and accessibility tree) at all times.
export default function Systems() {
  const section = useRef(null);
  const cards = useRef([]);
  const readout = useRef(null);
  const [active, setActive] = useState(0);
  const motion = useMotion();

  useEffect(() => {
    corridor.snap = !motion;
  }, [motion]);

  useEffect(() => {
    const sec = section.current;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = sec.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      const f = p * (STOPS - 1);
      corridor.f = f;
      cards.current.forEach((el, i) => {
        if (!el) return;
        const d = f - i;
        // fully solid near its stop, then a quick fade while flying between stops
        const o = Math.max(0, Math.min(1, 1 - (Math.abs(d) - 0.12) * 3.4));
        el.style.opacity = o.toFixed(3);
        el.style.translate = `0 ${(-d * 46).toFixed(1)}px`;
        el.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
      });
      sec.style.setProperty('--p', p.toFixed(4));
      if (readout.current) readout.current.textContent = `DEPTH ${String(Math.round(f * 16)).padStart(3, '0')} m`;
      const a = Math.round(f);
      setActive((prev) => (prev === a ? prev : a));
    };
    // Snap: once scrolling comes to rest inside the corridor, glide to the next stop in the direction of
    // travel (a small nudge settles back), so every pause lands squarely on a project window.
    let idle = 0;
    let restY = window.scrollY; // where the last scroll came to rest
    let touching = false;
    const snap = () => {
      if (touching) return;
      const y = window.scrollY;
      const moved = y - restY;
      restY = y;
      const r = sec.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0 || r.top > 0 || -r.top >= span) return; // not pinned: leave normal scrolling alone
      const stopPx = span / (STOPS - 1);
      const f = -r.top / stopPx;
      let target = Math.round(f);
      if (Math.abs(moved) > stopPx * 0.15) target = moved > 0 ? Math.ceil(f - 0.05) : Math.floor(f + 0.05);
      target = Math.max(0, Math.min(STOPS - 1, target));
      if (Math.abs(f - target) < 0.01) return;
      const goal = r.top + y + target * stopPx;
      restY = goal;
      scrollToY(goal);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
      clearTimeout(idle);
      idle = setTimeout(snap, 160);
    };
    const onTouchStart = () => {
      touching = true;
      clearTimeout(idle);
    };
    const onTouchEnd = () => {
      touching = false;
      clearTimeout(idle);
      idle = setTimeout(snap, 220); // let momentum scrolling finish first
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const jump = (k) => {
    const sec = section.current;
    const top = sec.getBoundingClientRect().top + window.scrollY;
    const span = sec.offsetHeight - window.innerHeight;
    scrollToY(top + (k / (STOPS - 1)) * span);
  };

  return (
    <section
      id="systems"
      ref={section}
      className="systems"
      data-offset="0"
      tabIndex={-1}
      aria-labelledby="systems-title"
      style={{ height: `calc(${(STOPS - 1) * VH_PER_STOP}vh + 100vh)` }}
    >
      <div className="sys-sticky">
        <Stage className="sys-stage" camera={{ fov: portrait ? 62 : 55, near: 0.1, far: 160, position: [0, 0.12, 4] }} bloom={{ intensity: 0.95, threshold: 0.5, radius: 0.7 }}>
          <Corridor />
        </Stage>
        <div className="sys-shade" aria-hidden="true" />

        <div className="sys-cards">
          <article className="sys-card sys-intro" ref={(el) => (cards.current[0] = el)}>
            <p className="sec-kicker">
              <span>// 02</span> Systems
            </p>
            <h2 className="sec-title" id="systems-title">
              Systems I&rsquo;ve built
            </h2>
            <p className="sec-lead">Five platforms from my time at State Street. Each window down this corridor is one of them, scroll to fly through.</p>
            <ol className="sys-index">
              {projects.map((p) => (
                <li key={p.id}>
                  <span>{p.code}</span>
                  {p.title}
                </li>
              ))}
            </ol>
            <p className="sys-hint">
              <ArrowDown width={15} height={15} /> scroll to fly
            </p>
          </article>

          {projects.map((p, i) => (
            <article key={p.id} className={`sys-card sys-proj ${i % 2 === 0 ? 'on-left' : 'on-right'}`} ref={(el) => (cards.current[i + 1] = el)} aria-labelledby={`sys-${p.id}`}>
              <p className="sys-code">
                <span>{p.code}</span>
                {p.tag}
                <em>{p.when}</em>
              </p>
              <h3 className="sys-title" id={`sys-${p.id}`}>
                {p.title}
              </h3>
              <p className="sys-sub">{p.subtitle}</p>
              <p className="sys-blurb">{p.blurb}</p>
              <dl className="sys-stats">
                {p.stats.map(([value, label]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="sys-details">
                {p.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p className="sys-stack">
                {p.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </p>
            </article>
          ))}

          <article className="sys-card sys-exit" ref={(el) => (cards.current[STOPS - 1] = el)} aria-hidden="true">
            <p className="hud-label">end of corridor</p>
            <p className="sys-exit-title">Next: uplink</p>
            <ArrowDown width={18} height={18} />
          </article>
        </div>

        <nav className="sys-rail" aria-label="Jump to a system">
          <span className="sys-rail-track" aria-hidden="true">
            <i />
          </span>
          {projects.map((p, i) => (
            <button key={p.id} type="button" className={active === i + 1 ? 'is-active' : ''} aria-current={active === i + 1 ? 'true' : undefined} onClick={() => jump(i + 1)}>
              <span className="sys-rail-code">{p.code.slice(-2)}</span>
              <span className="sys-rail-name">{p.title}</span>
            </button>
          ))}
        </nav>

        <div className="sys-readout" aria-hidden="true">
          <span>
            SYS {String(Math.min(Math.max(active, 0), projects.length)).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
          </span>
          <span ref={readout}>DEPTH 000 m</span>
        </div>
      </div>
    </section>
  );
}
