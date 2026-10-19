import type { Stage } from '../brand/Plant';
import type { DB, LawnEvent, Seed } from './types';

export function stageOf(seed: Seed, waterCount: number): Stage {
  if (seed.bloomedAt) return 'bloom';
  if (waterCount >= 2) return 'bud';
  if (waterCount >= 1) return 'sprout';
  return 'seed';
}

export const wateringsFor = (db: DB, seedId: string) =>
  db.waterings.filter((w) => w.seedId === seedId).sort((a, b) => a.createdAt - b.createdAt);

const TZ = 'America/Los_Angeles';

export function fmtDay(t: number) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ }).format(t);
}
export function fmtLongDay(t: number) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ }).format(t);
}
export function fmtTime(t: number) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(t).replace(':00', '').replace(' ', '').toLowerCase();
}
export function fmtRange(a: number, b: number) {
  return `${fmtTime(a)} to ${fmtTime(b)}`;
}
export function dateParts(t: number) {
  const d = new Date(t);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: TZ }).format(d);
  return { day: fmt({ day: 'numeric' }), month: fmt({ month: 'short' }), weekday: fmt({ weekday: 'short' }) };
}

export function ago(t: number, now = Date.now()) {
  const s = Math.round((now - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDay(t);
}

export function whenLabel(ev: LawnEvent, now = Date.now()) {
  if (now < ev.startsAt) {
    const days = Math.ceil((ev.startsAt - now) / 86_400_000);
    return days <= 1 ? 'Tomorrow' : `In ${days} days`;
  }
  if (now <= ev.endsAt) return 'Happening now';
  return 'Past lawn';
}

export const isPast = (ev: LawnEvent, now = Date.now()) => now > ev.endsAt;

function gcalStamp(t: number) {
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function googleCalendarUrl(ev: LawnEvent) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${gcalStamp(ev.startsAt)}/${gcalStamp(ev.endsAt)}`,
    details: `${ev.about}\n\nOn The Lawn: onthelawn.events`,
    location: `${ev.venue}, ${ev.address}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function mapsUrl(ev: LawnEvent) {
  return `https://maps.google.com/?q=${encodeURIComponent(`${ev.venue}, ${ev.address}`)}`;
}

export function firstName(name: string) {
  return name.split(' ')[0];
}

// Local input value for <input type="datetime-local">
export function toLocalInput(t: number) {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function copyText(text: string): Promise<boolean> {
  try {
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

export const appUrl = () => {
  try {
    const { origin, pathname } = window.location;
    if (origin.startsWith('http')) return `${origin}${pathname}`;
  } catch { /* noop */ }
  return 'https://onthelawn.events/app/';
};
