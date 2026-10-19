import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OtisLook } from '../brand/otis/Otis';
import { levelFor, statsFor, xpFor } from '../lib/game';
import { useMe, useStore } from '../lib/store';
import { StudioPanel } from './StudioPanel';

export function Studio() {
  const me = useMe()!;
  const nav = useNavigate();
  const db = useStore((s) => s.db);
  const update = useStore((s) => s.updateMe);
  const toast = useStore((s) => s.toast);
  const [look, setLook] = useState<OtisLook>(me.otis);
  const stats = statsFor(db, me.id);
  const lvl = levelFor(xpFor(stats));
  const changed = JSON.stringify(look) !== JSON.stringify(me.otis);

  return (
    <>
      <div className="row">
        <button className="btn cream small" onClick={() => nav(-1)}>Back</button>
        <span className="grow" />
        <button className="btn sun small" disabled={!changed} onClick={() => { update({ otis: look }); toast({ text: 'Otis is looking sharp', tone: 'good' }); nav('/me'); }}>Save</button>
      </div>
      <div className="card stack-lg">
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="display h2">Otis studio</h1>
          <p className="muted strong">Level {lvl.number} unlocks are open. Locked pieces show what earns them.</p>
        </div>
        <StudioPanel look={look} onChange={setLook} stats={stats} level={lvl.number} split />
        <button className="btn sun block" disabled={!changed} onClick={() => { update({ otis: look }); toast({ text: 'Otis is looking sharp', tone: 'good' }); nav('/me'); }}>
          {changed ? 'Save Otis' : 'No changes yet'}
        </button>
      </div>
    </>
  );
}
