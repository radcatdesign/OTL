import { useEffect, useMemo, useRef, useState } from 'react';
import { C } from '../brand/palette';
import { can, isStaffRole, roleIn } from '../lib/perms';
import { membershipOf, userById, useMe, useStore } from '../lib/store';
import type { ChatMessage, LawnEvent } from '../lib/types';
import { ago } from '../lib/util';
import { RoleBadge } from './Bits';
import { Avatar } from './Avatar';

export function EventChat({ ev, onRsvp, onPerson }: { ev: LawnEvent; onRsvp: () => void; onPerson: (id: string) => void }) {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const post = useStore((s) => s.postMessage);
  const hide = useStore((s) => s.hideMessage);
  const unhide = useStore((s) => s.unhideMessage);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const myRole = roleIn(db, ev.groupId, me.id);
  const staff = can(myRole, 'moderateChat');
  const onList = (membershipOf(db, ev.id, me.id)?.status ?? 'invited') !== 'invited';
  const canPost = ev.chat && (onList || isStaffRole(myRole));
  const msgs = useMemo(() => db.messages.filter((m) => m.eventId === ev.id).sort((a, b) => a.createdAt - b.createdAt), [db.messages, ev.id]);
  const byId = useMemo(() => new Map(msgs.map((m) => [m.id, m])), [msgs]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  if (!ev.chat) {
    return <p className="panel strong">Chat is off for this lawn.</p>;
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (post(ev.id, text, replyTo?.id)) {
      setText('');
      setReplyTo(null);
    }
  };

  return (
    <div className="stack">
      <div ref={listRef} className="stack" style={{ gap: 2, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }} aria-live="polite">
        {msgs.length === 0 && <p className="muted strong" style={{ padding: '18px 4px' }}>No messages yet. Ask the hosts anything, or say hi.</p>}
        {msgs.map((m) => {
          const u = userById(db, m.userId);
          if (!u) return null;
          const role = roleIn(db, ev.groupId, u.id);
          const mineMsg = u.id === me.id;
          const parent = m.replyTo ? byId.get(m.replyTo) : undefined;
          const parentUser = parent ? userById(db, parent.userId) : undefined;
          if (m.hiddenBy && !staff) {
            return <p key={m.id} className="small muted" style={{ padding: '8px 4px 8px 50px', fontStyle: 'italic' }}>{m.hiddenBy === m.userId ? 'Message deleted' : 'Message hidden by a moderator'}</p>;
          }
          return (
            <div key={m.id} className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '8px 4px', opacity: m.hiddenBy ? 0.5 : 1 }}>
              <button style={{ background: 'none', border: 0, padding: 0 }} onClick={() => onPerson(u.id)} aria-label={`See ${u.name}'s card`}>
                <Avatar user={u} size={38} />
              </button>
              <div className="grow stack" style={{ gap: 3 }}>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className="strong">{mineMsg ? 'You' : u.name}</span>
                  {role && role !== 'member' && <RoleBadge role={role} short />}
                  <span className="small muted">{ago(m.createdAt)}</span>
                </div>
                {parent && (
                  <p className="small" style={{ borderLeft: `3px solid ${C.lawn}`, paddingLeft: 8, color: 'var(--ink-soft)' }}>
                    <b>{parentUser?.id === me.id ? 'You' : parentUser?.name.split(' ')[0]}</b>: {parent.hiddenBy ? 'hidden message' : parent.text.slice(0, 90)}
                  </p>
                )}
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</p>
                {m.hiddenBy && <p className="small strong" style={{ color: C.tomato }}>Hidden from members</p>}
                <div className="row" style={{ gap: 4 }}>
                  {canPost && !m.hiddenBy && <button className="link-btn small" onClick={() => setReplyTo(m)}>Reply</button>}
                  {mineMsg && !m.hiddenBy && <button className="link-btn small" onClick={() => hide(m.id)}>Delete</button>}
                  {!mineMsg && staff && !m.hiddenBy && <button className="link-btn small" onClick={() => hide(m.id)}>Hide</button>}
                  {staff && m.hiddenBy && m.hiddenBy !== m.userId && <button className="link-btn small" onClick={() => unhide(m.id)}>Unhide</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canPost ? (
        <form className="stack" onSubmit={send} style={{ gap: 8 }}>
          {replyTo && (
            <div className="row panel" style={{ padding: '6px 10px' }}>
              <span className="small grow">Replying to <b>{userById(db, replyTo.userId)?.name.split(' ')[0]}</b>: {replyTo.text.slice(0, 70)}</span>
              <button type="button" className="link-btn small" onClick={() => setReplyTo(null)}>Cancel</button>
            </div>
          )}
          <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
            <label htmlFor={`chat-${ev.id}`} className="sr-only">Message</label>
            <textarea
              id={`chat-${ev.id}`}
              className="textarea grow"
              style={{ minHeight: 52, height: 52, resize: 'none' }}
              value={text}
              maxLength={600}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
              placeholder={staff ? 'Post an update or answer a question' : 'Ask the hosts, or say hi'}
            />
            <button className="btn sun" type="submit" disabled={!text.trim()}>Send</button>
          </div>
        </form>
      ) : (
        <div className="panel row">
          <p className="strong grow">RSVP to join the chat.</p>
          <button className="btn sun small" onClick={onRsvp}>RSVP</button>
        </div>
      )}
    </div>
  );
}
