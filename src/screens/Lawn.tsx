import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { C } from '../brand/palette';
import { can, isStaffRole, roleIn } from '../lib/perms';
import { canEnterGarden, groupById, membershipOf, userById, useMe, useStore } from '../lib/store';
import type { User } from '../lib/types';
import { useWide } from '../lib/useWide';
import { dateParts, fmtLongDay, fmtRange, isPast, whenLabel } from '../lib/util';
import { AddToCalendar } from '../ui/AddToCalendar';
import { RoleBadge, Tabs } from '../ui/Bits';
import { Cover } from '../ui/Cover';
import { EventChat } from '../ui/EventChat';
import { InviteSheet, inviteLink } from '../ui/InviteSheet';
import { LawnScene } from '../ui/LawnScene';
import { MapView } from '../ui/MapView';
import { PersonSheet } from '../ui/PersonSheet';
import { PhotoWall } from '../ui/PhotoWall';
import { QR } from '../ui/QR';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';

type Tab = 'about' | 'chat' | 'photos' | 'lawn';

export function Lawn() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const rsvp = useStore((s) => s.rsvp);
  const leave = useStore((s) => s.leave);
  const checkIn = useStore((s) => s.checkIn);
  const createCampaign = useStore((s) => s.createCampaign);
  const ev = db.events.find((e) => e.id === id);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [screenOpen, setScreenOpen] = useState(false);
  const [person, setPerson] = useState<string | null>(null);
  const [gate, setGate] = useState('');
  const [gateErr, setGateErr] = useState('');
  const [tab, setTab] = useState<Tab>(((loc.state as { tab?: Tab } | null)?.tab) ?? 'about');
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

  const group = groupById(db, ev.groupId);
  const myRole = roleIn(db, ev.groupId, me.id);
  const canEdit = can(myRole, 'createEvents');
  const staff = isStaffRole(myRole) || ev.hostId === me.id || ev.cohostIds.includes(me.id);
  const hostIds = ev.cohostIds.length ? ev.cohostIds : [ev.hostId];
  const hosts = hostIds.map((h) => userById(db, h)).filter((x): x is User => !!x);
  const mine = membershipOf(db, ev.id, me.id);
  const inGarden = canEnterGarden(db, ev, me.id);
  const members = db.memberships.filter((m) => m.eventId === ev.id);
  const going = members.filter((m) => m.status !== 'invited');
  const hereCount = members.filter((m) => m.status === 'here').length;
  const seeds = db.seeds.filter((s) => s.eventId === ev.id);
  const blooms = seeds.filter((s) => s.bloomedAt).length;
  const chatCount = db.messages.filter((m) => m.eventId === ev.id && !m.hiddenBy).length;
  const photoCount = db.photos.filter((p) => p.eventId === ev.id).length;
  const past = isPast(ev);
  const full = !!ev.capacity && going.length >= ev.capacity;
  const banned = db.groupBans.some((b) => b.groupId === ev.groupId && b.userId === me.id);

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

  const doRsvp = () => rsvp(ev.id, mine?.invitedBy);

  const topC = (
    <div className="row">
      <button className="btn cream small" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}>Back</button>
      <span className="grow" />
      <span className={`pill ${whenLabel(ev) === 'Happening now' ? 'sun' : ''}`}>{whenLabel(ev)}</span>
      {canEdit && <Link to={`/lawn/${ev.id}/edit`} className="btn cream small">Edit lawn</Link>}
    </div>
  );

  const heroC = <Cover cover={ev.cover} ratio={wide ? '2.3 / 1' : '16 / 10'} label={`${ev.title} cover`} />;

  const titleC = (
    <section className="card stack" aria-labelledby="lawn-title" style={{ gap: 14 }}>
      <h1 id="lawn-title" className="display h1">{ev.title}</h1>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <span className="date-block" aria-hidden>
          <span>{dateParts(ev.startsAt).month}</span>
          <b>{dateParts(ev.startsAt).day}</b>
        </span>
        <div className="stack" style={{ gap: 2 }}>
          <p className="strong" style={{ fontSize: '1.0625rem' }}>{fmtLongDay(ev.startsAt)}</p>
          <p className="strong muted">{fmtRange(ev.startsAt, ev.endsAt)}</p>
        </div>
      </div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <span className="icon-tile" aria-hidden><MapPin size={18} strokeWidth={2} /></span>
        <div className="stack" style={{ gap: 2 }}>
          <p className="strong">{ev.venue}</p>
          {ev.address && <p className="small muted strong">{ev.address}</p>}
        </div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <p className="label">Hosted by</p>
        <div className="row-wrap" style={{ alignItems: 'center' }}>
          {group && (
            <Link to={`/g/${group.slug}`} className="pill" style={{ textDecoration: 'none', padding: '3px 10px 3px 4px', gap: 6 }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: C[group.color], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)' }} aria-hidden />
              {group.name}
            </Link>
          )}
          {hosts.map((h) => (
            <button key={h.id} className="pill" style={{ padding: '3px 10px 3px 3px', gap: 6, cursor: 'pointer' }} onClick={() => setPerson(h.id)}>
              <Avatar user={h} size={26} /> {h.id === me.id ? 'You' : h.name}
            </button>
          ))}
        </div>
      </div>
      <div className="row-wrap">
        {ev.contribution.mode === 'donate' && ev.contribution.amount > 0 && <span className="pill"><Icon name="plant" size={16} /> Supports OTL</span>}
        {ev.visibility === 'invite' && <span className="pill">Invite only</span>}
        {ev.capacity && !isPast(ev) && <span className="pill">{Math.max(ev.capacity - going.length, 0)} of {ev.capacity} spots left</span>}
      </div>
    </section>
  );

  let actionC;
  if (banned) {
    actionC = <section className="card"><p className="strong">You can't join this group's lawns.</p></section>;
  } else if (staff) {
    actionC = (
      <section className="card stack" aria-labelledby="host-tools">
        <div className="row between">
          <h2 id="host-tools" className="display h3">Host tools</h2>
          {myRole && <RoleBadge role={myRole} />}
        </div>
        <div className="row">
          <div className="grow">
            <p className="small strong muted">Gate code</p>
            <p className="code" style={{ fontSize: '2rem', lineHeight: 1.1 }}>{ev.gate}</p>
          </div>
          <div className="stat" style={{ minWidth: 104 }}><b>{hereCount}</b><span>checked in</span></div>
        </div>
        <p className="small">Share the code at the event. Checking in opens the garden.</p>
        <div className="grid-2">
          <button className="btn sun" onClick={() => setInviteOpen(true)}>Invite people</button>
          <button className="btn cream" onClick={() => setScreenOpen(true)}>Show on screen</button>
        </div>
        <Link to={`/lawn/${ev.id}/garden`} className="btn block">Open the garden</Link>
        {can(myRole, 'sendCampaigns') && group && (
          <button className="btn cream block small" onClick={() => { const c = createCampaign(ev.groupId, ev.id); if (c) nav(`/g/${group.slug}/admin/campaigns/${c.id}`); }}>
            <Icon name="letter" size={24} /> Email about this lawn
          </button>
        )}
        {mine?.status !== 'here' && (
          <div className="row" style={{ justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {!mine && !past && <button className="link-btn" onClick={doRsvp}>Add me to the guest list</button>}
            <button className="link-btn" onClick={() => { if (checkIn(ev.id, ev.gate)) setTimeout(() => nav(`/lawn/${ev.id}/garden`), 500); }}>{past ? 'I was there. Check me in.' : "I'm here. Check me in."}</button>
          </div>
        )}
      </section>
    );
  } else if (inGarden) {
    actionC = (
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
    );
  } else if (mine && mine.status === 'going') {
    actionC = (
      <section className="card stack">
        <div className="row">
          <Icon name="location" size={44} />
          <div className="grow">
            <p className="display h4">You're going</p>
            <p className="small strong muted">{past ? 'Were you there? Check in with the gate code.' : 'When you get there, check in to open the garden.'}</p>
          </div>
        </div>
        <button className="btn sun block" onClick={() => setGateOpen(true)}>Check in</button>
        <button className="btn cream small block" onClick={() => setInviteOpen(true)}>Invite a friend</button>
      </section>
    );
  } else {
    actionC = (
      <section className="card stack">
        {mine?.status === 'invited' && mine.invitedBy && <p className="strong">{userById(db, mine.invitedBy)?.name} invited you.</p>}
        {ev.visibility === 'invite' && !mine ? (
          <p className="strong">This lawn is invite only. Ask the host for a link.</p>
        ) : (
          <>
            <button className="btn sun block" disabled={full} onClick={doRsvp} style={{ minHeight: 58, fontSize: '1.15rem' }}>
              {full ? 'This lawn is full' : past ? 'I was there' : "I'm going"}
            </button>
            <button className="link-btn" style={{ alignSelf: 'center' }} onClick={() => setGateOpen(true)}>I'm here now. Check in.</button>
          </>
        )}
      </section>
    );
  }

  const calendarC = !past ? <section className="card"><AddToCalendar ev={ev} /></section> : null;

  const whoC = going.length > 0 && (
    <div className="stack">
      <div className="row between">
        <h3 className="display h4">Who's {past ? 'been here' : 'coming'}</h3>
        <span className="small strong">{going.length}{ev.capacity ? ` of ${ev.capacity}` : ''}</span>
      </div>
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))' }}>
        {going.slice(0, 24).map((m) => {
          const u = users.get(m.userId);
          if (!u) return null;
          return (
            <button key={m.id} className="stack center" style={{ background: 'none', border: 0, padding: 0, gap: 4, alignItems: 'center' }} onClick={() => setPerson(u.id)}>
              <Avatar user={u} size={48} />
              <span className="small strong" style={{ lineHeight: 1.1 }}>{u.id === me.id ? 'You' : u.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
      {going.length > 24 && <p className="small strong muted">And {going.length - 24} more</p>}
    </div>
  );

  const tabsC = (
    <section className="stack">
      <Tabs<Tab>
        label="Lawn sections"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'about', label: 'Details' },
          { key: 'chat', label: 'Chat', count: ev.chat ? chatCount : undefined },
          { key: 'photos', label: 'Photos', count: ev.photos ? photoCount : undefined },
          { key: 'lawn', label: 'The lawn' },
        ]}
      />
      {tab === 'about' && (
        <div className="card stack-lg">
          <div className="stack">
            <h2 className="display h3">What's happening</h2>
            <p style={{ maxWidth: '62ch', whiteSpace: 'pre-wrap' }}>{ev.about || 'The host hasn’t added details yet.'}</p>
          </div>
          <div className="stack">
            <h3 className="display h4">Where</h3>
            <MapView geo={ev.geo} place={[ev.venue, ev.address].filter(Boolean).join(', ')} height={wide ? 280 : 220} />
          </div>
          {whoC}
        </div>
      )}
      {tab === 'chat' && <div className="card"><EventChat ev={ev} onRsvp={doRsvp} onPerson={setPerson} /></div>}
      {tab === 'photos' && <div className="card"><PhotoWall ev={ev} onRsvp={doRsvp} /></div>}
      {tab === 'lawn' && (
        <div className="stack">
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
          <p className="small strong center">Tap anyone's Otis to see their card. The garden opens when you check in.</p>
        </div>
      )}
    </section>
  );

  const leaveLink = !staff && mine && mine.status !== 'invited' && (
    <button className="link-btn" style={{ alignSelf: 'center' }} onClick={() => leave(ev.id)}>Leave this lawn</button>
  );

  return (
    <>
      {topC}
      {wide ? (
        <div className="cols">
          <div className="col">
            {heroC}
            {titleC}
            {tabsC}
          </div>
          <aside className="rail">
            {actionC}
            {calendarC}
            {leaveLink}
          </aside>
        </div>
      ) : (
        <>
          {heroC}
          {titleC}
          {actionC}
          {calendarC}
          {tabsC}
          {leaveLink}
        </>
      )}

      <InviteSheet ev={ev} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <PersonSheet userId={person} onClose={() => setPerson(null)} note={hostIds.includes(person ?? '') ? 'Hosting this lawn' : undefined} />

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
          <p className="code" style={{ fontSize: 'clamp(3rem, 18vw, 6rem)', lineHeight: 1, background: 'var(--brand-tint)', color: 'var(--brand)', border: '1px solid color-mix(in srgb, var(--brand) 30%, white)', borderRadius: 16, padding: '12px 24px' }}>{ev.gate}</p>
          <p className="strong">New here? Scan to join first.</p>
          <QR text={inviteLink(ev, me.id)} size={200} label="Scan to join this lawn" />
        </motion.div>
      </Sheet>
    </>
  );
}
