import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconKey } from '../../brand/icons';
import { groupStats } from '../../lib/groupStats';
import { useStore } from '../../lib/store';
import type { Group } from '../../lib/types';
import { useWide } from '../../lib/useWide';
import { fmtDay } from '../../lib/util';
import { AttendanceBars, GrowthChart } from '../../ui/Charts';
import { Avatar } from '../../ui/Avatar';

export function Overview({ group }: { group: Group }) {
  const db = useStore((s) => s.db);
  const wide = useWide();
  const st = useMemo(() => groupStats(db, group.id), [db, group.id]);
  const [growthTable, setGrowthTable] = useState(false);
  const [attTable, setAttTable] = useState(false);
  const past = st.perEvent.filter((e) => e.past).slice(-6).reverse();
  const upcoming = st.perEvent.filter((e) => !e.past);

  const tiles: { label: string; value: string; note: string }[] = [
    { label: 'Active in the last 90 days', value: String(st.active90), note: `${Math.round((st.active90 / Math.max(1, st.memberCount)) * 100)}% of members` },
    { label: 'Check-in rate', value: `${Math.round(st.checkinRate * 100)}%`, note: `${st.avgCheckins.toFixed(1)} people per past lawn` },
    { label: 'Email subscribers', value: String(st.subscribers), note: 'On the email list' },
  ];
  const parts: { icon: IconKey; label: string; n: number }[] = [
    { icon: 'picnicTable', label: 'Lawns', n: st.totals.lawns },
    { icon: 'plant', label: 'Seeds planted', n: st.totals.seeds },
    { icon: 'wateringCan', label: 'Seeds watered', n: st.totals.waterings },
    { icon: 'tulip', label: 'Blooms', n: st.totals.blooms },
    { icon: 'letter', label: 'Chat messages', n: st.totals.messages },
    { icon: 'phone', label: 'Photos posted', n: st.totals.photos },
  ];

  const headline = (
    <section className="card stack" style={{ gap: 14 }}>
      <div className="row" style={{ alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div className="stack" style={{ gap: 2 }}>
          <p className="label">Members</p>
          <p className="display" style={{ fontSize: 'clamp(3rem, 9vw, 4.4rem)', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>{st.memberCount}</p>
        </div>
        <p className="strong muted" style={{ paddingBottom: 6 }}>+{st.newThisMonth} this month</p>
        <span className="grow" />
        <div className="row-wrap">
          <span className="pill">{st.roleCounts.host + st.roleCounts.cohost} {st.roleCounts.host + st.roleCounts.cohost === 1 ? 'host' : 'hosts'}</span>
          <span className="pill">{st.roleCounts.moderator} {st.roleCounts.moderator === 1 ? 'moderator' : 'moderators'}</span>
          <span className="pill">{st.roleCounts.member} members</span>
        </div>
      </div>
      <div className="row between">
        <p className="strong">Members by month</p>
        <button className="link-btn small" onClick={() => setGrowthTable((v) => !v)}>{growthTable ? 'Show chart' : 'Show as table'}</button>
      </div>
      {growthTable ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Month</th><th className="num">Joined</th><th className="num">Total</th></tr></thead>
            <tbody>{st.growth.map((g) => <tr key={g.key}><td>{g.label}</td><td className="num">{g.added}</td><td className="num">{g.total}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <GrowthChart data={st.growth} />
      )}
    </section>
  );

  const tilesC = (
    <div className={wide ? 'grid-3' : 'stack'} style={{ gap: 12 }}>
      {tiles.map((t) => (
        <div key={t.label} className="stat" style={{ gap: 4 }}>
          <span>{t.label}</span>
          <b>{t.value}</b>
          <span>{t.note}</span>
        </div>
      ))}
    </div>
  );

  const attendance = (
    <section className="card stack">
      <div className="row between">
        <h2 className="display h4">Turnout at past lawns</h2>
        <button className="link-btn small" onClick={() => setAttTable((v) => !v)}>{attTable ? 'Show chart' : 'Show as table'}</button>
      </div>
      {past.length === 0 ? (
        <p className="muted strong">No past lawns yet. Turnout shows here after your first one.</p>
      ) : attTable ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Lawn</th><th className="num">RSVPs</th><th className="num">Checked in</th><th className="num">Rate</th></tr></thead>
            <tbody>{past.map((e) => <tr key={e.id}><td>{e.title}</td><td className="num">{e.rsvps}</td><td className="num">{e.checkins}</td><td className="num">{e.rsvps ? Math.round((e.checkins / e.rsvps) * 100) : 0}%</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <AttendanceBars rows={past.map((e) => ({ id: e.id, label: e.title, sub: fmtDay(e.startsAt), checkins: e.checkins, rsvps: e.rsvps }))} />
      )}
    </section>
  );

  const participation = (
    <section className="card stack">
      <h2 className="display h4">Participation</h2>
      <div className="grid-3" style={{ gap: 10 }}>
        {parts.map((p) => (
          <div key={p.label} className="stat" style={{ gap: 6 }}>
            <Icon name={p.icon} size={30} />
            <b>{p.n}</b>
            <span>{p.label}</span>
          </div>
        ))}
      </div>
    </section>
  );

  const topC = (
    <section className="card stack">
      <h2 className="display h4">Most involved</h2>
      <p className="small muted strong">Points: check-in 3, plant or water 2, bloom 4, message or photo 1.</p>
      <div className="list">
        {st.top.map((m, i) => {
          const u = db.users.find((x) => x.id === m.userId);
          if (!u) return null;
          return (
            <div key={m.userId} className="list-row" style={{ alignItems: 'center' }}>
              <span className="strong" style={{ width: 18, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <Avatar user={u} size={36} />
              <div className="grow" style={{ minWidth: 0 }}>
                <p className="strong" style={{ lineHeight: 1.1 }}>{u.name}</p>
                <p className="small muted">{m.checkins} check-ins, {m.seeds + m.waterings} garden actions</p>
              </div>
              <span className="pill sun" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.points}</span>
            </div>
          );
        })}
      </div>
    </section>
  );

  const upcomingC = (
    <section className="card stack">
      <div className="row between">
        <h2 className="display h4">Coming up</h2>
        <Link to={`/g/${group.slug}/admin/lawns`} className="link-btn small">Calendar</Link>
      </div>
      {upcoming.length === 0 ? <p className="muted strong">Nothing scheduled.</p> : (
        <div className="list">
          {upcoming.map((e) => (
            <Link key={e.id} to={`/lawn/${e.id}`} className="list-row" style={{ textDecoration: 'none', alignItems: 'center' }}>
              <div className="grow">
                <p className="strong">{e.title}</p>
                <p className="small muted">{fmtDay(e.startsAt)}, {e.messages} {e.messages === 1 ? 'message' : 'messages'}</p>
              </div>
              <span className="pill">{e.rsvps} going</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );

  if (wide) {
    return (
      <div className="cols">
        <div className="col">
          {headline}
          {tilesC}
          {attendance}
          {participation}
        </div>
        <aside className="rail">
          {upcomingC}
          {topC}
        </aside>
      </div>
    );
  }
  return (
    <>
      {headline}
      {tilesC}
      {upcomingC}
      {attendance}
      {participation}
      {topC}
    </>
  );
}
