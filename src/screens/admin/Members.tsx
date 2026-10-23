import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Icon } from '../../brand/icons';
import { OtisAvatar } from '../../brand/otis/Otis';
import { C } from '../../brand/palette';
import { validEmail } from '../../lib/email';
import { groupStats } from '../../lib/groupStats';
import { can, canActOn, roleIn, ROLE_INFO, ROLES_ORDER } from '../../lib/perms';
import { useMe, useStore } from '../../lib/store';
import type { Group, GroupRole, User } from '../../lib/types';
import { useWide } from '../../lib/useWide';
import { ago, appUrl, copyText, fmtDay } from '../../lib/util';
import { Locked, RoleBadge } from '../../ui/Bits';
import { PersonSheet } from '../../ui/PersonSheet';
import { Sheet } from '../../ui/Sheet';

// The croquet mallet from the OTL icon set, swung as the ban hammer.
function Mallet({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden>
      <rect x="32.9426" y="8.44238" width="29.5791" height="5.57287" rx="1.71473" transform="rotate(105 32.9426 8.44238)" fill="#F5C31D" stroke={C.pine} strokeWidth="1.2" />
      <rect x="10.8833" y="27.8284" width="26.5783" height="15.0039" rx="3.42946" transform="rotate(15 10.8833 27.8284)" fill={C.tomato} stroke={C.pine} strokeWidth="1.6" />
      <rect x="33.0515" y="32.8804" width="16.7186" height="3.42946" rx="1.71473" transform="rotate(105 33.0515 32.8804)" fill="#F5C31D" />
      <rect x="18.1448" y="28.8862" width="16.7186" height="3.42946" rx="1.71473" transform="rotate(105 18.1448 28.8862)" fill="#F5C31D" />
    </svg>
  );
}

function BanSheet({ group, target, onClose }: { group: Group; target: User | null; onClose: () => void }) {
  const ban = useStore((s) => s.banMember);
  const [reason, setReason] = useState('');
  const [swing, setSwing] = useState(false);
  const [done, setDone] = useState(false);

  const close = () => { setReason(''); setSwing(false); setDone(false); onClose(); };

  return (
    <Sheet open={!!target} onClose={close} label="Ban member">
      {target && (
        <div className="stack-lg">
          <div style={{ position: 'relative', height: 170, display: 'grid', placeItems: 'center' }}>
            <motion.div animate={done ? { scale: 0.6, opacity: 0.35, y: 18, rotate: 8 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
              <OtisAvatar look={target.otis} size={110} />
            </motion.div>
            <AnimatePresence>
              {swing && (
                <motion.div
                  style={{ position: 'absolute', right: '22%', top: -10, transformOrigin: '80% 90%' }}
                  initial={{ rotate: 70, opacity: 0 }}
                  animate={{ rotate: [70, 70, -20, 0], opacity: 1 }}
                  transition={{ duration: 0.55, times: [0, 0.2, 0.75, 1], ease: 'easeIn' }}
                  onAnimationComplete={() => setDone(true)}
                >
                  <Mallet size={120} />
                </motion.div>
              )}
            </AnimatePresence>
            {done && (
              <motion.span className="pill tomato" style={{ position: 'absolute', bottom: 0 }} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 12 }}>
                Banned
              </motion.span>
            )}
          </div>
          {!done ? (
            <form
              className="stack-lg"
              onSubmit={(e) => {
                e.preventDefault();
                if (ban(group.id, target.id, reason)) setSwing(true);
              }}
            >
              <div className="stack" style={{ gap: 6 }}>
                <h2 className="display h2">Ban {target.name.split(' ')[0]}?</h2>
                <ul className="strong" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>They're removed from {group.name} and can't rejoin.</li>
                  <li>They come off the guest list for upcoming lawns.</li>
                  <li>Their chat messages in this group are hidden.</li>
                  <li>They're unsubscribed from group emails.</li>
                </ul>
              </div>
              <div className="field">
                <label htmlFor="ban-reason">Reason, for other admins</label>
                <input id="ban-reason" className="input" value={reason} maxLength={140} onChange={(e) => setReason(e.target.value)} placeholder="Spam in event chat" />
              </div>
              <div className="grid-2">
                <button className="btn danger" type="submit" disabled={swing}>Ban from the group</button>
                <button className="btn cream" type="button" onClick={close}>Cancel</button>
              </div>
              <p className="hint">You can lift a ban any time from the banned list.</p>
            </form>
          ) : (
            <div className="stack center" style={{ alignItems: 'center' }}>
              <p className="strong">{target.name} is banned from {group.name}.</p>
              <button className="btn cream block" onClick={close}>Done</button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

export function Members({ group }: { group: Group }) {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const setRole = useStore((s) => s.setRole);
  const remove = useStore((s) => s.removeMember);
  const unban = useStore((s) => s.unban);
  const invite = useStore((s) => s.inviteToGroup);
  const revoke = useStore((s) => s.revokeInvite);
  const resend = useStore((s) => s.resendInvite);
  const toast = useStore((s) => s.toast);
  const wide = useWide();
  const myRole = roleIn(db, group.id, me.id);
  const canRoles = can(myRole, 'manageRoles');
  const canInvite = can(myRole, 'inviteMembers');
  const canRemove = can(myRole, 'removeMembers');
  const canBan = can(myRole, 'banMembers');

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<GroupRole | 'all'>('all');
  const [emails, setEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<GroupRole>('member');
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);

  const stats = useMemo(() => groupStats(db, group.id), [db, group.id]);
  const rows = db.groupMembers
    .filter((m) => m.groupId === group.id)
    .map((m) => ({ m, u: db.users.find((x) => x.id === m.userId)!, s: stats.perMember.get(m.userId) }))
    .filter((r) => r.u)
    .filter((r) => roleFilter === 'all' || r.m.role === roleFilter)
    .filter((r) => !q.trim() || `${r.u.name} ${r.u.email}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => ROLE_INFO[b.m.role].rank - ROLE_INFO[a.m.role].rank || a.u.name.localeCompare(b.u.name));
  const invites = db.groupInvites.filter((i) => i.groupId === group.id && i.status === 'pending').sort((a, b) => b.createdAt - a.createdAt);
  const bans = db.groupBans.filter((b) => b.groupId === group.id).sort((a, b) => b.createdAt - a.createdAt);
  const joinLink = `${appUrl()}#/g/${group.slug}`;

  const sendInvites = (e: React.FormEvent) => {
    e.preventDefault();
    const list = emails.split(/[\s,;]+/).filter(Boolean);
    const bad = list.filter((x) => !validEmail(x));
    const n = invite(group.id, list, inviteRole);
    if (n) toast({ text: `${n} ${n === 1 ? 'invite' : 'invites'} sent as ${ROLE_INFO[inviteRole].name.toLowerCase()}`, tone: 'good' });
    else if (!bad.length) toast({ text: 'Everyone there is already a member or invited.', tone: 'info' });
    if (bad.length) toast({ text: `Skipped ${bad.length} that didn't look like email addresses.`, tone: 'error' });
    setEmails('');
  };

  const actionsFor = (u: User, role: GroupRole) => {
    const self = u.id === me.id;
    const isHost = !canActOn(myRole, role);
    return (
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        {canRemove && !self && !isHost && (
          confirmRemove === u.id ? (
            <>
              <button className="btn danger small" onClick={() => { remove(group.id, u.id); setConfirmRemove(null); }}>Remove</button>
              <button className="btn cream small" onClick={() => setConfirmRemove(null)}>Keep</button>
            </>
          ) : (
            <button className="btn cream small" onClick={() => setConfirmRemove(u.id)}>Remove</button>
          )
        )}
        {canBan && !self && !isHost && confirmRemove !== u.id && (
          <button className="btn cream small" onClick={() => setBanTarget(u)} aria-label={`Ban ${u.name}`} title="Ban hammer">
            <svg width="20" height="20" viewBox="0 0 56 56" aria-hidden><rect x="10.8833" y="27.8284" width="26.5783" height="15.0039" rx="3.42946" transform="rotate(15 10.8833 27.8284)" fill={C.tomato} /><rect x="32.9426" y="8.44238" width="29.5791" height="5.57287" rx="1.71473" transform="rotate(105 32.9426 8.44238)" fill="#F5C31D" /></svg>
            Ban
          </button>
        )}
      </div>
    );
  };

  const roleCell = (u: User, role: GroupRole) => {
    const editable = canRoles && canActOn(myRole, role) && u.id !== me.id;
    if (!editable) return <RoleBadge role={role} />;
    return (
      <select className="input select small" style={{ width: 'auto' }} value={role} aria-label={`Role for ${u.name}`} onChange={(e) => setRole(group.id, u.id, e.target.value as GroupRole)}>
        {ROLES_ORDER.filter((r) => r !== 'host' || myRole === 'host').map((r) => <option key={r} value={r}>{ROLE_INFO[r].name}</option>)}
      </select>
    );
  };

  const inviteC = canInvite ? (
    <section className="card stack">
      <h2 className="display h4">Invite people</h2>
      <form className="stack" onSubmit={sendInvites}>
        <label htmlFor="inv-emails" className="label">Email addresses</label>
        <textarea id="inv-emails" className="textarea" style={{ minHeight: 76 }} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="sam@studio.com, lena@outfitter.co" />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor="inv-role" className="small strong">Join as</label>
          <select id="inv-role" className="input select small" style={{ width: 'auto' }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as GroupRole)}>
            {(['member', 'moderator', 'cohost'] as GroupRole[]).map((r) => <option key={r} value={r}>{ROLE_INFO[r].name}</option>)}
          </select>
          <span className="grow" />
          <button className="btn sun" type="submit" disabled={!emails.trim()}>Send invites</button>
        </div>
      </form>
      <div className="panel stack" style={{ gap: 6 }}>
        <p className="small strong">Or share the join link</p>
        <p className="small" style={{ wordBreak: 'break-all', userSelect: 'all' }}>{joinLink}</p>
        <button className="btn cream small" onClick={async () => toast({ text: (await copyText(joinLink)) ? 'Link copied' : 'Press and hold the link to copy it.', tone: 'info' })}>Copy link</button>
      </div>
      {invites.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <p className="label">Waiting on {invites.length}</p>
          <div className="list">
            {invites.map((i) => (
              <div key={i.id} className="list-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="grow" style={{ minWidth: 160 }}>
                  <p className="strong" style={{ wordBreak: 'break-all' }}>{i.email}</p>
                  <p className="small muted">{ROLE_INFO[i.role].name}, sent {ago(i.createdAt)}{i.sentCount > 1 ? `, ${i.sentCount} times` : ''}</p>
                </div>
                <button className="btn cream small" onClick={() => resend(i.id)}>Resend</button>
                <button className="link-btn small" onClick={() => revoke(i.id)}>Revoke</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  ) : (
    <Locked text="Moderators can see the member list, but only hosts and co-hosts can invite, remove, or ban members." />
  );

  const listC = (
    <section className="stack">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <label htmlFor="mem-q" className="sr-only">Search members</label>
        <input id="mem-q" className="input grow" style={{ minHeight: 44, minWidth: 180 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" />
        <div className="row-wrap" role="group" aria-label="Filter by role">
          {(['all', ...ROLES_ORDER] as const).map((r) => (
            <button key={r} className="chip" aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>{r === 'all' ? 'Everyone' : ROLE_INFO[r].name}</button>
          ))}
        </div>
      </div>
      <p className="small strong muted">{rows.length} of {stats.memberCount} members</p>
      {wide ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Member</th><th>Role</th><th>Joined</th><th className="num">Lawns</th><th className="num">Check-ins</th><th className="num">Garden</th><th>Last active</th><th /></tr>
            </thead>
            <tbody>
              {rows.map(({ m, u, s }) => (
                <tr key={m.id}>
                  <td>
                    <button className="row" style={{ background: 'none', border: 0, padding: 0, gap: 10, textAlign: 'left' }} onClick={() => setPerson(u.id)}>
                      <OtisAvatar look={u.otis} size={34} />
                      <span style={{ minWidth: 0 }}>
                        <span className="strong" style={{ display: 'block' }}>{u.id === me.id ? `${u.name} (you)` : u.name}</span>
                        {can(myRole, 'manageEmail') && <span className="small muted">{u.email}</span>}
                      </span>
                    </button>
                  </td>
                  <td>{roleCell(u, m.role)}</td>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDay(m.joinedAt)}</td>
                  <td className="num">{s?.rsvps ?? 0}</td>
                  <td className="num">{s?.checkins ?? 0}</td>
                  <td className="num">{(s?.seeds ?? 0) + (s?.waterings ?? 0)}</td>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>{s && s.lastActive ? ago(s.lastActive) : 'Never'}</td>
                  <td>{actionsFor(u, m.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: '2px 14px' }}>
          <div className="list">
            {rows.map(({ m, u, s }) => (
              <div key={m.id} className="stack" style={{ gap: 8, padding: '12px 0' }}>
                <div className="row" style={{ gap: 10 }}>
                  <button style={{ background: 'none', border: 0, padding: 0 }} onClick={() => setPerson(u.id)} aria-label={`See ${u.name}'s card`}><OtisAvatar look={u.otis} size={40} /></button>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <p className="strong" style={{ lineHeight: 1.15 }}>{u.id === me.id ? `${u.name} (you)` : u.name}</p>
                    <p className="small muted">{s?.checkins ?? 0} check-ins, active {s && s.lastActive ? ago(s.lastActive) : 'never'}</p>
                  </div>
                  {roleCell(u, m.role)}
                </div>
                {(canRemove || canBan) && u.id !== me.id && canActOn(myRole, m.role) && actionsFor(u, m.role)}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );

  const bansC = (canBan || bans.length > 0) && (
    <section className="card stack">
      <div className="row">
        <Icon name="croquet" size={34} />
        <h2 className="display h4 grow">Banned</h2>
        <span className="pill">{bans.length}</span>
      </div>
      {bans.length === 0 ? <p className="muted strong">Nobody. Long may it last.</p> : (
        <div className="list">
          {bans.map((b) => (
            <div key={b.id} className="list-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="grow" style={{ minWidth: 160 }}>
                <p className="strong">{b.name}</p>
                <p className="small muted">{b.reason}. Banned {ago(b.createdAt)} by {db.users.find((x) => x.id === b.bannedBy)?.name.split(' ')[0] ?? 'an admin'}.</p>
              </div>
              {canBan && <button className="btn cream small" onClick={() => unban(b.id)}>Lift ban</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      {wide ? (
        <>
          <div className={bansC ? 'cols even' : 'stack'} style={{ alignItems: 'start' }}>{inviteC}{bansC}</div>
          {listC}
        </>
      ) : (
        <>
          {inviteC}
          {listC}
          {bansC}
        </>
      )}
      <BanSheet group={group} target={banTarget} onClose={() => setBanTarget(null)} />
      <PersonSheet userId={person} onClose={() => setPerson(null)} />
    </>
  );
}
