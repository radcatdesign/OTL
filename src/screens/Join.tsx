import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { OtisLook } from '../brand/otis/Otis';
import { C } from '../brand/palette';
import { GUIDE_INTENTS, ROLES, type GuideIntent, type Role } from '../lib/intents';
import { ROLE_LOOKS } from '../lib/presets';
import { uid, useStore } from '../lib/store';
import { PhotoPicker } from '../ui/Avatar';
import { ProfileCard } from '../ui/ProfileCard';
import { StudioPanel } from './StudioPanel';

const STEPS = ['you', 'role', 'looking', 'otis', 'card'] as const;
type Step = (typeof STEPS)[number];

export function Join() {
  const nav = useNavigate();
  const loc = useLocation();
  const next = (loc.state as { next?: string } | null)?.next ?? '/';
  const signUp = useStore((s) => s.signUp);
  const users = useStore((s) => s.db.users);
  const celebrate = useStore((s) => s.celebrate);

  const [step, setStep] = useState<Step>('you');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [intents, setIntents] = useState<GuideIntent[]>([]);
  const [look, setLook] = useState<OtisLook>(ROLE_LOOKS.Creator);
  const [err, setErr] = useState('');
  const [touchedLook, setTouchedLook] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [draftId] = useState(() => uid('u'));

  const i = STEPS.indexOf(step);
  const go = (s: Step) => { setErr(''); setStep(s); };

  const draftUser = {
    id: 'draft', name: name || 'You', email, role: role ?? 'Other', bio, intents, otis: look, createdAt: Date.now(),
  };

  return (
    <div className="shell bare art" style={{ gap: 20, maxWidth: step === 'otis' ? 1000 : 600 }}>
      <div className="row" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}>
        <button className="btn cream small" onClick={() => (i === 0 ? nav('/') : go(STEPS[i - 1]))} aria-label="Back">Back</button>
        <div className="meter grow" aria-label={`Step ${i + 1} of ${STEPS.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={i + 1}>
          <span style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="stack-lg"
        >
          {step === 'you' && (
            <form
              className="card stack-lg"
              onSubmit={(e) => {
                e.preventDefault();
                const em = email.trim().toLowerCase();
                if (!name.trim()) return setErr('Add your name so people know who they are meeting.');
                if (!/.+@.+\..+/.test(em)) return setErr('That email looks off. Check for a typo.');
                if (users.some((u) => u.email === em && !u.demo)) return setErr('That email already has an account here. Use sign in instead.');
                go('role');
              }}
            >
              <h1 className="display h2">Pull up a lawn chair</h1>
              <PhotoPicker person={{ id: draftId, name: name || 'You', otis: look, photo }} onChange={setPhoto} />
              <div className="field">
                <label htmlFor="join-name">Your name</label>
                <input id="join-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Maya Okafor" />
              </div>
              <div className="field">
                <label htmlFor="join-email">Email</label>
                <input id="join-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@studio.com" />
              </div>
              <div className="field">
                <label htmlFor="join-bio">One line about what you make</label>
                <input id="join-bio" className="input" value={bio} maxLength={90} onChange={(e) => setBio(e.target.value)} placeholder="Illustrator. Maps, labels, the occasional mural." />
                <span className="hint">Optional. It shows on the back of your card.</span>
              </div>
              {err && <p className="error" role="alert">{err}</p>}
              <button className="btn sun block" type="submit">Next</button>
            </form>
          )}

          {step === 'role' && (
            <div className="card stack-lg">
              <h1 className="display h2">I am a...</h1>
              <div className="row-wrap">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    className="chip"
                    aria-pressed={role === r}
                    onClick={() => {
                      setRole(r);
                      if (!touchedLook) setLook(ROLE_LOOKS[r]);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="hint">Your Otis starts dressed for the part. You can change everything next.</p>
              <button className="btn sun block" disabled={!role} onClick={() => go('looking')}>Next</button>
            </div>
          )}

          {step === 'looking' && (
            <div className="card stack-lg">
              <div className="stack" style={{ gap: 6 }}>
                <h1 className="display h2">Looking to...</h1>
                <p className="muted">Pick any that fit. They go on the back of your card, so people know how to find you.</p>
              </div>
              <div className="stack">
                {GUIDE_INTENTS.map((g) => {
                  const on = intents.includes(g.key);
                  return (
                    <button
                      key={g.key}
                      className="chip"
                      aria-pressed={on}
                      style={{ justifyContent: 'flex-start', minHeight: 52, ['--chip-on' as string]: C[g.color], color: on && (g.color === 'forest' || g.color === 'tomato') ? C.cream : undefined }}
                      onClick={() => setIntents((xs) => (on ? xs.filter((x) => x !== g.key) : [...xs, g.key]))}
                    >
                      <span className="dot" style={{ width: 18, height: 18, background: C[g.color] }} />
                      {g.label}
                    </button>
                  );
                })}
              </div>
              <button className="btn sun block" onClick={() => go('otis')}>{intents.length ? 'Next' : 'Skip for now'}</button>
            </div>
          )}

          {step === 'otis' && (
            <div className="card stack-lg">
              <div className="stack" style={{ gap: 6 }}>
                <h1 className="display h2">Make your Otis</h1>
                <p className="muted">This little gnome cat stands in for you on every lawn. More hats unlock as you grow.</p>
              </div>
              <StudioPanel look={look} onChange={(l) => { setLook(l); setTouchedLook(true); }} stats={null} level={1} compact split />
              <button className="btn sun block" onClick={() => go('card')}>Looks good</button>
            </div>
          )}

          {step === 'card' && (
            <div className="stack-lg" style={{ alignItems: 'center' }}>
              <motion.div initial={{ rotateY: 180, scale: 0.7 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} style={{ width: '100%' }}>
                <ProfileCard user={draftUser} lawns={0} width="min(80vw, 300px)" />
              </motion.div>
              <p className="pill" style={{ alignSelf: 'center' }}>Tap your card to see the back</p>
              <button
                className="btn sun block"
                style={{ fontSize: '1.2rem', minHeight: 60 }}
                onClick={() => {
                  signUp({ id: draftId, name, email, role: role ?? 'Other', intents, otis: look, bio, photo });
                  const st = useStore.getState();
                  const otl = st.demo ? st.db.groupMembers.find((m) => m.groupId === 'otl' && m.userId === st.me && m.role === 'cohost') : undefined;
                  celebrate({
                    kind: 'welcome',
                    title: `Welcome, ${name.split(' ')[0]}`,
                    body: otl
                      ? "For this demo you're a co-host of On The Lawn, so the admin tools are open. Find them under Groups."
                      : 'Join a lawn, check in, and plant your first seed.',
                  });
                  nav(next, { replace: true });
                }}
              >
                Join On The Lawn
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
