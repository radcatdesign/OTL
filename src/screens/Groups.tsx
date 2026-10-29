import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { OtisAvatar } from '../brand/otis/Otis';
import { C, onColor } from '../brand/palette';
import { isBanned, isStaffRole, roleIn } from '../lib/perms';
import { useMe, useStore } from '../lib/store';
import type { DB, Group } from '../lib/types';
import { fmtDay } from '../lib/util';
import { RoleBadge } from '../ui/Bits';
import { Sheet } from '../ui/Sheet';
import { StartGroup } from '../ui/StartGroup';
import { needsReply } from './admin/Inbox';

function GroupCard({ g, db, meId }: { g: Group; db: DB; meId: string }) {
  const join = useStore((s) => s.joinGroup);
  const role = roleIn(db, g.id, meId);
  const members = db.groupMembers.filter((m) => m.groupId === g.id);
  const next = db.events.filter((e) => e.groupId === g.id && e.endsAt > Date.now() && e.visibility === 'public').sort((a, b) => a.startsAt - b.startsAt)[0];
  const lawns = db.events.filter((e) => e.groupId === g.id).length;
  const fg = onColor(g.color);
  const inbox = isStaffRole(role) ? needsReply(db, g.id).length : 0;
  return (
      <article className="card stack" style={{ padding: 0, overflow: 'hidden', gap: 0, height: '100%' }}>
        <Link to={`/g/${g.slug}`} style={{ textDecoration: 'none', color: fg, background: C[g.color], padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'block' }}>
          <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
            <h3 className="display h3" style={{ color: fg }}>{g.name}</h3>
            {role && <RoleBadge role={role} short />}
          </div>
          <p className="strong" style={{ color: fg, opacity: 0.9 }}>{g.tagline}</p>
        </Link>
        <div className="stack" style={{ padding: 16, gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <div className="avatar-stack">
              {members.slice(0, 5).map((m) => { const u = db.users.find((x) => x.id === m.userId); return u ? <OtisAvatar key={m.id} look={u.otis} size={30} /> : null; })}
            </div>
            <span className="small strong">{members.length} members, {lawns} {lawns === 1 ? 'lawn' : 'lawns'}</span>
          </div>
          <p className="small strong muted">{next ? `Next: ${next.title}, ${fmtDay(next.startsAt)}` : 'No lawn on the calendar yet'}</p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/g/${g.slug}`} className="btn cream small">Open</Link>
            {isStaffRole(role) && (
              <Link to={`/g/${g.slug}/admin`} className="btn sun small">
                Run it{inbox > 0 && <span className="pill sun">{inbox}</span>}
              </Link>
            )}
            {!role && !isBanned(db, g.id, meId) && <button className="btn sun small" onClick={() => join(g.id)}>Join</button>}
          </div>
        </div>
      </article>
  );
}

export function Groups() {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const nav = useNavigate();
  const [starting, setStarting] = useState(false);
  const mine = db.groups.filter((g) => roleIn(db, g.id, me.id)).sort((a, b) => {
    const r = { host: 0, cohost: 1, moderator: 2, member: 3 };
    return r[roleIn(db, a.id, me.id)!] - r[roleIn(db, b.id, me.id)!];
  });
  const others = db.groups.filter((g) => !roleIn(db, g.id, me.id) && !isBanned(db, g.id, me.id));

  return (
    <>
      <div className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="display h2">Groups</h1>
          <p className="muted strong">Groups host lawns, keep a member list and send the occasional email.</p>
        </div>
        <button className="btn sun" onClick={() => setStarting(true)}>Start a group</button>
      </div>

      <section className="stack">
        <h2 className="display h4">Yours</h2>
        {mine.length ? (
          <div className="card-grid">{mine.map((g) => <GroupCard key={g.id} g={g} db={db} meId={me.id} />)}</div>
        ) : (
          <div className="card stack center" style={{ alignItems: 'center' }}>
            <Icon name="trees" size={56} />
            <p className="strong">You're not in a group yet. Join one below or start your own.</p>
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="stack">
          <h2 className="display h4">More in Bend</h2>
          <div className="card-grid">{others.map((g) => <GroupCard key={g.id} g={g} db={db} meId={me.id} />)}</div>
        </section>
      )}

      <Sheet open={starting} onClose={() => setStarting(false)} label="Start a group">
        <StartGroup onDone={(g) => { setStarting(false); nav(`/g/${g.slug}/admin/overview`); }} />
      </Sheet>
    </>
  );
}
