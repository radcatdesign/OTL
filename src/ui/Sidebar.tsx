import { Compass, Flower2, Home, Plus, UserRound, Users, type LucideIcon } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { OTLMark } from '../brand/Logo';
import { C } from '../brand/palette';
import { levelFor, statsFor, xpFor } from '../lib/game';
import { isStaffRole, roleIn } from '../lib/perms';
import { useMe, useStore } from '../lib/store';
import { needsReply } from '../screens/admin/Inbox';
import { Avatar } from './Avatar';

export const NAV: { to: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Lawns', icon: Home, match: (p) => p === '/' || (p.startsWith('/lawn/') && !p.endsWith('/garden')) || p === '/new' },
  { to: '/gardens', label: 'Gardens', icon: Flower2, match: (p) => p === '/gardens' || p.endsWith('/garden') },
  { to: '/explore', label: 'Explore', icon: Compass, match: (p) => p === '/explore' },
  { to: '/groups', label: 'Groups', icon: Users, match: (p) => p === '/groups' || p.startsWith('/g/') },
  { to: '/me', label: 'Me', icon: UserRound, match: (p) => p === '/me' || p === '/studio' },
];

// Desktop navigation: a quiet column down the left edge.
export function Sidebar() {
  const me = useMe();
  const db = useStore((s) => s.db);
  const demo = useStore((s) => s.demo);
  const { pathname } = useLocation();
  if (!me) return null;
  const xp = xpFor(statsFor(db, me.id));
  const lvl = levelFor(xp);
  const rank = { host: 0, cohost: 1, moderator: 2, member: 3 };
  const mine = db.groups
    .map((g) => { const role = roleIn(db, g.id, me.id); return { g, role, inbox: isStaffRole(role) ? needsReply(db, g.id).length : 0 }; })
    .filter((x) => x.role)
    .sort((a, b) => rank[a.role!] - rank[b.role!]);

  return (
    <aside className="sidebar" aria-label="Main">
      <Link to="/" className="row" style={{ gap: 10, textDecoration: 'none', padding: '2px 10px 4px' }} aria-label="On The Lawn home">
        <OTLMark height={26} fill="#16541A" />
        {demo && <span className="demo-pill" title="Data lives in this browser until a backend is connected">Demo</span>}
      </Link>

      <Link to="/new" className="btn block">
        <Plus size={17} strokeWidth={2.4} aria-hidden /> Host a lawn
      </Link>

      <nav className="stack" style={{ gap: 2 }}>
        {NAV.map(({ to, label, icon: I, match }) => (
          <NavLink key={to} to={to} end className="side-link" aria-current={match(pathname) ? 'page' : undefined}>
            <I size={18} strokeWidth={2} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      {mine.length > 0 && (
        <div className="stack" style={{ gap: 2 }}>
          <p className="side-label">Your groups</p>
          {mine.slice(0, 5).map(({ g, role, inbox }) => (
            <Link key={g.id} to={isStaffRole(role) ? `/g/${g.slug}/admin` : `/g/${g.slug}`} className="side-group" aria-current={pathname.startsWith(`/g/${g.slug}`) ? 'page' : undefined}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: C[g.color], flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)' }} aria-hidden />
              <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
              {inbox > 0 && <span className="pill sun" title={`${inbox} questions to answer`}>{inbox}</span>}
            </Link>
          ))}
        </div>
      )}

      <span className="grow" />

      <Link to="/me" className="side-me" aria-label={`Your profile, level ${lvl.number}, ${xp} XP`}>
        <Avatar user={me} size={36} />
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="strong" style={{ display: 'block', fontSize: '0.875rem', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</span>
          <span className="small muted" style={{ display: 'block', lineHeight: 1.3 }}>Lv {lvl.number} {lvl.name}, {xp} XP</span>
          <span className="meter" style={{ display: 'block', height: 4, marginTop: 5 }}><span style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></span>
        </span>
      </Link>
    </aside>
  );
}
