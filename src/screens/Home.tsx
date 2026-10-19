import { Link } from 'react-router-dom';
import { Icon, type IconKey } from '../brand/icons';
import { OtisAvatar } from '../brand/otis/Otis';
import { levelFor, statsFor, xpFor, XP } from '../lib/game';
import { userById, useMe, useStore } from '../lib/store';
import { isPast } from '../lib/util';
import { useWide } from '../lib/useWide';
import { EventCard } from '../ui/EventCard';

export function Home() {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const demo = useStore((s) => s.demo);
  const rsvp = useStore((s) => s.rsvp);
  const wide = useWide();
  const stats = statsFor(db, me.id);
  const xp = xpFor(stats);
  const lvl = levelFor(xp);

  const myMemberships = db.memberships.filter((m) => m.userId === me.id);
  const invites = myMemberships.filter((m) => m.status === 'invited');
  const myEventIds = new Set([...myMemberships.filter((m) => m.status !== 'invited').map((m) => m.eventId), ...db.events.filter((e) => e.hostId === me.id).map((e) => e.id)]);
  const mine = db.events.filter((e) => myEventIds.has(e.id)).sort((a, b) => {
    const pa = isPast(a), pb = isPast(b);
    if (pa !== pb) return pa ? 1 : -1;
    return pa ? b.startsAt - a.startsAt : a.startsAt - b.startsAt;
  });
  const discover = db.events.filter((e) => !myEventIds.has(e.id) && e.visibility === 'public' && !invites.some((m) => m.eventId === e.id))
    .sort((a, b) => Number(isPast(a)) - Number(isPast(b)) || a.startsAt - b.startsAt);
  const flagship = db.events.find((e) => e.id === 'otl-2026');
  const atFlagship = flagship && myMemberships.find((m) => m.eventId === flagship.id)?.status === 'here';

  const quests: { done: boolean; label: string; xp: number; to: string; icon: IconKey }[] = [
    { done: true, label: 'Make your Otis', xp: 0, to: '/studio', icon: 'sunHat' },
    { done: stats.lawns > 0, label: 'Join a lawn', xp: XP.joinLawn, to: '/explore', icon: 'picnicTable' },
    { done: stats.attended > 0, label: 'Check in at a lawn', xp: XP.checkIn, to: flagship ? `/lawn/${flagship.id}` : '/explore', icon: 'location' },
    { done: stats.planted > 0, label: 'Plant your first seed', xp: XP.plant, to: '/gardens', icon: 'plant' },
    { done: stats.watered > 0, label: "Water someone's seed", xp: XP.water, to: '/gardens', icon: 'wateringCan' },
    { done: stats.blooms > 0, label: 'Grow a flower with someone', xp: XP.bloom, to: '/gardens', icon: 'tulip' },
    { done: stats.hosted > 0, label: 'Host a lawn', xp: XP.host, to: '/new', icon: 'basket' },
  ];
  const open = quests.filter((q) => !q.done);
  const doneCount = quests.length - open.length;

  const helloC = <>
      <section className="card stack" aria-labelledby="hello">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="grow stack" style={{ gap: 4 }}>
            <h1 id="hello" className="display h2">Hi, {me.name.split(' ')[0]}</h1>
            <p className="muted strong">Level {lvl.number}, {lvl.name}. {lvl.next ? `${lvl.toNext} XP to ${lvl.next.name}.` : 'Top of the lawn.'}</p>
          </div>
          <OtisAvatar look={me.otis} size={64} />
        </div>
        <div className="meter" aria-label="Progress to next level"><span style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></div>
      </section>

    </>;
  const demoCard = <>
      {demo && flagship && !atFlagship && (
        <section className="card stack" style={{ background: 'var(--sun)' }}>
          <div className="row">
            <Icon name="picnicTable" size={44} />
            <p className="strong grow">On The Lawn 2026 just happened. Its garden is full of seeds. Check in with gate code <span className="code" style={{ background: 'var(--cream)', border: '2px solid var(--pine)', borderRadius: 8, padding: '0 6px' }}>{flagship.gate}</span> to walk in.</p>
          </div>
          <Link to={`/lawn/${flagship.id}`} className="btn cream block">Go to the lawn</Link>
          <p className="small strong">Demo mode: in real life the host shows this code at the event.</p>
        </section>
      )}

    </>;
  const invitesCard = <>
      {invites.length > 0 && (
        <section className="stack" aria-labelledby="invites">
          <h2 id="invites" className="display h3">You're invited</h2>
          {invites.map((m) => {
            const ev = db.events.find((e) => e.id === m.eventId);
            const from = m.invitedBy ? userById(db, m.invitedBy) : undefined;
            if (!ev) return null;
            return (
              <div key={m.id} className="stack">
                <EventCard ev={ev} compact note={from ? `${from.name} invited you` : undefined} />
                <button className="btn block" onClick={() => rsvp(ev.id, m.invitedBy)}>I'm going</button>
              </div>
            );
          })}
        </section>
      )}

    </>;
  const questsCard = <>
      {open.length > 0 && (
        <section className="card stack" aria-labelledby="quests">
          <div className="row between">
            <h2 id="quests" className="display h3">Today on the lawn</h2>
            <span className="pill sun" style={{ fontVariantNumeric: 'tabular-nums' }}>{doneCount} of {quests.length}</span>
          </div>
          <div className="list">
            {open.slice(0, 3).map((q) => (
              <Link key={q.label} to={q.to} className="list-row" style={{ alignItems: 'center', textDecoration: 'none' }}>
                <Icon name={q.icon} size={36} />
                <span className="grow strong">{q.label}</span>
                <span className="xp-badge" style={{ marginLeft: 0 }}>+{q.xp} XP</span>
              </Link>
            ))}
          </div>
        </section>
      )}

    </>;
  const yoursC = <>
      <section className="stack" aria-labelledby="yours">
        <div className="row between">
          <h2 id="yours" className="display h3">Your lawns</h2>
          <span className="pill">{stats.lawns}</span>
        </div>
        {mine.length ? (
          <div className="card-grid">{mine.map((ev) => <EventCard key={ev.id} ev={ev} />)}</div>
        ) : (
          <div className="card stack center" style={{ alignItems: 'center' }}>
            <Icon name="picnicTable" size={56} />
            <p className="strong">No lawns yet. Join one below or host your own. Hosting is free.</p>
            <Link to="/new" className="btn sun">Host a lawn</Link>
          </div>
        )}
      </section>

    </>;
  const discoverC = <>
      {discover.length > 0 && (
        <section className="stack" aria-labelledby="near">
          <h2 id="near" className="display h3">Lawns around Bend</h2>
          <div className="card-grid">{discover.slice(0, wide ? 4 : 3).map((ev) => <EventCard key={ev.id} ev={ev} compact />)}</div>
          {discover.length > (wide ? 4 : 3) && <Link to="/explore" className="btn cream block">See all lawns</Link>}
        </section>
      )}
    </>;

  if (wide) {
    return (
      <>
        <div className="page-head">
          <div className="stack" style={{ gap: 6 }}>
            <h1 className="display h1">Hi, {me.name.split(' ')[0]}</h1>
            <p className="lede strong">{lvl.next ? `${lvl.toNext} XP to ${lvl.next.name}. Water a seed or check in somewhere new.` : 'Top of the lawn. Keep it growing.'}</p>
          </div>
        </div>
        <div className="cols">
          <div className="col">
            {yoursC}
            {discoverC}
          </div>
          <aside className="rail">
            {demoCard}
            {invitesCard}
            {questsCard}
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      {helloC}
      {demoCard}
      {invitesCard}
      {questsCard}
      {yoursC}
      {discoverC}
    </>
  );
}
