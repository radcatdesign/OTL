import { useEffect, useMemo, useRef, useState } from 'react';
import { C } from '../brand/palette';
import { mapsLink, type Geo } from '../lib/geo';

const TILE = 256;
const ZOOM = 16;

function toTile(geo: Geo, z: number) {
  const n = 2 ** z;
  const lat = (geo.lat * Math.PI) / 180;
  return {
    x: ((geo.lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n,
  };
}

function Pin() {
  return (
    <svg width="44" height="56" viewBox="0 0 44 56" aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -100%)', filter: 'drop-shadow(0 3px 0 rgba(22,84,26,.35))' }}>
      <path d="M22 3C11.5 3 4 10.8 4 20.6 4 34 22 53 22 53S40 34 40 20.6C40 10.8 32.5 3 22 3Z" fill={C.tomato} stroke={C.pine} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="22" cy="20.5" r="7.5" fill={C.cream} stroke={C.pine} strokeWidth="3" />
    </svg>
  );
}

// Drawn map used when map tiles can't load (offline, or embedded previews).
function Illustrated({ seed }: { seed: number }) {
  const r = (i: number) => ((Math.sin(seed * 9.13 + i * 12.97) + 1) / 2);
  const blocks = Array.from({ length: 16 }, (_, i) => ({
    x: (i % 4) * 100 + 8 + r(i) * 10, y: Math.floor(i / 4) * 60 + 6 + r(i + 40) * 6, w: 74 + r(i + 7) * 10, h: 40 + r(i + 3) * 8, park: r(i + 11) > 0.78,
  }));
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden style={{ position: 'absolute', inset: 0 }}>
      <rect width="400" height="240" fill="#f3efd8" />
      {blocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="8" fill={b.park ? C.lawn : '#e6e1c4'} opacity={b.park ? 0.85 : 1} />
      ))}
      <path d={`M-10 ${150 + r(1) * 40} C 90 ${110 + r(2) * 30}, 180 ${210 - r(3) * 40}, 260 ${140 + r(4) * 20} S 380 ${90 + r(5) * 40}, 420 ${120 + r(6) * 30}`} stroke={C.sky} strokeWidth="18" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M0 120 H400 M200 0 V240" stroke="#fff" strokeWidth="8" opacity="0.9" />
    </svg>
  );
}

export function MapView({ geo, place, height = 220, approx = false }: { geo?: Geo; place: string; height?: number; approx?: boolean }) {
  const [failed, setFailed] = useState(false);
  const loadedRef = useRef(false);
  const t = useMemo(() => (geo ? toTile(geo, ZOOM) : null), [geo]);

  useEffect(() => {
    setFailed(false);
    loadedRef.current = false;
    // If no tile shows up quickly, switch to the drawn map.
    const id = setTimeout(() => { if (!loadedRef.current) setFailed(true); }, 4500);
    return () => clearTimeout(id);
  }, [geo?.lat, geo?.lng]);

  const tiles = useMemo(() => {
    if (!t) return [];
    const out: { key: string; src: string; left: number; top: number }[] = [];
    const cx = Math.floor(t.x);
    const cy = Math.floor(t.y);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        out.push({ key: `${x}-${y}`, src: `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`, left: (x - t.x) * TILE, top: (y - t.y) * TILE });
      }
    }
    return out;
  }, [t]);

  const seed = geo ? Math.abs(geo.lat * 1000 + geo.lng * 1000) : place.length;
  const showTiles = !!t && !failed;

  return (
    <div style={{ position: 'relative', height, borderRadius: 20, border: `3px solid ${C.pine}`, overflow: 'hidden', background: '#f3efd8' }}>
      {showTiles ? (
        <div aria-hidden style={{ position: 'absolute', inset: 0, filter: 'saturate(0.75) sepia(0.12) hue-rotate(20deg)' }}>
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              width={TILE}
              height={TILE}
              draggable={false}
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => { loadedRef.current = true; }}
              onError={() => setFailed(true)}
              style={{ position: 'absolute', left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)`, width: TILE, height: TILE, maxWidth: 'none' }}
            />
          ))}
        </div>
      ) : (
        <Illustrated seed={seed} />
      )}
      {geo && <Pin />}
      <a
        className="btn cream small"
        href={mapsLink(place, geo)}
        target="_blank"
        rel="noreferrer"
        style={{ position: 'absolute', right: 10, bottom: 10, minHeight: 36 }}
      >
        Open in Maps
      </a>
      {showTiles && (
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ position: 'absolute', left: 8, bottom: 6, fontSize: 10, background: 'rgba(255,255,255,.8)', padding: '1px 5px', borderRadius: 6, color: C.pine }}>
          © OpenStreetMap
        </a>
      )}
      {!geo && (
        <p className="pill" style={{ position: 'absolute', left: 10, top: 10 }}>No pin yet</p>
      )}
      {geo && approx && (
        <p className="pill" style={{ position: 'absolute', left: 10, top: 10 }}>Approximate spot</p>
      )}
    </div>
  );
}
