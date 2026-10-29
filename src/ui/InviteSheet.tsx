import { useState } from 'react';
import { Icon } from '../brand/icons';
import { useMe, useStore } from '../lib/store';
import type { LawnEvent } from '../lib/types';
import { appUrl, copyText } from '../lib/util';
import { QR } from './QR';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';

export function inviteLink(ev: LawnEvent, fromId: string) {
  return `${appUrl()}#/invite/${ev.code}/${fromId}`;
}

export function InviteSheet({ ev, open, onClose }: { ev: LawnEvent; open: boolean; onClose: () => void }) {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const invitePeople = useStore((s) => s.invitePeople);
  const inviteEmails = useStore((s) => s.inviteEmails);
  const toast = useStore((s) => s.toast);
  const [picked, setPicked] = useState<string[]>([]);
  const [emails, setEmails] = useState('');
  const [copied, setCopied] = useState(false);
  const link = inviteLink(ev, me.id);

  // People you've shared a lawn with who aren't on this one yet.
  const myLawns = new Set(db.memberships.filter((m) => m.userId === me.id && m.status !== 'invited').map((m) => m.eventId));
  const here = new Set(db.memberships.filter((m) => m.eventId === ev.id).map((m) => m.userId));
  const met = [...new Set(db.memberships.filter((m) => myLawns.has(m.eventId) && m.userId !== me.id && m.status !== 'invited').map((m) => m.userId))]
    .filter((id) => !here.has(id))
    .map((id) => db.users.find((u) => u.id === id)!)
    .filter(Boolean);

  const share = async () => {
    const ok = await copyText(`${ev.title} on On The Lawn. Join with code ${ev.code}: ${link}`);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast({ text: 'Copy did not work here. Press and hold the link to copy it.', tone: 'info' });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label="Invite people">
      <div className="stack-lg">
        <div className="stack" style={{ gap: 6 }}>
          <h2 className="display h2">Invite people</h2>
          <p className="muted strong">Everyone who checks in gets into the garden. You earn XP when people you invite show up.</p>
        </div>

        <div className="card flat stack" style={{ alignItems: 'center', background: 'var(--paper)' }}>
          <QR text={link} size={168} label={`QR code to join ${ev.title}`} />
          <p className="small strong">Invite code</p>
          <p className="code" style={{ fontSize: '1.8rem' }}>{ev.code}</p>
          <p className="small muted" style={{ wordBreak: 'break-all', textAlign: 'center', userSelect: 'all' }}>{link}</p>
          <button className="btn sun block" onClick={share}>{copied ? 'Copied' : 'Copy invite link'}</button>
        </div>

        {met.length > 0 && (
          <div className="stack">
            <p className="label">People you've met on other lawns</p>
            <div className="grid-4">
              {met.map((u) => {
                const on = picked.includes(u.id);
                return (
                  <button
                    key={u.id}
                    className="swatch"
                    aria-pressed={on}
                    style={{ aspectRatio: 'auto', padding: '10px 4px', gap: 4, background: on ? 'var(--sun)' : 'var(--paper)' }}
                    onClick={() => setPicked((xs) => (on ? xs.filter((x) => x !== u.id) : [...xs, u.id]))}
                  >
                    <Avatar user={u} size={46} />
                    <span className="small strong" style={{ lineHeight: 1.1 }}>{u.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn block" disabled={!picked.length} onClick={() => { invitePeople(ev.id, picked); setPicked([]); }}>
              {picked.length ? `Invite ${picked.length}` : 'Pick people to invite'}
            </button>
          </div>
        )}

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const n = inviteEmails(ev.id, emails.split(/[\s,;]+/));
            if (!n) return toast({ text: 'Add at least one email address.', tone: 'error' });
            setEmails('');
            toast({ text: `${n} ${n === 1 ? 'email' : 'emails'} added to the invite list`, tone: 'good' });
          }}
        >
          <label className="label" htmlFor="invite-emails">Invite by email</label>
          <textarea id="invite-emails" className="textarea" style={{ minHeight: 72 }} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="sam@studio.com, lena@outfitter.co" />
          <span className="hint">Emails go out once the backend is connected. For now they're saved on the lawn's invite list.</span>
          <button className="btn cream block" type="submit"><Icon name="letter" size={26} /> Add to invite list</button>
        </form>
      </div>
    </Sheet>
  );
}
