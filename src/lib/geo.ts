export interface Geo { lat: number; lng: number }

export const BEND_CENTER: Geo = { lat: 44.0582, lng: -121.3153 };

// Spots people use often, so the map works even when address lookup is offline.
const KNOWN: [RegExp, Geo][] = [
  [/crux|50 sw division/i, { lat: 44.0498, lng: -121.3195 }],
  [/drake park|riverside blvd/i, { lat: 44.0584, lng: -121.3197 }],
  [/old mill/i, { lat: 44.0466, lng: -121.3156 }],
  [/osu.?cascades|1500 sw chandler/i, { lat: 44.0446, lng: -121.3424 }],
  [/cocc|central oregon community college|college way/i, { lat: 44.0721, lng: -121.3509 }],
  [/pilot butte/i, { lat: 44.0596, lng: -121.2830 }],
  [/downtown bend|wall st|bond st/i, { lat: 44.0582, lng: -121.3145 }],
];

export function knownPlace(text: string): Geo | null {
  for (const [re, g] of KNOWN) if (re.test(text)) return g;
  return null;
}

// Address lookup through OpenStreetMap's Nominatim. Falls back to known Bend spots.
export async function geocode(query: string): Promise<{ geo: Geo; approx: boolean } | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (res.ok) {
      const rows = (await res.json()) as { lat: string; lon: string }[];
      if (rows[0]) return { geo: { lat: Number(rows[0].lat), lng: Number(rows[0].lon) }, approx: false };
    }
  } catch { /* offline or blocked */ }
  const known = knownPlace(q);
  if (known) return { geo: known, approx: false };
  if (/bend/i.test(q)) return { geo: BEND_CENTER, approx: true };
  return null;
}

export function mapsLink(text: string, geo?: Geo) {
  return geo
    ? `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}
