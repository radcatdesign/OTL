import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { Otis, OtisAvatar } from '../brand/otis/Otis';
import { C, onColor } from '../brand/palette';
import { can, isBanned, isStaffRole, roleIn, ROLE_INFO } from '../lib/perms';
import { groupBySlug, useMe, useStore } from '../lib/store';
import { useWide } from '../lib/useWide';
import { RoleBadge, Tabs } from '../ui/Bits';
import { Calendar, monthStart } from '../ui/Calendar';
import { EventCard } from '../ui/EventCard';
import { PersonSheet } from '../ui/PersonSheet';
import { needsReply } from './admin/Inbox';

export function GroupPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const join = useStore((s) => s.joinGroup);
  const leave = useStore((s) => s.leaveGroup);
  const wide = useWide();
  const [tab, setTab] = useState<'upcoming' | 'calendar' | 'past'>('upcoming');
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [person, setPerson] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const group = slug ? groupBySlug(db, slug) : undefined;

  if (!group) {
    return (
      <div className="card stack center" style={{ alignItems: 'center' }}>
        <h1 className="display h2">No group at this address</h1>
        <Link to="/groups" className="btn sun">See groups</Link>
      </div>
    );
  }

  const role = roleIn(db, group.id, me.id);
  const banned = isBanned(db, group.id, me.id, me.email);
  const staff = isStaffRole(role);
  const members = db.groupMembers.filter((m) => m.groupId === group.id).sort((a, b) => ROLE_INFO[b.role].rank - ROLE_INFO[a.role].rank || a.joinedAt - b.joinedAt);
  const team = members.filter((m) => m.role !== 'member');
  const visible = db.events.filter((e) => e.groupId === group.id && (e.visibility === 'public' || role || e.hostId === me.id));
  const now = Date.now();
  const upcoming = visible.filter((e) => e.endsAt >= now).sort((a, b) => a.startsAt - b.startsAt);
  const past = visible.filter((e) => e.endsAt < now).sort((a, b) => b.startsAt - a.startsAt);
  const blooms = db.seeds.filter((s) => s.bloomedAt && visible.some((e) => e.id === s.eventId)).length;
  const fg = onColor(group.color);
  const inbox = staff ? needsReply(db, group.id).length : 0;
  const crowd = members.slice(0, wide ? 7 : 5).map((m) => db.users.find((u) => u.id === m.userId)).filter(Boolean);

  const hero = (
    <section className="art art-frame" style={{ background: C[group.color] }}>
      <div className="stack" style={{ padding: wide ? '28px 28px 0' : '20px 18px 0', gap: 8, color: fg }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="pill" style={{ background: C.cream }}>{group.city}</span>
          {role && <RoleBadge role={role} />}
        </div>
        <h1 className="display h1" style={{ color: fg, lineHeight: 1 }}>{group.name}</h1>
        <p className="strong" style={{ fontSize: 'var(--step-1)', color: fg, maxWidth: '36ch' }}>{group.tagline}</p>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'center', gap: wide ? 6 : 2, padding: '8px 12px 0', minHeight: wide ? 150 : 110 }} aria-hidden>
        {crowd.map((u, i) => (
          <div key={u!.id} style={{ width: wide ? 104 : 74, marginBottom: -8, transform: `translateY(${(i % 2) * 8}px)` }}>
            <Otis look={u!.otis} />
          </div>
        ))}
      </div>
      <div style={{ height: 22, background: C.lawn, borderTop: '3px solid var(--pine)' }} />
    </section>
  );

  const actions = (
    <section className="card stack">
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <div className="grow" style={{ minWidth: 160 }}>
          <p className="display h3" style={{ fontVariantNumeric: 'tabular-nums' }}>{members.length}</p>
          <p className="small strong muted">members, {visible.length} {visible.length === 1 ? 'lawn' : 'lawns'}, {blooms} {blooms === 1 ? 'flower' : 'flowers'} grown</p>
        </div>
        <div className="avatar-stack">
          {members.slice(0, 6).map((m) => { const u = db.users.find((x) => x.id === m.userId); return u ? <OtisAvatar key={m.id} look={u.otis} size={36} /> : null; })}
        </div>
      </div>
      {banned ? (
        <p className="panel strong" role="status">You can't join this group. If you think that's a mistake, reach out to {group.replyTo}.</p>
      ) : !role ? (
        <button className="btn sun block" onClick={() => join(group.id)}>Join {group.name}</button>
      ) : staff ? (
        <div className="stack" style={{ gap: 8 }}>
          <Link to={`/g/${group.slug}/admin`} className="btn sun block" style={{ whiteSpace: 'nowrap' }}>
            Run the group{inbox > 0 && <span className="pill sun">{inbox} to answer</span>}
          </Link>
          {can(role, 'createEvents') && <Link to={`/new?group=${group.id}`} className="btn cream block">New lawn</Link>}
        </div>
      ) : (
        <p className="small strong muted">You're a member. New lawns from this group show up on your home screen.</p>
      )}
      {role && role !== 'host' && (
        confirmLeave ? (
          <div className="row" style={{ gap: 8 }}>
            <span className="small strong grow">Leave {group.name}?</span>
            <button className="btn danger small" onClick={() => { leave(group.id); setConfirmLeave(false); }}>Leave</button>
            <button className="btn cream small" onClick={() => setConfirmLeave(false)}>Stay</button>
          </div>
        ) : <button className="link-btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirmLeave(true)}>Leave group</button>
      )}
    </section>
  );

  const about = (
    <section className="card stack">
      <h2 className="display h4">About</h2>
      <p style={{ whiteSpace: 'pre-wrap' }}>{group.about || 'No description yet.'}</p>
    </section>
  );

  const teamCard = (
    <section className="card stack">
      <h2 className="display h4">Who runs it</h2>
      <div className="list">
        {team.map((m) => {
          const u = db.users.find((x) => x.id === m.userId);
          if (!u) return null;
          return (
            <button key={m.id} className="list-row" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => setPerson(u.id)}>
              <OtisAvatar look={u.otis} size={40} />
              <span className="grow strong">{u.id === me.id ? 'You' : u.name}</span>
              <RoleBadge role={m.role} short />
            </button>
          );
        })}
      </div>
    </section>
  );

  const lawns = (
    <section className="stack">
      <Tabs label="Lawns" value={tab} onChange={setTab} items={[{ key: 'upcoming', label: 'Coming up', count: upcoming.length }, { key: 'calendar', label: 'Calendar' }, { key: 'past', label: 'Past', count: past.length }]} />
      {tab === 'calendar' ? (
        <div className="card">
          <Calendar
            month={month}
            onMonth={setMonth}
            events={visible}
            onEvent={(e) => nav(`/lawn/${e.id}`)}
            onPick={can(role, 'createEvents') ? (d) => nav(`/new?group=${group.id}&date=${d}`) : undefined}
            compact={!wide}
            createHint="New lawn on"
          />
          {can(role, 'createEvents') && <p className="small strong muted" style={{ marginTop: 10 }}>Click an empty day to start a lawn on it.</p>}
        </div>
      ) : (tab === 'upcoming' ? upcoming : past).length ? (
        <div className="card-grid">{(tab === 'upcoming' ? upcoming : past).map((e) => <EventCard key={e.id} ev={e} />)}</div>
      ) : (
        <div className="card stack center" style={{ alignItems: 'center' }}>
          <Icon name="picnicTable" size={52} />
          <p className="strong">{tab === 'upcoming' ? 'Nothing on the calendar yet.' : 'No past lawns yet.'}</p>
          {can(role, 'createEvents') && tab === 'upcoming' && <Link to={`/new?group=${group.id}`} className="btn sun">Plan one</Link>}
        </div>
      )}
    </section>
  );

  return (
    <>
      <Link to="/groups" className="small strong" style={{ textDecoration: 'none' }}>All groups</Link>
      {hero}
      {wide ? (
        <div className="cols">
          <div className="col">{about}{lawns}</div>
          <div className="rail">{actions}{teamCard}</div>
        </div>
      ) : (
        <>{actions}{about}{lawns}{teamCard}</>
      )}
      <PersonSheet userId={person} onClose={() => setPerson(null)} />
    </>
  );
}
