# On The Lawn

The community platform for On The Lawn, Bend's creative community. People make an Otis, host and join lawns, check in, and grow ideas together in each lawn's garden.

Built by RADCAT Design with Three Pines. Visuals come straight from the OTL Figma file (Otis presets, card fronts and backs, picnic icons, wordmarks).

## What people can do

1. **Sign up.** Name, email, "I am a..." role, and "Looking to..." intentions from Otis' guide.
2. **Make their Otis.** Hat, overalls, what Otis is holding, a hat band, a friend on the hat, and a card color. Each role starts from its Figma preset. Patterned hats and hat friends unlock as you level up.
3. **Host a lawn.** Name, story, card color, date, venue, spots, public or invite only.
4. **Invite people.** Invite link, QR code, six-character invite code, one-tap invites for people you've met on other lawns, and an email list.
5. **Check in and enter the garden.** Every lawn has a garden. It opens when you check in with the lawn's gate code. Plant a seed for what you're looking for (feedback, advice, a mentor, someone to mentor, a collaborator, help spreading the word). When someone offers help they water it, and it grows from seed to sprout to bud. The planter picks who they'll grow it with and it blooms, with both Otises shown on the flower for the whole garden to see.
6. **Profile.** A flippable trading card (front: Otis on your color, back: Otis' guide to finding you), the number of lawns you're part of, level, stats, and badges.
7. **The honest system.** Hosting is free. When creating a lawn, hosts can keep it free or chip in to OTL with a suggested or custom amount. Lawns that chip in show a "Supports OTL" sprout. Nothing is locked either way.
8. **Gamified.** XP for joining, checking in, planting, watering, blooming, hosting, and bringing people. Seven levels from Seed to Lawn legend, badges, a daily quest list, level-up and bloom celebrations, 3D tilt cards.

## Added beyond the brief

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

Until a backend is connected the app runs in demo mode: data lives in the browser (localStorage), and a small community of fictional Bend creatives is seeded so the gardens have life. On The Lawn 2026 (Oct 9, Crux Fermentation Project) is the flagship lawn; its demo gate code is `LAWN`. When you plant a seed in demo mode, a neighbor waters it after a few seconds so you can try blooming. "Reset demo data" lives on the profile screen.

## How it's built

React 18, TypeScript, Vite, Zustand, Framer Motion. Hash routing so it runs on any static host.

```
src/
  brand/          Otis (parametric SVG from the Figma vectors), icons, wordmarks, plants, palette
  lib/            types, store (all actions), game rules (XP, levels, badges, unlocks), intents, demo data
  screens/        Welcome, Join, Studio, Home, Explore, NewLawn, Lawn, Garden, Gardens, Me, InviteLanding
  ui/             Tilt cards, sheets, toasts and celebrations, event cards, profile card, lawn scene, QR
supabase/
  schema.sql      tables, row level security, check-in function, realtime
```

XP and badges are computed from activity (no separate ledger), so they stay correct when the backend arrives.

## Going live

1. **Supabase.** Create a project, run `supabase/schema.sql`, and enable email magic links. The schema keeps gate codes readable only by hosts and only lets people reach "checked in" through the `check_in` function. Then swap the bodies of the actions in `src/lib/store.ts` for Supabase calls (the action names and shapes already match the tables) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Donations.** Create a Stripe Payment Link with "Let customers choose what to pay" and set `VITE_OTL_DONATE_URL`. The honest-system step links to it.
3. **Email invites.** The invite list is stored per lawn; send it with a Supabase Edge Function and Resend or Postmark.
4. **Deploy.** Push to Vercel, framework preset Vite, output `dist`.

## Brand fonts

The Figma file uses BN Gummie (display) and Bree (body). Those are licensed, so the app ships with Titan One and Baloo 2 as stand-ins and picks up the real faces automatically when they're installed. To serve them on the web, add the licensed `.woff2` files to `public/fonts` and a `url()` source in `src/styles/global.css`.
