import { Clock, Flower2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OtisAvatar } from '../brand/otis/Otis';
import { userById, useStore } from '../lib/store';
import type { LawnEvent } from '../lib/types';
import { dateParts, fmtDay, fmtRange, isPast, whenLabel } from '../lib/util';
import { Cover } from './Cover';

// A lawn in a list: the illustrated cover on top, the facts underneath.
export function EventCard({ ev, compact = false, note }: { ev: LawnEvent; compact?: boolean; note?: string }) {
  const db = useStore((s) => s.db);
  const people = db.memberships.filter((m) => m.eventId === ev.id && m.status !== 'invited');
  const seeds = db.seeds.filter((s) => s.eventId === ev.id);
  const blooms = seeds.filter((s) => s.bloomedAt).length;
  const d = dateParts(ev.startsAt);
  const when = whenLabel(ev);
  const past = isPast(ev);
  const group = db.groups.find((g) => g.id === ev.groupId);
  const supports = ev.contribution.mode === 'donate' && ev.contribution.amount > 0;

  return (
    <Link to={`/lawn/${ev.id}`} className="ecard" aria-label={`${ev.title}, ${when}`}>
      <div className={`ecard-cover${compact ? ' compact' : ''}`}>
        <Cover cover={ev.cover} radius={0} style={{ position: 'absolute', inset: 0, aspectRatio: 'auto', border: 0 }} />
        <span className="ecard-date" aria-hidden><b>{d.day}</b><span>{d.month}</span></span>
        <span className="ecard-tags">
          <span className={`pill ${when === 'Happening now' ? 'sun' : ''}`}>{when}</span>
        </span>
      </div>
      <div className="ecard-body">
        <span className="ecard-title">{ev.title}</span>
        <div className="ecard-meta">
          <span><Clock size={13} strokeWidth={2} aria-hidden /><span>{fmtDay(ev.startsAt)}, {fmtRange(ev.startsAt, ev.endsAt)}</span></span>
          <span><MapPin size={13} strokeWidth={2} aria-hidden /><span>{ev.venue}</span></span>
        </div>
        {note && <p className="small strong" style={{ color: 'var(--brand)' }}>{note}</p>}
        <div className="ecard-foot">
          {people.length > 0 && (
            <div className="avatar-stack">
              {people.slice(0, 4).map((m) => {
                const u = userById(db, m.userId);
                return u ? <OtisAvatar key={m.id} look={u.otis} size={24} /> : null;
              })}
            </div>
          )}
          <span>{people.length ? `${people.length} ${past ? 'came' : 'going'}` : 'Be the first'}</span>
          {seeds.length > 0 && (
            <span className="row" style={{ gap: 4 }} title={`${seeds.length} seeds, ${blooms} in bloom`}>
              <Flower2 size={13} strokeWidth={2} aria-hidden />{seeds.length}
            </span>
          )}
          <span className="grow" />
          {supports ? <span className="pill lawn">Supports OTL</span> : group && group.id !== 'otl' ? <span className="pill">{group.name}</span> : null}
        </div>
      </div>
    </Link>
  );
}
