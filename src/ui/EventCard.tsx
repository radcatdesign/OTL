import { Link } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { Otis, OtisAvatar } from '../brand/otis/Otis';
import { C, onColor } from '../brand/palette';
import { userById, useStore } from '../lib/store';
import type { LawnEvent } from '../lib/types';
import { dateParts, whenLabel } from '../lib/util';
import { Tilt } from './Tilt';

export function EventCard({ ev, compact = false, note }: { ev: LawnEvent; compact?: boolean; note?: string }) {
  const db = useStore((s) => s.db);
  const host = userById(db, ev.hostId);
  const people = db.memberships.filter((m) => m.eventId === ev.id && m.status !== 'invited');
  const seeds = db.seeds.filter((s) => s.eventId === ev.id);
  const blooms = seeds.filter((s) => s.bloomedAt).length;
  const fg = onColor(ev.color);
  const dark = fg === C.cream;
  const d = dateParts(ev.startsAt);
  const when = whenLabel(ev);
  const group = db.groups.find((g) => g.id === ev.groupId);

  return (
    <Tilt>
      <Link
        to={`/lawn/${ev.id}`}
        className={`event-card ${dark ? 'on-dark' : ''}`}
        style={{ ['--card' as string]: C[ev.color], minHeight: compact ? 170 : 220 }}
        aria-label={`${ev.title}, ${when}`}
      >
        <span className="glare" />
        {host && (
          <div aria-hidden style={{ position: 'absolute', right: -8, bottom: compact ? -62 : -54, width: compact ? 104 : 124, transform: 'rotate(-5deg)' }}>
            <Otis look={host.otis} shadow={false} />
          </div>
        )}
        <div className="stack" style={{ gap: 10, position: 'relative', maxWidth: compact ? '68%' : '66%' }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="date-tab"><b>{d.day}</b><span>{d.month}</span></span>
            <div className="stack" style={{ gap: 4, alignItems: 'flex-start' }}>
              <span className={`pill ${when === 'Happening now' ? 'sun' : ''}`}>{when}</span>
              {ev.contribution.mode === 'donate' && ev.contribution.amount > 0 && (
                <span className="pill" title="The host chipped in to OTL">
                  <Icon name="plant" size={16} /> Supports OTL
                </span>
              )}
            </div>
          </div>
          <h3 className={`display ${compact ? 'h3' : 'h2'} ${dark ? 'outlined' : ''}`} style={{ color: dark ? undefined : C.pine }}>
            {ev.title}
          </h3>
          <p className="small strong" style={{ color: fg, opacity: 0.92 }}>{ev.venue}{group && group.id !== 'otl' ? `, by ${group.name}` : ''}</p>
          {note && <p className="small strong" style={{ color: fg }}>{note}</p>}
          <div className="row" style={{ gap: 10, marginTop: 2 }}>
            <div className="avatar-stack">
              {people.slice(0, 4).map((m) => {
                const u = userById(db, m.userId);
                return u ? <OtisAvatar key={m.id} look={u.otis} size={30} /> : null;
              })}
            </div>
            <span className="small strong" style={{ color: fg }}>
              {people.length} {people.length === 1 ? 'person' : 'people'}
              {seeds.length > 0 && `, ${seeds.length} ${seeds.length === 1 ? "seed" : "seeds"}`}
              {blooms > 0 && `, ${blooms} in bloom`}
            </span>
          </div>
        </div>
      </Link>
    </Tilt>
  );
}
