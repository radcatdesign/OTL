import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconKey } from '../brand/icons';
import { Wordmark } from '../brand/Logo';
import { Otis } from '../brand/otis/Otis';
import { ROLE_LOOKS } from '../lib/presets';
import { useStore } from '../lib/store';
import { Sheet } from '../ui/Sheet';

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

  return (
    <div className="shell bare" style={{ gap: 26, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)' }}>
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

      <p className="small center strong" style={{ color: 'var(--pine)' }}>
        A community project of RADCAT Design and Three Pines, Bend, Oregon.
      </p>

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
    </div>
  );
}
