import { useRef, useState } from 'react';
import { Icon } from '../brand/icons';
import { OtisAvatar } from '../brand/otis/Otis';
import { C } from '../brand/palette';
import { fileToDataUrl } from '../lib/media';
import { can, isStaffRole, roleIn } from '../lib/perms';
import { membershipOf, userById, useMe, useStore } from '../lib/store';
import type { LawnEvent } from '../lib/types';
import { ago } from '../lib/util';
import { Sheet } from './Sheet';

function Heart({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20.5S3 15 3 8.8A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 9 2.2C21 15 12 20.5 12 20.5Z" fill={on ? C.tomato : C.paper} stroke={C.pine} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

export function PhotoWall({ ev, onRsvp }: { ev: LawnEvent; onRsvp: () => void }) {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const addPhoto = useStore((s) => s.addPhoto);
  const del = useStore((s) => s.deletePhoto);
  const like = useStore((s) => s.toggleLike);
  const toast = useStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<{ src: string; caption: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const role = roleIn(db, ev.groupId, me.id);
  const staff = can(role, 'moderateChat');
  const onList = (membershipOf(db, ev.id, me.id)?.status ?? 'invited') !== 'invited';
  const canAdd = ev.photos && (onList || isStaffRole(role));
  const photos = db.photos.filter((p) => p.eventId === ev.id).sort((a, b) => b.createdAt - a.createdAt);
  const current = open !== null ? photos[open] : undefined;

  if (!ev.photos) return <p className="panel strong">The photo wall is off for this lawn.</p>;

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const out: { src: string; caption: string }[] = [];
    for (const f of Array.from(files).slice(0, 8)) {
      try { out.push({ src: await fileToDataUrl(f, 1280, 0.8), caption: '' }); }
      catch (e) { toast({ text: (e as Error).message, tone: 'error' }); }
    }
    setDrafts((d) => [...d, ...out]);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const share = () => {
    let n = 0;
    drafts.forEach((d) => { if (addPhoto(ev.id, d.src, d.caption)) n++; });
    setDrafts([]);
    if (n) toast({ text: n === 1 ? 'Photo added to the wall' : `${n} photos added to the wall`, tone: 'good' });
  };

  return (
    <div className="stack">
      {canAdd ? (
        <div className="stack">
          <input ref={fileRef} id={`photo-${ev.id}`} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => pick(e.target.files)} />
          <label htmlFor={`photo-${ev.id}`} className="btn sun block" style={{ cursor: 'pointer' }}>
            <Icon name="phone" size={26} /> {busy ? 'Getting photos ready' : 'Add photos'}
          </label>
          {drafts.length > 0 && (
            <div className="card flat stack" style={{ background: C.paper }}>
              <div className="grid-3">
                {drafts.map((d, i) => (
                  <div key={i} className="stack" style={{ gap: 6 }}>
                    <img src={d.src} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                    <input className="input" style={{ minHeight: 40, fontSize: '0.9rem', padding: '6px 10px' }} placeholder="Caption" aria-label={`Caption for photo ${i + 1}`} value={d.caption} maxLength={140} onChange={(e) => setDrafts((xs) => xs.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                  </div>
                ))}
              </div>
              <div className="row">
                <button className="btn sun grow" onClick={share}>Post {drafts.length === 1 ? 'photo' : `${drafts.length} photos`}</button>
                <button className="btn cream" onClick={() => setDrafts([])}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="panel row">
          <p className="strong grow">RSVP to add your photos.</p>
          <button className="btn sun small" onClick={onRsvp}>RSVP</button>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="muted strong" style={{ padding: '12px 4px' }}>No photos yet. After the lawn, this is where everyone's shots land.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <button key={p.id} className="photo-tile" onClick={() => setOpen(i)} aria-label={p.caption || `Photo by ${userById(db, p.userId)?.name}`}>
              <img src={p.src} alt="" loading="lazy" />
              {p.likes.length > 0 && <span className="pill" style={{ position: 'absolute', right: 6, bottom: 6, fontSize: 11, padding: '1px 7px' }}>♥ {p.likes.length}</span>}
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!current} onClose={() => setOpen(null)} label="Photo">
        {current && (() => {
          const u = userById(db, current.userId);
          const liked = current.likes.includes(me.id);
          return (
            <div className="stack">
              <img src={current.src} alt={current.caption} style={{ width: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: 12, background: 'var(--surface-2)' }} />
              <div className="row">
                {u && <OtisAvatar look={u.otis} size={36} />}
                <div className="grow">
                  <p className="strong">{current.caption || 'No caption'}</p>
                  <p className="small muted">{u?.id === me.id ? 'You' : u?.name}, {ago(current.createdAt)}</p>
                </div>
                <button className="btn cream small" onClick={() => like(current.id)} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'}>
                  <Heart on={liked} /> {current.likes.length}
                </button>
              </div>
              <div className="row between">
                <button className="btn cream small" disabled={open === 0} onClick={() => setOpen((o) => (o ?? 1) - 1)}>Newer</button>
                {(current.userId === me.id || staff) && (
                  <button className="link-btn" onClick={() => { del(current.id); setOpen(null); }}>{current.userId === me.id ? 'Delete photo' : 'Remove photo'}</button>
                )}
                <button className="btn cream small" disabled={open === photos.length - 1} onClick={() => setOpen((o) => (o ?? 0) + 1)}>Older</button>
              </div>
            </div>
          );
        })()}
      </Sheet>
    </div>
  );
}
