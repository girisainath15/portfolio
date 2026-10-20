import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Stage from '../three/Stage.jsx';
import Hologram from '../three/Hologram.jsx';
import { stack } from '../data.js';
import { lockScroll } from '../lib/scroll.js';
import { Arrow, Close } from './Icons.jsx';

// Full-screen hologram of one stack area. Rendered in a portal so the tilted panels can't trap `position: fixed`.
export default function SkillHolo({ index, onClose, onSwitch }) {
  const area = stack[index];
  const tagEls = useRef([]);
  const spin = useRef({ angle: 0, vel: 0, dragging: false, x: 0 });
  const closeBtn = useRef(null);
  const dialog = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    lockScroll(true);
    closeBtn.current?.focus();
    return () => {
      lockScroll(false);
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onSwitch(1);
      else if (e.key === 'ArrowLeft') onSwitch(-1);
      else if (e.key === 'Tab' && dialog.current) {
        const items = [...dialog.current.querySelectorAll('button')];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (!e.shiftKey && i === items.length - 1) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onSwitch]);

  // drag to spin the orbit; the scene keeps the momentum
  const drag = {
    onPointerDown: (e) => {
      const s = spin.current;
      s.dragging = true;
      s.x = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const s = spin.current;
      if (!s.dragging) return;
      const dx = e.clientX - s.x;
      s.x = e.clientX;
      s.angle += dx * 0.008;
      s.vel = dx * 0.5;
    },
    onPointerUp: () => {
      spin.current.dragging = false;
    },
  };

  return createPortal(
    <div className="holo" role="dialog" aria-modal="true" aria-labelledby="holo-title" ref={dialog}>
      <div className="holo-scrim" onClick={onClose} />
      <div className="holo-panel">
        <header className="holo-head">
          <span className="hud-tab">HOLO · PROJECTION</span>
          <h3 className="holo-title" id="holo-title">
            {area.label} <b>{area.items.length}</b>
          </h3>
          <button type="button" className="ibtn" ref={closeBtn} aria-label="Close hologram" onClick={onClose}>
            <Close />
          </button>
        </header>

        <div className="holo-stage" {...drag}>
          <Stage className="holo-canvas" camera={{ fov: 42, near: 0.1, far: 80, position: [0, 1.25, 8] }} bloom={{ intensity: 1.25, threshold: 0.12, radius: 0.75 }}>
            <Hologram key={area.id} count={area.items.length} tagEls={tagEls} spin={spin} />
          </Stage>
          <div className="holo-tags" key={area.id}>
            {area.items.map((item, i) => (
              <span key={item} className="holo-tag" ref={(el) => (tagEls.current[i] = el)}>
                <span>
                  <i aria-hidden="true">{String(i + 1).padStart(2, '0')}</i>
                  {item}
                </span>
              </span>
            ))}
          </div>
          <div className="holo-scan" aria-hidden="true" />
          <p className="holo-hint" aria-hidden="true">
            drag to spin · ← → switch area · esc to close
          </p>
        </div>

        <nav className="holo-areas" aria-label="Stack areas">
          <button type="button" className="ibtn" aria-label="Previous area" onClick={() => onSwitch(-1)}>
            <Arrow style={{ transform: 'scaleX(-1)' }} />
          </button>
          <div className="holo-chips">
            {stack.map((s, i) => (
              <button key={s.id} type="button" className={`chip ${i === index ? 'is-on' : ''}`} aria-pressed={i === index} onClick={() => onSwitch(i - index)}>
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" className="ibtn" aria-label="Next area" onClick={() => onSwitch(1)}>
            <Arrow />
          </button>
        </nav>
      </div>
    </div>,
    document.body,
  );
}
