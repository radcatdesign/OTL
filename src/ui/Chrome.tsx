import { Plus } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { OTLMark } from '../brand/Logo';
import { levelFor, statsFor, xpFor } from '../lib/game';
import { useMe, useStore } from '../lib/store';
import { NAV } from './Sidebar';
import { Avatar } from './Avatar';

export function TopBar() {
  const me = useMe();
  const db = useStore((s) => s.db);
  const demo = useStore((s) => s.demo);
  const xp = me ? xpFor(statsFor(db, me.id)) : 0;
  const lvl = levelFor(xp);
  return (
    <header className="topbar">
      <Link to="/" aria-label="On The Lawn home" className="row" style={{ gap: 8 }}>
        <OTLMark height={24} fill="#16541A" />
        {demo && <span className="demo-pill" title="Data lives in this browser until a backend is connected">Demo</span>}
      </Link>
      {me && (
        <Link to="/me" className="row" style={{ gap: 8, padding: '3px 10px 3px 3px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)' }} aria-label={`Your profile, level ${lvl.number}`}>
          <Avatar user={me} size={28} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>Lv {lvl.number}<span className="muted" style={{ fontWeight: 500 }}> {xp} XP</span></span>
        </Link>
      )}
    </header>
  );
}

export function BottomNav() {
  const me = useMe();
  const { pathname } = useLocation();
  if (!me) return null;
  const tab = (i: number) => {
    const { to, label, icon: I, match } = NAV[i];
    return (
      <NavLink to={to} end aria-current={match(pathname) || (to === '/' && pathname === '/explore') ? 'page' : undefined} className={() => ''}>
        <I size={21} strokeWidth={2} aria-hidden />
        {label}
      </NavLink>
    );
  };
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {tab(0)}
        {tab(1)}
        <Link to="/new" className="plant-btn" aria-label="Host a lawn">
          <Plus size={24} strokeWidth={2.4} aria-hidden />
        </Link>
        {tab(3)}
        {tab(4)}
      </div>
    </nav>
  );
}
