import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../brand/icons';
import { C } from '../../brand/palette';
import { audienceFor, audienceLabel } from '../../lib/email';
import { useStore } from '../../lib/store';
import type { Campaign, Group } from '../../lib/types';
import { useWide } from '../../lib/useWide';
import { fmtDay, fmtTime } from '../../lib/util';
import { Empty } from '../../ui/Bits';

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '0%');

function StatusPill({ c }: { c: Campaign }) {
  if (c.status === 'sent') return <span className="pill lawn">Sent {c.sentAt ? fmtDay(c.sentAt) : ''}</span>;
  if (c.status === 'scheduled') return <span className="pill sun">Goes out {c.scheduledAt ? `${fmtDay(c.scheduledAt)}, ${fmtTime(c.scheduledAt)}` : ''}</span>;
  return <span className="pill">Draft</span>;
}

export function Campaigns({ group }: { group: Group }) {
  const nav = useNavigate();
  const db = useStore((s) => s.db);
  const create = useStore((s) => s.createCampaign);
  const duplicate = useStore((s) => s.duplicateCampaign);
  const remove = useStore((s) => s.deleteCampaign);
  const wide = useWide();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [forLawn, setForLawn] = useState('');

  const all = db.campaigns.filter((c) => c.groupId === group.id);
  const scheduled = all.filter((c) => c.status === 'scheduled').sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
  const drafts = all.filter((c) => c.status === 'draft').sort((a, b) => b.updatedAt - a.updatedAt);
  const sent = all.filter((c) => c.status === 'sent').sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
  const subscribers = audienceFor(db, group.id, { all: true, listIds: [] }).length;
  const tot = sent.reduce((a, c) => ({ r: a.r + (c.stats?.recipients ?? 0), o: a.o + (c.stats?.opens ?? 0), k: a.k + (c.stats?.clicks ?? 0) }), { r: 0, o: 0, k: 0 });
  const upcoming = db.events.filter((e) => e.groupId === group.id && e.endsAt > Date.now()).sort((a, b) => a.startsAt - b.startsAt);

  const start = (eventId?: string) => {
    const c = create(group.id, eventId);
    if (c) nav(`/g/${group.slug}/admin/campaigns/${c.id}`);
  };

  const row = (c: Campaign) => {
    const n = c.status === 'sent' ? c.stats?.recipients ?? 0 : audienceFor(db, group.id, c.audience).length;
    return (
      <div key={c.id} className="list-row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span className="dot" style={{ width: 18, height: 18, borderRadius: 6, background: C[c.accent] }} />
        <div className="grow" style={{ minWidth: 200 }}>
          <Link to={`/g/${group.slug}/admin/campaigns/${c.id}`} className="strong" style={{ textDecoration: 'none' }}>{c.name}</Link>
          <p className="small muted" style={{ overflowWrap: 'anywhere' }}>{c.subject || 'No subject yet'}</p>
          <p className="small muted">{audienceLabel(db, c.audience)}, {n} {n === 1 ? 'person' : 'people'}</p>
        </div>
        <StatusPill c={c} />
        {c.status === 'sent' && c.stats && (
          <div className="row" style={{ gap: 6 }}>
            <span className="pill" title="Opened">{pct(c.stats.opens, c.stats.recipients)} opened</span>
            <span className="pill" title="Clicked">{pct(c.stats.clicks, c.stats.recipients)} clicked</span>
          </div>
        )}
        <div className="row" style={{ gap: 6 }}>
          <Link to={`/g/${group.slug}/admin/campaigns/${c.id}`} className="btn cream small">{c.status === 'sent' ? 'View' : 'Edit'}</Link>
          <button className="btn cream small" onClick={() => { const x = duplicate(c.id); if (x) nav(`/g/${group.slug}/admin/campaigns/${x.id}`); }}>Duplicate</button>
          {c.status !== 'sent' && (confirm === c.id ? (
            <>
              <button className="btn danger small" onClick={() => { remove(c.id); setConfirm(null); }}>Delete it</button>
              <button className="btn cream small" onClick={() => setConfirm(null)}>Keep</button>
            </>
          ) : <button className="link-btn small" onClick={() => setConfirm(c.id)}>Delete</button>)}
        </div>
      </div>
    );
  };

  const section = (title: string, items: Campaign[], empty: string) => (
    <section className="card stack">
      <h2 className="display h4">{title} <span className="muted" style={{ fontFamily: 'var(--font-body)', fontSize: '1rem' }}>{items.length}</span></h2>
      {items.length ? <div className="list">{items.map(row)}</div> : <p className="muted strong">{empty}</p>}
    </section>
  );

  return (
    <>
      <section className="card stack">
        <div className="row" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div className="grow" style={{ minWidth: 220 }}>
            <h2 className="display h3">Campaigns</h2>
            <p className="small strong muted">Write it, check how it lands in an inbox, then send it now or pick a time.</p>
          </div>
          {upcoming.length > 0 && (
            <label className="field" style={{ minWidth: 200 }}>
              <span className="label">Start from a lawn</span>
              <select className="input select" value={forLawn} onChange={(e) => { setForLawn(e.target.value); if (e.target.value) start(e.target.value); }}>
                <option value="">Pick a lawn</option>
                {upcoming.map((e) => <option key={e.id} value={e.id}>{e.title}, {fmtDay(e.startsAt)}</option>)}
              </select>
            </label>
          )}
          <button className="btn sun" onClick={() => start()}>New campaign</button>
        </div>
        <div className={wide ? 'grid-4' : 'grid-2'}>
          <div className="stat"><b>{subscribers}</b><span>Subscribers</span></div>
          <div className="stat"><b>{sent.length}</b><span>Sent</span></div>
          <div className="stat"><b>{pct(tot.o, tot.r)}</b><span>Average opens</span></div>
          <div className="stat"><b>{pct(tot.k, tot.r)}</b><span>Average clicks</span></div>
        </div>
        <p className="small muted strong">Open and click numbers in this demo are made up. Live, they come from the email service.</p>
      </section>

      {all.length === 0 ? (
        <Empty icon={<Icon name="letter" size={52} />} title="No campaigns yet">
          <p className="muted strong">Start with a lawn and the RSVP card is already in the email.</p>
          <button className="btn sun" onClick={() => start(upcoming[0]?.id)}>Write the first one</button>
        </Empty>
      ) : (
        <>
          {scheduled.length > 0 && section('Scheduled', scheduled, '')}
          {section('Drafts', drafts, 'No drafts. Start one above.')}
          {section('Sent', sent, 'Nothing sent yet.')}
        </>
      )}
    </>
  );
}
