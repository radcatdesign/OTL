import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { OtisAvatar } from '../brand/otis/Otis';
import { C, onColor } from '../brand/palette';
import { canEnterGarden, membershipOf, userById, useMe, useStore } from '../lib/store';
import type { User } from '../lib/types';
import { fmtLongDay, fmtRange, googleCalendarUrl, isPast, mapsUrl, whenLabel } from '../lib/util';
import { InviteSheet } from '../ui/InviteSheet';
import { LawnScene } from '../ui/LawnScene';
import { PersonSheet } from '../ui/PersonSheet';
import { QR } from '../ui/QR';
import { Sheet } from '../ui/Sheet';
import { inviteLink } from '../ui/InviteSheet';
import { useWide } from '../lib/useWide';

export function Lawn() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const rsvp = useStore((s) => s.rsvp);
  const leave = useStore((s) => s.leave);
  const checkIn = useStore((s) => s.checkIn);
  const ev = db.events.find((e) => e.id === id);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [screenOpen, setScreenOpen] = useState(false);
  const [person, setPerson] = useState<string | null>(null);
  const [gate, setGate] = useState('');
  const [gateErr, setGateErr] = useState('');
  const wide = useWide();

  useEffect(() => {
    if ((loc.state as { justCreated?: boolean } | null)?.justCreated) {
      setInviteOpen(true);
      nav(loc.pathname, { replace: true, state: null });
    }
  }, [loc, nav]);

  const users = useMemo(() => new Map(db.users.map((u) => [u.id, u] as [string, User])), [db.users]);

  if (!ev) {
    return (
      <div className="card stack center" style={{ alignItems: 'center' }}>
        <h1 className="display h2">This lawn wandered off</h1>
        <p>It may have been removed, or the link is missing a piece.</p>
        <Link to="/" className="btn sun">Back to your lawns</Link>
      </div>
    );
  }

  const host = userById(db, ev.hostId);
  const isHost = ev.hostId === me.id;
  const mine = membershipOf(db, ev.id, me.id);
  const inGarden = canEnterGarden(db, ev, me.id);
  const members = db.memberships.filter((m) => m.eventId === ev.id);
  const going = members.filter((m) => m.status !== 'invited');
  const hereCount = members.filter((m) => m.status === 'here').length;
  const seeds = db.seeds.filter((s) => s.eventId === ev.id);
  const blooms = seeds.filter((s) => s.bloomedAt).length;
  const fg = onColor(ev.color);
  const dark = fg === C.cream;
  const past = isPast(ev);
  const full = !!ev.capacity && going.length >= ev.capacity;

  const submitGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkIn(ev.id, gate)) {
      setGateOpen(false);
      setGate('');
      setTimeout(() => nav(`/lawn/${ev.id}/garden`), 500);
    } else {
      setGateErr("That's not the gate code. It's posted at the welcome table, or ask the host.");
    }
  };

  const topC = <>
      <div className="row">
        <button className="btn cream small" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}>Back</button>
        <span className="grow" />
        <span className="pill">{whenLabel(ev)}</span>
      </div>
    </>;
  const heroC = <>
      <section className="event-card stack" style={{ ['--card' as string]: C[ev.color], color: fg, minHeight: 0, padding: 20, gap: 14, display: 'flex', flexDirection: 'column' }} aria-labelledby="lawn-title">
        <h1 id="lawn-title" className={`display h1 ${dark ? 'outlined' : ''}`} style={{ color: dark ? undefined : C.pine }}>{ev.title}</h1>
        <div className="stack" style={{ gap: 4 }}>
          <p className="strong" style={{ fontSize: '1.0625rem' }}>{fmtLongDay(ev.startsAt)}</p>
          <p className="strong">{fmtRange(ev.startsAt, ev.endsAt)}</p>
          <a href={mapsUrl(ev)} target="_blank" rel="noreferrer" className="strong" style={{ color: fg }}>{ev.venue}{ev.address ? `, ${ev.address}` : ''}</a>
        </div>
        <div className="row-wrap" style={{ alignItems: 'center' }}>
          {host && (
            <button className="pill" style={{ padding: '3px 10px 3px 3px', gap: 6, cursor: 'pointer' }} onClick={() => setPerson(host.id)}>
              <OtisAvatar look={host.otis} size={26} ring={false} /> Hosted by {host.name}
            </button>
          )}
          {ev.contribution.mode === 'donate' && ev.contribution.amount > 0 && (
            <span className="pill"><Icon name="plant" size={16} /> Supports OTL</span>
          )}
          {ev.visibility === 'invite' && <span className="pill">Invite only</span>}
        </div>
      </section>
    </>;
  const actionC = <>
      {/* Primary action */}
      {isHost ? (
        <section className="card stack" aria-labelledby="host-tools">
          <div className="row between">
            <h2 id="host-tools" className="display h3">Host tools</h2>
            <span className="pill sun">{hereCount} checked in</span>
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="grow">
              <p className="small strong muted">Gate code</p>
              <p className="code" style={{ fontSize: '2rem', lineHeight: 1.1 }}>{ev.gate}</p>
              <p className="small">Share it at the event. Checking in opens the garden.</p>
            </div>
          </div>
          <div className="grid-2">
            <button className="btn sun" onClick={() => setInviteOpen(true)}>Invite people</button>
            <button className="btn cream" onClick={() => setScreenOpen(true)}>Show on screen</button>
          </div>
          <Link to={`/lawn/${ev.id}/garden`} className="btn block">Open the garden</Link>
        </section>
      ) : inGarden ? (
        <section className="card stack" style={{ background: 'var(--sun)' }}>
          <div className="row">
            <Icon name="tulip" size={44} />
            <div className="grow">
              <p className="display h4">You're on this lawn</p>
              <p className="small strong">{seeds.length} seeds planted, {blooms} in bloom</p>
            </div>
          </div>
          <Link to={`/lawn/${ev.id}/garden`} className="btn cream block">Open the garden</Link>
          <button className="btn white block small" onClick={() => setInviteOpen(true)}>Invite people</button>
        </section>
      ) : mine && mine.status === 'going' ? (
        <section className="card stack">
          <div className="row">
            <Icon name="location" size={44} />
            <div className="grow">
              <p className="display h4">You're going</p>
              <p className="small strong muted">{past ? 'Were you there? Check in with the gate code.' : 'When you get there, check in to open the garden.'}</p>
            </div>
          </div>
          <button className="btn sun block" onClick={() => setGateOpen(true)}>Check in</button>
          <div className="grid-2">
            <a className="btn cream small" href={googleCalendarUrl(ev)} target="_blank" rel="noreferrer">Add to calendar</a>
            <button className="btn cream small" onClick={() => setInviteOpen(true)}>Invite a friend</button>
          </div>
        </section>
      ) : (
        <section className="card stack">
          {mine?.status === 'invited' && mine.invitedBy && (
            <p className="strong">{userById(db, mine.invitedBy)?.name} invited you.</p>
          )}
          {ev.visibility === 'invite' && !mine ? (
            <p className="strong">This lawn is invite only. Ask the host for a link.</p>
          ) : (
            <>
              <button className="btn sun block" disabled={full} onClick={() => rsvp(ev.id, mine?.invitedBy)} style={{ minHeight: 58, fontSize: '1.15rem' }}>
                {full ? 'This lawn is full' : past ? 'I was there' : "I'm going"}
              </button>
              <button className="link-btn" style={{ alignSelf: 'center' }} onClick={() => setGateOpen(true)}>I'm here now. Check in.</button>
            </>
          )}
        </section>
      )}
    </>;
  const sceneC = <>
      <section className="stack" aria-labelledby="the-lawn">
        <div className="row between">
          <h2 id="the-lawn" className="display h3">The lawn</h2>
          <span className="small strong">{going.length}{ev.capacity ? ` of ${ev.capacity}` : ''} {past ? 'came' : 'going'}</span>
        </div>
        <LawnScene
          members={members}
          users={users}
          seeds={seeds}
          hostId={ev.hostId}
          meId={me.id}
          onPick={setPerson}
          onGarden={() => (inGarden ? nav(`/lawn/${ev.id}/garden`) : setGateOpen(true))}
          gardenOpen={inGarden}
        />
        <p className="small strong center">Tap anyone's Otis to see their card.</p>
      </section>
    </>;
  const aboutC = <>
      {ev.about && (
        <section className="card stack">
          <h2 className="display h3">What's happening</h2>
          <p style={{ maxWidth: '62ch' }}>{ev.about}</p>
        </section>
      )}
    </>;
  const whoC = <>
      {going.length > 0 && (
        <section className="card stack" aria-labelledby="who">
          <h2 id="who" className="display h3">Who's {past ? 'been here' : 'coming'}</h2>
          <div className="grid-4">
            {going.map((m) => {
              const u = users.get(m.userId);
              if (!u) return null;
              return (
                <button key={m.id} className="stack center" style={{ background: 'none', border: 0, padding: 0, gap: 4, alignItems: 'center' }} onClick={() => setPerson(u.id)}>
                  <OtisAvatar look={u.otis} size={52} />
                  <span className="small strong" style={{ lineHeight: 1.1 }}>{u.id === me.id ? 'You' : u.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>;
  const leaveLink = <>
      {!isHost && mine && mine.status !== 'invited' && (
        <button className="link-btn" style={{ alignSelf: 'center' }} onClick={() => { leave(ev.id); }}>Leave this lawn</button>
      )}
    </>;

  return (
    <>
      {topC}
      {wide ? (
        <div className="cols">
          <div className="col">
            {heroC}
            {sceneC}
            {aboutC}
          </div>
          <aside className="rail">
            {actionC}
            {whoC}
            {leaveLink}
          </aside>
        </div>
      ) : (
        <>
          {heroC}
          {actionC}
          {sceneC}
          {aboutC}
          {whoC}
          {leaveLink}
        </>
      )}

      <InviteSheet ev={ev} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <PersonSheet userId={person} onClose={() => setPerson(null)} note={person === ev.hostId ? 'Host of this lawn' : undefined} />

      <Sheet open={gateOpen} onClose={() => { setGateOpen(false); setGateErr(''); }} label="Check in">
        <form className="stack-lg" onSubmit={submitGate}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 className="display h2">Check in</h2>
            <p className="muted strong">The gate code is posted at the welcome table. Checking in opens the garden, where people plant what they're looking for.</p>
          </div>
          <input
            id="gate-code"
            className="input code"
            style={{ fontSize: '2rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.3em', minHeight: 72 }}
            value={gate}
            onChange={(e) => { setGate(e.target.value.toUpperCase().slice(0, 8)); setGateErr(''); }}
            aria-label="Gate code"
            placeholder="CODE"
            autoComplete="off"
            autoCapitalize="characters"
          />
          {gateErr && <p className="error" role="alert">{gateErr}</p>}
          <button className="btn sun block" type="submit" disabled={gate.length < 3}>Check in</button>
          {useStore.getState().demo && ev.id === 'otl-2026' && <p className="hint center">Demo: this lawn's code is {ev.gate}.</p>}
        </form>
      </Sheet>

      <Sheet open={screenOpen} onClose={() => setScreenOpen(false)} label="Gate screen">
        <motion.div className="stack-lg center" style={{ alignItems: 'center' }} initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
          <p className="display h3">{ev.title}</p>
          <p className="strong">Check in on On The Lawn with</p>
          <p className="code" style={{ fontSize: 'clamp(3rem, 18vw, 6rem)', lineHeight: 1, background: 'var(--sun)', border: '3px solid var(--pine)', borderRadius: 20, padding: '10px 22px', boxShadow: 'var(--drop)' }}>{ev.gate}</p>
          <p className="strong">New here? Scan to join first.</p>
          <QR text={inviteLink(ev, me.id)} size={200} label="Scan to join this lawn" />
        </motion.div>
      </Sheet>
    </>
  );
}
