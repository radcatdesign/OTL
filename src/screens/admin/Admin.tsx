import { Lock } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ABILITIES, can, isStaffRole, roleIn, ROLE_INFO, type Ability } from '../../lib/perms';
import { groupBySlug, useMe, useStore } from '../../lib/store';
import type { Group, GroupRole } from '../../lib/types';
import { Locked, RoleBadge } from '../../ui/Bits';
import { Campaigns } from './Campaigns';
import { EmailList } from './EmailList';
import { Inbox, needsReply } from './Inbox';
import { LawnsTab } from './LawnsTab';
import { Members } from './Members';
import { Overview } from './Overview';
import { Settings } from './Settings';

const listOf = (xs: readonly string[]) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`);

export type AdminTab = 'overview' | 'members' | 'lawns' | 'inbox' | 'email' | 'campaigns' | 'settings';

const TABS: { key: AdminTab; label: string; need: Ability | null }[] = [
  { key: 'overview', label: 'Overview', need: 'viewStats' },
  { key: 'members', label: 'Members', need: null },
  { key: 'lawns', label: 'Lawns', need: 'createEvents' },
  { key: 'inbox', label: 'Inbox', need: 'moderateChat' },
  { key: 'email', label: 'Email list', need: 'manageEmail' },
  { key: 'campaigns', label: 'Campaigns', need: 'sendCampaigns' },
  { key: 'settings', label: 'Settings', need: null },
];

export function DemoRoleSwitch({ group }: { group: Group }) {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const demo = useStore((s) => s.demo);
  const setMyRole = useStore((s) => s.demoSetMyRole);
  const role = roleIn(db, group.id, me.id);
  if (!demo || role === 'host') return null;
  return (
    <label className="row" style={{ gap: 8 }}>
      <span className="demo-pill">Demo</span>
      <span className="small muted">View as</span>
      <select className="input select small" style={{ width: 'auto' }} value={role ?? 'none'} onChange={(e) => setMyRole(group.id, e.target.value as GroupRole)} aria-label="Try another role">
        {(['cohost', 'moderator', 'member'] as GroupRole[]).map((r) => <option key={r} value={r}>{ROLE_INFO[r].name}</option>)}
        {!role && <option value="none" disabled>Not a member</option>}
      </select>
    </label>
  );
}

export function Admin() {
  const { slug, tab } = useParams();
  const nav = useNavigate();
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const group = slug ? groupBySlug(db, slug) : undefined;

  if (!group) {
    return (
      <div className="card stack center" style={{ alignItems: 'center' }}>
        <h1 className="display h2">No group at this address</h1>
        <Link to="/groups" className="btn sun">See groups</Link>
      </div>
    );
  }

  const role = roleIn(db, group.id, me.id);
  const current = (TABS.find((t) => t.key === tab)?.key ?? null) as AdminTab | null;
  if (!current) return <Navigate to={`/g/${group.slug}/admin/${isStaffRole(role) ? 'overview' : 'members'}`} replace />;
  const t = TABS.find((x) => x.key === current)!;
  const allowedHere = t.need ? can(role, t.need) : true;
  const inbox = can(role, 'moderateChat') ? needsReply(db, group.id).length : 0;

  return (
    <>
      <div className="page-head">
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <Link to={`/g/${group.slug}`} className="small strong" style={{ textDecoration: 'none' }}>{group.name}</Link>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h1 className="display h2">Run the group</h1>
            {role && <RoleBadge role={role} />}
          </div>
        </div>
        <DemoRoleSwitch group={group} />
      </div>

      {!isStaffRole(role) && (
        <Locked text="This space is for the group's hosts, co-hosts, and moderators. Members can see the member list and the role rules." />
      )}

      <div className="admin-tabs">
        <div className="tabbar" role="tablist" aria-label="Admin sections">
          {TABS.map((x) => {
            const ok = x.need ? can(role, x.need) : true;
            return (
              <button
                key={x.key}
                role="tab"
                aria-selected={current === x.key}
                style={{ opacity: ok ? 1 : 0.55 }}
                onClick={() => nav(`/g/${group.slug}/admin/${x.key}`)}
                title={ok ? undefined : `${ABILITIES[x.need!].label}: ${ABILITIES[x.need!].roles.map((r) => ROLE_INFO[r].name).join(', ')}`}
              >
                {!ok && (
                  <Lock size={13} strokeWidth={2.2} aria-label="Locked" />
                )}
                {x.label}
                {x.key === 'inbox' && inbox > 0 && <span className="pill sun">{inbox}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {!allowedHere ? (
        <Locked text={`Only ${listOf(ABILITIES[t.need!].roles.map((r) => ROLE_INFO[r].name.toLowerCase() + 's'))} can ${ABILITIES[t.need!].label.toLowerCase()}. ${role === 'moderator' ? "Moderators run lawns and conversations, and don't handle membership or email." : ''}`} />
      ) : current === 'overview' ? <Overview group={group} />
        : current === 'members' ? <Members group={group} />
        : current === 'lawns' ? <LawnsTab group={group} />
        : current === 'inbox' ? <Inbox group={group} />
        : current === 'email' ? <EmailList group={group} />
        : current === 'campaigns' ? <Campaigns group={group} />
        : <Settings group={group} />}
    </>
  );
}
