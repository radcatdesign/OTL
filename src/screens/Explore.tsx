import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { useStore } from '../lib/store';
import { isPast } from '../lib/util';
import { EventCard } from '../ui/EventCard';

export function Explore() {
  const events = useStore((s) => s.db.events);
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const list = events
    .filter((e) => e.visibility === 'public' && (when === 'past' ? isPast(e) : !isPast(e)))
    .sort((a, b) => (when === 'past' ? b.startsAt - a.startsAt : a.startsAt - b.startsAt));

  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <h1 className="display h2">Lawns around Bend</h1>
        <p className="muted strong">Every lawn is a real gathering. Join one, show up, and its garden opens for you.</p>
      </div>
      <div className="row-wrap" role="group" aria-label="When">
        <button className="chip" aria-pressed={when === 'upcoming'} onClick={() => setWhen('upcoming')}>Coming up</button>
        <button className="chip" aria-pressed={when === 'past'} onClick={() => setWhen('past')}>Past lawns</button>
      </div>
      {list.length ? (
        <div className="card-grid">{list.map((ev) => <EventCard key={ev.id} ev={ev} />)}</div>
      ) : (
        <div className="card stack center" style={{ alignItems: 'center' }}>
          <Icon name="basket" size={56} />
          <p className="strong">Nothing on the calendar yet. Be the first to host one.</p>
          <Link to="/new" className="btn sun">Host a lawn</Link>
        </div>
      )}
    </>
  );
}
