import { MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../brand/icons';
import { OtisAvatar } from '../brand/otis/Otis';
import { C, COLOR_KEYS, COLOR_NAMES, tint, type ColorKey } from '../brand/palette';
import { geocode, knownPlace, type Geo } from '../lib/geo';
import { fileToDataUrl } from '../lib/media';
import { canIn, groupsICanHost, roleIn, ROLE_INFO } from '../lib/perms';
import { useMe, useStore } from '../lib/store';
import type { Cover as CoverT, LawnEvent } from '../lib/types';
import { useWide } from '../lib/useWide';
import { fmtLongDay, fmtRange, fromZoned, zoned } from '../lib/util';
import { Locked, Toggle } from '../ui/Bits';
import { Calendar, dayKey, monthStart } from '../ui/Calendar';
import { Cover, COVER_ARTS } from '../ui/Cover';
import { MapView } from '../ui/MapView';
import { StartGroup } from '../ui/StartGroup';

const DONATE_URL = (import.meta.env.VITE_OTL_DONATE_URL as string | undefined) || '';
const AMOUNTS = [5, 15, 35, 75];

const hhmm = (t: number) => zoned(t).time;

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return dayKey(d);
}

export function EventEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const createEvent = useStore((s) => s.createEvent);
  const updateEvent = useStore((s) => s.updateEvent);
  const deleteEvent = useStore((s) => s.deleteEvent);
  const toast = useStore((s) => s.toast);
  const wide = useWide();

  const editing: LawnEvent | undefined = id ? db.events.find((e) => e.id === id) : undefined;
  const hostable = groupsICanHost(db, me.id);
  const startGroupId = editing?.groupId ?? (params.get('group') && hostable.some((g) => g.id === params.get('group')) ? params.get('group')! : hostable[0]?.id);

  const [groupId, setGroupId] = useState<string | undefined>(startGroupId);
  const group = db.groups.find((g) => g.id === groupId);
  const [cover, setCover] = useState<CoverT>(editing?.cover ?? { kind: 'art', art: 'lawn' });
  const [color, setColor] = useState<ColorKey>(editing?.color ?? group?.color ?? 'lawn');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [about, setAbout] = useState(editing?.about ?? '');
  const [day, setDay] = useState(editing ? zoned(editing.startsAt).day : params.get('date') ?? nextSaturday());
  const [month, setMonth] = useState(() => monthStart(new Date(`${day}T12:00`)));
  const [start, setStart] = useState(editing ? hhmm(editing.startsAt) : '16:00');
  const [end, setEnd] = useState(editing ? hhmm(editing.endsAt) : '19:00');
  const [venue, setVenue] = useState(editing?.venue ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [geo, setGeo] = useState<Geo | undefined>(editing?.geo);
  const [approx, setApprox] = useState(false);
  const [finding, setFinding] = useState(false);
  const [cohostIds, setCohostIds] = useState<string[]>(editing?.cohostIds ?? [me.id]);
  const [visibility, setVisibility] = useState<'public' | 'invite'>(editing?.visibility ?? 'public');
  const [capacity, setCapacity] = useState(editing?.capacity ? String(editing.capacity) : '');
  const [chat, setChat] = useState(editing?.chat ?? true);
  const [photos, setPhotos] = useState(editing?.photos ?? true);
  const [mode, setMode] = useState<'free' | 'donate'>(editing?.contribution.mode ?? 'free');
  const [amount, setAmount] = useState(15);
  const [custom, setCustom] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [thanks, setThanks] = useState<{ id: string; amount: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const startsAt = useMemo(() => fromZoned(day, start), [day, start]);
  const endsAt = useMemo(() => fromZoned(day, end), [day, end]);
  const pledge = mode === 'donate' ? (custom ? Math.max(0, Math.round(Number(custom) || 0)) : amount) : 0;
  const groupEvents = db.events.filter((e) => e.groupId === groupId && e.id !== editing?.id);
  const people = db.groupMembers
    .filter((m) => m.groupId === groupId)
    .map((m) => ({ m, u: db.users.find((x) => x.id === m.userId)! }))
    .filter((x) => x.u)
    .sort((a, b) => ROLE_INFO[b.m.role].rank - ROLE_INFO[a.m.role].rank || a.u.name.localeCompare(b.u.name));
  const staffPeople = people.filter((p) => p.m.role !== 'member');
  const otherPeople = people.filter((p) => p.m.role === 'member' && !cohostIds.includes(p.u.id));

  if (editing && !canIn(db, editing.groupId, me.id, 'createEvents')) {
    return (
      <div className="stack-lg" style={{ maxWidth: 560 }}>
        <Locked text={`Only hosts, co-hosts, and moderators of this group can edit "${editing.title}".`} />
        <Link to={`/lawn/${editing.id}`} className="btn cream">Back to the lawn</Link>
      </div>
    );
  }

  if (!hostable.length) {
    return (
      <div className="card" style={{ maxWidth: 620, width: '100%', alignSelf: 'center' }}>
        <p className="strong" style={{ marginBottom: 16 }}>Lawns live inside groups. Start one and you can host right away.</p>
        <StartGroup onDone={(g) => { setGroupId(g.id); setColor(g.color); }} />
      </div>
    );
  }

  if (thanks) {
    return (
      <div className="card stack-lg center" style={{ alignItems: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <Icon name="plant" size={72} />
        <h1 className="display h2">Thank you</h1>
        <p className="lede">Your lawn is live with a little sprout for supporting OTL. That's the honest system. We trust you to finish your ${thanks.amount} gift.</p>
        {DONATE_URL ? (
          <a className="btn sun block" href={DONATE_URL} target="_blank" rel="noreferrer">Give ${thanks.amount} to OTL</a>
        ) : (
          <p className="panel small strong">The donation page connects once OTL adds its payment link. Your pledge is saved on the lawn.</p>
        )}
        <button className="btn cream block" onClick={() => nav(`/lawn/${thanks.id}`, { state: { justCreated: true } })}>Go to your lawn</button>
      </div>
    );
  }

  const findOnMap = async () => {
    const q = [venue, address].filter(Boolean).join(', ');
    if (!q) return setErrors((e) => ({ ...e, venue: 'Add a venue or address first.' }));
    setFinding(true);
    const hit = await geocode(q);
    setFinding(false);
    if (hit) { setGeo(hit.geo); setApprox(hit.approx); }
    else toast({ text: "Couldn't find that address. Check the spelling, or leave it and guests can still open it in Maps.", tone: 'error' });
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { setCover({ kind: 'photo', src: await fileToDataUrl(file, 1600, 0.8) }); }
    catch (e) { toast({ text: (e as Error).message, tone: 'error' }); }
    setUploading(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!groupId) e.group = 'Pick a group.';
    if (title.trim().length < 3) e.title = 'Give the lawn a name people will remember.';
    if (!day || Number.isNaN(startsAt)) e.day = 'Pick a date and start time.';
    else if (endsAt <= startsAt) e.time = 'The end time needs to be after the start.';
    if (!venue.trim()) e.venue = 'Where should people show up?';
    if (capacity && Number(capacity) < 1) e.capacity = 'Spots should be at least 1, or leave it empty.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) {
      if (!wide) setView('edit');
      toast({ text: 'A few things need a look before saving.', tone: 'error' });
      return;
    }
    const geoFinal = geo ?? knownPlace(`${venue} ${address}`) ?? undefined;
    const input = {
      groupId: groupId!, title: title.trim(), about: about.trim(), startsAt, endsAt, venue: venue.trim(), address: address.trim(),
      geo: geoFinal, cover, color, cohostIds: cohostIds.length ? cohostIds : [me.id], visibility,
      capacity: capacity ? Number(capacity) : undefined, chat, photos,
      contribution: editing ? editing.contribution : { mode: pledge > 0 ? 'donate' as const : 'free' as const, amount: pledge },
    };
    if (editing) {
      updateEvent(editing.id, input);
      nav(`/lawn/${editing.id}`);
      return;
    }
    const ev = createEvent(input);
    if (!ev) return;
    if (pledge > 0) setThanks({ id: ev.id, amount: pledge });
    else nav(`/lawn/${ev.id}`, { state: { justCreated: true } });
  };

  const err = (k: string) => errors[k] && <p className="error" role="alert">{errors[k]}</p>;

  const previewC = (
    <div className="stack" style={{ gap: 12 }}>
      <Cover cover={cover} ratio="16 / 9" />
      <div className="card stack" style={{ gap: 10 }}>
        <p className="display h3">{title || 'Your lawn'}</p>
        <p className="strong">{Number.isNaN(startsAt) ? 'Pick a date' : `${fmtLongDay(startsAt)}, ${fmtRange(startsAt, endsAt)}`}</p>
        <p className="small strong muted">{venue || 'Somewhere in Bend'}{address ? `, ${address}` : ''}</p>
        <div className="row-wrap" style={{ alignItems: 'center' }}>
          {group && <span className="pill" style={tint(group.color)}>{group.name}</span>}
          {cohostIds.map((h) => { const u = db.users.find((x) => x.id === h); return u ? <span key={h} className="pill" style={{ padding: '2px 8px 2px 2px', gap: 5 }}><OtisAvatar look={u.otis} size={22} ring={false} />{u.id === me.id ? 'You' : u.name.split(' ')[0]}</span> : null; })}
        </div>
        {about && <p className="small" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{about}</p>}
        <div className="row-wrap">
          {chat && <span className="pill">Chat on</span>}
          {photos && <span className="pill">Photo wall on</span>}
          {visibility === 'invite' && <span className="pill">Invite only</span>}
          {capacity && <span className="pill">{capacity} spots</span>}
        </div>
      </div>
      {(venue || address) && <MapView geo={geo} place={[venue, address].filter(Boolean).join(', ')} height={170} approx={approx} />}
    </div>
  );

  const formC = (
    <div className="stack-lg">
      <section className="card stack">
        <h2 className="display h4">Group</h2>
        <label htmlFor="ed-group" className="sr-only">Group</label>
        <select id="ed-group" className="input select" value={groupId} onChange={(e) => { setGroupId(e.target.value); setCohostIds([me.id]); }}>
          {hostable.map((g) => <option key={g.id} value={g.id}>{g.name} ({ROLE_INFO[roleIn(db, g.id, me.id)!].name})</option>)}
        </select>
        {err('group')}
      </section>

      <section className="card stack">
        <h2 className="display h4">Cover</h2>
        <div className="grid-3" style={{ gap: 10 }}>
          {COVER_ARTS.map((a) => (
            <button key={a.key} type="button" className="swatch" style={{ aspectRatio: '16 / 10', padding: 0 }} aria-pressed={cover.kind === 'art' && cover.art === a.key} aria-label={`${a.name} cover`} onClick={() => setCover({ kind: 'art', art: a.key })}>
              <Cover cover={{ kind: 'art', art: a.key }} ratio="16 / 10" radius={0} style={{ border: 0, width: '100%' }} />
            </button>
          ))}
        </div>
        <input id="ed-cover" type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        <label htmlFor="ed-cover" className={`btn ${cover.kind === 'photo' ? 'sun' : 'cream'} block`} style={{ cursor: 'pointer' }}>
          {uploading ? 'Getting your photo ready' : cover.kind === 'photo' ? 'Using your photo. Pick another' : 'Upload a hero photo'}
        </label>
        <div className="field">
          <span className="label">Accent color</span>
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {COLOR_KEYS.map((k) => (
              <button type="button" key={k} className="swatch" style={{ background: C[k], borderRadius: 12 }} aria-pressed={color === k} aria-label={`${COLOR_NAMES[k]} accent`} onClick={() => setColor(k)} />
            ))}
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2 className="display h4">The basics</h2>
        <div className="field">
          <label htmlFor="ev-title">Title</label>
          <input id="ev-title" className="input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Portfolio picnic" />
          {err('title')}
        </div>
        <div className="field">
          <label htmlFor="ev-about">Details</label>
          <textarea id="ev-about" className="textarea" style={{ minHeight: 140 }} value={about} maxLength={2000} onChange={(e) => setAbout(e.target.value)} placeholder="What will people do there? What should they bring? Who is it for?" />
        </div>
      </section>

      <section className="card stack">
        <h2 className="display h4">Date and time</h2>
        <Calendar month={month} onMonth={setMonth} events={groupEvents} selected={day} onPick={(d) => { setDay(d); setErrors((e) => ({ ...e, day: '' })); }} compact={!wide} pickPast={!!editing} createHint="Pick" />
        <p className="small strong muted">{Number.isNaN(startsAt) ? '' : fmtLongDay(startsAt)}. Other lawns in this group show on the calendar so you can avoid a clash.</p>
        {err('day')}
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ev-start">Starts</label>
            <input id="ev-start" className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ev-end">Ends</label>
            <input id="ev-end" className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        {err('time')}
      </section>

      <section className="card stack">
        <h2 className="display h4">Hosted by</h2>
        <p className="small strong muted">{group?.name} shows first. Pick the people guests should look for.</p>
        <div className="row-wrap">
          {[...staffPeople, ...people.filter((p) => p.m.role === 'member' && cohostIds.includes(p.u.id))].map(({ u, m }) => {
            const on = cohostIds.includes(u.id);
            return (
              <button key={u.id} type="button" className="chip" aria-pressed={on} style={{ paddingLeft: 4 }} onClick={() => setCohostIds((xs) => (on ? xs.filter((x) => x !== u.id) : [...xs, u.id]))}>
                <OtisAvatar look={u.otis} size={28} ring={false} />
                {u.id === me.id ? 'You' : u.name}
                <span className="small" style={{ opacity: 0.7 }}>{ROLE_INFO[m.role].short}</span>
              </button>
            );
          })}
        </div>
        {otherPeople.length > 0 && (
          <div className="field">
            <label htmlFor="ev-addhost">Add a member as co-host</label>
            <select id="ev-addhost" className="input select" value="" onChange={(e) => e.target.value && setCohostIds((xs) => [...xs, e.target.value])}>
              <option value="">Pick someone</option>
              {otherPeople.map(({ u }) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
      </section>

      <section className="card stack">
        <h2 className="display h4">Location</h2>
        <div className="field">
          <label htmlFor="ev-venue">Venue or spot</label>
          <input id="ev-venue" className="input" value={venue} onChange={(e) => { setVenue(e.target.value); setGeo(undefined); }} placeholder="Drake Park, by the footbridge" />
          {err('venue')}
        </div>
        <div className="field">
          <label htmlFor="ev-address">Address</label>
          <input id="ev-address" className="input" value={address} onChange={(e) => { setAddress(e.target.value); setGeo(undefined); }} placeholder="777 NW Riverside Blvd, Bend, OR" autoComplete="street-address" />
        </div>
        <button type="button" className="btn cream block" onClick={findOnMap} disabled={finding}>
          <MapPin size={16} strokeWidth={2} aria-hidden /> {finding ? 'Looking it up' : geo ? 'Find it again' : 'Find it on the map'}
        </button>
        {!wide && (venue || address) && <MapView geo={geo} place={[venue, address].filter(Boolean).join(', ')} height={190} approx={approx} />}
      </section>

      <section className="card stack">
        <h2 className="display h4">On the page</h2>
        <Toggle id="ev-chat" checked={chat} onChange={setChat} label="Event chat" hint="Guests can ask questions. Hosts and moderators answer." />
        <Toggle id="ev-photos" checked={photos} onChange={setPhotos} label="Photo wall" hint="Guests post their shots during and after." />
        <Toggle id="ev-invite" checked={visibility === 'invite'} onChange={(v) => setVisibility(v ? 'invite' : 'public')} label="Invite only" hint="Hidden from Explore. People need your link." />
        <div className="field">
          <label htmlFor="ev-cap">Spots</label>
          <input id="ev-cap" className="input" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} placeholder="No limit" />
          {err('capacity')}
        </div>
      </section>

      {!editing && (
        <section className="card stack">
          <h2 className="display h4">The honest system</h2>
          <p>Hosting is free. If OTL helps bring your people together, chip in what feels right. Nobody checks.</p>
          <div className="row-wrap">
            <button type="button" className="chip" aria-pressed={mode === 'free'} onClick={() => setMode('free')}>Keep it free</button>
            <button type="button" className="chip" aria-pressed={mode === 'donate'} onClick={() => setMode('donate')}>Chip in to OTL</button>
          </div>
          {mode === 'donate' && (
            <div className="row-wrap" role="group" aria-label="Amount">
              {AMOUNTS.map((a) => (
                <button type="button" key={a} className="chip" aria-pressed={!custom && amount === a} onClick={() => { setAmount(a); setCustom(''); }}>${a}</button>
              ))}
              <input className="input" style={{ width: 120, minHeight: 40, borderRadius: 999, padding: '6px 14px', borderWidth: 2.5 }} inputMode="numeric" aria-label="Other amount in dollars" placeholder="Other $" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} />
            </div>
          )}
        </section>
      )}

      {editing && (
        <section className="card stack">
          <h2 className="display h4">Delete this lawn</h2>
          {confirmDelete ? (
            <div className="stack">
              <p className="strong">This removes the lawn, its guest list, chat, and photos. Seeds in the garden stay with the people who planted them.</p>
              <div className="grid-2">
                <button type="button" className="btn danger" onClick={() => { deleteEvent(editing.id); nav(group ? `/g/${group.slug}` : '/'); }}>Delete lawn</button>
                <button type="button" className="btn cream" onClick={() => setConfirmDelete(false)}>Keep it</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn cream" onClick={() => setConfirmDelete(true)}>Delete lawn</button>
          )}
        </section>
      )}
    </div>
  );

  const saveLabel = editing ? 'Save changes' : pledge > 0 ? `Create lawn and give $${pledge}` : 'Create lawn';

  return (
    <>
      <div className="page-head">
        <div className="row" style={{ gap: 12 }}>
          <button className="btn cream small" onClick={() => nav(-1)}>Back</button>
          <h1 className="display h2">{editing ? 'Edit lawn' : 'Host a lawn'}</h1>
        </div>
        {wide && <button className="btn sun" onClick={save}>{saveLabel}</button>}
      </div>
      {wide ? (
        <div className="cols" style={{ gridTemplateColumns: 'minmax(0, 1fr) 380px' }}>
          <div className="col">{formC}</div>
          <aside className="rail">
            <p className="label">How the page looks</p>
            {previewC}
            <button className="btn sun block" onClick={save}>{saveLabel}</button>
          </aside>
        </div>
      ) : (
        <>
          <div className="row" role="tablist" aria-label="Editor view">
            <button className="chip grow" role="tab" aria-selected={view === 'edit'} aria-pressed={view === 'edit'} style={{ justifyContent: 'center' }} onClick={() => setView('edit')}>Edit</button>
            <button className="chip grow" role="tab" aria-selected={view === 'preview'} aria-pressed={view === 'preview'} style={{ justifyContent: 'center' }} onClick={() => setView('preview')}>Preview</button>
          </div>
          {view === 'edit' ? formC : previewC}
          <button className="btn sun block" style={{ minHeight: 58, fontSize: '1.1rem' }} onClick={save}>{saveLabel}</button>
        </>
      )}
    </>
  );
}
