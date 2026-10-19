import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { OtisAvatar } from '../brand/otis/Otis';
import { Plant, STAGES, STAGE_NAMES } from '../brand/Plant';
import { C } from '../brand/palette';
import { SEED_INTENT, SEED_INTENTS, type SeedIntent } from '../lib/intents';
import { canEnterGarden, userById, useMe, useStore } from '../lib/store';
import type { Activity, DB, Seed } from '../lib/types';
import { ago, stageOf, wateringsFor } from '../lib/util';
import { PersonSheet } from '../ui/PersonSheet';
import { Sheet } from '../ui/Sheet';
import { Tilt } from '../ui/Tilt';
import { useWide } from '../lib/useWide';

export function Garden() {
  const { id } = useParams();
  const nav = useNavigate();
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const ev = db.events.find((e) => e.id === id);
  const [filter, setFilter] = useState<SeedIntent | 'all' | 'mine'>('all');
  const [planting, setPlanting] = useState(false);
  const [openSeed, setOpenSeed] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const wide = useWide();

  if (!ev) {
    return (
      <div className="card stack center" style={{ alignItems: 'center' }}>
        <h1 className="display h2">No garden here</h1>
        <Link to="/gardens" className="btn sun">See your gardens</Link>
      </div>
    );
  }

  if (!canEnterGarden(db, ev, me.id)) {
    return (
      <>
        <div className="row"><button className="btn cream small" onClick={() => nav(`/lawn/${ev.id}`)}>Back</button></div>
        <div className="card stack-lg center" style={{ alignItems: 'center' }}>
          <div className="row" style={{ justifyContent: 'center', gap: 0 }}>
            {STAGES.map((s, i) => (
              <Plant key={s} stage={s} color={SEED_INTENTS[i].color} accent={SEED_INTENTS[i].accent} size={64} />
            ))}
          </div>
          <h1 className="display h2">The garden opens when you check in</h1>
          <p className="lede">Show up to {ev.title}, enter the gate code, and you can plant what you're looking for and water other people's seeds.</p>
          <Link to={`/lawn/${ev.id}`} className="btn sun block">Go to the lawn</Link>
        </div>
      </>
    );
  }

  const seeds = db.seeds.filter((s) => s.eventId === ev.id).sort((a, b) => b.createdAt - a.createdAt);
  const shown = seeds.filter((s) => (filter === 'all' ? true : filter === 'mine' ? s.userId === me.id || db.waterings.some((w) => w.seedId === s.id && w.userId === me.id) : s.intent === filter));
  const blooms = seeds.filter((s) => s.bloomedAt);
  const pairs = new Set(blooms.flatMap((s) => [s.userId, ...s.partners]));
  const news = db.activity.filter((a) => a.eventId === ev.id && ['planted', 'watered', 'bloomed', 'checked_in'].includes(a.kind)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  const topC = <>
      <div className="row">
        <button className="btn cream small" onClick={() => nav(`/lawn/${ev.id}`)}>Lawn</button>
        <span className="grow" />
        <button className="btn sun small" onClick={() => setPlanting(true)}><Icon name="plant" size={24} /> Plant a seed</button>
      </div>

    </>;
  const headerC = <>
      <section className="card stack" style={{ background: C.soil, color: C.cream, padding: '18px 18px 16px' }} aria-labelledby="garden-title">
        <h1 id="garden-title" className="display h2 outlined">{ev.title} garden</h1>
        <p className="strong" style={{ maxWidth: '40ch' }}>Plant what you're looking for. When someone offers help, they water it. Pick who you'll grow it with and it blooms for everyone to see.</p>
        <div className="grid-3" style={{ color: C.pine }}>
          <div className="stat"><b>{seeds.length}</b><span>Seeds</span></div>
          <div className="stat"><b>{blooms.length}</b><span>In bloom</span></div>
          <div className="stat"><b>{pairs.size}</b><span>Growing together</span></div>
        </div>
      </section>

    </>;
  const filtersC = <>
      <div className={wide ? 'row-wrap' : 'row'} style={wide ? undefined : { overflowX: 'auto', paddingBottom: 6, marginInline: -4, paddingInline: 4 }} role="group" aria-label="Filter seeds">
        <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        <button className="chip" aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')} style={{ whiteSpace: 'nowrap' }}>Mine</button>
        {SEED_INTENTS.map((i) => (
          <button key={i.key} className="chip" aria-pressed={filter === i.key} onClick={() => setFilter(i.key)} style={{ whiteSpace: 'nowrap', ['--chip-on' as string]: C[i.color], color: filter === i.key && ['forest', 'tomato'].includes(i.color) ? C.cream : undefined }}>
            <span className="dot" style={{ background: C[i.color] }} />{i.label}
          </button>
        ))}
      </div>

    </>;
  const plotsC = <>
      {shown.length ? (
        <div className={wide ? 'plot-grid' : 'grid-2'} style={wide ? undefined : { gap: 14 }}>
          {shown.map((s) => <Plot key={s.id} seed={s} db={db} meId={me.id} onOpen={() => setOpenSeed(s.id)} />)}
        </div>
      ) : (
        <div className="card stack center" style={{ alignItems: 'center' }}>
          <Plant stage="seed" color="lawn" accent="sun" size={90} />
          <p className="strong">{filter === 'all' ? 'Nothing planted yet. Be the first.' : 'No seeds like that yet.'}</p>
          <button className="btn sun" onClick={() => setPlanting(true)}>Plant a seed</button>
        </div>
      )}

    </>;
  const newsCard = <>
      {news.length > 0 && (
        <section className="card stack" aria-labelledby="garden-news">
          <h2 id="garden-news" className="display h3">Garden news</h2>
          <div className="list">
            {news.map((a) => <NewsRow key={a.id} a={a} db={db} meId={me.id} onSeed={setOpenSeed} />)}
          </div>
        </section>
      )}
    </>;

  return (
    <>
      {topC}
      {wide ? (
        <div className="cols">
          <div className="col">
            {headerC}
            {filtersC}
            {plotsC}
          </div>
          <aside className="rail">
            <section className="card stack" aria-labelledby="how-it-grows">
      <h2 id="how-it-grows" className="display h3">How seeds grow</h2>
      <div className="list">
        {([
          ['seed', 'Planted', 'Someone shares what they need.'],
          ['sprout', 'Sprouting', 'A neighbor waters it with an offer.'],
          ['bud', 'Budding', 'More offers keep it growing.'],
          ['bloom', 'In bloom', 'The planter picks who to grow it with.'],
        ] as const).map(([stage, name, line], i) => (
          <div key={stage} className="list-row" style={{ alignItems: 'center' }}>
            <Plant stage={stage} color={SEED_INTENTS[i].color} accent={SEED_INTENTS[i].accent} size={46} />
            <div className="grow">
              <p className="strong">{name}</p>
              <p className="small muted">{line}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
            {newsCard}
          </aside>
        </div>
      ) : (
        <>
          {headerC}
          {filtersC}
          {plotsC}
          {newsCard}
        </>
      )}

      <PlantSheet eventId={ev.id} open={planting} onClose={() => setPlanting(false)} onPlanted={(sid) => { setPlanting(false); setTimeout(() => setOpenSeed(sid), 250); }} />
      <SeedSheet seedId={openSeed} onClose={() => setOpenSeed(null)} onPerson={setPerson} />
      <PersonSheet userId={person} onClose={() => setPerson(null)} />
    </>
  );
}

function Plot({ seed, db, meId, onOpen }: { seed: Seed; db: DB; meId: string; onOpen: () => void }) {
  const info = SEED_INTENT[seed.intent];
  const ws = wateringsFor(db, seed.id);
  const stage = stageOf(seed, ws.length);
  const planter = userById(db, seed.userId);
  const thirsty = !seed.bloomedAt && ws.length === 0;
  const mine = seed.userId === meId;
  return (
    <Tilt max={8}>
      <motion.button
        layout
        type="button"
        onClick={onOpen}
        className="card"
        style={{ width: '100%', padding: 0, overflow: 'hidden', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%' }}
        aria-label={`${info.ask}: ${seed.title}. ${STAGE_NAMES[stage]}.`}
      >
        <span className="glare" />
        <div style={{ position: 'relative', background: `linear-gradient(180deg, ${C.cream} 0 70%, ${C.lawn} 70%)`, borderBottom: `3px solid ${C.pine}`, display: 'grid', placeItems: 'center', paddingTop: 10 }}>
          <motion.div key={stage} initial={{ scale: 0.7, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }} style={{ width: '62%', marginBottom: -2 }}>
            <Plant stage={stage} color={info.color} accent={info.accent} size="100%" />
          </motion.div>
          <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            <span className="dot" style={{ width: 16, height: 16, background: C[info.color] }} title={info.label} />
            {mine ? <span className="pill sun" style={{ fontSize: 11 }}>Yours</span> : thirsty ? <span className="pill sky" style={{ fontSize: 11 }}>Thirsty</span> : null}
          </div>
        </div>
        <div className="stack" style={{ gap: 6, padding: '10px 12px 12px', flex: 1 }}>
          <span className="small strong" style={{ color: 'var(--ink-soft)' }}>{info.label}</span>
          <p className="strong" style={{ lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{seed.title}</p>
          <div className="row" style={{ marginTop: 'auto', gap: 6 }}>
            {planter && <OtisAvatar look={planter.otis} size={26} />}
            {seed.bloomedAt ? (
              <>
                <span className="small strong">+</span>
                <div className="avatar-stack">
                  {seed.partners.map((p) => { const u = userById(db, p); return u ? <OtisAvatar key={p} look={u.otis} size={26} /> : null; })}
                </div>
              </>
            ) : (
              <span className="small strong grow" style={{ textAlign: 'right' }}>
                <Droplet /> {ws.length}
              </span>
            )}
          </div>
        </div>
      </motion.button>
    </Tilt>
  );
}

function Droplet({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 12 16" aria-hidden style={{ display: 'inline-block', verticalAlign: '-2px' }}>
      <path d="M6 1C8 5 11 8 11 10.5A5 5 0 0 1 1 10.5C1 8 4 5 6 1Z" fill={C.sky} stroke={C.pine} strokeWidth="1.8" />
    </svg>
  );
}

function NewsRow({ a, db, meId, onSeed }: { a: Activity; db: DB; meId: string; onSeed: (id: string) => void }) {
  const who = userById(db, a.userId);
  const other = a.otherUserId ? userById(db, a.otherUserId) : undefined;
  const seed = a.seedId ? db.seeds.find((s) => s.id === a.seedId) : undefined;
  if (!who) return null;
  const name = (u: { id: string; name: string }) => (u.id === meId ? 'You' : u.name.split(' ')[0]);
  const text =
    a.kind === 'planted' ? `${name(who)} planted a seed` :
    a.kind === 'watered' ? `${name(who)} watered ${other ? (other.id === meId ? 'your' : `${other.name.split(' ')[0]}'s`) : 'a'} seed` :
    a.kind === 'bloomed' ? `${name(who)} and ${other ? name(other) : 'a neighbor'} are growing this together` :
    `${name(who)} checked in`;
  return (
    <button className="list-row" style={{ background: 'none', border: 0, width: '100%', textAlign: 'left', alignItems: 'center' }} onClick={() => seed && onSeed(seed.id)} disabled={!seed}>
      <OtisAvatar look={who.otis} size={36} />
      <div className="grow">
        <p className="strong" style={{ lineHeight: 1.2 }}>{text}</p>
        {seed && <p className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seed.title}</p>}
      </div>
      <span className="small muted strong" style={{ whiteSpace: 'nowrap' }}>{ago(a.createdAt)}</span>
    </button>
  );
}

function PlantSheet({ eventId, open, onClose, onPlanted }: { eventId: string; open: boolean; onClose: () => void; onPlanted: (seedId: string) => void }) {
  const plantSeed = useStore((s) => s.plantSeed);
  const [intent, setIntent] = useState<SeedIntent | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const info = intent ? SEED_INTENT[intent] : null;

  const reset = () => { setIntent(null); setTitle(''); setDetails(''); setLink(''); setErr(''); };

  return (
    <Sheet open={open} onClose={() => { onClose(); }} label="Plant a seed">
      <form
        className="stack-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (!intent) return setErr('Pick what kind of seed this is.');
          if (title.trim().length < 4) return setErr('Say what you are looking for in a few words.');
          const s = plantSeed(eventId, { intent, title, details, link });
          reset();
          onPlanted(s.id);
        }}
      >
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="grow stack" style={{ gap: 4 }}>
            <h2 className="display h2">Plant a seed</h2>
            <p className="muted strong">What are you looking for?</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={intent ?? 'none'} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
              <Plant stage="seed" color={info?.color ?? 'lawn'} accent={info?.accent ?? 'sun'} size={70} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="grid-2" role="radiogroup" aria-label="Kind of seed">
          {SEED_INTENTS.map((i) => {
            const on = intent === i.key;
            return (
              <button
                type="button"
                key={i.key}
                role="radio"
                aria-checked={on}
                aria-pressed={on}
                className="swatch"
                style={{ aspectRatio: 'auto', padding: '10px 12px', justifyItems: 'start', textAlign: 'left', gap: 4, background: on ? C[i.color] : 'var(--paper)', color: on && ['forest', 'tomato'].includes(i.color) ? C.cream : C.pine }}
                onClick={() => { setIntent(i.key); setErr(''); }}
              >
                <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: C[i.color] }} /><span className="strong">{i.label}</span></span>
                <span className="small" style={{ lineHeight: 1.2 }}>{i.ask}</span>
              </button>
            );
          })}
        </div>
        <div className="field">
          <label htmlFor="seed-title">In a few words</label>
          <input id="seed-title" className="input" value={title} maxLength={70} onChange={(e) => setTitle(e.target.value)} placeholder={info?.prompt ?? 'Review my brand deck before Friday'} />
        </div>
        <div className="field">
          <label htmlFor="seed-details">A little more</label>
          <textarea id="seed-details" className="textarea" value={details} maxLength={280} onChange={(e) => setDetails(e.target.value)} placeholder="What would help, and by when." />
        </div>
        <div className="field">
          <label htmlFor="seed-link">Link</label>
          <input id="seed-link" className="input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
          <span className="hint">Optional. A portfolio, deck, or shop.</span>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn sun block" type="submit" style={{ minHeight: 58, fontSize: '1.15rem' }}>Plant it</button>
      </form>
    </Sheet>
  );
}

function SeedSheet({ seedId, onClose, onPerson }: { seedId: string | null; onClose: () => void; onPerson: (id: string) => void }) {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const waterSeed = useStore((s) => s.waterSeed);
  const bloomSeed = useStore((s) => s.bloomSeed);
  const [msg, setMsg] = useState('');
  const [pouring, setPouring] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const seed = seedId ? db.seeds.find((s) => s.id === seedId) : undefined;
  const ws = useMemo(() => (seed ? wateringsFor(db, seed.id) : []), [db, seed]);

  if (!seed) return <Sheet open={false} onClose={onClose} label="Seed">{null}</Sheet>;

  const info = SEED_INTENT[seed.intent];
  const stage = stageOf(seed, ws.length);
  const planter = userById(db, seed.userId);
  const mine = seed.userId === me.id;
  const iWatered = ws.some((w) => w.userId === me.id);
  const helpers = [...new Map(ws.filter((w) => w.userId !== seed.userId).map((w) => [w.userId, w])).values()];

  const water = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setPouring(true);
    setTimeout(() => {
      waterSeed(seed.id, msg);
      setMsg('');
      setPouring(false);
    }, 900);
  };

  return (
    <Sheet open={!!seed} onClose={() => { setPicked([]); onClose(); }} label={seed.title}>
      <div className="stack-lg">
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center', background: `linear-gradient(180deg, #cfe7fd 0 64%, ${C.lawn} 64%)`, border: `3px solid ${C.pine}`, borderRadius: 24, paddingTop: 12, overflow: 'hidden' }}>
          <motion.div key={stage} initial={{ scale: 0.6, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 11 }} style={{ width: 150, marginBottom: -4 }}>
            <Plant stage={stage} color={info.color} accent={info.accent} size="100%" />
          </motion.div>
          <AnimatePresence>
            {pouring && (
              <motion.div aria-hidden style={{ position: 'absolute', top: 6, left: '50%' }} initial={{ x: 40, y: -20, rotate: 0, opacity: 0 }} animate={{ x: 10, y: 0, rotate: -28, opacity: 1 }} exit={{ opacity: 0 }}>
                <Icon name="wateringCan" size={72} style={{ transform: 'scaleX(-1)' }} />
                {[0, 1, 2, 3].map((i) => (
                  <motion.span key={i} style={{ position: 'absolute', left: 4 + i * 6, top: 52 }} initial={{ y: 0, opacity: 1 }} animate={{ y: 60, opacity: 0 }} transition={{ duration: 0.6, delay: 0.25 + i * 0.08, repeat: 1 }}>
                    <Droplet size={9} />
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ol className="row" aria-label="Growth" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 6 }}>
          {STAGES.map((s, i) => {
            const reached = STAGES.indexOf(stage) >= i;
            return (
              <li key={s} className="grow" style={{ textAlign: 'center' }}>
                <div style={{ height: 8, borderRadius: 99, border: `2px solid ${C.pine}`, background: reached ? C[info.color] : C.paper }} />
                <span className="small strong" style={{ opacity: reached ? 1 : 0.45 }}>{STAGE_NAMES[s]}</span>
              </li>
            );
          })}
        </ol>

        <div className="stack" style={{ gap: 6 }}>
          <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: C[info.color] }} /><span className="strong small">{info.ask}</span></span>
          <h2 className="display h3">{seed.title}</h2>
          {seed.details && <p>{seed.details}</p>}
          {seed.link && <a className="strong" href={seed.link} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{seed.link}</a>}
          {planter && (
            <button className="row" style={{ background: 'none', border: 0, padding: 0, gap: 8, marginTop: 4 }} onClick={() => onPerson(planter.id)}>
              <OtisAvatar look={planter.otis} size={34} />
              <span className="strong">{planter.id === me.id ? 'You planted this' : `Planted by ${planter.name}`}</span>
              <span className="small muted">{ago(seed.createdAt)}</span>
            </button>
          )}
        </div>

        {seed.bloomedAt && (
          <div className="card flat stack" style={{ background: C.sun, alignItems: 'center', textAlign: 'center' }}>
            <div className="row" style={{ justifyContent: 'center' }}>
              {[seed.userId, ...seed.partners].map((id) => { const u = userById(db, id); return u ? <OtisAvatar key={id} look={u.otis} size={48} /> : null; })}
            </div>
            <p className="strong">{[seed.userId, ...seed.partners].map((id) => (id === me.id ? 'You' : userById(db, id)?.name.split(' ')[0])).join(' and ')} are growing this together.</p>
          </div>
        )}

        <div className="stack">
          <h3 className="display h4">{ws.length ? `Watered ${ws.length} ${ws.length === 1 ? 'time' : 'times'}` : 'Not watered yet'}</h3>
          {ws.length === 0 && <p className="muted">{mine ? 'Neighbors will see it in the garden. You get a note when someone waters it.' : 'Be the first to help this one grow.'}</p>}
          <div className="list">
            {ws.map((w) => {
              const u = userById(db, w.userId);
              if (!u) return null;
              const canBloom = mine && !seed.bloomedAt && w.userId !== me.id && helpers.some((h) => h.id === w.id);
              const on = picked.includes(w.userId);
              return (
                <div key={w.id} className="list-row">
                  <button style={{ background: 'none', border: 0, padding: 0 }} onClick={() => onPerson(u.id)} aria-label={`See ${u.name}'s card`}>
                    <OtisAvatar look={u.otis} size={40} />
                  </button>
                  <div className="grow stack" style={{ gap: 2 }}>
                    <p className="strong">{u.id === me.id ? 'You' : u.name} <span className="small muted">{ago(w.createdAt)}</span></p>
                    <p>{w.message}</p>
                    {canBloom && (
                      <button className="chip" aria-pressed={on} onClick={() => setPicked((xs) => (on ? xs.filter((x) => x !== w.userId) : [...xs, w.userId]))} style={{ alignSelf: 'flex-start', marginTop: 4, ['--chip-on' as string]: C.sun }}>
                        {on ? `Growing with ${u.name.split(' ')[0]}` : `Grow this with ${u.name.split(' ')[0]}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {mine && !seed.bloomedAt && picked.length > 0 && (
            <motion.button initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="btn sun block" style={{ minHeight: 58, fontSize: '1.15rem' }} onClick={() => { bloomSeed(seed.id, picked); setPicked([]); }}>
              Bloom it
            </motion.button>
          )}
          {mine && !seed.bloomedAt && helpers.length > 0 && picked.length === 0 && (
            <p className="hint">Pick who you're going to work with. The seed blooms and everyone in the garden can see you're growing it together.</p>
          )}
        </div>

        {!mine && !seed.bloomedAt && (
          <form className="stack" onSubmit={water}>
            <label className="label" htmlFor="water-msg">{info.waterVerb}</label>
            <textarea id="water-msg" className="textarea" style={{ minHeight: 80 }} value={msg} maxLength={240} onChange={(e) => setMsg(e.target.value)} placeholder={iWatered ? 'Add another note' : 'What can you offer? Be specific about when.'} />
            <button className="btn sky block" type="submit" disabled={!msg.trim() || pouring}>
              <Icon name="wateringCan" size={30} /> {pouring ? 'Watering' : 'Water this seed'}
            </button>
          </form>
        )}
      </div>
    </Sheet>
  );
}
