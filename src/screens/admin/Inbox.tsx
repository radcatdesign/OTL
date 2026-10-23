import { useState } from 'react';
import { Link } from 'react-router-dom';
import { OtisAvatar } from '../../brand/otis/Otis';
import { C } from '../../brand/palette';
import { isStaffRole, roleIn } from '../../lib/perms';
import { useStore } from '../../lib/store';
import type { ChatMessage, DB, Group, Id } from '../../lib/types';
import { ago } from '../../lib/util';
import { Empty } from '../../ui/Bits';
import { Icon } from '../../brand/icons';

// Questions in this group's lawn chats that no host or moderator has answered yet.
export function needsReply(db: DB, groupId: Id): ChatMessage[] {
  const evIds = new Set(db.events.filter((e) => e.groupId === groupId).map((e) => e.id));
  const msgs = db.messages.filter((m) => evIds.has(m.eventId) && !m.hiddenBy);
  const staff = (userId: Id) => isStaffRole(roleIn(db, groupId, userId));
  return msgs
    .filter((m) => !staff(m.userId) && m.text.includes('?'))
    .filter((m) => !msgs.some((r) => staff(r.userId) && (r.replyTo === m.id || (!r.replyTo && r.eventId === m.eventId && r.createdAt > m.createdAt))))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function Inbox({ group }: { group: Group }) {
  const db = useStore((s) => s.db);
  const post = useStore((s) => s.postMessage);
  const hide = useStore((s) => s.hideMessage);
  const [view, setView] = useState<'open' | 'all'>('open');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const open = needsReply(db, group.id);
  const evIds = new Set(db.events.filter((e) => e.groupId === group.id).map((e) => e.id));
  const all = db.messages.filter((m) => evIds.has(m.eventId)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  const list = view === 'open' ? open : all;

  return (
    <section className="stack" style={{ maxWidth: 820 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div className="row-wrap" role="group" aria-label="Which messages">
          <button className="chip" aria-pressed={view === 'open'} onClick={() => setView('open')}>Needs a reply <span style={{ opacity: 0.7 }}>{open.length}</span></button>
          <button className="chip" aria-pressed={view === 'all'} onClick={() => setView('all')}>All recent</button>
        </div>
        <p className="small strong muted grow" style={{ minWidth: 200 }}>Questions from lawn chats, in one place. Replies post to that lawn's chat.</p>
      </div>
      {list.length === 0 ? (
        <Empty icon={<Icon name="letter" size={52} />} title="All caught up">
          <p className="muted strong">Every question in your lawn chats has an answer.</p>
        </Empty>
      ) : (
        list.map((m) => {
          const u = db.users.find((x) => x.id === m.userId);
          const ev = db.events.find((e) => e.id === m.eventId);
          if (!u || !ev) return null;
          const role = roleIn(db, group.id, u.id);
          const answered = !open.includes(m);
          const draft = drafts[m.id] ?? '';
          return (
            <article key={m.id} className="card stack" style={{ gap: 10, opacity: m.hiddenBy ? 0.6 : 1 }}>
              <div className="row" style={{ gap: 10 }}>
                <OtisAvatar look={u.otis} size={40} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className="strong" style={{ lineHeight: 1.15 }}>{u.name}{isStaffRole(role) ? ` (${role === 'moderator' ? 'mod' : 'host'})` : ''}</p>
                  <p className="small muted">in <Link to={`/lawn/${ev.id}`} state={{ tab: 'chat' }} className="strong">{ev.title}</Link>, {ago(m.createdAt)}</p>
                </div>
                {view === 'all' && <span className={`pill ${answered ? '' : 'sun'}`}>{m.hiddenBy ? 'Hidden' : answered ? 'Handled' : 'Open'}</span>}
              </div>
              <p style={{ fontSize: '1.0625rem', whiteSpace: 'pre-wrap' }}>{m.text}</p>
              {!answered && !m.hiddenBy && (
                <form
                  className="row"
                  style={{ alignItems: 'flex-end', gap: 8 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (post(m.eventId, draft, m.id)) setDrafts((d) => ({ ...d, [m.id]: '' }));
                  }}
                >
                  <label htmlFor={`rep-${m.id}`} className="sr-only">Reply to {u.name}</label>
                  <textarea id={`rep-${m.id}`} className="textarea grow" style={{ minHeight: 48, height: 48, resize: 'vertical' }} value={draft} onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))} placeholder={`Reply to ${u.name.split(' ')[0]}`} />
                  <button className="btn sun" type="submit" disabled={!draft.trim()}>Reply</button>
                </form>
              )}
              {!m.hiddenBy && !isStaffRole(role) && (
                <button className="link-btn small" style={{ alignSelf: 'flex-start', color: C.pine }} onClick={() => hide(m.id)}>Hide from chat</button>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
