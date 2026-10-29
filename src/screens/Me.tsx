import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { C } from '../brand/palette';
import { BADGES, levelFor, statsFor, xpFor } from '../lib/game';
import { GUIDE_INTENTS, ROLES, type GuideIntent, type Role } from '../lib/intents';
import { useMe, useStore } from '../lib/store';
import { fmtDay } from '../lib/util';
import { Avatar, PhotoPicker } from '../ui/Avatar';
import { ProfileCard } from '../ui/ProfileCard';
import { Sheet } from '../ui/Sheet';
import { useWide } from '../lib/useWide';

export function Me() {
  const me = useMe()!;
  const nav = useNavigate();
  const db = useStore((s) => s.db);
  const demo = useStore((s) => s.demo);
  const signOut = useStore((s) => s.signOut);
  const resetDemo = useStore((s) => s.resetDemo);
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const wide = useWide();
  const stats = statsFor(db, me.id);
  const xp = xpFor(stats);
  const lvl = levelFor(xp);
  const lawnIds = new Set([
    ...db.memberships.filter((m) => m.userId === me.id && m.status !== 'invited').map((m) => m.eventId),
    ...db.events.filter((e) => e.hostId === me.id).map((e) => e.id),
  ]);
  const lawns = db.events.filter((e) => lawnIds.has(e.id)).sort((a, b) => b.startsAt - a.startsAt);

  const cardBlock = <>
      <ProfileCard user={me} lawns={stats.lawns} width="min(80vw, 290px)" />
      <p className="pill" style={{ alignSelf: 'center' }}>Tap your card to flip it</p>

      <Link to="/studio" className="btn sun block">Dress your Otis</Link>
    </>;
  const headerC = (
    <section className="card row" style={{ gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
      <Avatar user={me} size={wide ? 96 : 76} />
      <div className="grow stack" style={{ gap: 2, minWidth: 180 }}>
        <h1 className="display h2">{me.name}</h1>
        <p className="muted">{me.role}</p>
        {me.bio && <p className="small" style={{ marginTop: 2 }}>{me.bio}</p>}
      </div>
      <button className="btn cream" onClick={() => setEditing(true)}>Edit profile</button>
    </section>
  );
  const lawnCountC = <>
      <section className="card stack" aria-labelledby="lawn-count">
        <div className="row" style={{ alignItems: 'center' }}>
          <div className="grow">
            <p id="lawn-count" className="display" style={{ fontSize: 'clamp(3.5rem, 18vw, 5rem)', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>{stats.lawns}</p>
            <p className="strong">{stats.lawns === 1 ? "lawn you're part of" : "lawns you're part of"}</p>
          </div>
          <Icon name="picnicTable" size={84} />
        </div>
        <div className="grid-2">
          <div className="stat"><b>{stats.attended}</b><span>Checked in</span></div>
          <div className="stat"><b>{stats.hosted}</b><span>Hosted</span></div>
        </div>
      </section>
    </>;
  const levelC = <>
      <section className="card stack" aria-labelledby="level">
        <div className="row between">
          <h2 id="level" className="display h3">Level {lvl.number}: {lvl.name}</h2>
          <span className="xp-badge" style={{ marginLeft: 0 }}>{xp} XP</span>
        </div>
        <div className="meter"><span style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></div>
        <p className="small strong muted">{lvl.next ? `${lvl.toNext} XP to ${lvl.next.name}. Water seeds, check in, and bloom things with people.` : 'You are a lawn legend.'}</p>
        <div className="grid-2">
          <div className="stat"><b>{stats.planted}</b><span>Seeds planted</span></div>
          <div className="stat"><b>{stats.watered}</b><span>Seeds watered</span></div>
          <div className="stat"><b>{stats.blooms}</b><span>Blooms</span></div>
          <div className="stat"><b>{stats.connections}</b><span>People grown with</span></div>
        </div>
      </section>
    </>;
  const badgesC = <>
      <section className="card stack" aria-labelledby="badges">
        <h2 id="badges" className="display h3">Badges</h2>
        <div className={wide ? 'badge-grid' : 'grid-2'}>
          {BADGES.map((b) => {
            const earned = b.earned(stats);
            const [have, need] = b.progress(stats);
            return (
              <div key={b.key} className={`badge-tile${earned ? ' earned' : ''}`}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ filter: earned ? 'none' : 'grayscale(1)', opacity: earned ? 1 : 0.5 }}><Icon name={b.icon} size={34} /></span>
                  <p className="strong" style={{ lineHeight: 1.1 }}>{b.name}</p>
                </div>
                <span>{earned ? 'Earned' : `${b.how}${need > 1 ? `, ${have} of ${need}` : ''}`}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>;
  const lawnsList = <>
      {lawns.length > 0 && (
        <section className="card stack" aria-labelledby="my-lawns">
          <h2 id="my-lawns" className="display h3">Your lawns</h2>
          <div className="list">
            {lawns.map((e) => (
              <Link key={e.id} to={`/lawn/${e.id}`} className="list-row" style={{ textDecoration: 'none', alignItems: 'center' }}>
                <span className="dot" style={{ width: 22, height: 22, borderRadius: 7, background: C[e.color] }} />
                <span className="grow strong">{e.title}</span>
                <span className="small muted strong">{e.hostId === me.id ? 'Host' : fmtDay(e.startsAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>;
  const accountC = <>
      <div className="stack">
        <button className="btn cream block" onClick={() => { signOut(); nav('/'); }}>Sign out</button>
        {demo && (
          confirmReset ? (
            <div className="card stack">
              <p className="strong">Start the demo over? This clears every account and lawn saved in this browser.</p>
              <div className="grid-2">
                <button className="btn tomato" onClick={() => { resetDemo(); nav('/'); }}>Reset demo</button>
                <button className="btn cream" onClick={() => setConfirmReset(false)}>Keep it</button>
              </div>
            </div>
          ) : (
            <button className="link-btn" style={{ alignSelf: 'center' }} onClick={() => setConfirmReset(true)}>Reset demo data</button>
          )
        )}
      </div>
    </>;

  return (
    <>
      {headerC}
      {wide ? (
        <div className="cols lead">
          <div className="rail" style={{ gap: 16 }}>
            {cardBlock}
            {accountC}
          </div>
          <div className="col">
            <div className="pair">
              {lawnCountC}
              {levelC}
            </div>
            {badgesC}
            {lawnsList}
          </div>
        </div>
      ) : (
        <>
          {cardBlock}
          {lawnCountC}
          {levelC}
          {badgesC}
          {lawnsList}
          {accountC}
        </>
      )}

      <EditProfile open={editing} onClose={() => setEditing(false)} />
    </>
  );
}

function EditProfile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()!;
  const update = useStore((s) => s.updateMe);
  const toast = useStore((s) => s.toast);
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [link, setLink] = useState(me.link ?? '');
  const [role, setRole] = useState<Role>(me.role);
  const [intents, setIntents] = useState<GuideIntent[]>(me.intents);
  const [photo, setPhoto] = useState<string | undefined>(me.photo);

  return (
    <Sheet open={open} onClose={onClose} label="Edit profile">
      <form
        className="stack-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          update({ name: name.trim(), bio: bio.trim(), link: link.trim() || undefined, role, intents, photo });
          toast({ text: 'Profile saved', tone: 'good' });
          onClose();
        }}
      >
        <h2 className="display h2">Edit profile</h2>
        <PhotoPicker person={{ ...me, name: name || me.name, photo }} onChange={setPhoto} />
        <div className="field">
          <label htmlFor="ep-name">Name</label>
          <input id="ep-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ep-bio">One line about what you make</label>
          <input id="ep-bio" className="input" value={bio} maxLength={90} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ep-link">Portfolio link</label>
          <input id="ep-link" className="input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </div>
        <div className="field">
          <span className="label">I am a...</span>
          <div className="row-wrap">
            {ROLES.map((r) => <button type="button" key={r} className="chip" aria-pressed={role === r} onClick={() => setRole(r)}>{r}</button>)}
          </div>
        </div>
        <div className="field">
          <span className="label">Looking to...</span>
          <div className="stack" style={{ gap: 8 }}>
            {GUIDE_INTENTS.map((g) => {
              const on = intents.includes(g.key);
              return (
                <button type="button" key={g.key} className="chip" aria-pressed={on} style={{ justifyContent: 'flex-start' }} onClick={() => setIntents((xs) => (on ? xs.filter((x) => x !== g.key) : [...xs, g.key]))}>
                  <span className="dot" style={{ background: C[g.color] }} />{g.label}
                </button>
              );
            })}
          </div>
        </div>
        <button className="btn sun block" type="submit">Save</button>
      </form>
    </Sheet>
  );
}
