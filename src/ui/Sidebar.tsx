import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconKey } from '../brand/icons';
import { OTLMark } from '../brand/Logo';
import { Otis } from '../brand/otis/Otis';
import { C } from '../brand/palette';
import { levelFor, statsFor, xpFor } from '../lib/game';
import { useMe, useStore } from '../lib/store';

const LINKS: { to: string; label: string; icon: IconKey; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Lawns', icon: 'picnicTable', match: (p) => p === '/' || (p.startsWith('/lawn/') && !p.endsWith('/garden')) },
  { to: '/gardens', label: 'Gardens', icon: 'tulip', match: (p) => p === '/gardens' || p.endsWith('/garden') },
  { to: '/explore', label: 'Explore', icon: 'location', match: (p) => p === '/explore' },
  { to: '/me', label: 'Me', icon: 'sunHat', match: (p) => p === '/me' || p === '/studio' },
];

// Desktop navigation: a sticker-cut panel down the left edge.
export function Sidebar() {
  const me = useMe();
  const db = useStore((s) => s.db);
  const demo = useStore((s) => s.demo);
  const { pathname } = useLocation();
  if (!me) return null;
  const stats = statsFor(db, me.id);
  const xp = xpFor(stats);
  const lvl = levelFor(xp);

  return (
    <aside className="sidebar" aria-label="Main">
      <Link to="/" className="row" style={{ gap: 10, textDecoration: 'none', paddingInline: 6 }} aria-label="On The Lawn home">
        <OTLMark height={34} />
        {demo && <span className="demo-pill" title="Data lives in this browser until a backend is connected">Demo</span>}
      </Link>

      <nav className="stack" style={{ gap: 4 }}>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end className="side-link" aria-current={l.match(pathname) ? 'page' : undefined}>
            <Icon name={l.icon} size={30} />
            {l.label}
          </NavLink>
        ))}
      </nav>

      <Link to="/new" className="btn sun block" style={{ minHeight: 56 }}>
        <svg width="20" height="20" viewBox="0 0 28 28" aria-hidden><path d="M14 4V24M4 14H24" stroke={C.pine} strokeWidth="5" strokeLinecap="round" /></svg>
        Host a lawn
      </Link>

      <span className="grow" />

      <Link to="/me" className="side-me" aria-label={`Your profile, level ${lvl.number}, ${xp} XP`}>
        <div className="side-me-stage" style={{ background: C[me.otis.card] }}>
          <div style={{ width: 92, marginBottom: -6 }}>
            <Otis look={me.otis} />
          </div>
        </div>
        <div className="stack" style={{ gap: 6, padding: '10px 12px 12px' }}>
          <p className="strong" style={{ lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</p>
          <div className="row between">
            <span className="small strong muted">Lv {lvl.number}, {lvl.name}</span>
            <span className="small strong" style={{ fontVariantNumeric: 'tabular-nums' }}>{xp} XP</span>
          </div>
          <div className="meter" style={{ height: 12 }}><span style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></div>
        </div>
      </Link>
    </aside>
  );
}
