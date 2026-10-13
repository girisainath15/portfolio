import { useRef } from 'react';
import { useInView, useTilt } from '../lib/hooks.js';

export function SectionHead({ index, kicker, title, lead, id }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  return (
    <header ref={ref} className={`sec-head ${seen ? 'is-in' : ''}`}>
      <p className="sec-kicker">
        <span>// {index}</span> {kicker}
      </p>
      <h2 className="sec-title" id={id}>
        {title}
      </h2>
      {lead && <p className="sec-lead">{lead}</p>}
    </header>
  );
}

// HUD panel: pale title tab, window controls, corner brackets, pointer tilt and a boot-in reveal.
export function Panel({ tab, meta, className = '', children, delay = 0, id, labelledBy }) {
  const tiltRef = useTilt(3);
  const seen = useInView(tiltRef);
  return (
    <article
      ref={tiltRef}
      id={id}
      className={`panel ${seen ? 'is-in' : ''} ${className}`}
      style={{ '--delay': `${delay}ms` }}
      aria-labelledby={labelledBy}
      tabIndex={id ? -1 : undefined}
    >
      <header className="panel-head">
        <span className="hud-tab">{tab}</span>
        <span className="panel-rule" aria-hidden="true" />
        {meta && <span className="panel-meta">{meta}</span>}
        <span className="panel-ctrl" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </header>
      <div className="panel-body">{children}</div>
    </article>
  );
}
