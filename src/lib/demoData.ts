// Demo community for local mode. Everyone here is fictional. The venue and the
// On The Lawn 2026 date (Oct 9, 2026 at Crux Fermentation Project) are real.
import { otisMarkup, type OtisLook } from '../brand/otis/Otis';
import { C, COLOR_KEYS, type ColorKey } from '../brand/palette';
import type { GuideIntent, Role } from './intents';
import { ROLE_LOOKS } from './presets';
import { fromZoned, zoned } from './util';
import type {
  Activity, Campaign, ChatMessage, Contact, ContactList, DB, EventPhoto, Group, GroupBan, GroupInvite,
  GroupMember, GroupRole, LawnEvent, Membership, Seed, User, Watering,
} from './types';

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function lawnSpot(i: number, n: number) {
  // Spread Otises across the lawn in loose rows, with a little wobble.
  const cols = Math.max(3, Math.ceil(Math.sqrt(n * 1.6)));
  const row = Math.floor(i / cols);
  const col = i % cols;
  const rows = Math.ceil(n / cols);
  const jx = (((i * 37) % 11) - 5) / 100;
  const jy = (((i * 53) % 9) - 4) / 100;
  const offset = row % 2 ? 0.5 / cols : 0;
  return {
    x: Math.min(0.92, Math.max(0.08, (col + 0.5) / cols + offset + jx)),
    y: Math.min(0.9, Math.max(0.12, (row + 0.5) / Math.max(rows, 1) + jy)),
  };
}

const pt = (iso: string) => new Date(iso).getTime();

// A wall-clock time in Bend on the day that contains t.
function bendAt(t: number, hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return fromZoned(zoned(t).day, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

// A "photo booth" snapshot drawn from Otis line art, used as seeded event photos.
export function photoBooth(looks: OtisLook[], bg: ColorKey, stamp: string, uid: string) {
  const n = looks.length;
  const w = 600;
  const slot = w / (n + 0.6);
  const figs = looks
    .map((l, i) => {
      const fw = Math.min(190, slot * 1.05);
      const x = slot * (i + 0.8) - fw / 2;
      const y = 600 - fw * 1.78 - 26 + (i % 2) * 14;
      return `<svg x="${x}" y="${y}" width="${fw}" height="${fw * 1.77}" viewBox="-6 -2 241 409" overflow="visible">${otisMarkup(l, `${uid}${i}`)}</svg>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<rect width="600" height="600" fill="${C[bg]}"/>
<circle cx="480" cy="110" r="60" fill="${C.cream}" opacity="0.35"/>
<path d="M0 470 C 150 440 450 440 600 468 V600 H0Z" fill="${C.lawn}" stroke="${C.pine}" stroke-width="5"/>
${figs}
<g transform="translate(28 30) rotate(-6)"><rect width="${stamp.length * 15 + 36}" height="48" rx="12" fill="${C.cream}" stroke="${C.pine}" stroke-width="4"/>
<text x="18" y="32" font-family="Titan One, Arial Rounded MT Bold, sans-serif" font-size="22" fill="${C.pine}">${stamp}</text></g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const EXTRA_PEOPLE: [string, Role][] = [
  ['Ava Lindqvist', 'Creator'], ['Ben Okoro', 'Strategist'], ['Cleo Park', 'Marketer'], ['Dev Shah', 'Analyst'],
  ['Eli Navarro', 'Founder'], ['Fern Gallagher', 'Creator'], ['Gus Moreno', 'Student'], ['Hana Sato', 'Creator'],
  ['Ivy Chen', 'Marketer'], ['Jules Bart', 'Strategist'], ['Kai Holm', 'Creator'], ['Lou Daniels', 'Founder'],
  ['Mina Farah', 'Student'], ['Nico Vale', 'Creator'], ['Ola Brandt', 'Analyst'], ['Pia Russo', 'Creator'],
  ['Quinn Abbott', 'Marketer'], ['Remy Cole', 'Investor'], ['Sol Ibarra', 'Creator'], ['Tess Whalen', 'Student'],
  ['Uma Patel', 'Strategist'], ['Vic Durant', 'Founder'], ['Wren Kelly', 'Creator'], ['Xavi Ruiz', 'Marketer'],
  ['Yara Haddad', 'Creator'], ['Zane Porter', 'Analyst'], ['Bea Lowry', 'Mentor'], ['Cal Mercer', 'Creator'],
];

const IMPORTED: [string, string][] = [
  ['Alex Morgan', 'alex.morgan'], ['Brooke Tan', 'brooke'], ['Carlos Diaz', 'carlos.d'], ['Dana Whitfield', 'dana.w'],
  ['Elena Petrova', 'elena.p'], ['Finn O\'Rourke', 'finn'], ['Grace Liu', 'grace.liu'], ['Hector Ruiz', 'hector'],
  ['Isla Bennett', 'isla.b'], ['Jamal Greene', 'jamal'], ['Kira Novak', 'kira.n'], ['Leo Brandt', 'leo.b'],
  ['Maeve Doyle', 'maeve'], ['Noah Kim', 'noah.k'], ['Opal Reyes', 'opal'], ['Parker Hale', 'parker.h'],
  ['Rina Sato', 'rina'], ['Silas Moore', 'silas.m'], ['Talia Cruz', 'talia'], ['Vera Lund', 'vera.l'],
  ['Will Ashby', 'will.a'], ['Zoe Marsh', 'zoe.m'], ['Nora Quinn', 'nora.q'], ['Owen Price', 'owen.p'],
];

export function buildDemoDB(now = Date.now()): DB {
  const t0 = pt('2025-05-10T10:00:00-07:00');
  const u = (id: string, name: string, role: User['role'], bio: string, look: Partial<OtisLook> = {}, intents: GuideIntent[] = []): User => ({
    id, name, email: `${id}@example.com`, role, bio, intents,
    otis: { ...ROLE_LOOKS[role], ...look }, createdAt: t0, demo: true,
  });

  const core: User[] = [
    u('otl', 'OTL Team', 'Founder', 'RADCAT Design + Three Pines. We put the chairs out.', { hat: 'checker', band: true, tool: 'wildflower', card: 'lawn' }, ['encourage', 'idea']),
    u('maya', 'Maya Okafor', 'Creator', 'Illustrator. Maps, labels, and the occasional mural.', { companion: 'butterfly' }, ['learn', 'idea']),
    u('jonah', 'Jonah Reyes', 'Strategist', 'Brand strategy for outdoor and beverage brands.', {}, ['feedback', 'encourage']),
    u('priya', 'Priya Lund', 'Creator', 'Motion designer. Makes logos wiggle for a living.', { hat: 'plaid', overalls: 'sky', card: 'sky' }, ['feedback', 'learn']),
    u('theo', 'Theo Marsh', 'Founder', 'Building a trail-gear company out of a garage on the west side.', {}, ['idea', 'launch']),
    u('sam', 'Sam Whitaker', 'Creator', 'Photographer. Shoots makers, mostly before sunrise.', { hat: 'sun', overalls: 'forest', tool: 'wildflower', card: 'tangerine' }, ['learn']),
    u('lena', 'Lena Ortiz', 'Marketer', 'Runs marketing for a Bend outfitter. Newsletter nerd.', {}, ['launch', 'feedback']),
    u('ari', 'Ari Becker', 'Analyst', 'Turns spreadsheets into stories.', {}, ['feedback']),
    u('rosa', 'Rosa Kim', 'Student', 'Graphic design at OSU-Cascades. Looking for my people.', {}, ['learn', 'feedback']),
    u('wes', 'Wes Calder', 'Investor', 'Backs early consumer brands in Central Oregon.', {}, ['mentor', 'encourage']),
    u('june', 'June Harlow', 'Creator', 'Ceramicist. Opening a little shop in November.', { hat: 'xtreme', overalls: 'tomato', tool: 'marigold', card: 'sun' }, ['launch']),
    u('marco', 'Marco Bell', 'Mentor', 'Thirty years as a creative director. Now I garden.', { companion: 'bird' }, ['mentor', 'encourage']),
  ];
  const hats = [...COLOR_KEYS, 'checker', 'plaid'] as const;
  const extras: User[] = EXTRA_PEOPLE.map(([name, role], i) => {
    const id = name.split(' ')[0].toLowerCase();
    return u(id, name, role, '', {
      hat: hats[(i * 5) % hats.length],
      overalls: COLOR_KEYS[(i * 3 + 1) % COLOR_KEYS.length],
      card: COLOR_KEYS[(i * 7 + 2) % COLOR_KEYS.length],
    }, [(['learn', 'idea', 'feedback', 'launch', 'encourage', 'mentor'] as const)[i % 6]]);
  });
  const users = [...core, ...extras];

  // ---------- Groups ----------
  const otlGroup: Group = {
    id: 'otl', slug: 'on-the-lawn', name: 'On The Lawn', tagline: 'Creative fresh air for Bend',
    about: 'Bend creatives, learners, and businesses growing together. We gather on lawns, run small group conversations, and help each other make things.',
    color: 'lawn', city: 'Bend, OR', createdAt: t0, replyTo: 'hello@onthelawn.events',
  };
  const typeClub: Group = {
    id: 'type-club', slug: 'bend-type-club', name: 'Bend Type Club', tagline: 'Letters, brushes, and tea',
    about: 'A small, slow club for people who love letterforms. Monthly practice nights, all levels.',
    color: 'tangerine', city: 'Bend, OR', createdAt: pt('2026-03-02T10:00:00-08:00'), replyTo: 'jonah@example.com',
  };

  const roles: Record<string, GroupRole> = { otl: 'host', jonah: 'cohost', maya: 'moderator', marco: 'moderator' };
  const groupMembers: GroupMember[] = [];
  let gmid = 0;
  // OTL membership grew slowly, then jumped around the 2026 event.
  const joinSchedule = [
    '2025-05-12', '2025-05-12', '2025-05-20', '2025-06-03', '2025-06-28', '2025-07-15', '2025-08-09', '2025-09-12',
    '2025-09-13', '2025-09-14', '2025-10-02', '2025-11-18', '2026-01-09', '2026-02-21', '2026-03-14', '2026-04-11',
    '2026-04-12', '2026-05-30', '2026-06-22', '2026-07-19', '2026-08-15', '2026-08-16', '2026-09-08', '2026-09-15',
    '2026-09-22', '2026-09-29', '2026-10-01', '2026-10-03', '2026-10-05', '2026-10-07', '2026-10-08', '2026-10-09',
    '2026-10-09', '2026-10-10', '2026-10-14', '2026-10-17', '2026-10-19', '2026-10-21', '2026-10-21', '2026-10-22',
  ];
  const otlOrder = ['otl', 'jonah', 'maya', 'marco', ...users.map((x) => x.id).filter((id) => !['otl', 'jonah', 'maya', 'marco'].includes(id))];
  otlOrder.forEach((userId, i) => {
    groupMembers.push({ id: `gm${++gmid}`, groupId: 'otl', userId, role: roles[userId] ?? 'member', joinedAt: pt(`${joinSchedule[i % joinSchedule.length]}T12:00:00-07:00`) });
  });
  const tcRoles: Record<string, GroupRole> = { jonah: 'host', priya: 'moderator' };
  ['jonah', 'priya', 'marco', 'rosa', 'lena', 'hana', 'kai', 'tess'].forEach((userId, i) => {
    groupMembers.push({ id: `gm${++gmid}`, groupId: 'type-club', userId, role: tcRoles[userId] ?? 'member', joinedAt: typeClub.createdAt + i * 9 * DAY });
  });

  // ---------- Lawns ----------
  const ev = (e: Partial<LawnEvent> & Pick<LawnEvent, 'id' | 'groupId' | 'title' | 'startsAt' | 'endsAt' | 'hostId'>): LawnEvent => ({
    code: e.id.slice(0, 6).toUpperCase().replace(/[^A-Z]/g, 'X'), gate: 'LAWN', about: '', cohostIds: [], venue: '', address: '',
    cover: { kind: 'art', art: 'lawn' }, color: 'lawn', visibility: 'public', chat: true, photos: true,
    contribution: { mode: 'free', amount: 0 }, createdAt: e.startsAt - 30 * DAY, ...e,
  });

  const events: LawnEvent[] = [
    ev({
      id: 'spring-popup', groupId: 'otl', title: 'Spring pop-up at the mill', hostId: 'otl', cohostIds: ['jonah'],
      startsAt: pt('2026-04-18T13:00:00-07:00'), endsAt: pt('2026-04-18T16:00:00-07:00'),
      venue: 'Old Mill District lawn', address: 'Old Mill District, Bend, OR 97702', geo: { lat: 44.0466, lng: -121.3156 },
      about: 'A short afternoon pop-up: lightning talks, a portfolio swap table, and a lot of sunscreen.',
      cover: { kind: 'art', art: 'checker' }, color: 'sun', code: 'SPRING', gate: 'MOSS',
    }),
    ev({
      id: 'sketch-walk', groupId: 'otl', title: 'Summer sketch walk', hostId: 'maya', cohostIds: ['maya'],
      startsAt: pt('2026-08-15T09:00:00-07:00'), endsAt: pt('2026-08-15T11:30:00-07:00'),
      venue: 'Drake Park', address: '777 NW Riverside Blvd, Bend, OR 97703', geo: { lat: 44.0587, lng: -121.3176 },
      about: 'We walk the river trail, stop every twenty minutes, and draw what is in front of us. Coffee after.',
      cover: { kind: 'art', art: 'sky' }, color: 'sky', code: 'SKETCH', gate: 'FERN',
    }),
    ev({
      id: 'otl-2026', groupId: 'otl', code: 'LAWN26', gate: 'LAWN', title: 'On The Lawn 2026', hostId: 'otl', cohostIds: ['jonah'],
      about: 'Our annual afternoon for Bend creatives and business leaders. Keynote chats, small group conversations led by volunteer facilitators, then drinks and a social hour. Bring a lawn chair and a friend.',
      startsAt: pt('2026-10-09T15:00:00-07:00'), endsAt: pt('2026-10-09T21:00:00-07:00'),
      venue: 'Crux Fermentation Project', address: '50 SW Division St, Bend, OR 97702', geo: { lat: 44.0498, lng: -121.3195 },
      cover: { kind: 'art', art: 'lawn' }, color: 'lawn', capacity: 250, createdAt: pt('2026-08-01T10:00:00-07:00'),
    }),
    ev({
      id: 'portfolio-picnic', groupId: 'otl', code: 'PICNIC', gate: 'SKETCH', title: 'Portfolio picnic', hostId: 'maya', cohostIds: ['maya'],
      about: 'Bring a printed piece or a laptop. We trade portfolios in groups of four and give each other one thing to keep and one thing to try. Blankets provided.',
      startsAt: bendAt(now + 9 * DAY, 16), endsAt: bendAt(now + 9 * DAY, 19),
      venue: 'Drake Park, by the footbridge', address: '777 NW Riverside Blvd, Bend, OR 97703', geo: { lat: 44.0581, lng: -121.3203 },
      cover: { kind: 'art', art: 'picnic' }, color: 'sky', capacity: 40, contribution: { mode: 'donate', amount: 25 }, createdAt: now - 3 * DAY,
    }),
    ev({
      id: 'holiday-market', groupId: 'otl', code: 'MARKET', gate: 'ACORN', title: 'Makers holiday market', hostId: 'otl', cohostIds: ['jonah', 'june'],
      about: 'Twenty Bend makers, one warm room, hot cider. Tables are free for OTL members. Apply in the garden.',
      startsAt: bendAt(now + 44 * DAY, 11), endsAt: bendAt(now + 44 * DAY, 17),
      venue: 'Crux Fermentation Project', address: '50 SW Division St, Bend, OR 97702', geo: { lat: 44.0498, lng: -121.3195 },
      cover: { kind: 'art', art: 'garden' }, color: 'tomato', capacity: 300, createdAt: now - 2 * DAY,
    }),
    ev({
      id: 'type-and-tea', groupId: 'type-club', code: 'SERIF1', gate: 'KERN', title: 'Type and tea', hostId: 'jonah', cohostIds: ['priya'],
      about: 'A slow evening of lettering practice. Brushes and paper on us. All levels, students free as always.',
      startsAt: bendAt(now + 23 * DAY, 18), endsAt: bendAt(now + 23 * DAY, 20.5),
      venue: 'The Juniper Room', address: 'Old Mill District, Bend, OR 97702', geo: { lat: 44.0459, lng: -121.3138 },
      cover: { kind: 'art', art: 'plaid' }, color: 'tangerine', capacity: 18, contribution: { mode: 'donate', amount: 10 }, createdAt: now - DAY,
    }),
  ];

  // ---------- Attendance ----------
  const memberships: Membership[] = [];
  let mid = 0;
  const add = (eventId: string, ids: string[], status: Membership['status'], at: number) =>
    ids.forEach((userId, i) => memberships.push({
      id: `m${++mid}`, eventId, userId, status, spot: lawnSpot(i, ids.length), createdAt: at,
      checkedInAt: status === 'here' ? at : undefined,
    }));
  const extraIds = extras.map((x) => x.id);
  const flagship = events.find((e) => e.id === 'otl-2026')!;
  add('spring-popup', ['otl', 'jonah', 'maya', 'theo', 'sam', 'lena', ...extraIds.slice(0, 6)], 'here', pt('2026-04-18T13:30:00-07:00'));
  add('spring-popup', extraIds.slice(6, 10), 'going', pt('2026-04-10T13:30:00-07:00'));
  add('sketch-walk', ['maya', 'rosa', 'priya', 'sam', 'june', ...extraIds.slice(3, 9)], 'here', pt('2026-08-15T09:10:00-07:00'));
  add('sketch-walk', extraIds.slice(10, 13), 'going', pt('2026-08-10T09:10:00-07:00'));
  add('otl-2026', [...core.map((x) => x.id), ...extraIds.slice(0, 18)], 'here', flagship.startsAt + HOUR);
  add('otl-2026', extraIds.slice(18, 24), 'going', flagship.startsAt - 5 * DAY);
  add('portfolio-picnic', ['maya', 'rosa', 'priya', 'sam', 'jonah', 'june', 'hana', 'kai'], 'going', now - 2 * DAY);
  add('holiday-market', ['otl', 'june', 'theo', 'lena', 'ava', 'fern', 'pia'], 'going', now - DAY);
  add('type-and-tea', ['jonah', 'marco', 'rosa', 'lena', 'tess'], 'going', now - DAY);

  // ---------- Gardens ----------
  const at = (h: number) => flagship.startsAt + h * HOUR;
  const seeds: Seed[] = [
    { id: 's1', eventId: 'otl-2026', userId: 'june', intent: 'launch', title: 'My ceramics shop opens November 1', details: 'Small batch mugs and planters, first weekend sale. Would love help getting the word out to Bend folks who care about handmade.', link: '', createdAt: at(1.2), partners: [] },
    { id: 's2', eventId: 'otl-2026', userId: 'rosa', intent: 'mentor', title: 'A mentor in brand design', details: 'Junior at OSU-Cascades. I want to understand how studios actually run projects and what to put in my portfolio.', createdAt: at(1.4), bloomedAt: at(2.6), partners: ['marco'] },
    { id: 's3', eventId: 'otl-2026', userId: 'jonah', intent: 'feedback', title: 'Fresh eyes on a brewery rebrand', details: 'Three directions, client meeting in two weeks. Looking for honest gut reactions, not polish.', createdAt: at(1.6), partners: [] },
    { id: 's4', eventId: 'otl-2026', userId: 'theo', intent: 'collab', title: 'Illustrator for trail map packaging', details: 'Our first product needs a box with a hand-drawn map of the Deschutes. Paid project.', createdAt: at(1.7), bloomedAt: at(3.1), partners: ['maya'] },
    { id: 's5', eventId: 'otl-2026', userId: 'priya', intent: 'advice', title: 'How do you price a motion retainer?', details: 'Two clients want monthly work. I have no idea if hourly, per-asset, or flat is the move.', createdAt: at(2.0), partners: [] },
    { id: 's6', eventId: 'otl-2026', userId: 'marco', intent: 'mentee', title: 'I can mentor two early-career designers', details: 'Monthly walks, portfolio reviews, and pep talks. Bring your questions.', createdAt: at(2.2), partners: [] },
    { id: 's7', eventId: 'otl-2026', userId: 'sam', intent: 'collab', title: 'Writer for a Central Oregon makers zine', details: 'I have the photos. Need someone who can interview and write short profiles.', createdAt: at(2.9), partners: [] },
    { id: 's8', eventId: 'otl-2026', userId: 'lena', intent: 'feedback', title: 'Gut-check my newsletter relaunch', details: 'New format, new cadence. Ten minutes of your time and a red pen.', createdAt: at(3.3), partners: [] },
    { id: 's9', eventId: 'otl-2026', userId: 'ari', intent: 'advice', title: 'Showing data work in a portfolio', details: 'Most of my best work is dashboards behind logins. How do you show that without breaking NDAs?', createdAt: at(3.6), partners: [] },
    { id: 's10', eventId: 'spring-popup', userId: 'theo', intent: 'feedback', title: 'Logo sketches for a trail-gear brand', details: 'Five rough marks. Which one feels like Bend?', createdAt: pt('2026-04-18T14:00:00-07:00'), bloomedAt: pt('2026-04-18T15:10:00-07:00'), partners: ['jonah'] },
    { id: 's11', eventId: 'sketch-walk', userId: 'rosa', intent: 'advice', title: 'Best sketchbook for gouache?', details: 'Mine buckles every time.', createdAt: pt('2026-08-15T10:00:00-07:00'), bloomedAt: pt('2026-08-15T11:00:00-07:00'), partners: ['maya'] },
  ];

  let wid = 0;
  const w = (seedId: string, userId: string, message: string, h: number): Watering => ({ id: `w${++wid}`, seedId, userId, message, createdAt: at(h) });
  const waterings: Watering[] = [
    w('s1', 'lena', "I'll put it in our November newsletter. 6k locals.", 1.8),
    w('s1', 'maya', 'Want a little illustrated flyer? Happy to make one.', 2.4),
    w('s2', 'marco', "I'd love to. Monthly walk along the river, starting next week?", 2.1),
    w('s2', 'jonah', 'Also happy to show you how we run a kickoff.', 2.3),
    w('s3', 'ari', 'Send the deck. I will give you my first-five-seconds read on each.', 2.5),
    w('s4', 'maya', 'Maps are my favorite thing to draw. Coffee Monday?', 2.0),
    w('s5', 'jonah', 'Flat monthly with a capped number of requests. Saved my sanity.', 2.6),
    w('s5', 'marco', 'Price the outcome, not the hours. Happy to walk through it.', 3.0),
    w('s6', 'sam', "Not early-career, but I'd still take a walk.", 3.2),
    w('s9', 'priya', 'Recreate one with fake data and narrate the decisions. Works every time.', 3.9),
    { id: `w${++wid}`, seedId: 's10', userId: 'jonah', message: 'Number three. Not close.', createdAt: pt('2026-04-18T14:40:00-07:00') },
    { id: `w${++wid}`, seedId: 's11', userId: 'maya', message: 'Stillman & Birn Beta. Thank me later.', createdAt: pt('2026-08-15T10:30:00-07:00') },
  ];

  const activity: Activity[] = [];
  let aid = 0;
  const act = (a: Omit<Activity, 'id'>) => activity.push({ id: `a${++aid}`, ...a });
  seeds.forEach((s) => act({ eventId: s.eventId, userId: s.userId, kind: 'planted', seedId: s.id, createdAt: s.createdAt }));
  waterings.forEach((x) => {
    const s = seeds.find((y) => y.id === x.seedId)!;
    act({ eventId: s.eventId, userId: x.userId, kind: 'watered', seedId: x.seedId, otherUserId: s.userId, createdAt: x.createdAt });
  });
  seeds.filter((s) => s.bloomedAt).forEach((s) => act({ eventId: s.eventId, userId: s.userId, kind: 'bloomed', seedId: s.id, otherUserId: s.partners[0], createdAt: s.bloomedAt! }));
  events.forEach((e) => act({ eventId: e.id, userId: e.hostId, kind: 'hosted', createdAt: e.createdAt }));

  // ---------- Chat ----------
  let cid = 0;
  const msg = (eventId: string, userId: string, text: string, t: number, replyTo?: string): ChatMessage => ({ id: `c${++cid}`, eventId, userId, text, createdAt: t, replyTo });
  const messages: ChatMessage[] = [
    msg('otl-2026', 'otl', 'Gates open at 3. Lawn chairs welcome, shade is limited.', flagship.startsAt - 2 * DAY),
    msg('otl-2026', 'ava', 'Is there bike parking?', flagship.startsAt - 26 * HOUR),
    msg('otl-2026', 'maya', 'Yes, racks along Division. We will have a bike valet too.', flagship.startsAt - 25 * HOUR, 'c2'),
    msg('otl-2026', 'theo', 'Thanks for a great afternoon, everyone. My cheeks hurt from smiling.', flagship.endsAt + 3 * HOUR),
    msg('otl-2026', 'june', 'Who was the facilitator at the purple table? I owe you a mug.', flagship.endsAt + 20 * HOUR),
    msg('portfolio-picnic', 'maya', 'Bring something printed if you can. Paper starts better conversations than screens.', now - 2 * DAY),
    msg('portfolio-picnic', 'hana', 'Is there parking near the footbridge?', now - 20 * HOUR),
    msg('portfolio-picnic', 'kai', 'Can I bring a friend who is not on the app yet?', now - 6 * HOUR),
    msg('holiday-market', 'fern', 'How do I apply for a table?', now - 9 * HOUR),
    msg('type-and-tea', 'tess', 'Do I need my own brushes?', now - 15 * HOUR),
  ];

  // ---------- Photos ----------
  const L = (id: string) => users.find((x) => x.id === id)!.otis;
  let pid = 0;
  const photo = (eventId: string, userId: string, looks: OtisLook[], bg: ColorKey, stamp: string, caption: string, t: number, likes: string[]): EventPhoto => ({
    id: `p${++pid}`, eventId, userId, src: photoBooth(looks, bg, stamp, `pb${pid}`), caption, createdAt: t, likes,
  });
  const photos: EventPhoto[] = [
    photo('otl-2026', 'sam', [L('maya'), L('theo')], 'sky', 'OTL 2026', 'Maya and Theo shaking on the map project', at(3.2), ['maya', 'theo', 'jonah', 'june']),
    photo('otl-2026', 'sam', [L('rosa'), L('marco')], 'sun', 'OTL 2026', 'Mentor match, made on the lawn', at(2.8), ['rosa', 'marco', 'otl']),
    photo('otl-2026', 'lena', [L('june'), L('lena'), L('priya')], 'tomato', 'OTL 2026', 'Purple table crew', at(4.1), ['june', 'priya']),
    photo('otl-2026', 'jonah', [L('otl'), L('jonah')], 'tangerine', 'OTL 2026', 'Hosts, tired and happy', at(5.6), ['otl', 'maya', 'sam', 'ari', 'wes']),
    photo('sketch-walk', 'maya', [L('rosa'), L('priya'), L('sam'), L('june')], 'sky', 'SKETCH WALK', 'River trail, stop four', pt('2026-08-15T10:20:00-07:00'), ['rosa']),
  ];

  // ---------- Email list ----------
  const contactLists: ContactList[] = [
    { id: 'l-2026', groupId: 'otl', name: '2026 attendees', color: 'lawn', createdAt: pt('2026-10-10T10:00:00-07:00') },
    { id: 'l-vol', groupId: 'otl', name: 'Volunteers', color: 'sun', createdAt: pt('2026-08-20T10:00:00-07:00') },
    { id: 'l-spon', groupId: 'otl', name: 'Sponsors', color: 'sky', createdAt: pt('2026-07-01T10:00:00-07:00') },
    { id: 'l-stu', groupId: 'otl', name: 'Students', color: 'tangerine', createdAt: pt('2026-09-01T10:00:00-07:00') },
    { id: 'l-tc', groupId: 'type-club', name: 'Regulars', color: 'tangerine', createdAt: typeClub.createdAt },
  ];
  const attended2026 = new Set(memberships.filter((m) => m.eventId === 'otl-2026').map((m) => m.userId));
  const contacts: Contact[] = [];
  let ctid = 0;
  groupMembers.forEach((m) => {
    const usr = users.find((x) => x.id === m.userId)!;
    const lists: string[] = [];
    if (m.groupId === 'otl') {
      if (attended2026.has(usr.id)) lists.push('l-2026');
      if (['maya', 'marco', 'sam', 'lena', 'ava', 'cleo'].includes(usr.id)) lists.push('l-vol');
      if (usr.role === 'Student') lists.push('l-stu');
      if (['wes', 'remy'].includes(usr.id)) lists.push('l-spon');
    } else lists.push('l-tc');
    contacts.push({
      id: `ct${++ctid}`, groupId: m.groupId, email: usr.email, name: usr.name, listIds: lists,
      status: usr.id === 'zane' ? 'unsubscribed' : 'subscribed', source: 'member', userId: usr.id, createdAt: m.joinedAt,
    });
  });
  IMPORTED.forEach(([name, handle], i) => {
    const lists = i < 16 ? ['l-2026'] : [];
    if (i % 7 === 0) lists.push('l-spon');
    if (i % 5 === 2) lists.push('l-stu');
    contacts.push({
      id: `ct${++ctid}`, groupId: 'otl', email: `${handle}@example.com`, name, listIds: lists,
      status: i === 9 || i === 17 ? 'unsubscribed' : 'subscribed', source: 'import', createdAt: pt('2026-10-10T11:00:00-07:00') + i * 60000,
    });
  });

  // ---------- Campaigns ----------
  const campaigns: Campaign[] = [
    {
      id: 'cmp-thanks', groupId: 'otl', name: 'Thank you, OTL 2026', subject: 'Thank you for a great afternoon on the lawn',
      preheader: 'Photos, the garden, and what is next', fromName: 'On The Lawn', accent: 'lawn',
      blocks: [
        { id: 'b1', type: 'heading', text: 'That was a good one, Bend.' },
        { id: 'b2', type: 'text', text: 'Thank you for showing up on October 9. Thirty of you checked in, nine seeds went into the garden, and two of them have already bloomed into real projects.\n\nThe garden stays open, so if you planted something, keep an eye on it. If you saw a seed you can help with, go water it.' },
        { id: 'b3', type: 'button', text: 'Visit the garden', url: 'https://onthelawn.events' },
        { id: 'b4', type: 'event', eventId: 'portfolio-picnic' },
        { id: 'b5', type: 'signoff', text: 'See you on the lawn,\nThe OTL Team' },
      ],
      audience: { all: false, listIds: ['l-2026'] }, status: 'sent', sentAt: pt('2026-10-12T09:00:00-07:00'),
      createdBy: 'otl', createdAt: pt('2026-10-11T15:00:00-07:00'), updatedAt: pt('2026-10-11T16:00:00-07:00'),
      stats: { recipients: 38, opens: 27, clicks: 11 },
    },
    {
      id: 'cmp-picnic', groupId: 'otl', name: 'Portfolio picnic reminder', subject: 'Portfolio picnic is next week',
      preheader: 'Bring one printed piece and an open mind', fromName: 'On The Lawn', accent: 'sky',
      blocks: [
        { id: 'b1', type: 'heading', text: 'Bring your work to the park' },
        { id: 'b2', type: 'text', text: 'Maya is hosting a portfolio picnic by the Drake Park footbridge. Groups of four, one thing to keep and one thing to try. Blankets on us.' },
        { id: 'b3', type: 'event', eventId: 'portfolio-picnic' },
        { id: 'b4', type: 'signoff', text: 'The OTL Team' },
      ],
      audience: { all: true, listIds: [] }, status: 'scheduled', scheduledAt: bendAt(now + 2 * DAY, 9),
      createdBy: 'jonah', createdAt: now - DAY, updatedAt: now - DAY,
    },
    {
      id: 'cmp-market', groupId: 'otl', name: 'Holiday market call for makers', subject: 'Want a table at the makers holiday market?',
      preheader: 'Free tables for OTL members', fromName: 'On The Lawn', accent: 'tomato',
      blocks: [
        { id: 'b1', type: 'heading', text: 'Calling Bend makers' },
        { id: 'b2', type: 'text', text: 'We are filling twenty tables for the holiday market. Tables are free for OTL members.' },
        { id: 'b3', type: 'event', eventId: 'holiday-market' },
      ],
      audience: { all: false, listIds: ['l-vol'] }, status: 'draft',
      createdBy: 'otl', createdAt: now - 5 * HOUR, updatedAt: now - 5 * HOUR,
    },
  ];

  const groupInvites: GroupInvite[] = [
    { id: 'gi1', groupId: 'otl', email: 'hello@threepines.example', role: 'cohost', invitedBy: 'otl', createdAt: now - 4 * DAY, status: 'pending', sentCount: 1 },
    { id: 'gi2', groupId: 'otl', email: 'facilitators@example.com', role: 'moderator', invitedBy: 'jonah', createdAt: now - 2 * DAY, status: 'pending', sentCount: 2 },
  ];
  const groupBans: GroupBan[] = [
    { id: 'gb1', groupId: 'otl', email: 'promo-bot@example.com', name: 'Totally Real Promoter', reason: 'Spam in event chat', bannedBy: 'jonah', createdAt: pt('2026-09-30T12:00:00-07:00') },
  ];

  return {
    users, groups: [otlGroup, typeClub], groupMembers, groupInvites, groupBans,
    contactLists, contacts, campaigns, events, memberships, emailInvites: [], messages, photos,
    seeds, waterings, activity,
  };
}

export const DEMO_REPLIES: Record<string, string[]> = {
  feedback: ["Happy to take a look. Send the link and I'll mark it up by Thursday.", 'I give blunt notes. In a kind way. Count me in.'],
  advice: ['Been there. Coffee this week? I will bring my numbers.', 'Short answer: start simpler than you think. Long answer over lunch?'],
  mentor: ["I'd love to. I made the same jump a few years back. Monthly walk?", 'Let me buy you a coffee and hear where you are headed.'],
  mentee: ["Raising my hand. I'm learning and would love a guide.", 'This is exactly what I was hoping to find here.'],
  collab: ['This is my kind of project. Want to sketch it out Saturday?', 'I have a free afternoon next week. Let us make something.'],
  launch: ["I'll share it with my list on launch day.", 'Posting it to our studio story. When is the date?'],
};

export const DEMO_CHAT_REPLIES = [
  'Good question. I will find out and post here.',
  'Yes! The more the merrier.',
  'Answered in the details above, but short version: yes.',
];
