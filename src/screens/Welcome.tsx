import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconKey } from '../brand/icons';
import { Wordmark } from '../brand/Logo';
import { Otis } from '../brand/otis/Otis';
import { ROLE_LOOKS } from '../lib/presets';
import { useStore } from '../lib/store';
import { Sheet } from '../ui/Sheet';
import { useWide } from '../lib/useWide';
import { Wildflower } from '../brand/Plant';

const CREW = [ROLE_LOOKS.Creator, ROLE_LOOKS.Strategist, { ...ROLE_LOOKS.Other, hat: 'checker' as const }, ROLE_LOOKS.Analyst, ROLE_LOOKS.Marketer];

const HOW: { icon: IconKey; title: string; body: string }[] = [
  { icon: 'picnicTable', title: 'Host a lawn', body: 'Any gathering for Bend creatives. Free to host, always.' },
  { icon: 'location', title: 'Show up', body: 'Check in at the lawn and the garden opens for you.' },
  { icon: 'wateringCan', title: 'Plant and water', body: 'Plant what you need. When someone helps, it grows. Bloom together.' },
];

export function Welcome() {
  const nav = useNavigate();
  const signIn = useStore((s) => s.signIn);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const wide = useWide();

  const signInSheet = (
      <Sheet open={open} onClose={() => setOpen(false)} label="Sign in">
        <form
          className="stack-lg"
          onSubmit={(e) => {
            e.preventDefault();
            if (signIn(email)) nav('/');
            else setErr('No account with that email in this browser yet. Make your Otis to join.');
          }}
        >
          <h2 className="display h2">Welcome back</h2>
          <div className="field">
            <label htmlFor="signin-email">Email</label>
            <input id="signin-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="you@studio.com" required />
            <span className="hint">Demo mode keeps accounts in this browser. Real sign-in links arrive by email once the backend is connected.</span>
          </div>
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn block" type="submit">Sign in</button>
        </form>
      </Sheet>
  );
  const howCard = (
      <div className="card stack" style={{ gap: 0, padding: '4px 18px' }}>
        <div className="list">
          {HOW.map((h) => (
            <div key={h.title} className="list-row" style={{ alignItems: 'center' }}>
              <Icon name={h.icon} size={44} />
              <div className="grow">
                <p className="strong" style={{ fontSize: '1.0625rem' }}>{h.title}</p>
                <p className="muted small">{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
  );

  if (wide) {
    return (
      <div className="shell bare art" style={{ gap: 36, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)' }}>
        <div className="cols even" style={{ alignItems: 'center', gap: 56 }}>
          <div className="col" style={{ gap: 26 }}>
            <motion.div initial={{ scale: 0.85, rotate: -3, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 13 }} style={{ transformOrigin: 'left center' }}>
              <Wordmark width={400} />
            </motion.div>
            <p className="lede strong" style={{ fontSize: '1.45rem', maxWidth: '26ch' }}>Creative fresh air for Bend. Find your people, then actually make things together.</p>
            <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
              <Link to="/join" className="btn sun" style={{ fontSize: '1.2rem', minHeight: 60, paddingInline: 28 }}>Make your Otis</Link>
              <button className="btn cream" style={{ minHeight: 60 }} onClick={() => setOpen(true)}>I already have an account</button>
            </div>
          </div>
          <HeroLawn />
        </div>
        <div className="grid-3" style={{ gap: 20 }}>
          {HOW.map((h) => (
            <div key={h.title} className="card stack" style={{ gap: 8 }}>
              <Icon name={h.icon} size={52} />
              <p className="display h4">{h.title}</p>
              <p className="muted strong">{h.body}</p>
            </div>
          ))}
        </div>
        <p className="small center strong" style={{ color: 'var(--pine)' }}>
          A community project of RADCAT Design and Three Pines, Bend, Oregon.
        </p>
        {signInSheet}
      </div>
    );
  }

  return (
    <div className="shell bare art" style={{ gap: 26, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)' }}>
      <div className="stack center" style={{ alignItems: 'center', gap: 14 }}>
        <motion.div initial={{ scale: 0.8, rotate: -4, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 13 }}>
          <Wordmark width="min(78vw, 330px)" />
        </motion.div>
        <p className="lede strong" style={{ textAlign: 'center' }}>Creative fresh air for Bend. Find your people, then actually make things together.</p>
      </div>

      <div aria-hidden style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 0, marginTop: 4, height: 'min(46vw, 210px)' }}>
        {CREW.map((look, i) => (
          <motion.div
            key={i}
            style={{ width: i === 2 ? '24%' : '18%', maxWidth: i === 2 ? 120 : 92, marginInline: '-1.5%', zIndex: i === 2 ? 2 : 1 }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 + i * 0.09 }}
          >
            <Otis look={look} />
          </motion.div>
        ))}
      </div>

      <div className="stack">
        <Link to="/join" className="btn sun block" style={{ fontSize: '1.2rem', minHeight: 60 }}>Make your Otis</Link>
        <button className="btn cream block" onClick={() => setOpen(true)}>I already have an account</button>
      </div>

      {howCard}

      <p className="small center strong" style={{ color: 'var(--pine)' }}>
        A community project of RADCAT Design and Three Pines, Bend, Oregon.
      </p>

      {signInSheet}
    </div>
  );
}

// Desktop hero: a crowd of Otises on the lawn.
const HERO_CREW = [
  { look: ROLE_LOOKS.Mentor, x: 14, y: 58, w: 17 },
  { look: { ...ROLE_LOOKS.Marketer, companion: 'butterfly' as const }, x: 38, y: 55, w: 16 },
  { look: ROLE_LOOKS.Investor, x: 62, y: 57, w: 16 },
  { look: { ...ROLE_LOOKS.Analyst, hat: 'plaid' as const }, x: 85, y: 59, w: 16 },
  { look: ROLE_LOOKS.Creator, x: 24, y: 92, w: 22 },
  { look: { ...ROLE_LOOKS.Other, hat: 'checker' as const, band: true }, x: 52, y: 96, w: 25 },
  { look: { ...ROLE_LOOKS.Strategist, companion: 'bird' as const }, x: 79, y: 92, w: 22 },
];

function HeroLawn() {
  return (
    <div className="card flat" aria-hidden style={{ padding: 0, overflow: 'hidden', aspectRatio: '1 / 1', maxWidth: '100%', background: 'linear-gradient(180deg, #8fc3fb 0%, #d7ecfd 40%, #8cb200 40.3%, #86ad00 100%)', boxShadow: 'var(--drop)' }}>
      <svg viewBox="0 0 400 400" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M0 162C90 150 190 146 280 154C330 158 370 156 400 158" stroke="#16541A" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M52 64C44 64 41 57 45 53C48 50 52 50 55 51C56 44 63 40 70 41C74 34 85 34 89 41C95 37 104 40 105 47C113 47 118 54 114 61C118 62 118 64 113 64Z" fill="#fff" />
        <path d="M286 40C281 40 279 35 282 32C284 31 286 31 288 31.5C289 27 293 24 298 25C301 21 307 21 310 25C314 22 320 24 321 29C327 29 330 33 327 38C330 39 330 40 326 40Z" fill="#fff" />
      </svg>
      {[[6, 74], [94, 70], [44, 72], [70, 80], [10, 96], [93, 97]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
          <Wildflower size={i % 2 ? 22 : 28} />
        </div>
      ))}
      {HERO_CREW.map((o, i) => (
        <div key={i} style={{ position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, width: `${o.w}%`, transform: 'translate(-50%, -100%)', zIndex: Math.round(o.y) }}>
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.2 + i * 0.08 }}>
            <Otis look={o.look} />
          </motion.div>
        </div>
      ))}
    </div>
  );
}
