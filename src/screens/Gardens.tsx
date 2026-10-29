import { Link } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { Plant } from '../brand/Plant';
import { C } from '../brand/palette';
import { SEED_INTENT } from '../lib/intents';
import { canEnterGarden, membershipOf, useMe, useStore } from '../lib/store';
import { fmtDay, wateringsFor } from '../lib/util';
import { Tilt } from '../ui/Tilt';

export function Gardens() {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const open = db.events.filter((e) => canEnterGarden(db, e, me.id)).sort((a, b) => b.startsAt - a.startsAt);
  const locked = db.events.filter((e) => !canEnterGarden(db, e, me.id) && membershipOf(db, e.id, me.id)?.status === 'going');

  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <h1 className="display h2">Your gardens</h1>
        <p className="muted strong">Every lawn you check in at has a garden. They stay open after the event, so things keep growing.</p>
      </div>

      {open.length === 0 && (
        <div className="card stack center" style={{ alignItems: 'center' }}>
          <Plant stage="sprout" color="lawn" accent="sun" size={90} />
          <p className="strong">No gardens yet. Check in at a lawn to open its garden.</p>
          <Link to="/explore" className="btn sun">Find a lawn</Link>
        </div>
      )}

      {open.length > 0 && <div className="card-grid">{open.map((ev) => {
        const seeds = db.seeds.filter((s) => s.eventId === ev.id);
        const thirsty = seeds.filter((s) => !s.bloomedAt && wateringsFor(db, s.id).length === 0 && s.userId !== me.id).length;
        const mine = seeds.filter((s) => s.userId === me.id);
        const sample = [...seeds].sort((a, b) => Number(!!b.bloomedAt) - Number(!!a.bloomedAt)).slice(0, 4);
        return (
          <Tilt key={ev.id}>
            <Link to={`/lawn/${ev.id}/garden`} className="card stack" style={{ textDecoration: 'none', padding: 0, overflow: 'hidden' }}>
              <span className="glare" />
              <div style={{ background: `linear-gradient(180deg, ${C.cream} 0 62%, ${C.soil} 62%)`, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4, padding: '12px 12px 0', minHeight: 110 }}>
                {sample.length ? sample.map((s) => {
                  const info = SEED_INTENT[s.intent];
                  const n = wateringsFor(db, s.id).length;
                  return <Plant key={s.id} stage={s.bloomedAt ? 'bloom' : n >= 2 ? 'bud' : n ? 'sprout' : 'seed'} color={info.color} accent={info.accent} size={70} />;
                }) : <Plant stage="seed" color="lawn" accent="sun" size={70} />}
              </div>
              <div className="stack" style={{ padding: '12px 16px 16px', gap: 6 }}>
                <div className="row between">
                  <h2 className="display h3">{ev.title}</h2>
                  <span className="small strong muted">{fmtDay(ev.startsAt)}</span>
                </div>
                <div className="row-wrap">
                  <span className="pill">{seeds.length} seeds</span>
                  <span className="pill sun">{seeds.filter((s) => s.bloomedAt).length} in bloom</span>
                  {thirsty > 0 && <span className="pill sky">{thirsty} thirsty</span>}
                  {mine.length > 0 && <span className="pill lawn">{mine.length} yours</span>}
                </div>
              </div>
            </Link>
          </Tilt>
        );
      })}</div>}

      {locked.length > 0 && (
        <section className="card stack">
          <h2 className="display h3">Opens when you check in</h2>
          <div className="list">
            {locked.map((ev) => (
              <Link key={ev.id} to={`/lawn/${ev.id}`} className="list-row" style={{ textDecoration: 'none', alignItems: 'center' }}>
                <Icon name="location" size={34} />
                <span className="grow strong">{ev.title}</span>
                <span className="small strong muted">{fmtDay(ev.startsAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
