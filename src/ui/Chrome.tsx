import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { OTLMark } from '../brand/Logo';
import { OtisAvatar } from '../brand/otis/Otis';
import { levelFor, statsFor, xpFor } from '../lib/game';
import { useMe, useStore } from '../lib/store';

export function TopBar() {
  const me = useMe();
  const db = useStore((s) => s.db);
  const demo = useStore((s) => s.demo);
  const xp = me ? xpFor(statsFor(db, me.id)) : 0;
  const lvl = levelFor(xp);
  return (
    <header className="topbar">
      <Link to="/" aria-label="On The Lawn home" className="row" style={{ gap: 10 }}>
        <OTLMark height={30} />
        {demo && <span className="demo-pill" title="Data lives in this browser until a backend is connected">Demo</span>}
      </Link>
      {me && (
        <Link to="/me" className="row" style={{ gap: 8, background: 'var(--cream)', border: '3px solid var(--pine)', borderRadius: 999, padding: '3px 12px 3px 3px', boxShadow: 'var(--drop-sm)' }} aria-label={`Your profile, level ${lvl.number}`}>
          <OtisAvatar look={me.otis} size={34} ring={false} />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <b style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '0.95rem' }}>Lv {lvl.number}</b>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{xp} XP</span>
          </span>
        </Link>
      )}
    </header>
  );
}

export function BottomNav() {
  const me = useMe();
  const loc = useLocation();
  if (!me) return null;
  const tab = (to: string, label: string, icon: Parameters<typeof Icon>[0]['name'], match?: (p: string) => boolean) => (
    <NavLink
      to={to}
      end
      aria-current={(match ? match(loc.pathname) : loc.pathname === to) ? 'page' : undefined}
      className={() => ''}
    >
      <Icon name={icon} size={30} />
      {label}
    </NavLink>
  );
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {tab('/', 'Lawns', 'picnicTable', (p) => p === '/' || p.startsWith('/lawn/') && !p.endsWith('/garden'))}
        {tab('/gardens', 'Gardens', 'tulip', (p) => p === '/gardens' || p.endsWith('/garden'))}
        <Link to="/new" className="plant-btn" aria-label="Host a lawn">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
            <path d="M14 4V24M4 14H24" stroke="#16541A" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </Link>
        {tab('/explore', 'Explore', 'location')}
        {tab('/me', 'Me', 'sunHat', (p) => p === '/me' || p === '/studio')}
      </div>
    </nav>
  );
}
