import { useEffect, useState } from 'react';

// True on desktop-width screens, where the app switches to the sidebar layout.
export const WIDE_QUERY = '(min-width: 1024px)';

export function useWide(query = WIDE_QUERY) {
  const read = () => {
    try { return window.matchMedia(query).matches; } catch { return false; }
  };
  const [match, setMatch] = useState(read);
  useEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia(query); } catch { return; }
    const onChange = () => setMatch(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [query]);
  return match;
}
