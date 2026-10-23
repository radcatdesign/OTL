import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C, COLOR_KEYS, COLOR_NAMES, type ColorKey } from '../../brand/palette';
import { validEmail } from '../../lib/email';
import { ABILITIES, can, roleIn, ROLE_INFO, ROLES_ORDER, type Ability } from '../../lib/perms';
import { useMe, useStore } from '../../lib/store';
import type { Group } from '../../lib/types';
import { useWide } from '../../lib/useWide';

function Check({ on }: { on: boolean }) {
  return on ? (
    <svg width="22" height="22" viewBox="0 0 22 22" role="img" aria-label="Yes"><circle cx="11" cy="11" r="10" fill={C.lawn} stroke={C.pine} strokeWidth="2" /><path d="M6.5 11.5l3 3 6-6.5" stroke={C.pine} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 22 22" role="img" aria-label="No"><circle cx="11" cy="11" r="10" fill={C.paper} stroke={C.pine} strokeWidth="2" opacity="0.35" /></svg>
  );
}

export function RolesMatrix() {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>What they can do</th>
            {ROLES_ORDER.map((r) => <th key={r} style={{ textAlign: 'center' }}>{ROLE_INFO[r].name}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Join lawns, chat, post photos, plant seeds</td>
            {ROLES_ORDER.map((r) => <td key={r} style={{ textAlign: 'center' }}><Check on /></td>)}
          </tr>
          {(Object.keys(ABILITIES) as Ability[]).map((a) => (
            <tr key={a}>
              <td>{ABILITIES[a].label}</td>
              {ROLES_ORDER.map((r) => <td key={r} style={{ textAlign: 'center' }}><Check on={can(r, a)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Settings({ group }: { group: Group }) {
  const me = useMe()!;
  const nav = useNavigate();
  const db = useStore((s) => s.db);
  const update = useStore((s) => s.updateGroup);
  const leave = useStore((s) => s.leaveGroup);
  const wide = useWide('(min-width: 1280px)');
  const role = roleIn(db, group.id, me.id);
  const editable = can(role, 'editGroup');
  const [name, setName] = useState(group.name);
  const [tagline, setTagline] = useState(group.tagline);
  const [about, setAbout] = useState(group.about);
  const [color, setColor] = useState<ColorKey>(group.color);
  const [replyTo, setReplyTo] = useState(group.replyTo);
  const [err, setErr] = useState('');

  const details = (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 3) return setErr('The name needs at least three letters.');
        if (!validEmail(replyTo)) return setErr('Replies need a real email address.');
        setErr('');
        update(group.id, { name: name.trim(), tagline: tagline.trim(), about: about.trim(), color, replyTo: replyTo.trim() });
      }}
    >
      <h2 className="display h4">Group details</h2>
      <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
        <div className="field">
          <label htmlFor="gs-name">Name</label>
          <input id="gs-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="gs-tag">One line about it</label>
          <input id="gs-tag" className="input" value={tagline} maxLength={60} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="gs-about">About</label>
          <textarea id="gs-about" className="textarea" value={about} maxLength={600} onChange={(e) => setAbout(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="gs-reply">Campaign replies go to</label>
          <input id="gs-reply" className="input" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Color</span>
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {COLOR_KEYS.map((k) => (
              <button type="button" key={k} className="swatch" style={{ background: C[k], borderRadius: 12 }} aria-pressed={color === k} aria-label={COLOR_NAMES[k]} onClick={() => setColor(k)} />
            ))}
          </div>
        </div>
      </fieldset>
      {err && <p className="error" role="alert">{err}</p>}
      {editable ? <button className="btn sun" type="submit">Save details</button> : <p className="small strong muted">Only hosts and co-hosts can change these.</p>}
    </form>
  );

  const roles = (
    <section className="card stack">
      <h2 className="display h4">Roles</h2>
      <div className="list">
        {ROLES_ORDER.map((r) => (
          <div key={r} className="list-row">
            <div className="grow">
              <p className="strong">{ROLE_INFO[r].name}</p>
              <p className="small muted">{ROLE_INFO[r].blurb}</p>
            </div>
          </div>
        ))}
      </div>
      <RolesMatrix />
    </section>
  );

  return (
    <>
      <div className={wide ? 'cols even' : 'stack-lg'}>
        {details}
        {roles}
      </div>
      {role && role !== 'host' && (
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { leave(group.id); nav('/groups'); }}>Leave {group.name}</button>
      )}
    </>
  );
}
