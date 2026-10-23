import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { C, COLOR_KEYS, COLOR_NAMES, onColor } from '../../brand/palette';
import { audienceFor, emailBody, renderEmailHtml, validEmail } from '../../lib/email';
import { fileToDataUrl, downloadText } from '../../lib/media';
import { can, roleIn } from '../../lib/perms';
import { groupBySlug, uid, useMe, useStore } from '../../lib/store';
import type { BlockType, Campaign, CampaignBlock, DB, Group } from '../../lib/types';
import { useWide } from '../../lib/useWide';
import { ago, appUrl, copyText, firstName, fmtDay, fmtLongDay, fmtTime, fromZoned, TZ_LABEL, zoned } from '../../lib/util';
import { Locked, Tabs } from '../../ui/Bits';
import { DemoRoleSwitch } from './Admin';

const BLOCKS: { type: BlockType; label: string; hint: string }[] = [
  { type: 'heading', label: 'Heading', hint: 'Big line' },
  { type: 'text', label: 'Text', hint: 'A paragraph or two' },
  { type: 'image', label: 'Image', hint: 'Photo or poster' },
  { type: 'button', label: 'Button', hint: 'One clear link' },
  { type: 'event', label: 'Lawn card', hint: 'Date, place, RSVP' },
  { type: 'divider', label: 'Divider', hint: 'A breather' },
  { type: 'signoff', label: 'Sign-off', hint: 'Who it is from' },
];
const LABEL: Record<BlockType, string> = Object.fromEntries(BLOCKS.map((b) => [b.type, b.label])) as Record<BlockType, string>;

const addDays = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '0%');
const firstText = (c: Campaign) => c.blocks.find((b) => b.type === 'text' && b.text?.trim())?.text?.trim() ?? '';
const okUrl = (u?: string) => !u || /^(https?:\/\/|mailto:)\S+$/i.test(u.trim());

// ---------- preview pieces ----------

// Scales a fixed-width child down to fit its column, keeping the layout height right.
function Fit({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const W = outer.current?.clientWidth ?? width;
      const s = Math.min(1, W / width);
      setScale(s);
      setH((inner.current?.offsetHeight ?? 0) * s);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} style={{ width: '100%', height: h || undefined, overflow: 'hidden' }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left', margin: scale === 1 ? '0 auto' : 0 }}>{children}</div>
    </div>
  );
}

// The app's own @font-face rules, so the preview shows the brand type the way Apple Mail would.
let fontCssCache: string | null = null;
function appFontCss() {
  if (fontCssCache !== null) return fontCssCache;
  let out = '';
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const r of Array.from(rules)) if (r.constructor.name === 'CSSFontFaceRule' && /Titan One|Baloo 2/.test(r.cssText)) out += `${r.cssText}\n`;
    }
  } catch { /* noop */ }
  fontCssCache = out;
  return out;
}

// Renders the email in an isolated frame. The frame loads once; edits swap the body so it stays fast while typing.
function EmailFrame({ html, width }: { html: string; width: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [h, setH] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const shell = useMemo(() => `<!doctype html><html><head><meta charset="utf-8"><style>${appFontCss()}html,body{margin:0;padding:0;background:#EEF3DC}a{cursor:default}</style></head><body></body></html>`, []);
  const body = emailBody(html);

  useEffect(() => {
    if (!ready || blocked) return;
    try {
      const d = ref.current?.contentDocument;
      if (!d) throw new Error('no doc');
      d.body.innerHTML = body;
      const measure = () => setH(d.body.scrollHeight + 2);
      measure();
      d.fonts?.ready.then(measure).catch(() => {});
      d.querySelectorAll('img').forEach((img) => { if (!img.complete) img.addEventListener('load', measure, { once: true }); });
    } catch {
      setBlocked(true);
    }
  }, [ready, blocked, body]);

  if (blocked) {
    return <div style={{ width, background: '#EEF3DC' }} dangerouslySetInnerHTML={{ __html: body }} />;
  }
  return (
    <iframe
      ref={ref}
      title="Email preview"
      srcDoc={shell}
      sandbox="allow-same-origin"
      onLoad={() => {
        try {
          const d = ref.current?.contentDocument;
          if (!d) throw new Error('no doc');
          d.addEventListener('click', (e) => { if ((e.target as Element | null)?.closest?.('a')) e.preventDefault(); });
          setReady(true);
        } catch {
          setBlocked(true);
        }
      }}
      style={{ width, height: h || 900, border: 0, display: 'block', background: '#EEF3DC' }}
    />
  );
}

const OTHER_MAIL = [
  { from: 'Dana Ruiz', subject: 'Re: poster sizes', snippet: "18 by 24 works. I'll bring the tape.", time: 'Yesterday' },
  { from: 'Print Shop', subject: 'Your proofs are ready', snippet: 'Three files are waiting for a thumbs up.', time: 'Tue' },
  { from: 'Weekend Forecast', subject: 'Sunny and 68 on Saturday', snippet: 'Good weather for being outside.', time: 'Mon' },
];

function Sender({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size, flex: 'none', borderRadius: 999, background: color, border: `2px solid ${C.pine}`, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: size * 0.42, color: C.pine }}>
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

function InboxPreview({ c, device, when }: { c: Campaign; device: 'desktop' | 'phone'; when: string }) {
  const snippet = c.preheader.trim() || firstText(c);
  const accent = C[c.accent];
  const mine = { from: c.fromName || 'Your group', subject: c.subject || 'No subject', snippet, time: when, mine: true };
  const rows = [mine, ...OTHER_MAIL.map((m) => ({ ...m, mine: false }))];
  if (device === 'phone') {
    return (
      <Fit width={375}>
        <div className="phone-frame">
          <div style={{ padding: '14px 18px 8px', borderBottom: `1.5px solid ${C.paper}` }}>
            <p style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.1, color: C.pine }}>Inbox</p>
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: `1.5px solid ${C.paper}`, background: r.mine ? '#fffdf5' : C.cream }}>
              <span style={{ width: 9, flex: 'none', paddingTop: 7 }}>{r.mine && <span style={{ display: 'block', width: 9, height: 9, borderRadius: 9, background: '#2f6fe4' }} />}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontWeight: r.mine ? 800 : 700, fontSize: 16, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.from}</span>
                  <span style={{ fontSize: 13, color: '#6b8a6c', flex: 'none' }}>{r.time}</span>
                </div>
                <div style={{ fontWeight: r.mine ? 800 : 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</div>
                <div style={{ fontSize: 14, color: '#5b7a5c', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{r.snippet || ' '}</div>
              </div>
            </div>
          ))}
        </div>
      </Fit>
    );
  }
  return (
    <Fit width={680}>
      <div className="desk-frame">
        <div className="desk-bar"><i /><i /><i /><span>Inbox</span></div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1.5px solid ${C.paper}`, background: r.mine ? '#fffdf5' : C.cream, fontSize: 15 }}>
            <Sender name={r.from} color={r.mine ? accent : C.paper} size={30} />
            <span style={{ width: 150, flex: 'none', fontWeight: r.mine ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.from}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: r.mine ? 800 : 600 }}>{r.subject}</span>
              <span style={{ color: '#6b8a6c', marginLeft: 10 }}>{r.snippet}</span>
            </span>
            <span style={{ fontSize: 13, color: '#6b8a6c', flex: 'none', fontWeight: r.mine ? 800 : 500 }}>{r.time}</span>
          </div>
        ))}
      </div>
    </Fit>
  );
}

function MessagePreview({ c, group, html, device, toName }: { c: Campaign; group: Group; html: string; device: 'desktop' | 'phone'; toName: string }) {
  const head = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', borderBottom: `1.5px solid ${C.paper}`, background: C.cream }}>
      <Sender name={c.fromName || group.name} color={C[c.accent]} size={36} />
      <div style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
        <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.fromName || group.name}</div>
        <div style={{ fontSize: 13, color: '#5b7a5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>To {toName}. Replies go to {group.replyTo}</div>
      </div>
    </div>
  );
  if (device === 'phone') {
    return (
      <Fit width={375}>
        <div className="phone-frame">
          <p style={{ padding: '14px 16px 4px', fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>{c.subject || 'No subject'}</p>
          {head}
          <EmailFrame html={html} width={371} />
        </div>
      </Fit>
    );
  }
  return (
    <Fit width={680}>
      <div className="desk-frame">
        <div className="desk-bar"><i /><i /><i /><span>{c.subject || 'No subject'}</span></div>
        {head}
        <EmailFrame html={html} width={676} />
      </div>
    </Fit>
  );
}

// ---------- block editor ----------

function BlockCard({ b, db, groupId, index, count, onChange, onMove, onRemove }: {
  b: CampaignBlock; db: DB; groupId: string; index: number; count: number;
  onChange: (p: Partial<CampaignBlock>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const toast = useStore((s) => s.toast);
  const id = `blk-${b.id}`;
  const events = db.events.filter((e) => e.groupId === groupId && (e.endsAt > Date.now() || e.id === b.eventId)).sort((a, z) => a.startsAt - z.startsAt);
  const ev = db.events.find((e) => e.id === b.eventId);
  return (
    <div className="panel stack" style={{ gap: 10, background: C.cream }}>
      <div className="row" style={{ gap: 6 }}>
        <span className="pill" style={{ fontSize: 12 }}>{LABEL[b.type]}</span>
        <span className="grow" />
        <button type="button" className="btn cream small icon" aria-label={`Move ${LABEL[b.type]} up`} disabled={index === 0} onClick={() => onMove(-1)}>
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden><path d="M3 11l6-6 6 6" stroke={C.pine} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="btn cream small icon" aria-label={`Move ${LABEL[b.type]} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden><path d="M3 7l6 6 6-6" stroke={C.pine} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="btn cream small icon" aria-label={`Remove ${LABEL[b.type]}`} onClick={onRemove}>
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden><path d="M4 4l10 10M14 4L4 14" stroke={C.pine} strokeWidth="3" strokeLinecap="round" /></svg>
        </button>
      </div>
      {b.type === 'heading' && (
        <>
          <label htmlFor={id} className="sr-only">Heading text</label>
          <input id={id} className="input" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }} value={b.text ?? ''} maxLength={90} onChange={(e) => onChange({ text: e.target.value })} placeholder="The big line" />
        </>
      )}
      {(b.type === 'text' || b.type === 'signoff') && (
        <>
          <label htmlFor={id} className="sr-only">{LABEL[b.type]} text</label>
          <textarea id={id} className="textarea" style={{ minHeight: b.type === 'text' ? 120 : 70 }} value={b.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} placeholder={b.type === 'text' ? 'Write like you talk. A blank line starts a new paragraph.' : 'See you on the lawn,\nYour name'} />
        </>
      )}
      {b.type === 'button' && (
        <div className="grid-2 stack-sm" style={{ gap: 8 }}>
          <div className="field">
            <label htmlFor={`${id}-t`}>Button text</label>
            <input id={`${id}-t`} className="input" value={b.text ?? ''} maxLength={40} onChange={(e) => onChange({ text: e.target.value })} placeholder="Save your spot" />
          </div>
          <div className="field">
            <label htmlFor={`${id}-u`}>Link</label>
            <input id={`${id}-u`} className="input" inputMode="url" value={b.url ?? ''} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://" aria-invalid={!okUrl(b.url)} />
            {!okUrl(b.url) && <span className="error small">Links need to start with https:// or mailto:</span>}
          </div>
        </div>
      )}
      {b.type === 'image' && (
        <div className="stack" style={{ gap: 8 }}>
          {b.src ? (
            <img src={b.src} alt={b.alt || ''} style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 14, border: `3px solid ${C.pine}` }} />
          ) : (
            <p className="small strong muted">No image yet. It won't show in the email until you add one.</p>
          )}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <input id={`${id}-f`} type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try { onChange({ src: await fileToDataUrl(f, 1100, 0.8) }); } catch { toast({ text: "That image didn't load. Try a JPG or PNG.", tone: 'error' }); }
            }} />
            <label htmlFor={`${id}-f`} className="btn cream small" style={{ cursor: 'pointer' }}>{b.src ? 'Swap image' : 'Upload image'}</label>
            <label htmlFor={`${id}-a`} className="sr-only">Describe the image</label>
            <input id={`${id}-a`} className="input grow" style={{ minHeight: 40, minWidth: 160 }} value={b.alt ?? ''} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Describe it for screen readers" />
          </div>
        </div>
      )}
      {b.type === 'event' && (
        <div className="field">
          <label htmlFor={id}>Which lawn</label>
          <select id={id} className="input select" value={b.eventId ?? ''} onChange={(e) => onChange({ eventId: e.target.value })}>
            <option value="" disabled>Pick a lawn</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}, {fmtDay(e.startsAt)}</option>)}
          </select>
          {!ev && <span className="error small">Pick a lawn or this card stays out of the email.</span>}
          {ev && <span className="hint">Shows the date, time, place and an RSVP button.</span>}
        </div>
      )}
      {b.type === 'divider' && <div style={{ borderTop: `2px dashed ${C.pine}`, opacity: 0.3, margin: '6px 0' }} />}
    </div>
  );
}

// ---------- the editor ----------

export function CampaignEditor() {
  const { slug, cid } = useParams();
  const nav = useNavigate();
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const update = useStore((s) => s.updateCampaign);
  const schedule = useStore((s) => s.scheduleCampaign);
  const unschedule = useStore((s) => s.unscheduleCampaign);
  const sendNow = useStore((s) => s.sendCampaignNow);
  const duplicate = useStore((s) => s.duplicateCampaign);
  const toast = useStore((s) => s.toast);
  const wide = useWide();
  // Side-by-side editing needs room for a readable preview. Below that, Write and Preview are tabs.
  const split = useWide('(min-width: 1280px)');
  const group = slug ? groupBySlug(db, slug) : undefined;
  const c = db.campaigns.find((x) => x.id === cid && x.groupId === group?.id);

  const [pane, setPane] = useState<'write' | 'preview'>('write');
  const [view, setView] = useState<'inbox' | 'email'>('email');
  const [device, setDevice] = useState<'desktop' | 'phone'>(wide ? 'desktop' : 'phone');
  const [testTo, setTestTo] = useState(me.email);
  const initial = c?.scheduledAt ? zoned(c.scheduledAt) : { day: addDays(zoned(Date.now()).day, 1), time: '09:00' };
  const [day, setDay] = useState(initial.day);
  const [time, setTime] = useState(initial.time);
  const [confirmSend, setConfirmSend] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => { setDevice(wide ? 'desktop' : 'phone'); }, [wide]);

  const html = useMemo(() => (c && group ? renderEmailHtml(c, group, db, appUrl(), firstName(me.name)) : ''), [c, group, db, me.name]);

  if (!group || !c) {
    return (
      <div className="card stack center" style={{ alignItems: 'center' }}>
        <h1 className="display h2">That campaign isn't here</h1>
        <p className="muted strong">It may have been deleted.</p>
        <Link to={group ? `/g/${group.slug}/admin/campaigns` : '/groups'} className="btn sun">Back to campaigns</Link>
      </div>
    );
  }

  const role = roleIn(db, group.id, me.id);
  const back = <Link to={`/g/${group.slug}/admin/campaigns`} className="small strong" style={{ textDecoration: 'none' }}>{group.name}: Campaigns</Link>;
  if (!can(role, 'sendCampaigns')) {
    return (
      <>
        <div className="page-head">
          <div className="stack" style={{ gap: 6 }}>{back}<h1 className="display h2">{c.name}</h1></div>
          <DemoRoleSwitch group={group} />
        </div>
        <Locked text="Campaigns are for hosts and co-hosts. Moderators run lawns and conversations, and don't send email to the list." />
      </>
    );
  }

  const set = (patch: Partial<Campaign>) => update(c.id, patch);
  const setBlock = (id: string, p: Partial<CampaignBlock>) => set({ blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  const move = (i: number, d: -1 | 1) => {
    const xs = [...c.blocks];
    const j = i + d;
    if (j < 0 || j >= xs.length) return;
    [xs[i], xs[j]] = [xs[j], xs[i]];
    set({ blocks: xs });
  };
  const addBlock = (type: BlockType) => {
    const nextEvent = db.events.filter((e) => e.groupId === group.id && e.endsAt > Date.now()).sort((a, b) => a.startsAt - b.startsAt)[0];
    const b: CampaignBlock = { id: uid('b'), type };
    if (type === 'heading') b.text = '';
    if (type === 'text') b.text = '';
    if (type === 'button') { b.text = 'Open On The Lawn'; b.url = 'https://onthelawn.events'; }
    if (type === 'signoff') b.text = `See you on the lawn,\n${firstName(me.name)}`;
    if (type === 'event') b.eventId = nextEvent?.id;
    // New blocks go above the sign-off so it stays last.
    const last = c.blocks[c.blocks.length - 1];
    const blocks = last && last.type === 'signoff' && type !== 'signoff' ? [...c.blocks.slice(0, -1), b, last] : [...c.blocks, b];
    set({ blocks });
  };

  const sent = c.status === 'sent';
  const recipients = audienceFor(db, group.id, c.audience);
  const lists = db.contactLists.filter((l) => l.groupId === group.id);
  const subs = audienceFor(db, group.id, { all: true, listIds: [] }).length;
  const scheduledAt = fromZoned(day, time);
  const today = zoned(Date.now()).day;

  const problems: string[] = [];
  if (!c.subject.trim()) problems.push('Add a subject line.');
  if (!recipients.length) problems.push(c.audience.all ? 'Nobody is subscribed yet.' : 'Pick at least one list with subscribers in it.');
  if (!c.blocks.some((b) => (b.type === 'text' || b.type === 'heading') && b.text?.trim())) problems.push('Write something in the email.');
  if (c.blocks.some((b) => b.type === 'button' && !okUrl(b.url))) problems.push('Fix the button link.');
  if (c.blocks.some((b) => b.type === 'event' && !db.events.some((e) => e.id === b.eventId))) problems.push('Pick a lawn for the lawn card, or remove it.');
  const timeProblem = Number.isNaN(scheduledAt) ? 'Pick a date and time.' : scheduledAt < Date.now() + 5 * 60_000 ? 'Pick a time at least five minutes from now.' : '';

  const eventBlock = c.blocks.find((b) => b.type === 'event' && b.eventId);
  const ev = eventBlock ? db.events.find((e) => e.id === eventBlock.eventId) : undefined;
  const quick: { label: string; day: string; time: string }[] = [
    { label: 'Tomorrow, 9am', day: addDays(today, 1), time: '09:00' },
    { label: 'Saturday, 9am', day: addDays(today, ((6 - dow(today) + 7) % 7) || 7), time: '09:00' },
  ];
  if (ev) {
    const d = addDays(zoned(ev.startsAt).day, -3);
    if (fromZoned(d, '09:00') > Date.now() + 3600_000) quick.push({ label: `3 days before ${ev.title}`, day: d, time: '09:00' });
  }

  const doSchedule = () => {
    setTried(true);
    if (problems.length || timeProblem) return;
    schedule(c.id, scheduledAt);
  };
  const doSend = () => {
    setTried(true);
    if (problems.length) { setConfirmSend(false); return; }
    sendNow(c.id);
    setConfirmSend(false);
  };
  const copyHtml = async () => {
    if (await copyText(html)) toast({ text: 'Email HTML copied', tone: 'good' });
    else if (downloadText(`${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'campaign'}.html`, html, 'text/html')) toast({ text: 'Saved the HTML file', tone: 'good' });
    else toast({ text: 'Copying is blocked in this preview.', tone: 'error' });
  };
  const when = c.status === 'scheduled' && c.scheduledAt ? fmtTime(c.scheduledAt) : c.sentAt ? fmtDay(c.sentAt) : 'Now';

  // ----- preview column -----
  const preview = (
    <section className="card stack preview-pane" aria-label="Preview">
      <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Tabs label="Preview type" value={view} onChange={setView} items={[{ key: 'inbox', label: 'Inbox' }, { key: 'email', label: 'Email' }]} />
        <Tabs label="Screen size" value={device} onChange={setDevice} items={[{ key: 'desktop', label: 'Desktop' }, { key: 'phone', label: 'Phone' }]} />
      </div>
      <div className="preview-stage">
        {view === 'inbox' ? <InboxPreview c={c} device={device} when={when} /> : <MessagePreview c={c} group={group} html={html} device={device} toName={firstName(me.name)} />}
      </div>
      {view === 'inbox' && (
        <p className="small strong muted">
          {!c.preheader.trim() ? 'No preview text, so inboxes show the first line of the email instead. ' : ''}
          {c.subject.length > 45 ? `The subject is ${c.subject.length} characters. Phones cut it off around 40.` : 'Subject fits on a phone.'}
        </p>
      )}
    </section>
  );

  // ----- sent: read-only -----
  if (sent) {
    const s = c.stats ?? { recipients: 0, opens: 0, clicks: 0 };
    return (
      <>
        <div className="page-head">
          <div className="stack" style={{ gap: 6, minWidth: 0 }}>
            {back}
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <h1 className="display h2">{c.name}</h1>
              <span className="pill lawn">Sent {c.sentAt ? `${fmtDay(c.sentAt)}, ${fmtTime(c.sentAt)}` : ''}</span>
            </div>
          </div>
          <button className="btn sun" onClick={() => { const x = duplicate(c.id); if (x) nav(`/g/${group.slug}/admin/campaigns/${x.id}`); }}>Duplicate to edit</button>
        </div>
        <div className={split ? 'cols even' : 'stack-lg'}>
          <div className="col">
            <section className="card stack">
              <h2 className="display h4">How it did</h2>
              <div className="grid-3">
                <div className="stat"><b>{s.recipients}</b><span>Delivered</span></div>
                <div className="stat"><b>{pct(s.opens, s.recipients)}</b><span>{s.opens} opened</span></div>
                <div className="stat"><b>{pct(s.clicks, s.recipients)}</b><span>{s.clicks} clicked</span></div>
              </div>
              <p className="small strong muted">Demo numbers. Live, these come from the email service.</p>
            </section>
            <section className="card stack" style={{ gap: 8 }}>
              <h2 className="display h4">Envelope</h2>
              <p><span className="muted strong">Subject: </span>{c.subject}</p>
              <p><span className="muted strong">Preview text: </span>{c.preheader || 'None'}</p>
              <p><span className="muted strong">From: </span>{c.fromName}</p>
              <p className="small muted">Sent emails can't be edited. Duplicate it to send a new version.</p>
            </section>
          </div>
          {preview}
        </div>
      </>
    );
  }

  // ----- draft or scheduled -----
  const envelope = (
    <section className="card stack">
      <h2 className="display h4">Envelope</h2>
      <div className="field">
        <label htmlFor="cm-subject">Subject line</label>
        <input id="cm-subject" className="input" value={c.subject} maxLength={120} onChange={(e) => set({ subject: e.target.value })} placeholder="Picnic is on. Bring your portfolio." aria-invalid={tried && !c.subject.trim()} />
        <span className="hint">{c.subject.length}/120. Under 45 reads in full on a phone.</span>
      </div>
      <div className="field">
        <label htmlFor="cm-pre">Preview text</label>
        <input id="cm-pre" className="input" value={c.preheader} maxLength={140} onChange={(e) => set({ preheader: e.target.value })} placeholder="The line people see next to the subject" />
      </div>
      <div className="field">
        <label htmlFor="cm-from">From name</label>
        <input id="cm-from" className="input" value={c.fromName} maxLength={50} onChange={(e) => set({ fromName: e.target.value })} />
      </div>
      <div className="field">
        <span className="label">Accent</span>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Accent color">
          {COLOR_KEYS.map((k) => <button type="button" key={k} className="swatch" style={{ width: 40, height: 40, borderRadius: 12, background: C[k] }} aria-pressed={c.accent === k} aria-label={COLOR_NAMES[k]} onClick={() => set({ accent: k })} />)}
        </div>
      </div>
      <p className="small muted">Replies go to {group.replyTo}. Change that in Settings.</p>
    </section>
  );

  const audience = (
    <section className="card stack">
      <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h2 className="display h4">Who gets it</h2>
        <span className="pill sun" aria-live="polite">{recipients.length} {recipients.length === 1 ? 'person' : 'people'}</span>
      </div>
      <div className="row-wrap" role="radiogroup" aria-label="Audience">
        <button type="button" role="radio" aria-checked={c.audience.all} className="chip" aria-pressed={c.audience.all} onClick={() => set({ audience: { all: true, listIds: [] } })}>Everyone subscribed <span style={{ opacity: 0.7 }}>{subs}</span></button>
        <button type="button" role="radio" aria-checked={!c.audience.all} className="chip" aria-pressed={!c.audience.all} onClick={() => set({ audience: { all: false, listIds: c.audience.listIds.length ? c.audience.listIds : lists.slice(0, 1).map((l) => l.id) } })} disabled={!lists.length}>Pick lists</button>
      </div>
      {!c.audience.all && (
        <div className="row-wrap" role="group" aria-label="Lists">
          {lists.map((l) => {
            const on = c.audience.listIds.includes(l.id);
            const n = audienceFor(db, group.id, { all: false, listIds: [l.id] }).length;
            return (
              <button type="button" key={l.id} className="chip" aria-pressed={on} style={{ ['--chip-on' as string]: C[l.color], color: on ? onColor(l.color) : undefined }} onClick={() => set({ audience: { all: false, listIds: on ? c.audience.listIds.filter((x) => x !== l.id) : [...c.audience.listIds, l.id] } })}>
                <span className="dot" style={{ background: C[l.color] }} />{l.name} <span style={{ opacity: 0.75 }}>{n}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="small muted">Only subscribed contacts get it, and each email address gets one copy even if it sits on two lists. {lists.length ? '' : 'Make lists on the Email list tab.'}</p>
    </section>
  );

  const content = (
    <section className="card stack">
      <div className="row between">
        <h2 className="display h4">Email</h2>
        <span className="small muted">Saved {ago(c.updatedAt)}</span>
      </div>
      {c.blocks.map((b, i) => (
        <BlockCard key={b.id} b={b} db={db} groupId={group.id} index={i} count={c.blocks.length}
          onChange={(p) => setBlock(b.id, p)} onMove={(d) => move(i, d)} onRemove={() => set({ blocks: c.blocks.filter((x) => x.id !== b.id) })} />
      ))}
      {!c.blocks.length && <p className="panel strong muted">Empty email. Add a heading and some text to start.</p>}
      <div className="stack" style={{ gap: 6 }}>
        <span className="label">Add</span>
        <div className="row-wrap">
          {BLOCKS.map((b) => <button type="button" key={b.type} className="chip" title={b.hint} onClick={() => addBlock(b.type)}>+ {b.label}</button>)}
        </div>
      </div>
    </section>
  );

  const send = (
    <section className="card stack" id="send">
      <h2 className="display h4">{c.status === 'scheduled' ? 'Change the send' : 'Send it'}</h2>
      {tried && problems.length > 0 && (
        <div className="panel stack" role="alert" style={{ gap: 4, background: '#fff1ea', borderColor: C.tomato }}>
          <p className="strong">Before it can go out:</p>
          {problems.map((p) => <p key={p} className="small strong">{p}</p>)}
        </div>
      )}
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">Send a test</span>
        <form className="row" style={{ gap: 8, flexWrap: 'wrap' }} onSubmit={(e) => {
          e.preventDefault();
          if (!validEmail(testTo)) { toast({ text: 'That test address looks off.', tone: 'error' }); return; }
          toast({ text: `Test sent to ${testTo.trim()}. The demo doesn't deliver real mail.`, tone: 'info' });
        }}>
          <label htmlFor="cm-test" className="sr-only">Test address</label>
          <input id="cm-test" className="input grow" type="email" style={{ minHeight: 44, minWidth: 180 }} value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <button className="btn cream small" type="submit">Send test</button>
          <button className="btn cream small" type="button" onClick={copyHtml}>Copy HTML</button>
        </form>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">Schedule</span>
        <div className="row-wrap">
          {quick.map((q) => <button type="button" key={q.label} className="chip" aria-pressed={day === q.day && time === q.time} onClick={() => { setDay(q.day); setTime(q.time); }}>{q.label}</button>)}
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 150px' }}>
            <label htmlFor="cm-day">Day</label>
            <input id="cm-day" className="input" type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label htmlFor="cm-time">Time ({TZ_LABEL})</label>
            <input id="cm-time" className="input" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        {!timeProblem ? (
          <p className="small strong">Goes out {fmtLongDay(scheduledAt)} at {fmtTime(scheduledAt)} to {recipients.length} {recipients.length === 1 ? 'person' : 'people'}.</p>
        ) : <p className="small strong error">{timeProblem}</p>}
        <button className="btn sun block" onClick={doSchedule} disabled={!!timeProblem}>{c.status === 'scheduled' ? 'Update the time' : 'Schedule it'}</button>
      </div>
      <div className="stack" style={{ gap: 8, borderTop: `2px dashed color-mix(in srgb, ${C.pine} 20%, transparent)`, paddingTop: 12 }}>
        {confirmSend ? (
          <>
            <p className="strong">Send to {recipients.length} {recipients.length === 1 ? 'person' : 'people'} right now? Once it's out, it's out.</p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn sun grow" onClick={doSend}>Yes, send it</button>
              <button className="btn cream" onClick={() => setConfirmSend(false)}>Not yet</button>
            </div>
          </>
        ) : (
          <button className="btn cream block" onClick={() => { setTried(true); if (!problems.length) setConfirmSend(true); }}>Send now instead</button>
        )}
      </div>
    </section>
  );

  const head = (
    <div className="page-head">
      <div className="stack" style={{ gap: 6, minWidth: 0, flex: 1 }}>
        {back}
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="cm-name" className="sr-only">Campaign name</label>
          <input id="cm-name" className="input display" style={{ fontSize: 'var(--step-2)', minHeight: 0, padding: '4px 12px', maxWidth: 520, flex: '1 1 240px' }} value={c.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
          {c.status === 'scheduled' ? <span className="pill sun">Scheduled</span> : <span className="pill">Draft</span>}
        </div>
        <p className="small muted">Only your team sees the campaign name. Changes save as you type.</p>
      </div>
    </div>
  );

  const banner = c.status === 'scheduled' && c.scheduledAt ? (
    <div className="card row" style={{ gap: 10, flexWrap: 'wrap', background: C.sun }}>
      <p className="strong grow" style={{ minWidth: 220 }}>Goes out {fmtLongDay(c.scheduledAt)} at {fmtTime(c.scheduledAt)} {TZ_LABEL} to {recipients.length} {recipients.length === 1 ? 'person' : 'people'}. Edits save to it until then.</p>
      <button className="btn cream small" onClick={() => unschedule(c.id)}>Move back to drafts</button>
    </div>
  ) : null;

  if (!split) {
    return (
      <>
        {head}
        {banner}
        <Tabs label="Editor" value={pane} onChange={setPane} items={[{ key: 'write', label: 'Write' }, { key: 'preview', label: 'Preview' }]} />
        {pane === 'write' ? <>{envelope}{audience}{content}{send}</> : <>{preview}{send}</>}
      </>
    );
  }

  return (
    <>
      {head}
      {banner}
      <div className="cols even">
        <div className="col">{envelope}{audience}{content}{send}</div>
        <div className="rail">{preview}</div>
      </div>
    </>
  );
}
