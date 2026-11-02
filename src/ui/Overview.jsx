import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { about, agentGraph, career, dailyTools, impact, inventory, knowledge, stack, suggestions } from '../data.js';
import { useInView } from '../lib/hooks.js';
import { createRetriever } from '../lib/retriever.js';
import { useMotion } from '../lib/store.js';
import { Panel, SectionHead } from './Bits.jsx';
import SkillHolo from './SkillHolo.jsx';

const PROMPT = 'giri@portfolio:~$';

/* ------------------------------------------------------------------ whoami */

function Terminal() {
  const blocks = [
    { cmd: 'whoami', out: [about.whoami] },
    { cmd: 'cat about.md', out: about.summary },
    { cmd: 'cat education.md', out: [about.education, about.certs] },
  ];
  let t = 350;
  return (
    <div className="term">
      {blocks.map((b) => {
        const typeAt = t;
        const typeFor = b.cmd.length * 55;
        t += typeFor + 220;
        const outAt = t;
        t += 260 + b.out.length * 160;
        return (
          <div className="term-block" key={b.cmd}>
            <p className="term-cmd">
              <span className="term-prompt">{PROMPT}</span>{' '}
              <span className="type" style={{ '--n': b.cmd.length, '--t': `${typeFor}ms`, '--d': `${typeAt}ms` }}>
                {b.cmd}
              </span>
            </p>
            {b.out.map((o, j) => (
              <p className="term-out" key={j} style={{ '--d': `${outAt + j * 160}ms` }}>
                {o}
              </p>
            ))}
          </div>
        );
      })}
      <p className="term-cmd">
        <span className="term-prompt">{PROMPT}</span> <span className="term-caret" style={{ '--d': `${t}ms` }} />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ impact rings */

function Ring({ pct = 1, dots }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 84 84" aria-hidden="true">
      {dots
        ? Array.from({ length: dots }, (_, i) => {
            const a = (i / dots) * Math.PI * 2 - Math.PI / 2;
            return <circle key={i} className="ring-dot" cx={42 + Math.cos(a) * r} cy={42 + Math.sin(a) * r} r="1.9" style={{ '--i': i }} />;
          })
        : (
          <>
            <circle className="ring-track" cx="42" cy="42" r={r} />
            <circle className="ring-value" cx="42" cy="42" r={r} strokeDasharray={c} style={{ '--len': `${c}px`, '--pct': pct }} transform="rotate(-90 42 42)" />
          </>
        )}
      <circle className="ring-inner" cx="42" cy="42" r="25" />
    </svg>
  );
}

function Inventory() {
  const max = Math.max(...inventory.map((d) => d[1]));
  return (
    <figure className="inventory">
      <figcaption className="hud-label">Built at State Street</figcaption>
      <div className="inv-chart">
        {inventory.map(([code, n, label]) => (
          <div className="inv-col" key={code} style={{ '--h': n / max }}>
            <b>
              {n}
              {code === 'SVC' ? '+' : ''}
            </b>
            <i aria-hidden="true" />
            <span>{label.replace(' (12+)', '')}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function Impact() {
  return (
    <>
      <ImpactRings />
      <Inventory />
    </>
  );
}

function ImpactRings() {
  return (
    <ul className="impact">
      {impact.map((m) => (
        <li className="impact-item" key={m.label}>
          <Ring pct={m.pct} dots={m.dots} />
          <div className="impact-text">
            <strong className="impact-value">{m.value}</strong>
            {(m.from || m.delta) && (
              <span className="impact-from">
                {m.from && <>from {m.from}</>}
                {m.from && m.delta && ' · '}
                {m.delta}
              </span>
            )}
            <span className="impact-label">{m.label}</span>
            <span className="impact-note">{m.note}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ git log */

function CareerLog() {
  return (
    <ol className="gitlog">
      {career.map((c) => (
        <li key={c.hash} className={`git ${c.head ? 'is-head' : ''} ${c.root ? 'is-root' : ''}`}>
          <span className="git-node" aria-hidden="true" />
          <p className="git-meta">
            <code>{c.hash}</code>
            {c.head && <span className="git-ref">HEAD → main</span>}
            <time>{c.when}</time>
          </p>
          <h3 className="git-title">{c.title}</h3>
          <p className="git-role">{c.role}</p>
          <p className="git-note">{c.note}</p>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ agent topology */

const NODE_W = 148;
const nodeH = (n) => (n.sub ? 44 : 32);

function edgePath(a, b) {
  const x1 = a.x;
  const y1 = a.y + nodeH(a) / 2;
  const x2 = b.x;
  const y2 = b.y - nodeH(b) / 2;
  const dy = (y2 - y1) * 0.55;
  return `M${x1} ${y1} C${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
}

function AgentGraph() {
  const motion = useMotion();
  const ref = useRef(null);
  const seen = useInView(ref, { once: false, rootMargin: '0px' });
  const [step, setStep] = useState({ run: 0, i: 0 });
  const [hover, setHover] = useState(null);
  const byId = useMemo(() => Object.fromEntries(agentGraph.nodes.map((n) => [n.id, n])), []);

  const run = agentGraph.runs[step.run];
  const current = run[Math.min(step.i, run.length - 1)];

  useEffect(() => {
    if (!motion || !seen || hover) return undefined;
    const last = step.i >= run.length - 1;
    const id = setTimeout(
      () => setStep((s) => (last ? { run: (s.run + 1) % agentGraph.runs.length, i: 0 } : { run: s.run, i: s.i + 1 })),
      last ? 2600 : 1500,
    );
    return () => clearTimeout(id);
  }, [motion, seen, hover, step, run.length]);

  const live = motion;
  const doneNodes = new Set(live ? run.slice(0, step.i).flatMap((s) => s.nodes) : []);
  const doneEdges = new Set(live ? run.slice(0, step.i).flatMap((s) => s.edges) : []);
  const nowNodes = new Set(live ? current.nodes : []);
  const nowEdges = new Set(live ? current.edges : []);
  const caption = hover ? byId[hover].desc : live ? current.log : 'Four specialised agents behind one orchestrator; a validator checks the work before an SME sees it.';

  return (
    <div className="agents" ref={ref}>
      <svg className="agents-svg" viewBox="0 0 600 352" role="img" aria-labelledby="agents-title agents-desc">
        <title id="agents-title">Data Exploration Agent topology</title>
        <desc id="agents-desc">
          An SME question goes to an orchestrator, which routes it to a Researcher agent (RAG over schema docs), an EDA agent (SQL and Python) or a General agent. Researcher and EDA output goes through a Validator agent before the mapping file is produced; General answers go straight back as guidance.
        </desc>
        <defs>
          <filter id="ag-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {agentGraph.edges.map(([a, b]) => {
          const key = `${a}-${b}`;
          const cls = nowEdges.has(key) ? 'is-now' : doneEdges.has(key) ? 'is-done' : '';
          return (
            <g key={key} className={`ag-edge ${cls}`}>
              <path d={edgePath(byId[a], byId[b])} />
              <path className="ag-flow" d={edgePath(byId[a], byId[b])} filter={cls === 'is-now' ? 'url(#ag-glow)' : undefined} />
            </g>
          );
        })}
        {agentGraph.nodes.map((n) => {
          const h = nodeH(n);
          const cls = nowNodes.has(n.id) ? 'is-now' : doneNodes.has(n.id) ? 'is-done' : '';
          return (
            <g
              key={n.id}
              className={`ag-node ${n.io ? 'is-io' : ''} ${cls} ${hover === n.id ? 'is-hover' : ''}`}
              transform={`translate(${n.x} ${n.y})`}
              tabIndex={0}
              aria-label={`${n.label}${n.sub ? ` (${n.sub})` : ''}: ${n.desc}`}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(n.id)}
              onBlur={() => setHover(null)}
            >
              <rect x={-NODE_W / 2} y={-h / 2} width={NODE_W} height={h} rx="9" filter={cls === 'is-now' ? 'url(#ag-glow)' : undefined} />
              <text className="ag-label" y={n.sub ? -3 : 4.5}>
                {n.label}
              </text>
              {n.sub && (
                <text className="ag-sub" y="13">
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="agents-log">
        <span className="agents-dot" aria-hidden="true" />
        {caption}
      </p>
      <dl className="agents-stats">
        <div>
          <dt>agents</dt>
          <dd>4 specialised</dd>
        </div>
        <div>
          <dt>gate</dt>
          <dd>validator</dd>
        </div>
        <div>
          <dt>accuracy</dt>
          <dd>80%+</dd>
        </div>
        <div>
          <dt>turnaround</dt>
          <dd>6–8 mo → 2–3 wk</dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ stack radar */

function StackRadar() {
  const [hl, setHl] = useState(null);
  const [holo, setHolo] = useState(null); // index of the area being projected
  const switchHolo = useCallback((d) => setHolo((h) => (h + d + stack.length) % stack.length), []);
  const closeHolo = useCallback(() => setHolo(null), []);
  const n = stack.length;
  const max = Math.max(...stack.map((s) => s.items.length));
  const cx = 210;
  const cy = 162;
  const r = 104;
  const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i, k) => [cx + Math.cos(ang(i)) * r * k, cy + Math.sin(ang(i)) * r * k];
  const poly = (k) => stack.map((_, i) => pt(i, k).join(',')).join(' ');
  const vals = stack.map((s, i) => pt(i, 0.22 + (0.78 * s.items.length) / max));
  const sweepEnd = [cx + Math.cos(-Math.PI / 2 + 0.75) * r, cy + Math.sin(-Math.PI / 2 + 0.75) * r];

  return (
    <div className="radar">
      <div className="radar-l">
        <svg className="radar-svg" viewBox="0 0 420 326" role="img" aria-label={`Radar of tools per area: ${stack.map((s) => `${s.label} ${s.items.length}`).join(', ')}`}>
          <defs>
            <linearGradient id="sweep-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5ef2e3" stopOpacity="0" />
              <stop offset="1" stopColor="#5ef2e3" stopOpacity="0.32" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((k) => (
            <polygon key={k} className="radar-ring" points={poly(k)} />
          ))}
          {stack.map((s, i) => {
            const [x, y] = pt(i, 1);
            return <line key={s.id} className={`radar-axis ${hl === i ? 'is-hl' : ''}`} x1={cx} y1={cy} x2={x} y2={y} />;
          })}
          <g className="radar-sweep">
            <path d={`M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 0 1 ${sweepEnd[0]} ${sweepEnd[1]} Z`} fill="url(#sweep-g)" />
          </g>
          <polygon className="radar-value" points={vals.map((p) => p.join(',')).join(' ')} />
          {vals.map(([x, y], i) => (
            <circle key={stack[i].id} className={`radar-pt ${hl === i ? 'is-hl' : ''}`} cx={x} cy={y} r={hl === i ? 5 : 3.2} onClick={() => setHolo(i)} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)} />
          ))}
          {stack.map((s, i) => {
            const [x, y] = pt(i, 1.17);
            const c = Math.cos(ang(i));
            const anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
            return (
              <text key={s.id} className={`radar-label ${hl === i ? 'is-hl' : ''}`} x={x} y={y + 4} textAnchor={anchor} onClick={() => setHolo(i)} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}>
                {s.label}
              </text>
            );
          })}
        </svg>
        <p className="stack-hint">
          <span className="holo-dot" aria-hidden="true" /> Click any area to project its skills as a hologram
        </p>
        <p className="stack-tools">
          <span className="hud-label">daily tools</span> {dailyTools.join(' · ')}
        </p>
      </div>
      <ul className="stack-list">
        {stack.map((s, i) => (
          <li key={s.id} className={hl === i ? 'is-hl' : ''} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}>
            <button type="button" className="stack-row" onClick={() => setHolo(i)} aria-haspopup="dialog" aria-label={`Project ${s.label} as a hologram: ${s.items.join(', ')}`}>
              <span className="stack-name">
                {s.label} <b>{s.items.length}</b>
              </span>
              <span className="stack-items">{s.items.join(' · ')}</span>
              <span className="stack-go" aria-hidden="true">
                ◈
              </span>
            </button>
          </li>
        ))}
      </ul>
      {holo !== null && <SkillHolo index={holo} onClose={closeHolo} onSwitch={switchHolo} />}
    </div>
  );
}

/* ------------------------------------------------------------------ ask console */

const FALLBACK = "That isn't in my résumé. Try RAGAS, the Data Exploration Agent, guardrails, observability or my stack, or just email me.";

function AskConsole() {
  const retrieve = useMemo(() => createRetriever(knowledge), []);
  const motion = useMotion();
  const [input, setInput] = useState('');
  const [run, setRun] = useState(null);
  const [shown, setShown] = useState('');

  const answer = run ? (run.best ? run.best.text : FALLBACK) : '';

  useEffect(() => {
    if (!run) return undefined;
    if (!motion) {
      setShown(answer);
      return undefined;
    }
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i = Math.min(answer.length, i + 3);
      setShown(answer.slice(0, i));
      if (i >= answer.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const ask = (q) => {
    const text = q.trim();
    if (!text) return;
    setRun({ q: text, ...retrieve(text), key: Date.now() });
    setInput('');
  };
  const done = run && shown.length === answer.length;

  return (
    <div className="ask">
      <div className="ask-l">
        <p className="ask-intro">
          Ask about my work. Answers are retrieved from my résumé right here in your browser: keyword scoring over a dozen chunks. No LLM, no server, nothing you type leaves the page.
        </p>
        <div className="ask-chips">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="ask-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <label htmlFor="ask-input" className="sr-only">
            Your question
          </label>
          <span className="ask-prompt" aria-hidden="true">
            &gt;
          </span>
          <input id="ask-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="How do your agents avoid hallucinating?" autoComplete="off" maxLength={160} />
          <button type="submit" className="ask-run">
            Run <kbd>⏎</kbd>
          </button>
        </form>
      </div>
      <div className="ask-out">
        {run ? (
          <div key={run.key} className="ask-result">
            <p className="ask-q">
              <span className="hud-label">query</span> {run.q}
            </p>
            <div className="ask-trace">
              <span className="hud-label">retrieval trace</span>
              {run.hits.length ? (
                run.hits.map((h, i) => (
                  <div key={h.id} className={`hit ${i === 0 && run.best ? 'is-top' : ''}`} style={{ '--s': Math.min(1, h.score) }}>
                    <code>{h.id}</code>
                    <i />
                    <b>{h.score.toFixed(2)}</b>
                  </div>
                ))
              ) : (
                <p className="hit-none">no chunk matched</p>
              )}
            </div>
            <p className="ask-a">
              {shown}
              {!done && <span className="caret" aria-hidden="true" />}
            </p>
            {done && run.best && <p className="ask-src">source · {run.best.source}</p>}
          </div>
        ) : (
          <p className="ask-idle">
            awaiting query<span className="caret" aria-hidden="true" />
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {done ? answer : ''}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ section */

export default function Overview() {
  return (
    <section id="overview" className="section overview" tabIndex={-1} aria-labelledby="overview-title">
      <div className="wrap">
        <SectionHead
          index="01"
          kicker="Overview"
          id="overview-title"
          title="Mission control"
          lead="Nearly three years at State Street on one screen: who I am, what moved, how my agents are wired, and a console that answers from my résumé."
        />
        <div className="grid">
          <Panel tab="whoami" meta="tty1" className="p-term">
            <Terminal />
          </Panel>
          <Panel tab="Impact" meta="key results" className="p-impact" delay={90}>
            <Impact />
          </Panel>
          <Panel tab="git log --career" meta="State Street · Jan 2024 →" className="p-log">
            <CareerLog />
          </Panel>
          <Panel tab="Agent topology" meta="Data Exploration Agent · live" className="p-agents" delay={90}>
            <AgentGraph />
          </Panel>
          <Panel tab="Stack scan" meta="tools per area · résumés + certifications" className="p-stack">
            <StackRadar />
          </Panel>
          <Panel tab="ask.py" meta="local retriever · no LLM" className="p-ask" id="ask">
            <AskConsole />
          </Panel>
        </div>
      </div>
    </section>
  );
}
