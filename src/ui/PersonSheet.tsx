import { statsFor } from '../lib/game';
import { useStore } from '../lib/store';
import { ProfileCard } from './ProfileCard';
import { Sheet } from './Sheet';

export function PersonSheet({ userId, onClose, note }: { userId: string | null; onClose: () => void; note?: string }) {
  const db = useStore((s) => s.db);
  const user = userId ? db.users.find((u) => u.id === userId) : undefined;
  const stats = user ? statsFor(db, user.id) : null;
  return (
    <Sheet open={!!user} onClose={onClose} label={user ? user.name : 'Person'}>
      {user && stats && (
        <div className="stack-lg">
          <ProfileCard user={user} lawns={stats.lawns} width="min(74vw, 290px)" />
          <p className="pill" style={{ alignSelf: 'center' }}>Tap the card to flip it</p>
          {note && <p className="center strong">{note}</p>}
          <div className="grid-3">
            <div className="stat"><b>{stats.lawns}</b><span>Lawns</span></div>
            <div className="stat"><b>{stats.watered}</b><span>Seeds watered</span></div>
            <div className="stat"><b>{stats.blooms}</b><span>Blooms</span></div>
          </div>
          {user.link && (
            <a className="btn cream block" href={user.link} target="_blank" rel="noreferrer">See their work</a>
          )}
        </div>
      )}
    </Sheet>
  );
}
