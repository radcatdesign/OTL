import { Link, useNavigate, useParams } from 'react-router-dom';
import { Wordmark } from '../brand/Logo';
import { OtisAvatar } from '../brand/otis/Otis';
import { membershipOf, userById, useMe, useStore } from '../lib/store';
import { EventCard } from '../ui/EventCard';

export function InviteLanding() {
  const { code, from } = useParams();
  const nav = useNavigate();
  const me = useMe();
  const db = useStore((s) => s.db);
  const rsvp = useStore((s) => s.rsvp);
  const ev = db.events.find((e) => e.code.toUpperCase() === (code ?? '').toUpperCase());
  const inviter = from ? userById(db, from) : undefined;

  if (!ev) {
    return (
      <div className="card stack center" style={{ alignItems: 'center' }}>
        <h1 className="display h2">That invite code didn't match a lawn</h1>
        <p>Check the code with whoever sent it. Codes are six letters and numbers.</p>
        <Link to="/" className="btn sun">Go to On The Lawn</Link>
      </div>
    );
  }

  const joined = me && membershipOf(db, ev.id, me.id)?.status !== undefined && membershipOf(db, ev.id, me.id)?.status !== 'invited';

  return (
    <div className="stack-lg art" style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      {!me && <div style={{ display: 'grid', placeItems: 'center' }}><Wordmark width={200} /></div>}
      {inviter && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <OtisAvatar look={inviter.otis} size={44} />
          <p className="strong">{inviter.name} invited you to a lawn</p>
        </div>
      )}
      <EventCard ev={ev} />
      {me ? (
        joined ? (
          <Link to={`/lawn/${ev.id}`} className="btn sun block">You're on this lawn. Open it.</Link>
        ) : (
          <button className="btn sun block" style={{ minHeight: 58, fontSize: '1.15rem' }} onClick={() => { rsvp(ev.id, from); nav(`/lawn/${ev.id}`); }}>I'm going</button>
        )
      ) : (
        <div className="stack">
          <Link to="/join" state={{ next: `/invite/${ev.code}${from ? `/${from}` : ''}` }} className="btn sun block" style={{ minHeight: 58, fontSize: '1.15rem' }}>Make your Otis to join</Link>
          <p className="center small strong">Takes about a minute. Then you're on the list.</p>
        </div>
      )}
    </div>
  );
}
