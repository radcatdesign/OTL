import { useState } from 'react';
import { C, COLOR_KEYS, COLOR_NAMES, type ColorKey } from '../brand/palette';
import { useStore } from '../lib/store';
import type { Group } from '../lib/types';

export function StartGroup({ onDone }: { onDone: (g: Group) => void }) {
  const createGroup = useStore((s) => s.createGroup);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [color, setColor] = useState<ColorKey>('sky');
  const [err, setErr] = useState('');
  return (
    <form
      className="stack-lg"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 3) return setErr('Give the group a name with at least three letters.');
        onDone(createGroup({ name, tagline, about, color }));
      }}
    >
      <div className="stack" style={{ gap: 6 }}>
        <h2 className="display h2">Start a group</h2>
        <p className="muted strong">A group is a home for your lawns, your members, and your email list. You'll be the host.</p>
      </div>
      <div className="field">
        <label htmlFor="g-name">Group name</label>
        <input id="g-name" className="input" value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Bend Type Club" />
      </div>
      <div className="field">
        <label htmlFor="g-tag">One line about it</label>
        <input id="g-tag" className="input" value={tagline} maxLength={60} onChange={(e) => setTagline(e.target.value)} placeholder="Letters, brushes, and tea" />
      </div>
      <div className="field">
        <label htmlFor="g-about">Who it's for</label>
        <textarea id="g-about" className="textarea" value={about} maxLength={400} onChange={(e) => setAbout(e.target.value)} placeholder="A monthly practice night for anyone who loves letterforms." />
      </div>
      <div className="field">
        <span className="label">Color</span>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
          {COLOR_KEYS.map((k) => (
            <button type="button" key={k} className="swatch" style={{ background: C[k], borderRadius: 12 }} aria-pressed={color === k} aria-label={COLOR_NAMES[k]} onClick={() => setColor(k)} />
          ))}
        </div>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn sun block" type="submit">Start the group</button>
    </form>
  );
}
