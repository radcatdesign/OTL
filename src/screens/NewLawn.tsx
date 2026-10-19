import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { Otis } from '../brand/otis/Otis';
import { C, COLOR_KEYS, COLOR_NAMES, onColor, type ColorKey } from '../brand/palette';
import { useMe, useStore } from '../lib/store';
import { dateParts, fmtLongDay, fmtRange } from '../lib/util';

const DONATE_URL = (import.meta.env.VITE_OTL_DONATE_URL as string | undefined) || '';
const AMOUNTS = [5, 15, 35, 75];

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STEPS = ['what', 'where', 'honest'] as const;
type Step = (typeof STEPS)[number];

export function NewLawn() {
  const me = useMe()!;
  const nav = useNavigate();
  const createEvent = useStore((s) => s.createEvent);

  const [step, setStep] = useState<Step>('what');
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  const [color, setColor] = useState<ColorKey>(me.otis.card);
  const [date, setDate] = useState(nextSaturday());
  const [start, setStart] = useState('16:00');
  const [end, setEnd] = useState('19:00');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'invite'>('public');
  const [mode, setMode] = useState<'free' | 'donate' | null>(null);
  const [amount, setAmount] = useState<number>(15);
  const [custom, setCustom] = useState('');
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<{ id: string; amount: number } | null>(null);

  const startsAt = useMemo(() => new Date(`${date}T${start}`).getTime(), [date, start]);
  const endsAt = useMemo(() => new Date(`${date}T${end}`).getTime(), [date, end]);
  const i = STEPS.indexOf(step);
  const pledge = mode === 'donate' ? (custom ? Math.max(0, Math.round(Number(custom) || 0)) : amount) : 0;

  const go = (s: Step) => { setErr(''); setStep(s); };

  const validateWhat = () => {
    if (title.trim().length < 3) return setErr('Give your lawn a name people will remember.');
    go('where');
  };
  const validateWhere = () => {
    if (!date || Number.isNaN(startsAt)) return setErr('Pick a date and start time.');
    if (endsAt <= startsAt) return setErr('The end time needs to be after the start.');
    if (!venue.trim()) return setErr('Where should people show up? Add a venue or spot.');
    go('honest');
  };
  const create = () => {
    if (!mode) return setErr('Choose free or chip in. Both are welcome here.');
    const ev = createEvent({
      title: title.trim(), about: about.trim(), startsAt, endsAt, venue: venue.trim(), address: address.trim(),
      color, visibility, capacity: capacity ? Number(capacity) : undefined,
      contribution: { mode: pledge > 0 ? 'donate' : 'free', amount: pledge },
    });
    if (pledge > 0) setCreated({ id: ev.id, amount: pledge });
    else nav(`/lawn/${ev.id}`, { state: { justCreated: true } });
  };

  const fg = onColor(color);
  const d = dateParts(Number.isNaN(startsAt) ? Date.now() : startsAt);

  if (created) {
    return (
      <div className="card stack-lg center" style={{ alignItems: 'center' }}>
        <div style={{ width: 120 }}><Otis look={{ ...me.otis, companion: 'ladybug' }} /></div>
        <h1 className="display h2">Thank you</h1>
        <p className="lede">Your lawn is live, and it shows a little sprout for supporting OTL. That's the honest system. We trust you to finish your ${created.amount} gift.</p>
        {DONATE_URL ? (
          <a className="btn sun block" href={DONATE_URL} target="_blank" rel="noreferrer">Give ${created.amount} to OTL</a>
        ) : (
          <p className="panel small strong">The donation page connects once OTL adds its payment link. Your pledge is saved on the lawn.</p>
        )}
        <button className="btn cream block" onClick={() => nav(`/lawn/${created.id}`, { state: { justCreated: true } })}>Go to your lawn</button>
      </div>
    );
  }

  return (
    <>
      <div className="row">
        <button className="btn cream small" onClick={() => (i === 0 ? nav(-1) : go(STEPS[i - 1]))}>Back</button>
        <div className="meter grow" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={i + 1} aria-label={`Step ${i + 1} of 3`}>
          <span style={{ width: `${((i + 1) / 3) * 100}%` }} />
        </div>
      </div>

      {step !== 'honest' && (
        <div aria-label="Preview" className="event-card" style={{ ['--card' as string]: C[color], color: fg, minHeight: 168 }}>
          <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -58, width: 108, transform: 'rotate(-5deg)' }}>
            <Otis look={me.otis} shadow={false} />
          </div>
          <div className="stack" style={{ gap: 8, maxWidth: '68%' }}>
            <span className="date-tab" style={{ alignSelf: 'flex-start' }}><b>{d.day}</b><span>{d.month}</span></span>
            <p className={`display h3 ${fg === C.cream ? 'outlined' : ''}`} style={{ color: fg === C.cream ? undefined : C.pine }}>{title || 'Your lawn'}</p>
            <p className="small strong">{venue || 'Somewhere in Bend'}</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
          {step === 'what' && (
            <form className="card stack-lg" onSubmit={(e) => { e.preventDefault(); validateWhat(); }}>
              <h1 className="display h2">Host a lawn</h1>
              <div className="field">
                <label htmlFor="ev-title">Name</label>
                <input id="ev-title" className="input" value={title} maxLength={48} onChange={(e) => setTitle(e.target.value)} placeholder="Portfolio picnic" />
              </div>
              <div className="field">
                <label htmlFor="ev-about">What will people do there?</label>
                <textarea id="ev-about" className="textarea" value={about} maxLength={400} onChange={(e) => setAbout(e.target.value)} placeholder="Bring a printed piece. We trade portfolios in groups of four." />
              </div>
              <div className="field">
                <span className="label">Card color</span>
                <div className="grid-3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
                  {COLOR_KEYS.map((k) => (
                    <button type="button" key={k} className="swatch" style={{ background: C[k], borderRadius: 12 }} aria-pressed={color === k} aria-label={COLOR_NAMES[k]} onClick={() => setColor(k)} />
                  ))}
                </div>
              </div>
              {err && <p className="error" role="alert">{err}</p>}
              <button className="btn sun block" type="submit">Next</button>
            </form>
          )}

          {step === 'where' && (
            <form className="card stack-lg" onSubmit={(e) => { e.preventDefault(); validateWhere(); }}>
              <h1 className="display h2">When and where</h1>
              <div className="field">
                <label htmlFor="ev-date">Date</label>
                <input id="ev-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="ev-start">Starts</label>
                  <input id="ev-start" className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ev-end">Ends</label>
                  <input id="ev-end" className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="ev-venue">Venue or spot</label>
                <input id="ev-venue" className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Drake Park, by the footbridge" />
              </div>
              <div className="field">
                <label htmlFor="ev-address">Address</label>
                <input id="ev-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="777 NW Riverside Blvd, Bend, OR" autoComplete="street-address" />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="ev-cap">Spots</label>
                  <input id="ev-cap" className="input" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} placeholder="No limit" />
                </div>
                <div className="field">
                  <span className="label">Who can find it</span>
                  <div className="row" style={{ gap: 6 }}>
                    <button type="button" className="chip" aria-pressed={visibility === 'public'} onClick={() => setVisibility('public')}>Anyone</button>
                    <button type="button" className="chip" aria-pressed={visibility === 'invite'} onClick={() => setVisibility('invite')}>Invited</button>
                  </div>
                </div>
              </div>
              {err && <p className="error" role="alert">{err}</p>}
              <button className="btn sun block" type="submit">Next</button>
            </form>
          )}

          {step === 'honest' && (
            <div className="card stack-lg">
              <div className="stack" style={{ gap: 8 }}>
                <h1 className="display h2">The honest system</h1>
                <p className="lede">Hosting a lawn is free. If OTL helped bring your people together, chip in what feels right. Nobody checks, and nothing is locked either way.</p>
              </div>

              <div className="grid-2">
                <button className="swatch" style={{ aspectRatio: 'auto', padding: 14, background: mode === 'free' ? 'var(--lawn)' : 'var(--paper)', gap: 6, textAlign: 'left', justifyItems: 'start' }} aria-pressed={mode === 'free'} onClick={() => setMode('free')}>
                  <Icon name="picnicTable" size={40} />
                  <span className="strong">Keep it free</span>
                  <span className="small">Totally fine. Go host.</span>
                </button>
                <button className="swatch" style={{ aspectRatio: 'auto', padding: 14, background: mode === 'donate' ? 'var(--sun)' : 'var(--paper)', gap: 6, textAlign: 'left', justifyItems: 'start' }} aria-pressed={mode === 'donate'} onClick={() => setMode('donate')}>
                  <Icon name="plant" size={40} />
                  <span className="strong">Chip in to OTL</span>
                  <span className="small">Your lawn gets a sprout.</span>
                </button>
              </div>

              {mode === 'donate' && (
                <motion.div className="stack" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                  <div className="row-wrap" role="group" aria-label="Amount">
                    {AMOUNTS.map((a) => (
                      <button key={a} className="chip" aria-pressed={!custom && amount === a} onClick={() => { setAmount(a); setCustom(''); }} style={{ fontSize: '1.05rem', minWidth: 64, justifyContent: 'center' }}>${a}</button>
                    ))}
                    <input
                      className="input"
                      style={{ width: 120, minHeight: 40, borderRadius: 999, padding: '6px 14px', borderWidth: 2.5 }}
                      inputMode="numeric"
                      aria-label="Other amount in dollars"
                      placeholder="Other $"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <p className="hint">Gifts keep OTL's annual event free, fund student programs with COCC, OSU-Cascades and local high schools, and keep this platform running.</p>
                </motion.div>
              )}

              <div className="panel small">
                <p className="strong">{title}</p>
                <p>{fmtLongDay(startsAt)}, {fmtRange(startsAt, endsAt)}</p>
                <p>{venue}{address ? `, ${address}` : ''}</p>
              </div>

              {err && <p className="error" role="alert">{err}</p>}
              <button className="btn sun block" style={{ minHeight: 58, fontSize: '1.15rem' }} onClick={create}>
                {pledge > 0 ? `Create lawn and give $${pledge}` : 'Create lawn'}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
