import { googleCalendarUrl, icsFile, outlookCalendarUrl } from '../lib/calendar';
import { saveFile } from '../lib/media';
import { useStore } from '../lib/store';
import type { LawnEvent } from '../lib/types';

export function AddToCalendar({ ev }: { ev: LawnEvent }) {
  const toast = useStore((s) => s.toast);
  const slug = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lawn';
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="label">Add to calendar</p>
      <div className="grid-3" style={{ gap: 8 }}>
        <a className="btn cream small" href={googleCalendarUrl(ev)} target="_blank" rel="noreferrer">Google</a>
        <a className="btn cream small" href={outlookCalendarUrl(ev)} target="_blank" rel="noreferrer">Outlook</a>
        <button
          className="btn cream small"
          onClick={async () => { if ((await saveFile(`${slug}.ics`, icsFile(ev), 'text/calendar')) === 'unavailable') toast({ text: "Calendar files can't be saved from this preview. Use Google or Outlook.", tone: 'info' }); }}
        >
          Apple
        </button>
      </div>
    </div>
  );
}
