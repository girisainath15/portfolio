import { useRef } from 'react';
import Stage from '../three/Stage.jsx';
import NeuralNet, { NODE_TAGS } from '../three/NeuralNet.jsx';
import { heroBars, heroGauges, inventory, profile } from '../data.js';
import { useClock } from '../lib/hooks.js';
import { Cluster } from './Chrome.jsx';
import { ArrowDown, ArrowUpRight, Gear, Play } from './Icons.jsx';

const R = 46;
const C = 2 * Math.PI * R;

// 270° dial, like the reference's top-right cluster. Needle variant shows a "was" ghost needle.
export function Dial({ kind, label, value, sub, pct, ghost, hot }) {
  const ticks = Array.from({ length: 28 }, (_, i) => 135 + (270 / 27) * i);
  return (
    <figure className={`dial ${hot ? 'dial--hot' : ''}`} style={{ '--pct': pct, '--ghost': ghost ?? 0 }}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        {ticks.map((a, i) => (
          <line key={i} className={i / 27 <= pct ? 'tick is-on' : 'tick'} x1="111" y1="60" x2={i % 3 ? 114 : 116} y2="60" transform={`rotate(${a} 60 60)`} />
        ))}
        <circle className="dial-track" cx="60" cy="60" r={R} strokeDasharray={`${C * 0.75} ${C}`} transform="rotate(135 60 60)" />
        <circle className="dial-value" cx="60" cy="60" r={R} strokeDasharray={`${C * 0.75} ${C}`} style={{ '--len': `${C * 0.75}px` }} transform="rotate(135 60 60)" />
        {hot && <circle className="dial-hot" cx="60" cy="60" r={R} strokeDasharray={`${C * 0.07} ${C}`} transform={`rotate(${135 + 270 * 0.86} 60 60)`} />}
        {kind === 'needle' && (
          <>
            {/* rim pointers, so the centre stays free for the value */}
            <line className="needle needle--ghost" x1="84" y1="60" x2="104" y2="60" />
            <line className="needle" x1="82" y1="60" x2="106" y2="60" />
          </>
        )}
      </svg>
      <figcaption>
        <strong>{value}</strong>
        <span>{label}</span>
        <em>{sub}</em>
      </figcaption>
    </figure>
  );
}

function Monitor() {
  const time = useClock(profile.timeZone);
  const max = Math.max(...inventory.map((d) => d[1]));
  return (
    <aside className="monitor" aria-label="Impact at a glance">
      <div className="monitor-head">
        <span className="hud-tab">SYS · MONITOR</span>
        <span className="monitor-time">
          IST <b>{time}</b>
        </span>
      </div>
      <div className="monitor-dials">
        {heroGauges.map((g) => (
          <Dial key={g.label} {...g} />
        ))}
      </div>
      <div className="monitor-foot">
        <div className="monitor-bars">
          <span className="hud-label">Impact</span>
          {heroBars.map(([label, value, pct]) => (
            <div className="mbar" key={label} style={{ '--pct': pct }}>
              <span>{label}</span>
              <b>{value}</b>
              <i />
            </div>
          ))}
        </div>
        <div className="monitor-inv">
          <span className="hud-label">Built</span>
          <div className="inv">
            {inventory.map(([code, n, label]) => (
              <span key={code} className="inv-bar" style={{ '--h': n / max }} title={`${n}${code === 'SVC' ? '+' : ''} ${label}`}>
                <i />
                <b>{code}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Hero({ onMenu }) {
  const tagEls = useRef([]);
  return (
    <section id="home" className="hero" tabIndex={-1} aria-label="Introduction">
      <Stage className="hero-stage" camera={{ fov: 50, near: 0.1, far: 120, position: [0, 0, 10] }} bloom={{ intensity: 1.15, threshold: 0.14, radius: 0.75 }}>
        <NeuralNet tagEls={tagEls} />
      </Stage>
      <div className="node-tags" aria-hidden="true">
        {NODE_TAGS.map((t, i) => (
          <span key={t} className="node-tag" ref={(el) => (tagEls.current[i] = el)}>
            {t}
          </span>
        ))}
      </div>

      <Cluster onMenu={onMenu} />
      <Monitor />

      <div className="hero-content">
        <h1 className="hero-name">{profile.name}</h1>
        <p className="hero-kicker">
          <span>{profile.title}</span>
          <Gear className="gear" width={18} height={18} />
          <span>{profile.company}</span>
        </p>
        <p className="hero-role">
          <span className="hero-role-text">{profile.role}</span>
          <span className="streak" aria-hidden="true" />
        </p>
        <p className="hero-line">{profile.tagline}</p>
        <div className="hero-actions">
          <a className="btn-hud" href="#overview">
            <span>
              <Play width={16} height={16} /> Explore
            </span>
          </a>
          <a className="btn-ghost" href={profile.resume} target="_blank" rel="noreferrer">
            Résumé <ArrowUpRight width={16} height={16} />
          </a>
        </div>
      </div>

      <a className="scroll-cue" href="#overview" aria-label="Scroll to overview">
        <span className="scroll-cue-diamond" />
        <ArrowDown width={16} height={16} />
      </a>
    </section>
  );
}
