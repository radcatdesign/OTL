import type { LawnEvent } from './types';
import { appUrl } from './util';

const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const details = (ev: LawnEvent) => `${ev.about}\n\nRSVP and chat: ${appUrl()}#/lawn/${ev.id}`.trim();
const where = (ev: LawnEvent) => [ev.venue, ev.address].filter(Boolean).join(', ');

export function googleCalendarUrl(ev: LawnEvent) {
  const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates: `${stamp(ev.startsAt)}/${stamp(ev.endsAt)}`, details: details(ev), location: where(ev) });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(ev: LawnEvent) {
  const p = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent', subject: ev.title,
    startdt: new Date(ev.startsAt).toISOString(), enddt: new Date(ev.endsAt).toISOString(),
    body: details(ev), location: where(ev),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${p.toString()}`;
}

const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function icsFile(ev: LawnEvent) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//On The Lawn//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}@onthelawn.events`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(ev.startsAt)}`,
    `DTEND:${stamp(ev.endsAt)}`,
    `SUMMARY:${icsEsc(ev.title)}`,
    `DESCRIPTION:${icsEsc(details(ev))}`,
    `LOCATION:${icsEsc(where(ev))}`,
    ...(ev.geo ? [`GEO:${ev.geo.lat};${ev.geo.lng}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
