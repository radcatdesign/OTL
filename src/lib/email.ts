import { C, onColor } from '../brand/palette';
import type { Campaign, CampaignBlock, Contact, DB, Group, Id } from './types';
import { fmtLongDay, fmtRange } from './util';

export const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
export const validEmail = (e: string) => EMAIL_RE.test(e.trim());

// Subscribed contacts a campaign will go to, deduped by email.
export function audienceFor(db: DB, groupId: Id, audience: Campaign['audience']): Contact[] {
  const seen = new Set<string>();
  return db.contacts.filter((c) => {
    if (c.groupId !== groupId || c.status !== 'subscribed') return false;
    if (!audience.all && !c.listIds.some((l) => audience.listIds.includes(l))) return false;
    if (seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });
}

export function audienceLabel(db: DB, audience: Campaign['audience']) {
  if (audience.all) return 'All subscribers';
  const names = audience.listIds.map((id) => db.contactLists.find((l) => l.id === id)?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'No list picked yet';
}

// ---------- CSV ----------

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === '\t' || ch === ';') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

// Works with a header row ("name,email") or without one.
export function rowsToContacts(rows: string[][]): { email: string; name: string }[] {
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.toLowerCase());
  let emailCol = head.findIndex((h) => h.includes('email') || h.includes('e-mail'));
  let nameCol = head.findIndex((h) => h === 'name' || h.includes('full name'));
  const first = head.findIndex((h) => h.includes('first'));
  const last = head.findIndex((h) => h.includes('last'));
  let body = rows;
  if (emailCol >= 0) body = rows.slice(1);
  else emailCol = rows[0].findIndex((c) => validEmail(c));
  if (emailCol < 0) return [];
  return body.map((r) => {
    let name = '';
    if (nameCol >= 0) name = r[nameCol] ?? '';
    else if (first >= 0) name = [r[first], last >= 0 ? r[last] : ''].filter(Boolean).join(' ');
    else name = r.find((c, i) => i !== emailCol && c && !validEmail(c)) ?? '';
    return { email: (r[emailCol] ?? '').toLowerCase(), name };
  });
}

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCSV(db: DB, contacts: Contact[]) {
  const head = ['email', 'name', 'status', 'lists', 'source', 'added'];
  const lines = contacts.map((c) => [
    c.email, c.name, c.status,
    c.listIds.map((id) => db.contactLists.find((l) => l.id === id)?.name ?? '').filter(Boolean).join('; '),
    c.source, new Date(c.createdAt).toISOString().slice(0, 10),
  ].map(esc).join(','));
  return [head.join(','), ...lines].join('\n');
}

// ---------- Email HTML ----------
// Table layout with inline styles so it renders the same in Gmail, Apple Mail and Outlook.

const h = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const para = (s: string) => h(s).split(/\n{2,}/).map((p) => p.replace(/\n/g, '<br>')).join('</p><p style="margin:0 0 14px">');

function blockHtml(b: CampaignBlock, db: DB, accent: string, accentFg: string, appUrl: string) {
  const pad = 'padding:0 32px 18px';
  switch (b.type) {
    case 'heading':
      return `<tr><td style="${pad}"><h1 style="margin:0;font-family:'Titan One',Arial Rounded MT Bold,Arial,sans-serif;font-weight:400;font-size:30px;line-height:1.1;color:${C.pine}">${h(b.text || '')}</h1></td></tr>`;
    case 'text':
      return `<tr><td style="${pad};font-size:16px;line-height:1.55;color:${C.pine}"><p style="margin:0 0 14px">${para(b.text || '')}</p></td></tr>`;
    case 'image':
      return b.src ? `<tr><td style="${pad}"><img src="${h(b.src)}" alt="${h(b.alt || '')}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:16px;border:3px solid ${C.pine}"></td></tr>` : '';
    case 'button':
      return `<tr><td style="${pad}"><a href="${h(b.url || appUrl)}" style="display:inline-block;background:${accent};color:${accentFg};font-weight:800;font-size:16px;text-decoration:none;padding:14px 24px;border:3px solid ${C.pine};border-radius:14px">${h(b.text || 'Open')}</a></td></tr>`;
    case 'divider':
      return `<tr><td style="${pad}"><div style="border-top:2px dashed ${C.pine};opacity:.3"></div></td></tr>`;
    case 'signoff':
      return `<tr><td style="${pad};font-size:16px;line-height:1.5;color:${C.pine};font-weight:700">${h(b.text || '').replace(/\n/g, '<br>')}</td></tr>`;
    case 'event': {
      const ev = db.events.find((e) => e.id === b.eventId);
      if (!ev) return '';
      const bg = C[ev.color];
      const fg = onColor(ev.color);
      return `<tr><td style="${pad}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:3px solid ${C.pine};border-radius:18px"><tr><td style="padding:20px 22px;color:${fg}">
<div style="font-size:13px;font-weight:800;letter-spacing:.02em;opacity:.9">${h(fmtLongDay(ev.startsAt))}, ${h(fmtRange(ev.startsAt, ev.endsAt))}</div>
<div style="font-family:'Titan One',Arial Rounded MT Bold,Arial,sans-serif;font-size:26px;line-height:1.1;margin:6px 0 6px">${h(ev.title)}</div>
<div style="font-size:14px;font-weight:700;margin-bottom:14px">${h(ev.venue)}</div>
<a href="${h(appUrl)}#/lawn/${h(ev.id)}" style="display:inline-block;background:${C.cream};color:${C.pine};font-weight:800;font-size:15px;text-decoration:none;padding:10px 18px;border:3px solid ${C.pine};border-radius:12px">RSVP on On The Lawn</a>
</td></tr></table></td></tr>`;
    }
  }
}

// Clients that allow web fonts (Apple Mail, iOS Mail) get the brand type. Others fall back to rounded system fonts.
const FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Titan+One&display=swap">';

export function renderEmailHtml(campaign: Campaign, group: Group, db: DB, appUrl = 'https://onthelawn.events/app/', recipientName = 'there') {
  const accent = C[campaign.accent];
  const accentFg = onColor(campaign.accent);
  const blocks = campaign.blocks.map((b) => blockHtml(b, db, accent, accentFg, appUrl)).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${FONT_LINK}<title>${h(campaign.subject)}</title></head>
<body style="margin:0;padding:0;background:#EEF3DC">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${h(campaign.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF3DC;font-family:'Baloo 2','Trebuchet MS',Arial,sans-serif"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.cream};border:3px solid ${C.pine};border-radius:24px;overflow:hidden">
<tr><td style="background:${accent};border-bottom:3px solid ${C.pine};padding:18px 32px;color:${accentFg};font-family:'Titan One',Arial Rounded MT Bold,Arial,sans-serif;font-size:20px">${h(group.name)}</td></tr>
<tr><td style="height:26px"></td></tr>
<tr><td style="padding:0 32px 10px;font-size:15px;color:${C.pine};font-weight:700">Hi ${h(recipientName)},</td></tr>
${blocks}
<tr><td style="padding:10px 32px 26px;font-size:12px;line-height:1.5;color:#4a7a4c">You're getting this because you joined ${h(group.name)} on On The Lawn.<br>Replies go to ${h(group.replyTo)}.<br><a href="${h(appUrl)}" style="color:#4a7a4c">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
}

// Body only, for showing inside the app.
export function emailBody(html: string) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
}

export function campaignStats(id: string, recipients: number) {
  // Stable demo numbers per campaign.
  let x = 0;
  for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  const openRate = 0.52 + ((x % 17) / 100);
  const clickRate = 0.14 + ((x % 9) / 100);
  return { recipients, opens: Math.round(recipients * openRate), clicks: Math.round(recipients * clickRate) };
}

export function newBlocks(group: Group, eventId?: Id): CampaignBlock[] {
  const id = () => Math.random().toString(36).slice(2, 9);
  return [
    { id: id(), type: 'heading', text: 'News from the lawn' },
    { id: id(), type: 'text', text: `A quick note from ${group.name}. Write what's happening, who it's for, and what you want people to do.` },
    ...(eventId ? [{ id: id(), type: 'event' as const, eventId }] : [{ id: id(), type: 'button' as const, text: 'Open On The Lawn', url: 'https://onthelawn.events' }]),
    { id: id(), type: 'signoff', text: `See you on the lawn,\n${group.name}` },
  ];
}
