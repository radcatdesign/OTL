// Demo community for local mode. Everyone here is fictional except the venue and the
// On The Lawn 2026 event itself (Oct 9, 2026 at Crux Fermentation Project).
import type { DB, Membership, Seed, User, Watering, Activity } from './types';
import { ROLE_LOOKS } from './presets';

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

export function buildDemoDB(now = Date.now()): DB {
  const t0 = new Date('2026-09-20T10:00:00-07:00').getTime();
  const u = (id: string, name: string, role: User['role'], bio: string, look: Partial<User['otis']> = {}, intents: User['intents'] = []): User => ({
    id, name, email: `${id}@demo.onthelawn.events`, role, bio, intents,
    otis: { ...ROLE_LOOKS[role], ...look }, createdAt: t0, demo: true,
  });

  const users: User[] = [
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

  const flagship = {
    id: 'otl-2026', code: 'LAWN26', gate: 'LAWN', title: 'On The Lawn 2026',
    about: 'Our annual afternoon for Bend creatives and business leaders. Keynote chats, small group conversations led by volunteer facilitators, then drinks and a social hour. Bring a lawn chair and a friend.',
    hostId: 'otl',
    startsAt: new Date('2026-10-09T15:00:00-07:00').getTime(),
    endsAt: new Date('2026-10-09T21:00:00-07:00').getTime(),
    venue: 'Crux Fermentation Project', address: '50 SW Division St, Bend, OR 97702',
    color: 'lawn' as const, visibility: 'public' as const, capacity: 250,
    contribution: { mode: 'free' as const, amount: 0 }, createdAt: t0,
  };
  const picnic = {
    id: 'portfolio-picnic', code: 'PICNIC', gate: 'SKETCH', title: 'Portfolio picnic',
    about: 'Bring a printed piece or a laptop. We trade portfolios in groups of four and give each other one thing to keep and one thing to try. Blankets provided.',
    hostId: 'maya',
    startsAt: startOfDay(now + 9 * DAY) + 16 * HOUR, endsAt: startOfDay(now + 9 * DAY) + 19 * HOUR,
    venue: 'Drake Park, by the footbridge', address: '777 NW Riverside Blvd, Bend, OR 97703',
    color: 'sky' as const, visibility: 'public' as const, capacity: 40,
    contribution: { mode: 'donate' as const, amount: 25 }, createdAt: now - 3 * DAY,
  };
  const typeTea = {
    id: 'type-and-tea', code: 'SERIF1', gate: 'KERN', title: 'Type and tea',
    about: 'A slow evening of lettering practice. Brushes and paper on us. All levels, students free as always.',
    hostId: 'jonah',
    startsAt: startOfDay(now + 23 * DAY) + 18 * HOUR, endsAt: startOfDay(now + 23 * DAY) + 20.5 * HOUR,
    venue: 'The Juniper Room', address: 'Old Mill District, Bend, OR',
    color: 'tangerine' as const, visibility: 'public' as const, capacity: 18,
    contribution: { mode: 'donate' as const, amount: 10 }, createdAt: now - 1 * DAY,
  };

  const flagshipCrew = users.map((x) => x.id);
  const memberships: Membership[] = [];
  let mid = 0;
  const add = (eventId: string, ids: string[], status: Membership['status'], at: number) =>
    ids.forEach((userId, i) => memberships.push({
      id: `m${++mid}`, eventId, userId, status, spot: lawnSpot(i, ids.length), createdAt: at,
      checkedInAt: status === 'here' ? at : undefined,
    }));
  add('otl-2026', flagshipCrew, 'here', flagship.startsAt + HOUR);
  add('portfolio-picnic', ['maya', 'rosa', 'priya', 'sam', 'jonah', 'june'], 'going', now - 2 * DAY);
  add('type-and-tea', ['jonah', 'marco', 'rosa', 'lena'], 'going', now - DAY);

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
  ];

  const activity: Activity[] = [];
  let aid = 0;
  const act = (a: Omit<Activity, 'id' | 'eventId'> & { eventId?: string }) => activity.push({ id: `a${++aid}`, eventId: a.eventId ?? 'otl-2026', ...a });
  seeds.forEach((s) => act({ userId: s.userId, kind: 'planted', seedId: s.id, createdAt: s.createdAt }));
  waterings.forEach((x) => act({ userId: x.userId, kind: 'watered', seedId: x.seedId, otherUserId: seeds.find((s) => s.id === x.seedId)!.userId, createdAt: x.createdAt }));
  seeds.filter((s) => s.bloomedAt).forEach((s) => act({ userId: s.userId, kind: 'bloomed', seedId: s.id, otherUserId: s.partners[0], createdAt: s.bloomedAt! }));
  act({ eventId: 'portfolio-picnic', userId: 'maya', kind: 'hosted', createdAt: picnic.createdAt });
  act({ eventId: 'type-and-tea', userId: 'jonah', kind: 'hosted', createdAt: typeTea.createdAt });

  return {
    users,
    events: [flagship, picnic, typeTea],
    memberships,
    emailInvites: [],
    seeds,
    waterings,
    activity,
  };
}

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const DEMO_REPLIES: Record<string, string[]> = {
  feedback: ["Happy to take a look. Send the link and I'll mark it up by Thursday.", 'I give blunt notes. In a kind way. Count me in.'],
  advice: ['Been there. Coffee this week? I will bring my numbers.', 'Short answer: start simpler than you think. Long answer over lunch?'],
  mentor: ["I'd love to. I made the same jump a few years back. Monthly walk?", 'Let me buy you a coffee and hear where you are headed.'],
  mentee: ["Raising my hand. I'm learning and would love a guide.", 'This is exactly what I was hoping to find here.'],
  collab: ['This is my kind of project. Want to sketch it out Saturday?', 'I have a free afternoon next week. Let us make something.'],
  launch: ["I'll share it with my list on launch day.", 'Posting it to our studio story. When is the date?'],
};
