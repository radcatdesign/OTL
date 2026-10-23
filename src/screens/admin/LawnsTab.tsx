import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { C } from '../../brand/palette';
import { groupStats } from '../../lib/groupStats';
import { useStore } from '../../lib/store';
import type { Group } from '../../lib/types';
import { useWide } from '../../lib/useWide';
import { fmtDay, fmtRange } from '../../lib/util';
import { Calendar, monthStart } from '../../ui/Calendar';

export function LawnsTab({ group }: { group: Group }) {
  const nav = useNavigate();
  const db = useStore((s) => s.db);
  const wide = useWide();
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const events = db.events.filter((e) => e.groupId === group.id);
  const st = groupStats(db, group.id);
  const now = Date.now();
  const upcoming = events.filter((e) => e.endsAt >= now).sort((a, b) => a.startsAt - b.startsAt);
  const past = events.filter((e) => e.endsAt < now).sort((a, b) => b.startsAt - a.startsAt);

  const row = (id: string) => {
    const e = events.find((x) => x.id === id)!;
    const s = st.perEvent.find((x) => x.id === id)!;
    return (
      <div key={id} className="list-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="dot" style={{ width: 18, height: 18, borderRadius: 6, background: C[e.color] }} />
        <div className="grow" style={{ minWidth: 180 }}>
          <Link to={`/lawn/${e.id}`} className="strong" style={{ textDecoration: 'none' }}>{e.title}</Link>
          <p className="small muted">{fmtDay(e.startsAt)}, {fmtRange(e.startsAt, e.endsAt)}</p>
        </div>
        <span className="pill">{s.rsvps} {e.endsAt < now ? 'RSVPs' : 'going'}</span>
        {e.endsAt < now && <span className="pill">{s.checkins} checked in</span>}
        <Link to={`/lawn/${e.id}/edit`} className="btn cream small">Edit</Link>
      </div>
    );
  };

  return (
    <>
      <section className="card stack">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="display h3">Calendar</h2>
            <p className="small strong muted">Click a day to start a lawn on it.</p>
          </div>
          <Link to={`/new?group=${group.id}`} className="btn sun">New lawn</Link>
        </div>
        <Calendar
          month={month}
          onMonth={setMonth}
          events={events}
          onPick={(d) => nav(`/new?group=${group.id}&date=${d}`)}
          onEvent={(e) => nav(`/lawn/${e.id}`)}
          compact={!wide}
          createHint="New lawn on"
        />
      </section>
      <div className={wide ? 'cols even' : 'stack-lg'}>
        <section className="card stack">
          <h2 className="display h4">Coming up</h2>
          {upcoming.length ? <div className="list">{upcoming.map((e) => row(e.id))}</div> : <p className="muted strong">Nothing on the calendar yet.</p>}
        </section>
        <section className="card stack">
          <h2 className="display h4">Past lawns</h2>
          {past.length ? <div className="list">{past.map((e) => row(e.id))}</div> : <p className="muted strong">No past lawns yet.</p>}
        </section>
      </div>
    </>
  );
}
