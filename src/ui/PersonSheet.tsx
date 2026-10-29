import { useState } from 'react';
import { C } from '../brand/palette';
import { GUIDE_INTENTS } from '../lib/intents';
import { statsFor } from '../lib/game';
import { useStore } from '../lib/store';
import { Avatar } from './Avatar';
import { Tabs } from './Bits';
import { ProfileCard } from './ProfileCard';
import { Sheet } from './Sheet';

export function PersonSheet({ userId, onClose, note }: { userId: string | null; onClose: () => void; note?: string }) {
  const db = useStore((s) => s.db);
  const [view, setView] = useState<'profile' | 'card'>('profile');
  const user = userId ? db.users.find((u) => u.id === userId) : undefined;
  const stats = user ? statsFor(db, user.id) : null;
  return (
    <Sheet open={!!user} onClose={() => { setView('profile'); onClose(); }} label={user ? user.name : 'Person'}>
      {user && stats && (
        <div className="stack-lg">
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <Avatar user={user} size={76} />
            <div className="grow stack" style={{ gap: 2 }}>
              <h2 className="display h3">{user.name}</h2>
              <p className="muted">{user.role}</p>
              {user.bio && <p className="small" style={{ marginTop: 4 }}>{user.bio}</p>}
            </div>
          </div>
          {note && <p className="strong">{note}</p>}
          <div className="grid-3">
            <div className="stat"><b>{stats.lawns}</b><span>Lawns</span></div>
            <div className="stat"><b>{stats.watered}</b><span>Seeds watered</span></div>
            <div className="stat"><b>{stats.blooms}</b><span>Blooms</span></div>
          </div>
          <Tabs label="Profile view" value={view} onChange={setView} items={[{ key: 'profile', label: 'Looking for' }, { key: 'card', label: 'Their Otis card' }]} />
          {view === 'card' ? (
            <div className="stack" style={{ alignItems: 'center' }}>
              <ProfileCard user={user} lawns={stats.lawns} width="min(70vw, 270px)" />
              <span className="small muted">Tap the card to flip it</span>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {user.intents.length ? <IntentList intents={user.intents} /> : <p className="muted">Nothing listed yet.</p>}
            </div>
          )}
          {user.link && <a className="btn cream block" href={user.link} target="_blank" rel="noreferrer">See their work</a>}
        </div>
      )}
    </Sheet>
  );
}

function IntentList({ intents }: { intents: string[] }) {
  return (
    <div className="row-wrap">
      {GUIDE.filter((g) => intents.includes(g.key)).map((g) => (
        <span key={g.key} className="pill" style={{ padding: '4px 10px', fontSize: '0.8125rem' }}>
          <span className="dot" style={{ background: g.color }} />{g.label}
        </span>
      ))}
    </div>
  );
}

const GUIDE = GUIDE_INTENTS.map((g) => ({ key: g.key as string, label: g.label, color: C[g.color] }));
