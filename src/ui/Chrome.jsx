import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { profile } from '../data.js';
import { setMotion, useMotion } from '../lib/store.js';
import { lockScroll, scrollToId } from '../lib/scroll.js';
import { ArrowUpRight, Close, Cube, Doc, Icosa, Logo, Menu } from './Icons.jsx';

export const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'overview', label: 'Overview' },
  { id: 'systems', label: 'Systems' },
  { id: 'contact', label: 'Contact' },
];

export function MotionToggle({ className = 'ibtn' }) {
  const motion = useMotion();
  return (
    <button
      type="button"
      className={`${className} motion-toggle`}
      aria-pressed={!motion}
      aria-label={motion ? 'Pause 3D motion' : 'Resume 3D motion'}
      data-tip={motion ? 'Pause motion' : 'Resume motion'}
      onClick={() => setMotion(!motion)}
    >
      <Cube />
      {!motion && <span className="slash" aria-hidden="true" />}
    </button>
  );
}

// Top-left cluster in the hero, as in the reference: logo, 3D toggle, "ask" shortcut, menu.
export function Cluster({ onMenu }) {
  return (
    <div className="cluster">
      <a className="ibtn ibtn--logo" href="#home" aria-label={`${profile.short} — home`}>
        <Logo size={26} />
      </a>
      <MotionToggle />
      <a className="ibtn" href="#ask" aria-label="Ask my résumé a question" data-tip="Ask my résumé" data-focus>
        <Icosa />
      </a>
      <button type="button" className="ibtn" aria-label="Open menu" aria-haspopup="dialog" data-tip="Menu" onClick={onMenu}>
        <Menu />
      </button>
    </div>
  );
}

function useActiveSection() {
  const [active, setActive] = useState('home');
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: '-48% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

export function TabBar({ onMenu }) {
  const [shown, setShown] = useState(false);
  const active = useActiveSection();
  const tabsRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // slide the chamfered highlight under the active tab
  useLayoutEffect(() => {
    const wrap = tabsRef.current;
    if (!wrap) return undefined;
    const place = () => {
      const el = wrap.querySelector(`[data-id="${active}"]`);
      if (!el) return;
      wrap.style.setProperty('--ink-x', `${el.offsetLeft}px`);
      wrap.style.setProperty('--ink-w', `${el.offsetWidth}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [active]);

  return (
    <header className={`tabbar ${shown ? 'is-on' : ''}`} inert={shown ? undefined : ''}>
      <a className="tabbar-logo" href="#home" aria-label={`${profile.short} — back to top`}>
        <Logo size={28} />
        <span>
          {profile.short}
          <small>{profile.role}</small>
        </span>
      </a>
      <nav className="tabs" ref={tabsRef} aria-label="Sections">
        <span className="tabs-ink" aria-hidden="true" />
        {SECTIONS.map((s) => (
          <a key={s.id} data-id={s.id} href={`#${s.id}`} className={`tab ${active === s.id ? 'is-active' : ''}`} aria-current={active === s.id ? 'true' : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
      <div className="tabbar-tools">
        <MotionToggle className="ibtn ibtn--bare" />
        <a className="ibtn ibtn--bare" href={profile.resume} target="_blank" rel="noreferrer" aria-label="Résumé (PDF, opens in a new tab)" data-tip="Résumé">
          <Doc />
        </a>
        <a className="pill" href="#contact">
          <span>
            Get in touch <ArrowUpRight width={16} height={16} />
          </span>
        </a>
        <button type="button" className="ibtn ibtn--bare tabbar-menu" aria-label="Open menu" aria-haspopup="dialog" onClick={onMenu}>
          <Menu />
        </button>
      </div>
    </header>
  );
}

export function MenuSheet({ open, onClose }) {
  const panel = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    lockScroll(true);
    const first = panel.current?.querySelector('a, button');
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll('a, button')];
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
    return () => {
      document.removeEventListener('keydown', onKey);
      lockScroll(false);
      lastFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const go = (id) => (e) => {
    e.preventDefault();
    onClose();
    requestAnimationFrame(() => scrollToId(id));
  };

  return (
    <div className={`menu ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open} inert={open ? undefined : ''}>
      <div className="menu-scrim" onClick={onClose} />
      <div className="menu-panel" ref={panel}>
        <div className="menu-head">
          <span className="hud-label">// navigation</span>
          <button type="button" className="ibtn" aria-label="Close menu" onClick={onClose}>
            <Close />
          </button>
        </div>
        <ol className="menu-list">
          {SECTIONS.map((s, i) => (
            <li key={s.id} style={{ '--i': i }}>
              <a href={`#${s.id}`} onClick={go(s.id)}>
                <span className="menu-idx">0{i}</span>
                {s.label}
              </a>
            </li>
          ))}
          <li style={{ '--i': SECTIONS.length }}>
            <a href="#ask" onClick={go('ask')}>
              <span className="menu-idx">→</span>Ask my résumé
            </a>
          </li>
        </ol>
        <div className="menu-foot">
          <a href={profile.resume} target="_blank" rel="noreferrer">
            Résumé (PDF) <ArrowUpRight width={14} height={14} />
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            LinkedIn <ArrowUpRight width={14} height={14} />
          </a>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <MotionToggle className="ibtn" />
        </div>
      </div>
    </div>
  );
}
