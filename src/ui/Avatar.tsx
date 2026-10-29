import { Camera } from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';
import { Face } from '../brand/Face';
import { Otis } from '../brand/otis/Otis';
import { C } from '../brand/palette';
import { fileToSquareDataUrl } from '../lib/media';
import type { User } from '../lib/types';

type Person = Pick<User, 'id' | 'name' | 'otis' | 'photo'>;

// A person: their photo in the circle, their gnome cat in a small circle on the corner.
export function Avatar({ user, size = 40, badge = true, style, title }: {
  user: Person; size?: number; badge?: boolean; style?: CSSProperties; title?: string;
}) {
  const b = Math.max(15, Math.round(size * 0.42));
  const showBadge = badge && size >= 26;
  return (
    <span className="avatar" style={{ width: size, height: size, ...style }} title={title ?? user.name}>
      <span className="avatar-img">
        {user.photo ? <img src={user.photo} alt="" /> : <Face seed={user.id} size="100%" />}
      </span>
      {showBadge && (
        <span className="avatar-badge" style={{ width: b, height: b, background: C[user.otis.card] }} aria-hidden>
          <Otis look={user.otis} frame="badge" style={{ width: '100%' }} />
        </span>
      )}
    </span>
  );
}

// Upload, swap or remove a profile photo. Shows the gnome badge so people see how it will look.
export function PhotoPicker({ person, onChange, size = 88 }: { person: Person; onChange: (photo: string | undefined) => void; size?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const id = `photo-${person.id}`;
  return (
    <div className="row" style={{ gap: 16, alignItems: 'center' }}>
      <button type="button" className="avatar-pick" onClick={() => input.current?.click()} aria-label={person.photo ? 'Change your photo' : 'Add a photo'}>
        <Avatar user={person} size={size} />
        <span className="avatar-pick-cam" aria-hidden><Camera size={14} strokeWidth={2.2} /></span>
      </button>
      <div className="stack" style={{ gap: 6 }}>
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try { onChange(await fileToSquareDataUrl(f)); setErr(''); } catch (x) { setErr((x as Error).message || 'That photo did not load.'); }
          }}
        />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor={id} className="btn cream small" style={{ cursor: 'pointer' }}>{person.photo ? 'Change photo' : 'Add a photo'}</label>
          {person.photo && <button type="button" className="link-btn small" onClick={() => onChange(undefined)}>Remove</button>}
        </div>
        <span className="hint">{person.photo ? 'Your Otis rides along in the corner.' : 'A clear face helps people find you at the lawn. Your Otis rides along in the corner.'}</span>
        {err && <span className="error small">{err}</span>}
      </div>
    </div>
  );
}
