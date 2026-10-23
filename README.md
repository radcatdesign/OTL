# On The Lawn

The community platform for On The Lawn, Bend's creative community. People make an Otis, host and join lawns, check in, and grow ideas together in each lawn's garden.

Built by RADCAT Design with Three Pines. Visuals come straight from the OTL Figma file (Otis presets, card fronts and backs, picnic icons, wordmarks).

## What people can do

1. **Sign up.** Name, email, "I am a..." role, and "Looking to..." intentions from Otis' guide.
2. **Make their Otis.** Hat, overalls, what Otis is holding, a hat band, a friend on the hat, and a card color. Each role starts from its Figma preset. Patterned hats and hat friends unlock as you level up.
3. **Host a lawn.** Pick a day on a calendar, then the details: title, hero image (six illustrated covers or your own photo), date and time, who's hosting, description, location with a map, spots, chat and photo wall on or off, public or invite only.
4. **Invite people.** Invite link, QR code, six-character invite code, one-tap invites for people you've met on other lawns, and an email list.
5. **Check in and enter the garden.** Every lawn has a garden. It opens when you check in with the lawn's gate code. Plant a seed for what you're looking for (feedback, advice, a mentor, someone to mentor, a collaborator, help spreading the word). When someone offers help they water it, and it grows from seed to sprout to bud. The planter picks who they'll grow it with and it blooms, with both Otises shown on the flower for the whole garden to see.
6. **Profile.** A flippable trading card (front: Otis on your color, back: Otis' guide to finding you), the number of lawns you're part of, level, stats, and badges.
7. **The honest system.** Hosting is free. When creating a lawn, hosts can keep it free or chip in to OTL with a suggested or custom amount. Lawns that chip in show a "Supports OTL" sprout. Nothing is locked either way.
8. **Gamified.** XP for joining, checking in, planting, watering, blooming, hosting, and bringing people. Seven levels from Seed to Lawn legend, badges, a daily quest list, level-up and bloom celebrations, 3D tilt cards.

## Groups and admin

Groups own lawns. On The Lawn is the first group; anyone can start another.

**Roles**

| What they can do | Host | Co-host | Moderator | Member |
|---|:-:|:-:|:-:|:-:|
| Join lawns, chat, post photos, plant seeds | yes | yes | yes | yes |
| Create and edit lawns | yes | yes | yes | |
| Answer and hide chat messages | yes | yes | yes | |
| See group stats | yes | yes | yes | |
| Invite, remove and ban members | yes | yes | | |
| Change roles, edit group details | yes | yes | | |
| Email list and campaigns | yes | yes | | |

Co-hosts have the same power as the host, with one guardrail: co-hosts can't remove, ban or demote each other. Only the host can, and only the host can hand over hosting.

**The admin space** (`/g/<group>/admin`) has seven tabs:

- **Overview.** Member count and growth by month, active members, check-in rate, email subscribers, turnout at past lawns, garden activity, most involved members, what's coming up. Every chart has a table view.
- **Members.** Search and filter by role, change roles, remove, and the ban hammer. Invite by email with a role, or share the join link. Pending invites can be resent or revoked. Banning someone takes them out of the group, off upcoming lawns, hides their chat messages and unsubscribes them. Bans can be lifted.
- **Lawns.** A month calendar. Click a day to start a lawn on it.
- **Inbox.** Every question from every lawn chat that a host or moderator hasn't answered yet. Reply from here and it posts to that lawn's chat.
- **Email list.** Members and RSVPs land on the list on their own. Add people by hand, import a CSV (with or without headers, first and last name columns work), export to CSV, sub-lists with colors, bulk add to list, unsubscribe and delete.
- **Campaigns.** Drafts, scheduled and sent, with open and click rates. The editor has subject, preview text, from name and accent color, an audience picker (everyone or sub-lists, deduped), and a block builder: heading, text, image, button, lawn card (date, place and RSVP button), divider, sign-off. The preview shows the email in an inbox list and opened, on desktop and phone. Send a test, copy the HTML, schedule it (Pacific time, with quick picks like "3 days before the lawn") or send now. "Email about this lawn" on any lawn starts a campaign with the lawn card already in it.
- **Settings.** Group name, tagline, about, reply-to address, color, and the roles table.

**Lawn pages** have the hero image, date, location, "Hosted by" (the group plus the hosts), details, a map, add to calendar (Google, Outlook, Apple), the guest list, event chat with replies, and a photo wall with captions, likes and a lightbox.

## Phone and desktop

One app, two layouts. Under 1024px it's the phone layout: top bar, bottom tabs, one column. At 1024px and up it becomes a desktop web app: a sidebar with your Otis, level and a Host button, two-column pages with a sticky side rail (garden news and the growth guide in gardens, check-in and guest list on lawns), card grids for lawns and gardens, the Otis studio with the preview beside the controls, and the host form with a live preview card.

## Added beyond the brief

- **Walk the garden.** Each garden is a little world bigger than the screen. Steer your Otis with the arrow keys or WASD, or tap anywhere to walk there. Plant a seed right where you're standing, walk up to someone's seed to water it (the can comes out and the plant grows on the spot), and use the minimap to get around. Neighbors wander, say hi when you pass, and walk over to water your seeds. A plain list view is one tap away.
- **Each event is a literal lawn.** Everyone's Otis stands on the event's lawn scene. Tap one to see their card.
- **Gate code check-in.** Hosts get a code and a "Show on screen" mode with the code and a join QR for the welcome table. The garden only opens for people who were there.
- **Profile card mirrors the printed OTL cards.** Front and back, including the checker border and the six colored intentions.
- **Seed types use Otis' guide colors**, so a garden reads at a glance.
- **Thirsty seeds.** Unwatered seeds are flagged so helpers find them first.
- **Garden news.** A feed of plants, waterings, and blooms.
- **Students.** "Student" role for the Plant pillar (COCC, OSU-Cascades, local high schools).
- **Add to calendar and maps links** on every lawn.
- **Unlocks tied to good behavior.** Hat friends unlock by watering, blooming, and hosting, not by spending.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # static site in dist/ (deploy anywhere: Vercel, Netlify)
npm run build:preview  # one self-contained HTML file in dist-preview/
```

## Demo mode

Until a backend is connected the app runs in demo mode: data lives in the browser (localStorage), and a community of 40 fictional Bend creatives is seeded so the gardens, charts and email list have life. On The Lawn 2026 (Oct 9, Crux Fermentation Project) is the flagship lawn; its demo gate code is `LAWN`. When you plant a seed in demo mode, a neighbor waters it after a few seconds so you can try blooming. "Reset demo data" lives on the profile screen.

In demo mode you sign up as a co-host of On The Lawn so the admin space is open. A "Demo: try this as" switch at the top of the admin space lets you see it as a moderator or member. Campaign sends, tests and open rates are simulated. Scheduled campaigns flip to sent when their time comes while the app is open. Maps use OpenStreetMap tiles and fall back to an illustrated map when tiles can't load.

## How it's built

React 18, TypeScript, Vite, Zustand, Framer Motion. Hash routing so it runs on any static host.

```
src/
  brand/          Otis (parametric SVG from the Figma vectors), icons, wordmarks, plants, palette
  lib/            types, store (all actions), game rules (XP, levels, badges, unlocks), intents, demo data
  lib/perms.ts    roles and what each can do (mirrored in supabase/schema.sql)
  lib/email.ts    audience, CSV import and export, email HTML (table layout, inline styles)
  screens/        Welcome, Join, Studio, Home, Explore, EventEditor, Lawn, Garden, Gardens, Me, Groups, GroupPage
  screens/admin/  Overview, Members, LawnsTab, Inbox, EmailList, Campaigns, CampaignEditor, Settings
  ui/             Tilt cards, sheets, calendar, map, cover art, chat, photo wall, charts, lawn scene, QR
supabase/
  schema.sql      tables, role-based row level security, ban/role/check-in functions, storage, realtime
```

XP and badges are computed from activity (no separate ledger), so they stay correct when the backend arrives.

## Going live

1. **Supabase.** Create a project, run `supabase/schema.sql`, and enable email magic links. Row level security follows the roles table above: helper functions (`can`, `outranks`, `is_lawn_staff`) carry the same rules as `src/lib/perms.ts`, gate codes are readable only by lawn staff, check-in only happens through `check_in`, and bans, role changes and invite acceptance go through `ban_member`, `set_member_role` and `accept_group_invites`. Then swap the bodies of the actions in `src/lib/store.ts` for Supabase calls (the action names and shapes already match the tables) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Photos and covers.** The schema creates `lawn-photos`, `covers` and `email-images` buckets with policies. Upload there instead of keeping images in the browser.
3. **Email.** Use Resend (or Postmark) from two Supabase Edge Functions:
   - `send-campaigns`: picks up campaigns that are due, sends the stored HTML in batches with `{{first_name}}` filled in, writes `campaign_sends`, and marks the campaign sent. The schema has the `pg_cron` job that calls it every minute.
   - `unsubscribe`: handles the footer link with the contact's `unsubscribe_token`.
   Point Resend's open and click webhooks at a third small function that updates `campaign_sends` and the campaign totals. Verify the sending domain (SPF, DKIM, DMARC) before the first real send. Group invites and lawn email invites go out through the same provider.
4. **Maps.** OpenStreetMap's public tiles are fine for light use. For real traffic, switch the tile URL in `src/ui/MapView.tsx` to MapTiler, Stadia or Mapbox, and move geocoding off the public Nominatim server.
5. **Donations.** Create a Stripe Payment Link with "Let customers choose what to pay" and set `VITE_OTL_DONATE_URL`. The honest-system step links to it.
6. **Deploy.** Push to Vercel, framework preset Vite, output `dist`.

## Brand fonts

The Figma file uses BN Gummie (display) and Bree (body). Those are licensed, so the app ships with Titan One and Baloo 2 as stand-ins and picks up the real faces automatically when they're installed. To serve them on the web, add the licensed `.woff2` files to `public/fonts` and a `url()` source in `src/styles/global.css`.
