import { useMemo, useRef, useState } from 'react';
import Stage from '../three/Stage.jsx';
import Globe, { coordLabels } from '../three/Globe.jsx';
import { contactTopics, profile } from '../data.js';
import { useClock, useInView } from '../lib/hooks.js';
import { SectionHead } from './Bits.jsx';
import { ArrowUpRight, Check, Copy, Doc, GitHub, LinkedIn, Mail, Send } from './Icons.jsx';

const blank = { name: '', email: '', topic: contactTopics[0], message: '' };

function ContactForm() {
  const [form, setForm] = useState(blank);
  const [status, setStatus] = useState(null);
  const msg = useRef(null);
  const ref = useRef(null);
  const seen = useInView(ref);
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.message.trim()) {
      setStatus({ kind: 'warn', text: 'Write a message first, one line is plenty.' });
      msg.current?.focus();
      return;
    }
    const name = form.name.trim();
    const subject = `[Portfolio] ${form.topic}${name ? `: ${name}` : ''}`;
    const sign = [name, form.email.trim()].filter(Boolean).join(' · ');
    const body = `${form.message.trim()}\n\n${sign ? `From ${sign}` : 'Sent from your portfolio'}`;
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus({ kind: 'ok', text: 'Opening your mail app with everything filled in. Nothing opened? Copy the address on the right instead.' });
  };

  return (
    <form ref={ref} className={`cform ${seen ? 'is-in' : ''}`} onSubmit={submit} noValidate aria-labelledby="cform-title">
      <div className="cform-head">
        <span className="hud-tab hud-tab--wide" id="cform-title">
          Contact
        </span>
        <span className="cform-rule" aria-hidden="true">
          <i />
        </span>
      </div>
      <div className="cform-sub">
        <span>▮ Compose transmission</span>
        <span className="cform-meter" aria-hidden="true" />
      </div>
      <div className="cform-grid">
        <label className="field">
          <span>Name</span>
          <input value={form.name} onChange={set('name')} autoComplete="name" />
        </label>
        <label className="field">
          <span>Your email</span>
          <input type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        <label className="field field--full">
          <span>Topic</span>
          <select value={form.topic} onChange={set('topic')}>
            {contactTopics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field field--full">
          <span>Message</span>
          <textarea ref={msg} rows={5} value={form.message} onChange={set('message')} aria-required="true" />
        </label>
      </div>
      <div className="cform-actions">
        <button type="submit" className="btn-hud btn-hud--sm">
          <span>
            <Send width={15} height={15} /> Transmit
          </span>
        </button>
        <button
          type="button"
          className="btn-line"
          onClick={() => {
            setForm(blank);
            setStatus(null);
          }}
        >
          Clear
        </button>
      </div>
      <p className={`cform-status ${status ? `is-${status.kind}` : ''}`} role="status">
        {status?.text}
      </p>
    </form>
  );
}

function Socials() {
  const [copied, setCopied] = useState(null);
  const addr = useRef(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied('Copied');
    } catch {
      // no clipboard access (e.g. opened from file://): select the text so Ctrl/Cmd+C works
      const range = document.createRange();
      range.selectNodeContents(addr.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      setCopied('Selected: press Ctrl/⌘ + C');
    }
    setTimeout(() => setCopied(null), 2600);
  };

  const items = [
    profile.github && { href: profile.github, label: 'GitHub', icon: <GitHub width={26} height={26} />, external: true },
    { href: profile.linkedin, label: 'LinkedIn', icon: <LinkedIn width={26} height={26} />, external: true },
    { href: `mailto:${profile.email}`, label: 'Email', icon: <Mail width={26} height={26} /> },
    { href: profile.resume, label: 'Résumé', icon: <Doc width={26} height={26} />, external: true },
  ].filter(Boolean);

  return (
    <div className="socials-wrap">
      <ul className="socials">
        {items.map((it) => (
          <li key={it.label}>
            <a className="orb" href={it.href} target={it.external ? '_blank' : undefined} rel={it.external ? 'noreferrer' : undefined} aria-label={it.external ? `${it.label} (opens in a new tab)` : it.label}>
              <span className="orb-ring">{it.icon}</span>
              <span className="orb-label">{it.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="addr">
        <code ref={addr}>{profile.email}</code>
        <button type="button" className="btn-line btn-line--sm" onClick={copy}>
          {copied ? <Check width={15} height={15} /> : <Copy width={15} height={15} />}
          {copied || 'Copy address'}
        </button>
      </div>
    </div>
  );
}

export default function Contact() {
  const homeEl = useRef(null);
  const tagEls = useRef([]);
  const snippetEls = useRef([]);
  const time = useClock(profile.timeZone);
  const labels = useMemo(coordLabels, []);

  return (
    <section id="contact" className="section contact" tabIndex={-1} aria-labelledby="contact-title">
      <div className="wrap">
        <SectionHead
          index="03"
          kicker="Uplink"
          id="contact-title"
          title="Let's build something that ships."
          lead="Roles, collaborations, or a RAG / agents problem you want a second pair of eyes on, the channel is open."
        />

        <div className="globe-frame">
          <Stage className="globe-stage" camera={{ fov: 42, near: 0.1, far: 100, position: [0, 0, 9] }} bloom={{ intensity: 1.1, threshold: 0.15, radius: 0.7 }}>
            <Globe homeEl={homeEl} tagEls={tagEls} snippetEls={snippetEls} />
          </Stage>

          <div className="globe-overlay" aria-hidden="true">
            <span className="anchor" ref={homeEl}>
              <span className="geo-home">
                <b>{profile.location}</b>
                <em>{profile.geo.label}</em>
              </span>
            </span>
            {labels.map((t, i) => (
              <span key={t} className="anchor" ref={(el) => (tagEls.current[i] = el)}>
                <span className="geo-tag">{t}</span>
              </span>
            ))}
            <span className="anchor" ref={(el) => (snippetEls.current[0] = el)}>
              <pre className="snip snip--l">
                <span className="t-c">{'// uplink.ts'}</span>
                {'\n'}
                <span className="t-k">const</span> contact = {'{'}
                {'\n  '}
                <span className="t-p">email</span>: <span className="t-s">"{profile.email}"</span>,{'\n  '}
                <span className="t-p">linkedin</span>: <span className="t-s">"{profile.linkedinShort}"</span>,{'\n'}
                {'};'}
              </pre>
            </span>
            <span className="anchor" ref={(el) => (snippetEls.current[1] = el)}>
              <pre className="snip snip--r">
                <span className="t-c"># node.yaml</span>
                {'\n'}
                <span className="t-p">location</span>: {profile.location}
                {'\n'}
                <span className="t-p">timezone</span>: IST (UTC+05:30)
                {'\n'}
                <span className="t-p">local_time</span>: <span className="t-s">"{time}"</span>
              </pre>
            </span>
          </div>

          <div className="frame-deco" aria-hidden="true">
            <span className="fd-rail fd-rail--l" />
            <span className="fd-rail fd-rail--r" />
            <span className="fd-tag">
              <i className="fd-ring" />
              UPLINK · NODE 01
            </span>
            <span className="fd-br">
              LOCAL {time} IST · <b>STABLE</b>
            </span>
          </div>
        </div>

        <div className="contact-grid">
          <ContactForm />
          <div className="contact-side">
            <Socials />
            <div className="tip">
              <p>
                <b>Boot tip:</b> “Transmit” opens your own mail app with the message pre-filled. This site is fully static, so nothing you type is sent to a server.
                <span className="caret" aria-hidden="true" />
              </p>
              <a className="tip-link" href={profile.linkedin} target="_blank" rel="noreferrer">
                Prefer LinkedIn? <ArrowUpRight width={14} height={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <p className="footer-mid">React · Three.js · static build</p>
        <a href="#home">Back to top ↑</a>
      </div>
    </footer>
  );
}
